#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, String, Boolean
from ccc import Corpus
from ccc.utils import format_cqp_query
from flask import current_app
from pandas import DataFrame

from . import db
from .database import Query
from .users import auth

bp = APIBlueprint('query', __name__, url_prefix='/query')


def get_or_create_query(corpus, discourseme, context_break=None, p_query=None, match_strategy='longest', subcorpus_name=None, cqp_query=None):
    """

    """

    current_app.logger.debug(f"get_or_create_query :: discourseme {discourseme.name} on corpus {corpus.cwb_id} (subcorpus: {subcorpus_name})")
    if not cqp_query:
        cqp_query = format_cqp_query(discourseme.items.split("\t"), p_query, context_break, escape=False)
    query = Query.query.filter_by(discourseme_id=discourseme.id, corpus_id=corpus.id, cqp_query=cqp_query,
                                  nqr_name=subcorpus_name, match_strategy=match_strategy).order_by(Query.id.desc()).first()

    if not query:
        query = Query(discourseme_id=discourseme.id, corpus_id=corpus.id, cqp_query=cqp_query, nqr_name=subcorpus_name, match_strategy=match_strategy)
        db.session.add(query)
        db.session.commit()

    return query


def ccc_query(query, return_df=True):
    """create or get matches of this query

    """

    matches = query.matches

    if len(matches) == 0:

        current_app.logger.debug(f'ccc_query :: querying corpus {query.corpus.cwb_id}')
        corpus = Corpus(query.corpus.cwb_id,
                        cqp_bin=current_app.config['CCC_CQP_BIN'],
                        registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                        data_dir=current_app.config['CCC_DATA_DIR'])
        if query.nqr_name:
            # TODO check that subcorpus exists
            # print(query.nqr_name)
            # nqrs = corpus.show_nqr()
            corpus = corpus.subcorpus(query.nqr_name)

        matches = corpus.query(cqp_query=query.cqp_query, match_strategy=query.match_strategy)
        query.cqp_nqr_matches = matches.subcorpus_name
        df_matches = matches.df.reset_index()[['match', 'matchend']]
        df_matches['query_id'] = query.id

        current_app.logger.debug(f"get_or_create_matches :: saving {len(df_matches)} lines to database")
        df_matches.to_sql('matches', con=db.engine, if_exists='append', index=False)
        db.session.commit()
        current_app.logger.debug("get_or_create_matches :: saved to database")

        matches_df = df_matches.drop('query_id', axis=1).set_index(['match', 'matchend'])

    elif return_df:
        current_app.logger.debug("get_or_create_matches :: getting matches from database")
        matches_df = DataFrame([vars(s) for s in query.matches], columns=['match', 'matchend']).set_index(['match', 'matchend'])
        current_app.logger.debug(f"get_or_create_matches :: got {len(matches_df)} matches from database")

    else:
        current_app.logger.debug("get_or_create_matches :: matches already exist in database")
        matches_df = None

    return matches_df


class QueryIn(Schema):

    discourseme_id = Integer()
    corpus_id = Integer()
    match_strategy = String()
    cqp_query = String()
    nqr_name = String(required=False)


class QueryOut(Schema):

    id = Integer()
    discourseme_id = Integer()
    corpus_id = Integer()
    match_strategy = String()
    cqp_query = String()
    nqr_name = String()
    cqp_nqr_matches = String()


@bp.post('/')
@bp.input(QueryIn)
@bp.input({'execute': Boolean(load_default=True)}, location='query')
@bp.output(QueryOut)
@bp.auth_required(auth)
def create(data, data_query):
    """Create new query.

    """
    query = Query(**data)
    db.session.add(query)
    db.session.commit()

    if data_query['execute']:
        ccc_query(query)

    return QueryOut().dump(query), 200


@bp.get('/')
@bp.output(QueryOut(many=True))
@bp.auth_required(auth)
def get_queries():
    """Get all queries.

    """

    queries = Query.query.all()

    return [QueryOut().dump(query) for query in queries], 200


@bp.get('/<id>')
@bp.output(QueryOut)
@bp.auth_required(auth)
def get_query(id):
    """Get details of a query.

    """

    query = db.get_or_404(Query, id)

    return QueryOut().dump(query), 200


@bp.delete('/<id>')
@bp.auth_required(auth)
def delete_query(id):
    """Delete a query.

    """

    query = db.get_or_404(Query, id)
    db.session.delete(query)
    db.session.commit()

    return 'Deletion successful.', 200


@bp.post('/<id>/execute')
@bp.output(QueryOut)
@bp.auth_required(auth)
def execute(id):
    """Execute query: create matches.

    """

    query = db.get_or_404(Query, id)
    ccc_query(query)

    return QueryOut().dump(query), 200
