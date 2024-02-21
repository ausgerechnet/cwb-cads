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


def get_or_create_query(corpus, discourseme, context_break=None, p_query=None, match_strategy='longest', subcorpus_id=None, cqp_query=None):
    """

    """
    current_app.logger.debug(f"get_or_create_query :: discourseme {discourseme.name} on corpus {corpus.cwb_id} (subcorpus: {subcorpus_id})")

    if not cqp_query:
        items = discourseme.get_items()
        cqp_query = format_cqp_query(items, p_query, context_break, escape=False)

    query = Query.query.filter_by(discourseme_id=discourseme.id, corpus_id=corpus.id, cqp_query=cqp_query,
                                  subcorpus_id=subcorpus_id, match_strategy=match_strategy).order_by(Query.id.desc()).first()

    if query.subcorpus:
        current_app.logger.debug(f"get_or_create_query :: subcorpus {query.subcorpus.name}")

    if not query:
        query = Query(discourseme_id=discourseme.id, corpus_id=corpus.id, cqp_query=cqp_query, subcorpus_id=subcorpus_id, match_strategy=match_strategy)
        db.session.add(query)
        db.session.commit()

    return query


def ccc_query(query, return_df=True, p_breakdown=None):
    """create or get matches of this query

    """

    matches = query.matches

    if len(matches) == 0:

        current_app.logger.debug(f'ccc_query :: querying corpus {query.corpus.cwb_id}')
        if query.subcorpus:
            current_app.logger.debug(f'ccc_query :: subcorpus {query.subcorpus.name}')
        corpus = Corpus(query.corpus.cwb_id,
                        cqp_bin=current_app.config['CCC_CQP_BIN'],
                        registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                        data_dir=current_app.config['CCC_DATA_DIR'])
        if query.subcorpus_id:
            if query.subcorpus.nqr_cqp not in corpus.show_nqr()['subcorpus'].values:
                raise NotImplementedError('dynamic subcorpus creation not implemented')
            corpus = corpus.subcorpus(query.subcorpus.cqr_cqps)

        matches = corpus.query(cqp_query=query.cqp_query, match_strategy=query.match_strategy, propagate_error=True)
        if isinstance(matches, str):
            current_app.logger.error(f"{matches}")
            db.session.delete(query)
            db.session.commit()
            return matches
        query.nqr_cqp = matches.subcorpus_name
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

    discourseme_id = Integer(required=False, metadata={'nullable': True})
    corpus_id = Integer(required=True)
    subcorpus_id = Integer(required=False)

    match_strategy = String(dump_default='longest', required=False, validate=OneOf(['longest', 'shortest', 'standard']))

    cqp_query = String(required=True)

    s = String(required=True)


class QueryAssistedIn(Schema):

    discourseme_id = Integer(required=False, metadata={'nullable': True})
    corpus_id = Integer(required=True)
    subcorpus_id = Integer(required=False)

    match_strategy = String(dump_default='longest', required=False, validate=OneOf(['longest', 'shortest', 'standard']))

    items = List(String, required=True)
    p = String(required=True)
    ignore_case = Boolean(dump_default=True, required=False)
    ignore_diacritics = Boolean(dump_default=True, required=False)
    escape = Boolean(dump_default=True, required=False)

    s = String(required=True)


class QueryOut(Schema):

    id = Integer()
    discourseme_id = Integer(metadata={'nullable': True})
    corpus = Nested(CorpusOut)
    subcorpus_id = Integer(required=False)
    match_strategy = String()
    cqp_query = String()
    nqr_cqp = String()
    subcorpus = String(metadata={'nullable': True})


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
        ret = ccc_query(query)
        if isinstance(ret, str):  # CQP error
            from apiflask import abort
            return abort(400, ret)

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
        ret = ccc_query(query)
        if isinstance(ret, str):  # CQP error
            from apiflask import abort
            return abort(409, ret)

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


@bp.patch('/<id>')
@bp.input(QueryIn(partial=True))
@bp.output(QueryOut)
@bp.auth_required(auth)
def patch_query(id, data):

    # TODO: delete matches
    # TODO: queries belong to users

    # user_id = auth.current_user.id

    query = db.get_or_404(Query, id)

    # if query.user_id != user_id:
    #     return abort(409, 'query does not belong to user')

    for attr, value in data.items():
        setattr(query, attr, value)

    db.session.commit()

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
