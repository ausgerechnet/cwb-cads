#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, String
from ccc import Corpus
from ccc.utils import format_cqp_query
from flask import current_app, request
from pandas import DataFrame

from . import db
from .database import Matches, Query
from .users import auth

bp = APIBlueprint('query', __name__, url_prefix='/query')


def get_or_create_matches(discourseme, corpus, corpus_id, context_break, subcorpus_name=None, p_query='lemma', return_df=True):
    """
    create matches or get the last matches of this discourseme on this corpus
    """

    current_app.logger.debug(f"get_or_create_matches :: discourseme {discourseme.name} on corpus {corpus_id} (subcorpus: {subcorpus_name})")

    cqp_query = format_cqp_query(discourseme.items.split("\t"), p_query, context_break, escape=False)

    query = Query.query.filter_by(discourseme_id=discourseme.id, corpus_id=corpus_id, cqp_query=cqp_query, nqr_name=subcorpus_name).order_by(
        Query.id.desc()
    ).first()

    if not query:

        current_app.logger.debug("get_or_create_matches :: querying corpus")
        query = Query(discourseme_id=discourseme.id, corpus_id=corpus_id, cqp_query=cqp_query, nqr_name=subcorpus_name)
        db.session.add(query)
        db.session.commit()

        matches = corpus.query(cqp_query=cqp_query, context_break=context_break)
        matches_df = matches.df.reset_index()[['match', 'matchend']]
        matches_df['query_id'] = query.id

        current_app.logger.debug(f"get_or_create_matches :: saving {len(matches_df)} matches from database")
        # doesn't work, but why?
        # matches_lines = matches_df.apply(lambda row: Matches(**row), axis=1)
        matches_lines = list()
        for m in matches_df.to_dict(orient='records'):
            matches_lines.append(Matches(**m))
        db.session.add_all(matches_lines)
        db.session.commit()

        matches_df = matches_df.drop('query_id', axis=1).set_index(['match', 'matchend'])

    elif return_df:
        current_app.logger.debug("get_or_create_matches :: getting matches from database")
        matches_df = DataFrame([vars(s) for s in query.matches], columns=['match', 'matchend']).set_index(['match', 'matchend'])

    else:
        current_app.logger.debug("get_or_create_matches :: matches exist in database")
        matches_df = None

    return matches_df


def ccc_query(query):
    """get Matches for query

    """

    corpus = Corpus(query.corpus.cwb_id,
                    cqp_bin=current_app.config['CCC_CQP_BIN'],
                    registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                    data_dir=current_app.config['CCC_DATA_DIR'])
    result = corpus.query(query.cqp_query, match_strategy=query.match_strategy)

    if result is None:
        raise ValueError()

    matches = result.df.drop(['context', 'contextend'], axis=1)
    matches['query_id'] = query.id

    current_app.logger.debug(f'ccc_query :: saving {len(result)} matches to database')
    for m in matches.reset_index().to_dict(orient='records'):
        db.session.add(Matches(**m))
    db.session.commit()

    return matches


class QueryIn(Schema):

    discourseme_id = Integer()
    corpus_id = Integer()
    match_strategy = String()
    cqp_query = String()


class QueryOut(Schema):

    id = Integer()
    discourseme_id = Integer()
    corpus_id = Integer()
    match_strategy = String()
    cqp_query = String()
    cqp_id = String()


@bp.post('/')
@bp.input(QueryIn)
@bp.output(QueryOut)
@bp.auth_required(auth)
def create(data):
    """Create new query.

    """
    query = Query(**request.json)
    db.session.add(query)
    db.session.commit()

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
