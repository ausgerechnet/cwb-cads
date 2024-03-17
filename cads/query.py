#!/usr/bin/python3
# -*- coding: utf-8 -*-

from random import randint

from apiflask import APIBlueprint, Schema, abort
from apiflask.fields import Boolean, Integer, List, Nested, String
from apiflask.validators import OneOf
from ccc import Corpus
from ccc.collocates import dump2cooc
from ccc.utils import format_cqp_query
from flask import current_app
from pandas import DataFrame

from . import db
from .concordance import (ConcordanceIn, ConcordanceLineIn, ConcordanceLineOut,
                          ConcordanceOut, ccc_concordance)
from .corpus import CorpusOut
from .database import Cotext, Discourseme, Matches, Query
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

    if not query:
        query = Query(discourseme_id=discourseme.id, corpus_id=corpus.id, cqp_query=cqp_query, subcorpus_id=subcorpus_id, match_strategy=match_strategy)
        db.session.add(query)
        db.session.commit()

    if query.subcorpus:
        current_app.logger.debug(f"get_or_create_query :: subcorpus {query.subcorpus.name}")

    return query


def query_item(item, p, s, corpus, escape=True):

    # TODO run only on subcorpus
    current_app.logger.debug(f'query_item :: querying corpus "{corpus.cwb_id}" for item "{item}"')
    cqp_query = format_cqp_query([item], p_query=p, escape=escape)

    # try to retrieve
    query = Query.query.filter_by(
        corpus_id=corpus.id,
        cqp_query=cqp_query,
        s=s
    ).first()

    if not query:
        query = Query(
            corpus_id=corpus.id,
            cqp_query=cqp_query,
            s=s
        )
        db.session.add(query)
        db.session.commit()

    # make sure there's matches
    ccc_query(query, return_df=False)

    return query


def query_discourseme(discourseme, corpus):
    """create a discourseme query with standard settings

    """

    # try to retrieve query in corpus
    q = [q for q in discourseme.queries if q.corpus_id == corpus.id]
    if len(q) == 1:
        query = q[0]

    # create query
    elif len(q) == 0:

        # create template if necessary
        if len(discourseme.template) == 0:
            discourseme.generate_template()

        s = corpus.s_atts[0]           # TODO better default
        p = discourseme.template[0].p  # TODO check with p-atts of corpus
        match_strategy = 'longest'

        items = [i.surface for i in discourseme.template]
        cqp_query = format_cqp_query(items, p_query=p, s_query=s, escape=False)

        query = Query(
            discourseme_id=discourseme.id,
            corpus_id=corpus.id,
            cqp_query=cqp_query,
            s=s,
            match_strategy=match_strategy
        )
        db.session.add(query)
        db.session.commit()
        ccc_query(query)

    else:                   # does not happen due to unique constraint
        raise NotImplementedError(f'several queries for discourseme "{discourseme.name}" in corpus "{corpus.name}"')

    return query


def ccc_query(query, return_df=True, p_breakdown=None):
    """create or get matches of this query

    """

    current_app.logger.debug(f'ccc_query :: query {query.id} in corpus {query.corpus.cwb_id}')

    matches = Matches.query.filter_by(query_id=query.id)

    if not matches.first():

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

        matches = corpus.query(cqp_query=query.cqp_query, context_break=query.s, match_strategy=query.match_strategy, propagate_error=True)
        if isinstance(matches, str):
            current_app.logger.error(f"{matches}")
            db.session.delete(query)
            db.session.commit()
            return matches
        if len(matches.df) == 0:
            current_app.logger.debug("0 matches")
            return None
        query.nqr_cqp = matches.subcorpus_name
        df_matches = matches.df.reset_index()[['match', 'matchend', 'contextid']]
        df_matches['contextid'] = df_matches['contextid'].astype(int)
        df_matches['query_id'] = query.id

        current_app.logger.debug(f"ccc_query :: saving {len(df_matches)} lines to database")
        df_matches.to_sql('matches', con=db.engine, if_exists='append', index=False)
        db.session.commit()
        current_app.logger.debug("ccc_query :: saved to database")

        matches_df = df_matches.drop('query_id', axis=1).set_index(['match', 'matchend'])

    elif return_df:
        current_app.logger.debug("ccc_query :: getting matches from database")
        matches_df = DataFrame([vars(s) for s in query.matches], columns=['match', 'matchend']).set_index(['match', 'matchend'])
        current_app.logger.debug(f"ccc_query :: got {len(matches_df)} matches from database")

    else:
        current_app.logger.debug("ccc_query :: matches already exist in database")
        matches_df = None

    # if matches_df and p_breakdown:
    #     breakdowns = Breakdown.query.filter_by(query_id=query.id, p=p_breakdown).all()
    #     if len(breakdowns) == 0:
    #         breakdown = Breakdown(query_id=query.id, p=p_breakdown)
    #         db.session.add(breakdown)
    #         db.session.commit()
    #         if not matches:

    return matches_df


def get_or_create_cotext(query, window, context_break, return_df=False):

    # TODO: dump2cooc() drops duplicates, but these are needed for accurately filtering concordance lines!

    matches_df = ccc_query(query)
    cotext = Cotext.query.filter(
        Cotext.query_id == query.id,
        Cotext.context >= window,
        Cotext.context_break == context_break
    ).first()

    if not cotext:

        current_app.logger.debug("get_or_create_cotext :: creating from scratch")
        cotext = Cotext(query_id=query.id, context=window, context_break=context_break)
        db.session.add(cotext)
        db.session.commit()

        corpus = Corpus(corpus_name=query.corpus.cwb_id,
                        lib_dir=None,
                        cqp_bin=current_app.config['CCC_CQP_BIN'],
                        registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                        data_dir=current_app.config['CCC_DATA_DIR'])

        subcorpus_context = corpus.subcorpus(
            subcorpus_name=None,
            df_dump=matches_df,
            overwrite=False
        ).set_context(
            window,
            context_break,
            overwrite=False
        )

        current_app.logger.debug("get_or_create_cotext :: .. dump2cooc")
        df_cooc = dump2cooc(subcorpus_context.df, rm_nodes=False, drop_duplicates=False)
        df_cooc = df_cooc.rename({'match': 'match_pos'}, axis=1).reset_index(drop=True)
        df_cooc['cotext_id'] = cotext.id

        current_app.logger.debug(f"get_or_create_cotext :: .. saving {len(df_cooc)} lines to database")
        df_cooc.to_sql("cotext_lines", con=db.engine, if_exists='append', index=False)
        db.session.commit()
        current_app.logger.debug("get_or_create_cotext :: .. saved to database")

        # if return_df:
        #     df_cooc = df_cooc.loc[abs(df_cooc['offset']) <= window]
        #     df_cooc = df_cooc[['cotext_id', 'match_pos', 'cpos', 'offset']]
        #     return df_cooc

    else:
        current_app.logger.debug("get_or_create_cotext :: cotext already exists")
        # if return_df:
        #     current_app.logger.debug("get_or_create_cotext :: getting cooc-table from database")
        #     sql_query = CotextLines.query.filter(CotextLines.cotext_id == cotext.id,
        #                                          CotextLines.offset <= window,
        #                                          CotextLines.offset >= -window)
        #     df_cooc = read_sql(sql_query.statement, con=db.engine, index_col='id').reset_index(drop=True)
        #     current_app.logger.debug(f"get_or_create_cotext :: got {len(df_cooc)} lines from database")
        #     return df_cooc

    return cotext


################
# API schemata #
################
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


#################
# API endpoints #
#################
@bp.post('/')
@bp.input(QueryIn)
@bp.input({'execute': Boolean(load_default=True)}, location='query')
@bp.output(QueryOut)
@bp.auth_required(auth)
def create(json_data, query_data):
    """Create new query.

    """

    query = Query(**json_data)
    db.session.add(query)
    db.session.commit()

    if query_data['execute']:
        ret = ccc_query(query)
        if isinstance(ret, str):  # CQP error
            return abort(400, ret)

    return QueryOut().dump(query), 200


@bp.post('/assisted/')
@bp.input(QueryAssistedIn)
@bp.input({'execute': Boolean(load_default=True)}, location='query')
@bp.output(QueryOut)
@bp.auth_required(auth)
def create_assisted(json_data, query_data):
    """Create new query in assisted mode.

    """

    items = json_data.pop('items')
    p = json_data.pop('p')
    escape = json_data.pop('escape', json_data.get('escape'))
    ignore_diacritics = json_data.pop('ignore_diacritics', json_data.get('ignore_diacritics'))
    ignore_case = json_data.pop('ignore_case', json_data.get('ignore_case'))
    flags = ''
    if ignore_case or ignore_diacritics:
        flags = '%'
        if ignore_case:
            flags += 'c'
        if ignore_diacritics:
            flags += 'd'

    json_data['cqp_query'] = format_cqp_query(items, p_query=p, s_query=json_data['s'], flags=flags, escape=escape)

    query = Query(**json_data)
    db.session.add(query)
    db.session.commit()

    if query_data['execute']:
        ret = ccc_query(query)
        if isinstance(ret, str):  # CQP error
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
    """Get details of query.

    """

    query = db.get_or_404(Query, id)

    return QueryOut().dump(query), 200


# @bp.patch('/<id>')
# @bp.input(QueryIn(partial=True))
# @bp.output(QueryOut)
# @bp.auth_required(auth)
# def patch_query(id, data):

#     # TODO: delete matches
#     # TODO: queries belong to users

#     # user_id = auth.current_user.id

#     query = db.get_or_404(Query, id)

#     # if query.user_id != user_id:
#     #     return abort(409, 'query does not belong to user')

#     for attr, value in data.items():
#         setattr(query, attr, value)

#     db.session.commit()

#     return QueryOut().dump(query), 200


@bp.delete('/<id>')
@bp.auth_required(auth)
def delete_query(id):
    """Delete query.

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


@bp.get("/<query_id>/concordance")
@bp.input(ConcordanceIn, location='query')
@bp.output(ConcordanceOut)
@bp.auth_required(auth)
def concordance_lines(query_id, query_data):
    """Get concordance lines.

    """

    query = db.get_or_404(Query, query_id)
    corpus = query.corpus

    # display options
    window = query_data.get('window')
    primary = query_data.get('primary')
    secondary = query_data.get('secondary')
    extended_window = query_data.get('extended_window')

    # pagination
    page_size = query_data.get('page_size')
    page_number = query_data.get('page_number')

    # sorting
    sort_order = query_data.get('sort_order')
    sort_by = query_data.get('sort_by_p_att')
    sort_by_s_att = query_data.get('sort_by_s_att')
    sort_offset = query_data.get('sort_by_offset')

    # filtering
    filter_item = query_data.get('filter_item')
    filter_item_p_att = query_data.get('filter_item_p_att')
    filter_discourseme_ids = query_data.get('filter_discourseme_ids')

    # highlighting
    highlight_discourseme_ids = query_data.get('highlight_discourseme_ids')

    # prepare filter queries
    filter_queries = set()

    for discourseme_id in filter_discourseme_ids:
        fd = db.get_or_404(Discourseme, discourseme_id)
        fq = query_discourseme(fd, corpus)
        filter_queries.add(fq)

    if filter_item:
        fq = query_item(filter_item, filter_item_p_att, query.s, corpus)
        filter_queries.add(fq)

    # prepare highlight queries
    highlight_queries = set()

    for discourseme_id in highlight_discourseme_ids:
        hd = db.get_or_404(Discourseme, discourseme_id)
        hq = query_discourseme(hd, corpus)
        highlight_queries.add(hq)

    concordance = ccc_concordance(query,
                                  primary, secondary,
                                  window, extended_window,
                                  filter_queries=filter_queries, highlight_queries=highlight_queries,
                                  page_number=page_number, page_size=page_size,
                                  sort_by=sort_by, sort_offset=sort_offset, sort_order=sort_order, sort_by_s_att=sort_by_s_att)

    return ConcordanceOut().dump(concordance), 200


@bp.post("/<query_id>/concordance/shuffle")
@bp.auth_required(auth)
@bp.output({'query_id': Integer()})
def concordance_shuffle(query_id):
    """Shuffle concordance lines.

    """
    query = db.get_or_404(Query, query_id)
    query.random_seed = randint(1, 10000)
    db.session.commit()

    return {'query.id': query_id}, 200


@bp.get("/<query_id>/concordance/<match_id>")
@bp.input(ConcordanceLineIn, location='query')
@bp.output(ConcordanceLineOut)
@bp.auth_required(auth)
def concordance_line(query_id, match_id, query_data):
    """Get (additional context of) one concordance line.

    """

    query = db.get_or_404(Query, query_id)

    # display options
    extended_context_break = query_data.get('extended_context_break')
    extended_window = query_data.get('extended_window')
    window = query_data.get('window')
    primary = query_data.get('primary')
    secondary = query_data.get('secondary')

    concordance = ccc_concordance(query,
                                  primary, secondary,
                                  window, extended_window, context_break=extended_context_break,
                                  match_id=match_id)

    return ConcordanceLineOut().dump(concordance['lines'][0]), 200


# @bp.get("/<query_id>/breakdown")
# def get_breakdowns(query_id):
#     """Get breakdowns of query. Will create if it doesn't exist.

#     """

#     query = db.get_or_404(Query, query_id)
#     return [BreakdownOut().dump(breakdown) for breakdown in query.breakdowns], 200


# class CollocationIn(Schema):

#     p = String(required=True)
#     window = Integer(required=True)


# class CollocationOut(Schema):

#     id = Integer()
#     p = String()
#     s_break = String()
#     window = Integer()

#     sem_map_id = Integer()

#     _query = Nested(QueryOut)
#     constellation_id = Integer()


# @bp.get("/<query_id>/collocation")
# @bp.input(CollocationIn, location='query')
# @bp.output(CollocationOut)
# @bp.auth_required(auth)
# def collocation(query_id, data):
#     """Get collocation id

#     """
#     pass
