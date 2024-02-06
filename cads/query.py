#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Boolean, Integer, List, Nested, String
from apiflask.validators import OneOf
from ccc import Corpus
from ccc.utils import format_cqp_query
from flask import current_app
from pandas import DataFrame

from . import db
from .corpus import CorpusOut
from .database import Query
from .users import auth

bp = APIBlueprint('query', __name__, url_prefix='/query')


def get_or_create_query(corpus, discourseme, context_break=None, p_query=None, match_strategy='longest', subcorpus_name=None, cqp_query=None):
    """

    """

    current_app.logger.debug(f"get_or_create_query :: discourseme {discourseme.name} on corpus {corpus.cwb_id} (subcorpus: {subcorpus_name})")
    if not cqp_query:
        cqp_query = format_cqp_query(discourseme.get_items(), p_query, context_break, escape=False)
    query = Query.query.filter_by(discourseme_id=discourseme.id, corpus_id=corpus.id, cqp_query=cqp_query,
                                  nqr_name=subcorpus_name, match_strategy=match_strategy).order_by(Query.id.desc()).first()

    if not query:
        query = Query(discourseme_id=discourseme.id, corpus_id=corpus.id, cqp_query=cqp_query, nqr_name=subcorpus_name, match_strategy=match_strategy)
        db.session.add(query)
        db.session.commit()

    return query


def ccc_query(query, return_df=True, p_breakdown=None):
    """create or get matches of this query

    """

    matches = query.matches

    if len(matches) == 0:

        current_app.logger.debug(f'ccc_query :: querying corpus {query.corpus.cwb_id} (subcorpus: {query.nqr_name})')
        corpus = Corpus(query.corpus.cwb_id,
                        cqp_bin=current_app.config['CCC_CQP_BIN'],
                        registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                        data_dir=current_app.config['CCC_DATA_DIR'])
        if query.nqr_name:
            if query.nqr_name not in corpus.show_nqr()['subcorpus'].values:
                raise NotImplementedError('dynamic subcorpus creation not implemented')
            corpus = corpus.subcorpus(query.nqr_name)

        matches = corpus.query(cqp_query=query.cqp_query, match_strategy=query.match_strategy, propagate_error=True)
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

    # if matches_df and p_breakdown:
    #     breakdowns = Breakdown.query.filter_by(query_id=query.id, p=p_breakdown).all()
    #     if len(breakdowns) == 0:
    #         breakdown = Breakdown(query_id=query.id, p=p_breakdown)
    #         db.session.add(breakdown)
    #         db.session.commit()
    #         if not matches:

    return matches_df


class QueryIn(Schema):

    discourseme_id = Integer(required=False, nullable=True)
    corpus_id = Integer()
    match_strategy = String(required=False, validate=OneOf(['longest', 'shortest', 'standard']), default='longest')
    cqp_query = String()
    nqr_name = String(required=False, nullable=True)
    s = String()


class QueryAssistedIn(Schema):

    discourseme_id = Integer(required=False, nullable=True)
    corpus_id = Integer()
    match_strategy = String(required=False, validate=OneOf(['longest', 'shortest', 'standard']), default='longest')
    nqr_name = String(required=False, nullable=True)
    items = List(String)
    p = String()
    s = String()
    ignore_case = Boolean(required=False, default=True)
    ignore_diacritics = Boolean(required=False, default=True)
    escape = Boolean(required=False, default=True)


class QueryOut(Schema):

    id = Integer()
    discourseme_id = Integer(nullable=True)
    corpus = Nested(CorpusOut)
    match_strategy = String()
    cqp_query = String()
    cqp_nqr_matches = String()
    nqr_name = String(nullable=True)
    subcorpus = String(nullable=True)


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


@bp.post('/assisted/')
@bp.input(QueryAssistedIn)
@bp.input({'execute': Boolean(load_default=True)}, location='query')
@bp.output(QueryOut)
@bp.auth_required(auth)
def create_assisted(data, data_query):
    """Create new query in assisted mode.

    """

    items = data.pop('items')
    p = data.pop('p')
    escape = data.pop('escape')
    ignore_diacritics = data.pop('ignore_diacritics')
    ignore_case = data.pop('ignore_case')
    flags = ''
    if ignore_case or ignore_diacritics:
        flags = '%'
        if ignore_case:
            flags += 'c'
        if ignore_diacritics:
            flags += 'd'

    data['cqp_query'] = format_cqp_query(items, p_query=p, s_query=data['s'], flags=flags, escape=escape)

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
