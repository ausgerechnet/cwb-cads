#!/usr/bin/python3
# -*- coding: utf-8 -*-

from random import randint

from apiflask import APIBlueprint, Schema, abort
from apiflask.fields import Boolean, Float, Integer, List, String
from apiflask.validators import OneOf
from ccc.collocates import dump2cooc
from ccc.utils import format_cqp_query
from flask import current_app
from pandas import DataFrame, read_sql

from . import db
from .breakdown import BreakdownIn, BreakdownOut, ccc_breakdown
from .collocation import CollocationIn, CollocationOut, get_or_create_counts
from .concordance import (ConcordanceIn, ConcordanceLineIn, ConcordanceLineOut,
                          ConcordanceOut, ccc_concordance)
from .corpus import get_meta_frequencies, get_meta_number_tokens
from .database import (Breakdown, Collocation, Corpus, Cotext, CotextLines,
                       Matches, Query, get_or_create)
from .semantic_map import ccc_semmap_init
from .users import auth

bp = APIBlueprint('query', __name__, url_prefix='/query')


def ccc_query(query, return_df=True):
    """get or create matches of this query

    """

    current_app.logger.debug(f'ccc_query :: query {query.id} in corpus {query.corpus.cwb_id}')

    if query.zero_matches or query.error:
        current_app.logger.debug("ccc_query :: query has zero matches")
        return DataFrame()

    matches = Matches.query.filter_by(query_id=query.id)

    if not matches.first():

        if query.subcorpus:
            corpus = query.subcorpus.ccc()
        else:
            corpus = query.corpus.ccc()

        # query corpus
        current_app.logger.debug('ccc_query :: querying')
        matches = corpus.query(cqp_query=query.cqp_query,
                               context_break=query.s,
                               match_strategy=query.match_strategy,
                               propagate_error=True)

        if isinstance(matches, str):  # error
            current_app.logger.error(f"ccc_query :: error: '{matches}'")
            query.error = True
            db.session.commit()
            return DataFrame()

        if len(matches.df) == 0:  # no matches
            current_app.logger.debug("0 matches")
            query.zero_matches = True
            db.session.commit()
            return DataFrame()

        # update name
        query.nqr_cqp = matches.subcorpus_name

        # save matches
        matches_df = matches.df.reset_index()[['match', 'matchend', 'contextid']]
        matches_df['contextid'] = matches_df['contextid'].astype(int)
        matches_df['query_id'] = query.id
        current_app.logger.debug(f"ccc_query :: saving {len(matches_df)} lines to database")
        matches_df.to_sql('matches', con=db.engine, if_exists='append', index=False)
        db.session.commit()
        current_app.logger.debug("ccc_query :: saved to database")

        matches_df = matches_df.drop('query_id', axis=1).set_index(['match', 'matchend'])

    elif return_df:
        current_app.logger.debug("ccc_query :: getting matches from database")
        matches_df = DataFrame([vars(s) for s in query.matches], columns=['match', 'matchend', 'contextid']).set_index(['match', 'matchend'])
        current_app.logger.debug(f"ccc_query :: got {len(matches_df)} matches from database")
    else:
        current_app.logger.debug("ccc_query :: matches exist in database")
        return

    return matches_df


def get_or_create_query_item(corpus, item, p, s, escape=True, match_strategy='longest'):
    """get or create query for item in corpus

    """

    # TODO run only on subcorpus?
    current_app.logger.debug(f'get_or_create_query :: item "{item}" in corpus "{corpus.cwb_id}"')

    # try to retrieve
    cqp_query = format_cqp_query([item], p_query=p, s_query=s, escape=escape)
    query = Query.query.filter_by(
        corpus_id=corpus.id,
        cqp_query=cqp_query,
        s=s,
        match_strategy=match_strategy
    ).first()

    # create query
    if not query:
        current_app.logger.debug('get_or_create_query :: querying')
        query = Query(
            corpus_id=corpus.id,
            cqp_query=cqp_query,
            s=s,
            match_strategy=match_strategy
        )
        db.session.add(query)
        db.session.commit()
        ccc_query(query, return_df=False)

    return query


def get_or_create_cotext(query, window, context_break, return_df=False):

    cotext = Cotext.query.filter(
        Cotext.query_id == query.id,
        Cotext.context >= window,
        Cotext.context_break == context_break
    ).first()

    if not cotext:

        matches_df = ccc_query(query)

        current_app.logger.debug("get_or_create_cotext :: creating from scratch")
        cotext = Cotext(query_id=query.id, context=window, context_break=context_break)
        db.session.add(cotext)
        db.session.commit()

        corpus = query.corpus.ccc()

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


def filter_matches(focus_query, filter_queries, window, overlap):
    """Filter matches of focus query matches according to presence of filter queries in window (and focus_query.s)

    :param Query focus_query:
    :param dict(Query) filter_queries:
    :param int window:
    :param str overlap: one of 'match', 'matchend', 'partial', or 'full'
    """

    current_app.logger.debug("filter_matches :: enter")

    matches = Matches.query.filter_by(query_id=focus_query.id)
    matches_tmp = matches.all()
    relevant_match_pos = set([m.match for m in matches_tmp])

    # get relevant cotext lines
    current_app.logger.debug("filter_matches :: getting cotext")
    cotext = get_or_create_cotext(focus_query, window, focus_query.s)
    current_app.logger.debug("filter_matches :: filtering cotext")
    cotext_lines = CotextLines.query.filter(CotextLines.cotext_id == cotext.id,
                                            CotextLines.offset <= window,
                                            CotextLines.offset >= -window)
    for key, fq in filter_queries.items():
        current_app.logger.debug(f"filter_matches :: filtering cotext: {key}")

        current_app.logger.debug("filter_matches :: filtering cotext: matches")
        cotext_lines_match = cotext_lines.join(
            Matches,
            (Matches.query_id == fq.id) &
            (Matches.match == CotextLines.cpos)
        )
        matches_in_cotext = set([c.match_pos for c in cotext_lines_match])
        current_app.logger.debug("filter_matches :: filtering cotext: matchends")
        cotext_lines_matchend = cotext_lines.join(
            Matches,
            (Matches.query_id == fq.id) &
            (Matches.matchend == CotextLines.cpos)
        )
        matchends_in_cotext = set([c.match_pos for c in cotext_lines_matchend])

        current_app.logger.debug(f"filter_matches :: filtering cotext: overlap mode: {overlap}")
        if overlap == 'partial':
            relevant_match_pos = relevant_match_pos.intersection(matches_in_cotext.union(matchends_in_cotext))
        elif overlap == 'full':
            # TODO: this does not work perfectly, since it does not take into account that
            # match and matchend could stem from different filter query matches
            relevant_match_pos = relevant_match_pos.intersection(matches_in_cotext.intersection(matchends_in_cotext))
        elif overlap == 'match':
            relevant_match_pos = relevant_match_pos.intersection(matches_in_cotext)
        elif overlap == 'matchend':
            relevant_match_pos = relevant_match_pos.intersection(matchends_in_cotext)
        else:
            raise ValueError("filter_matches :: filtering cotext: overlap must be one of 'match', 'matchend', 'partial', or 'full'")

        if len(relevant_match_pos) == 0:
            current_app.logger.error(f"filter_matches :: filtering cotext: no lines left after filtering for query {fq.cqp_query}")
            return

    current_app.logger.debug("filter_matches :: filtering matches")
    matches = Matches.query.filter(
        Matches.query_id == focus_query.id,
        Matches.match.in_(relevant_match_pos)
    )

    current_app.logger.debug("filter_matches :: exit")

    return matches


def iterative_query(focus_query, filter_queries, window, overlap='partial'):
    """Create a new query (and corresponding matches) based on filtered matches of focus query. Retrieve if already exists.

    TODO include in ccc_query
    """

    filter_sequence = "S" + str(focus_query.s) + "W" + str(window) + "O" + overlap + \
        "Q-" + "-".join([str(focus_query.id)] + [str(fq.id) for fq in filter_queries.values()])

    # get or create query
    query = Query.query.filter_by(
        corpus_id=focus_query.corpus.id,
        subcorpus_id=focus_query.subcorpus_id,
        filter_sequence=filter_sequence,
        match_strategy=focus_query.match_strategy,
        s=focus_query.s,
        cqp_query=focus_query.cqp_query
    ).first()

    if not query:
        query = Query(
            corpus_id=focus_query.corpus.id,
            subcorpus_id=focus_query.subcorpus_id,
            filter_sequence=filter_sequence,
            match_strategy=focus_query.match_strategy,
            s=focus_query.s,
            cqp_query=focus_query.cqp_query
        )
        db.session.add(query)
        db.session.commit()

    # get or create matches
    matches = Matches.query.filter_by(
        query_id=query.id
    ).first()

    if not matches:
        # create matches
        matches = filter_matches(focus_query, filter_queries, window, overlap)
        df_matches = read_sql(matches.statement, con=db.engine)[['contextid', 'match', 'matchend']]
        df_matches['query_id'] = query.id
        df_matches.to_sql('matches', con=db.engine, if_exists='append', index=False)

    return query


################
# API schemata #
################

# INPUT
class QueryIn(Schema):

    corpus_id = Integer(required=True)
    subcorpus_id = Integer(required=False, metadata={'nullable': True})

    match_strategy = String(dump_default='longest', required=False, validate=OneOf(['longest', 'shortest', 'standard']))

    cqp_query = String(required=True)

    s = String(required=False)


class QueryAssistedIn(Schema):

    corpus_id = Integer(required=True)
    subcorpus_id = Integer(required=False, metadata={'nullable': True})

    match_strategy = String(dump_default='longest', required=False, validate=OneOf(['longest', 'shortest', 'standard']))

    items = List(String, required=True)
    p = String(required=True)

    ignore_case = Boolean(required=False, dump_default=True)
    ignore_diacritics = Boolean(required=False, dump_default=True)
    escape = Boolean(required=False, dump_default=True)

    s = String(required=False)


class QueryMetaIn(Schema):

    level = String(required=True)
    key = String(required=True)
    p = String(required=False, load_default='word')


# OUTPUT
class QueryOut(Schema):

    id = Integer(required=True)
    corpus_id = Integer(required=True)
    corpus_name = String(required=True)
    subcorpus_id = Integer(required=True, dump_default=None, metadata={'nullable': True})
    subcorpus_name = String(required=True, dump_default=None, metadata={'nullable': True})
    match_strategy = String(required=True)
    cqp_query = String(required=True)
    random_seed = Integer(required=True)
    number_matches = Integer(required=True)


class QueryMetaOut(Schema):

    item = String(required=True)
    value = String(required=True)
    frequency = Integer(required=True)
    nr_tokens = Integer(required=True)
    nr_texts = Integer(required=True)
    ipm = Float(required=True)


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

    corpus = db.get_or_404(Corpus, json_data['corpus_id'])
    json_data['s'] = json_data.get('s', corpus.s_default)

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

    corpus = db.get_or_404(Corpus, json_data['corpus_id'])
    json_data['s'] = json_data.get('s', corpus.s_default)

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


# TODO!
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


# @bp.post('/<id>/execute')
# @bp.output(QueryOut)
# @bp.auth_required(auth)
# def execute(id):
#     """Execute query: create matches.

#     """

#     query = db.get_or_404(Query, id)
#     ccc_query(query)

#     return QueryOut().dump(query), 200


#####################
# QUERY/CONCORDANCE #
#####################
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
    context_break = query_data.get('context_break')
    extended_context_break = query_data.get('extended_context_break')

    # pagination
    page_size = query_data.get('page_size')
    page_number = query_data.get('page_number')

    # sorting
    sort_order = query_data.get('sort_order')
    sort_by_p_att = query_data.get('sort_by_p_att')
    sort_by_s_att = query_data.get('sort_by_s_att')
    sort_by_offset = query_data.get('sort_by_offset')

    # filtering
    filter_item = query_data.get('filter_item')
    filter_item_p_att = query_data.get('filter_item_p_att')
    filter_query_ids = query_data.get('filter_query_ids')

    # highlighting
    highlight_query_ids = query_data.get('highlight_query_ids')

    # prepare filter queries
    filter_queries = {query_id: db.get_or_404(Query, query_id) for query_id in filter_query_ids}
    if filter_item:
        fq = get_or_create_query_item(corpus, filter_item, filter_item_p_att, query.s)
        filter_queries['_FILTER'] = fq

    # prepare highlight queries
    highlight_queries = {query_id: db.get_or_404(Query, query_id) for query_id in highlight_query_ids}

    # attributes to show
    p_show = [primary, secondary]
    s_show = query.corpus.s_annotations

    concordance = ccc_concordance(query,
                                  p_show, s_show,
                                  window, context_break,
                                  extended_window, extended_context_break,
                                  highlight_queries=highlight_queries,
                                  match_id=None,
                                  filter_queries=filter_queries, overlap='partial',
                                  page_number=page_number, page_size=page_size,
                                  sort_order=sort_order,
                                  sort_by_offset=sort_by_offset, sort_by_p_att=sort_by_p_att, sort_by_s_att=sort_by_s_att)

    return ConcordanceOut().dump(concordance), 200


@bp.post("/<query_id>/concordance/shuffle")
@bp.auth_required(auth)
@bp.output(QueryOut)
def concordance_shuffle(query_id):
    """Shuffle concordance lines. Changes the 'random' sort order that query matches will be displayed in.

    """
    query = db.get_or_404(Query, query_id)
    query.random_seed = randint(1, 10000)
    db.session.commit()

    return QueryOut().dump(query), 200


@bp.get("/<query_id>/concordance/<match_id>")
@bp.input(ConcordanceLineIn, location='query')
@bp.output(ConcordanceLineOut)
@bp.auth_required(auth)
def concordance_line(query_id, match_id, query_data):
    """Get (additional context of) one concordance line.

    """

    query = db.get_or_404(Query, query_id)

    # display options
    window = query_data.get('window')
    context_break = query_data.get('context_break')
    extended_window = query_data.get('extended_window')
    extended_context_break = query_data.get('extended_context_break', query.corpus.s_default)
    primary = query_data.get('primary')
    secondary = query_data.get('secondary')

    # highlighting
    highlight_query_ids = query_data.get('highlight_query_ids')

    # prepare highlight queries
    highlight_queries = {query_id: db.get_or_404(Query, query_id) for query_id in highlight_query_ids}

    # attributes to show
    p_show = [primary, secondary]
    s_show = query.corpus.s_annotations

    concordance = ccc_concordance(query,
                                  p_show, s_show,
                                  window, context_break,
                                  extended_window, extended_context_break,
                                  highlight_queries,
                                  match_id)

    return ConcordanceLineOut().dump(concordance['lines'][0]), 200


###################
# QUERY/BREAKDOWN #
###################
@bp.get("/<query_id>/breakdown")
@bp.input(BreakdownIn, location='query')
@bp.output(BreakdownOut)
@bp.auth_required(auth)
def get_breakdown(query_id, query_data):
    """Get breakdown of query. Will create if it doesn't exist.

    """

    query = db.get_or_404(Query, query_id)
    p = query_data.get('p')
    if p not in query.corpus.p_atts:
        msg = f'p-attribute "{p}" does not exist in corpus "{query.corpus.cwb_id}"'
        current_app.logger.error(msg)
        abort(404, msg)

    breakdown = get_or_create(Breakdown, query_id=query_id, p=p)
    ccc_breakdown(breakdown)

    return BreakdownOut().dump(breakdown), 200


##############
# QUERY/META #
##############
@bp.get("/<query_id>/meta")
@bp.input(QueryMetaIn, location='query')
@bp.output(QueryMetaOut(many=True))
@bp.auth_required(auth)
def get_meta(query_id, query_data):
    """Get meta distribution of query.

    """

    query = db.get_or_404(Query, query_id)
    level = query_data.get('level')
    key = query_data.get('key')
    p = query_data.get('p', 'word')

    matches_df = ccc_query(query, return_df=True)
    crps = query.corpus.ccc().subcorpus(df_dump=matches_df, overwrite=False)
    df_meta = crps.concordance(p_show=[p], s_show=[f'{level}_{key}'], cut_off=None)[[p, f'{level}_{key}']].value_counts().reset_index()
    df_meta.columns = ['item', 'value', 'frequency']

    df_texts = DataFrame.from_records(get_meta_frequencies(query.corpus, level, key))
    df_texts.columns = ['value', 'nr_texts']

    df_tokens = DataFrame.from_records(get_meta_number_tokens(query.corpus, level, key))
    df_tokens.columns = ['value', 'nr_tokens']

    df_meta = df_meta.set_index('value').\
        join(df_texts.set_index('value'), how='outer').\
        join(df_tokens.set_index('value'), how='outer').\
        fillna(0, downcast='infer').sort_values(by='frequency', ascending=False)

    df_meta['ipm'] = round(df_meta['frequency'] / df_meta['nr_tokens'] * 10 ** 6, 6)

    meta = df_meta.reset_index().to_dict(orient='records')

    return [QueryMetaOut().dump(m) for m in meta], 200


#####################
# QUERY/COLLOCATION #
#####################
@bp.get("/<query_id>/collocation")
@bp.input(CollocationIn, location='query')
@bp.output(CollocationOut)
@bp.auth_required(auth)
def get_collocation(query_id, query_data):
    """Get collocation of query. Will create if doesn't exist.

    """

    query = db.get_or_404(Query, query_id)

    p = query_data.get('p')
    window = query_data.get('window')
    s_break = query_data.get('s_break')
    marginals = query_data.get('marginals', 'global')

    # semantic map
    semantic_map_id = query_data.get('semantic_map_id', None)
    semantic_map_init = query_data.get('semantic_map_init', True)

    # filtering
    filter_item = query_data.pop('filter_item', None)
    filter_item_p_att = query_data.pop('filter_item_p_att', None)
    filter_overlap = query_data.pop('filter_overlap', 'partial')
    filter_queries = dict()
    if filter_item:
        filter_queries['_FILTER'] = get_or_create_query_item(query.corpus, filter_item, filter_item_p_att, query.s)
    if len(filter_queries) > 0:
        query = iterative_query(query, filter_queries, window, filter_overlap)

    collocation = Collocation(
        query_id=query.id,
        p=p,
        s_break=s_break,
        window=window,
        marginals=marginals
    )
    db.session.add(collocation)
    db.session.commit()

    get_or_create_counts(collocation, remove_focus_cpos=True)

    if semantic_map_init:
        ccc_semmap_init(collocation, semantic_map_id)

    return CollocationOut().dump(collocation), 200
