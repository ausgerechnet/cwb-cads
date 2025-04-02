#!/usr/bin/python3
# -*- coding: utf-8 -*-

from random import randint

from apiflask import APIBlueprint, Schema, abort
from apiflask.fields import (Boolean, Float, Integer, List, Nested, String,
                             Tuple)
from apiflask.validators import OneOf
from ccc.collocates import dump2cooc
from ccc.utils import format_cqp_query
from flask import current_app
from pandas import DataFrame, read_sql
from sqlalchemy.orm import aliased
from sqlalchemy.sql import exists

from . import db
from .breakdown import BreakdownIn, BreakdownOut, ccc_breakdown
from .collocation import CollocationIn, CollocationOut, get_or_create_counts
from .concordance import (ConcordanceIn, ConcordanceLineIn, ConcordanceLineOut,
                          ConcordanceOut, ccc_concordance)
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
            current_app.logger.debug("ccc_query :: 0 matches")
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

    current_app.logger.debug('ccc_query :: exit')

    return matches_df


def get_flags(ignore_case, ignore_diacritics):
    """translate boolean flags into one string (%cd)

    """
    flags = ''
    if ignore_case or ignore_diacritics:
        flags = '%'
        if ignore_case:
            flags += 'c'
        if ignore_diacritics:
            flags += 'd'
    return flags


def get_or_create_query_assisted(corpus_id, subcorpus_id, items, p, s,
                                 escape, ignore_case, ignore_diacritics,
                                 focus_query=None, execute=True):
    """

    """
    corpus = db.get_or_404(Corpus, corpus_id)
    s = corpus.s_default if s is None else s

    flags = get_flags(ignore_case, ignore_diacritics)
    cqp_query = format_cqp_query(items, p_query=p, s_query=s, flags=flags, escape=escape)

    current_app.logger.debug(f'get_or_create_query_assisted :: items "{items}" in corpus "{corpus.cwb_id}"')

    if focus_query:
        # TODO speed up for subcorpus queries on context of focus query
        # NB context of focus is not saved as subcorpus
        pass

    # TODO check reasonable filtering
    if subcorpus_id is None:
        query = Query.query.filter_by(
            corpus_id=corpus_id,
            cqp_query=cqp_query,
            # match_strategy=json_data.get('match_strategy'),
            # filter_sequence=None,  → filter properly
            s=s
        ).first()
    else:
        query = Query.query.filter_by(
            corpus_id=corpus_id,
            subcorpus_id=subcorpus_id,
            cqp_query=cqp_query,
            # match_strategy=json_data.get('match_strategy'),
            # filter_sequence=None,  → filter properly
            s=s
        ).first()

    if query is None:

        query = Query(
            corpus_id=corpus_id,
            subcorpus_id=subcorpus_id,
            cqp_query=cqp_query,
            s=s
        )
        db.session.add(query)
        db.session.commit()

        if execute:
            current_app.logger.debug('get_or_create_query_assisted :: querying')
            ret = ccc_query(query)
            if isinstance(ret, str):  # CQP error
                return ret

    current_app.logger.debug('get_or_create_query_assisted :: exit')

    return query


def iterative_query(focus_query, filter_queries, window, overlap='partial'):
    """Create a new query (and corresponding matches) based on filtered matches of focus query.
    Retrieve if already exists.

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
        if matches is None:
            return
        df_matches = read_sql(matches.statement, con=db.engine)[['contextid', 'match', 'matchend']]
        df_matches['query_id'] = query.id
        df_matches.to_sql('matches', con=db.engine, if_exists='append', index=False)

    return query


def get_or_create_cotext(query, window, context_break):
    """get or create cotext of query specified by window and context_break

    """

    cotext = Cotext.query.filter(
        Cotext.query_id == query.id,
        Cotext.context >= window,
        Cotext.context_break == context_break
    ).first()

    if not cotext:

        matches_df = ccc_query(query)
        if len(matches_df) == 0:
            current_app.logger.debug("get_or_create_context :: empty query")
            return

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

    else:
        current_app.logger.debug("get_or_create_cotext :: cotext already exists")

    return cotext


def filter_matches(focus_query, filter_queries, window, overlap):
    """Filter matches of focus query according to presence of filter queries in window (and focus_query.s)

    :param Query focus_query:
    :param dict(Query) filter_queries:
    :param int window:
    :param str overlap: one of 'match', 'matchend', 'partial', or 'full'
    """

    current_app.logger.debug("filter_matches :: enter")

    matches = Matches.query.filter_by(query_id=focus_query.id)

    # Get relevant cotext lines
    current_app.logger.debug("filter_matches :: getting cotext")
    cotext = get_or_create_cotext(focus_query, window, focus_query.s)
    if cotext is None:
        current_app.logger.error("filter_matches :: empty query to start with")
        return

    current_app.logger.debug("filter_matches :: filtering cotext")
    cotext_lines = CotextLines.query.filter(
        CotextLines.cotext_id == cotext.id,
        CotextLines.offset.between(-window, window)
    ).subquery()

    for key, fq in filter_queries.items():
        current_app.logger.debug(f"filter_matches :: filtering cotext: {key}")

        # Define alias for Matches (to avoid conflicts in joins)
        matches_alias = aliased(Matches)

        # Subqueries to check for match and matchend presence
        match_subquery = (
            db.session.query(cotext_lines.c.match_pos)
            .join(matches_alias, (matches_alias.query_id == fq.id) & (matches_alias.match == cotext_lines.c.cpos))
            .subquery()
        )

        matchend_subquery = (
            db.session.query(cotext_lines.c.match_pos)
            .join(matches_alias, (matches_alias.query_id == fq.id) & (matches_alias.matchend == cotext_lines.c.cpos))
            .subquery()
        )

        current_app.logger.debug(f"filter_matches :: filtering cotext: overlap mode: {overlap}")

        # Apply filtering based on overlap mode
        if overlap == "partial":
            matches = matches.filter(
                exists().where(Matches.match == match_subquery.c.match_pos) |
                exists().where(Matches.match == matchend_subquery.c.match_pos)
            )
        elif overlap == "full":
            matches = matches.filter(
                exists().where(Matches.match == match_subquery.c.match_pos),
                exists().where(Matches.matchend == matchend_subquery.c.match_pos)
            )
        elif overlap == "match":
            matches = matches.filter(exists().where(Matches.match == match_subquery.c.match_pos))
        elif overlap == "matchend":
            matches = matches.filter(exists().where(Matches.matchend == matchend_subquery.c.match_pos))
        else:
            raise ValueError("filter_matches :: filtering cotext: overlap must be one of 'match', 'matchend', 'partial', or 'full'")

        # Check if no matches remain
        if matches.count() == 0:
            current_app.logger.error(f"filter_matches :: filtering cotext: no lines left after filtering for query {fq.cqp_query}")
            return

    current_app.logger.debug("filter_matches :: exit")

    return matches


def get_concordance_lines(query_id, query_data):

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
        fq = get_or_create_query_assisted(
            corpus.id, query.subcorpus_id, [filter_item],
            filter_item_p_att, query.s,
            True, False, False
        )
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

    return concordance


def paginate_dataframe(df, sort_by, sort_order, page_number, page_size):
    """paginate a pandas DataFrame.

    """
    # Sort DataFrame
    ascending = sort_order == "ascending"
    df_sorted = df.sort_values(by=sort_by, ascending=ascending)

    # Get total records and pages
    total_records = len(df_sorted)
    total_pages = (total_records + page_size - 1) // page_size  # Equivalent to ceil(total_records / page_size)

    # Slice DataFrame for pagination
    start_idx = (page_number - 1) * page_size
    end_idx = start_idx + page_size
    df_paginated = df_sorted.iloc[start_idx:end_idx]

    # Pagination metadata
    metadata = {
        "total": total_records,
        "pages": total_pages,
        "page_number": page_number,
        "page_size": page_size,
    }

    return df_paginated, metadata


def get_query_meta_freq_breakdown(query, level, key, p, nr_bins, time_interval):

    # TODO support for numeric / datetime

    from .corpus import get_meta_freq

    att = query.corpus.get_s_att(level, key)
    if att is None:
        abort(404, 'annotation layer not found')

    # bin frequencies
    records = get_meta_freq(att, nr_bins, time_interval, query.subcorpus_id, force_categorical=True).group_by('bin_index')
    df = DataFrame(records)
    df['bin_index'] = df['bin_index'].astype(str)
    df = df.set_index('bin_index')

    # match frequencies
    matches_df = ccc_query(query, return_df=True)
    crps = query.corpus.ccc().subcorpus(df_dump=matches_df, overwrite=False)
    df_matches = crps.concordance(p_show=[p], s_show=[f'{level}_{key}'], cut_off=None)[[p, f'{level}_{key}']].value_counts().reset_index()
    df_matches.columns = ['item', 'bin_index', 'nr_matches']
    df_matches = df_matches.set_index('bin_index')

    # TODO: combine to bins

    # combined
    df_freq = df.join(df_matches)
    df_freq['nr_matches'] = df_freq['nr_matches'].fillna(0)
    df_freq = df_freq.sort_values(by='nr_matches', ascending=False)
    df_freq['nr_ipm'] = round(df_freq['nr_matches'] / df_freq['nr_tokens'] * 10 ** 6, 6)

    return df_freq


################
# API schemata #
################

# INPUT
class QueryIn(Schema):

    corpus_id = Integer(required=True)
    subcorpus_id = Integer(required=False, allow_none=True)

    match_strategy = String(dump_default='longest', required=False, validate=OneOf(['longest', 'shortest', 'standard']))

    cqp_query = String(required=True)

    s = String(required=False)


class QueryAssistedIn(Schema):

    corpus_id = Integer(required=True)
    subcorpus_id = Integer(required=False, allow_none=True)

    match_strategy = String(dump_default='longest', required=False, validate=OneOf(['longest', 'shortest', 'standard']))

    items = List(String, required=True)
    p = String(required=True)

    ignore_case = Boolean(required=False, dump_default=True)
    ignore_diacritics = Boolean(required=False, dump_default=True)
    escape = Boolean(required=False, dump_default=True)

    s = String(required=False)


class QueryMetaFrequenciesIn(Schema):

    subcorpus_id = Integer(required=False, allow_none=True, load_default=None)

    level = String(required=True)
    key = String(required=True)
    p = String(required=False, load_default='lemma')

    sort_by = String(required=False, load_default='nr_ipm', validate=OneOf(['bin', 'nr_ipm', 'nr_matches', 'nr_tokens', 'nr_spans']))
    sort_order = String(required=False, load_default='descending', validate=OneOf(['ascending', 'descending']))
    page_size = Integer(required=False, load_default=10)
    page_number = Integer(required=False, load_default=1)

    nr_bins = Integer(
        required=False, load_default=30,
        metadata={'description': "how may (equidistant) bins to create. only used for numeric values."}
    )
    time_interval = String(
        required=False, load_default='day', validate=OneOf(['hour', 'day', 'week', 'month', 'year']),
        metadata={'description': "which bins to create for datetime values. only used for datetime values."}
    )


# OUTPUT
class QueryOut(Schema):

    id = Integer(required=True)
    corpus_id = Integer(required=True)
    corpus_name = String(required=True)
    subcorpus_id = Integer(required=True, dump_default=None, allow_none=True)
    subcorpus_name = String(required=True, dump_default=None, allow_none=True)
    match_strategy = String(required=True)
    cqp_query = String(required=True)
    random_seed = Integer(required=True)
    number_matches = Integer(required=True)


class QueryMetaFrequencyOut(Schema):

    bin_unicode = String(required=False, allow_none=True)
    bin_boolean = Boolean(required=False, allow_none=True)
    bin_numeric = Tuple((Float, Float), required=False, allow_none=True)
    bin_datetime = String(required=False, allow_none=True)

    nr_spans = Integer(required=True)
    nr_tokens = Integer(required=True)

    item = String(metadata={'description': 'item'})
    nr_matches = Integer(metadata={'description': 'number of matches of query in bin'})
    nr_ipm = Float(metadata={'description': 'instances of query matches per million tokens in bin'})


class QueryMetaFrequenciesOut(Schema):

    sort_by = String(required=True)
    sort_order = String(required=True)
    nr_items = Integer(required=True)
    page_size = Integer(required=True)
    page_number = Integer(required=True)
    page_count = Integer(required=True)
    value_type = String(required=True, validate=OneOf(['datetime', 'numeric', 'boolean', 'unicode']))

    frequencies = Nested(QueryMetaFrequencyOut(many=True), required=True, dump_default=[])


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
            return abort(406, ret)

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
            return abort(406, ret)

    return QueryOut().dump(query), 200


@bp.put('/assisted/')
@bp.input(QueryAssistedIn)
@bp.input({'execute': Boolean(load_default=True)}, location='query')
@bp.output(QueryOut)
@bp.auth_required(auth)
def create_or_get_query(json_data, query_data):
    """Create new query in assisted mode, if it does not exist.

    """

    corpus_id = json_data.get('corpus_id')
    subcorpus_id = json_data.get('subcorpus_id')

    s = json_data.get('s')
    items = json_data.get('items')
    p = json_data.get('p')
    escape = json_data.get('escape', json_data.get('escape'))
    ignore_diacritics = json_data.get('ignore_diacritics', json_data.get('ignore_diacritics'))
    ignore_case = json_data.get('ignore_case', json_data.get('ignore_case'))

    query = get_or_create_query_assisted(
        corpus_id, subcorpus_id, items, p, s,
        escape, ignore_case, ignore_diacritics, focus_query=None,
        execute=query_data['execute']
    )

    if isinstance(query, str):
        return abort(406, query)

    return QueryOut().dump(query), 200


@bp.get('/')
@bp.output(QueryOut(many=True))
@bp.auth_required(auth)
def get_queries():
    """Get all queries.

    """

    queries = Query.query.all()

    return [QueryOut().dump(query) for query in queries], 200


@bp.get('/<query_id>')
@bp.output(QueryOut)
@bp.auth_required(auth)
def get_query(query_id):
    """Get details of query.

    """

    query = db.get_or_404(Query, query_id)

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


@bp.delete('/<query_id>')
@bp.auth_required(auth)
def delete_query(query_id):
    """Delete query.

    """

    query = db.get_or_404(Query, query_id)
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

    concordance = get_concordance_lines(query_id, query_data)

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
@bp.input(QueryMetaFrequenciesIn, location='query')
@bp.output(QueryMetaFrequenciesOut)
@bp.auth_required(auth)
def get_meta(query_id, query_data):
    """Get meta distribution of query. NB: only works with categorical data, other types will be forced to categorical.

    """

    from .corpus import rename_meta_freq

    query = db.get_or_404(Query, query_id)
    level = query_data.get('level')
    key = query_data.get('key')
    p = query_data.get('p')

    page_number = query_data.get('page_number', 1)
    page_size = query_data.get('page_size', 20)
    sort_order = query_data.get('sort_order', 'descending')
    sort_by = query_data.get('sort_by', 'nr_matches')
    sort_by = 'bin_index' if sort_by == 'bin' else sort_by

    att = query.corpus.get_s_att(level, key)
    if att is None:
        abort(404, 'annotation layer not found')

    # TODO this only works if s-attribute encoded in CWB matches the ones encoded in database
    nr_bins = query_data.get('nr_bins', 5)
    time_interval = query_data.get('time_interval', 'day')

    if query.zero_matches:
        abort(406, 'query has zero matches')

    df_freq = get_query_meta_freq_breakdown(query, level, key, p, nr_bins, time_interval)
    df_freq, metadata = paginate_dataframe(df_freq, sort_by, sort_order, page_number, page_size)
    freq = rename_meta_freq(df_freq.reset_index(), att.value_type, time_interval)

    # TODO w/o p

    return QueryMetaFrequenciesOut().dump({
        'sort_by': sort_by,
        'sort_order': sort_order,
        'nr_items': metadata['total'],
        'page_size': page_size,
        'page_number': page_number,
        'page_count': metadata['pages'],
        'value_type': att.value_type,
        'frequencies': [QueryMetaFrequencyOut().dump(f) for f in freq]
    }), 200


#####################
# QUERY/COLLOCATION #
#####################
@bp.put("/<query_id>/collocation")
@bp.input(CollocationIn)
@bp.output(CollocationOut)
@bp.auth_required(auth)
def get_or_create_collocation(query_id, json_data):
    """Get collocation analysis of query; create if necessary.

    """

    query = db.get_or_404(Query, query_id)

    p = json_data.get('p')
    window = json_data.get('window')
    s_break = json_data.get('s_break')
    marginals = json_data.get('marginals', 'global')

    # semantic map
    semantic_map_id = json_data.get('semantic_map_id', None)
    semantic_map_init = json_data.get('semantic_map_init', True)

    # filtering
    filter_item = json_data.pop('filter_item', None)
    filter_item_p_att = json_data.pop('filter_item_p_att', None)
    filter_overlap = json_data.pop('filter_overlap', 'partial')
    filter_queries = dict()
    if filter_item:
        filter_queries['_FILTER'] = get_or_create_query_assisted(
            query.corpus_id, None, [filter_item], filter_item_p_att, query.s,
            True, False, False
        )
    if len(filter_queries) > 0:
        query = iterative_query(query, filter_queries, window, filter_overlap)
        if query is None:
            abort(406, 'empty iterative query')

    collocation = Collocation.query.filter_by(
        query_id=query.id,
        p=p,
        s_break=s_break,
        window=window,
        marginals=marginals
    ).order_by(Collocation.id.desc()).first()
    if not collocation:
        current_app.logger.debug("creating collocation analysis")
        collocation = Collocation(
            query_id=query.id,
            p=p,
            s_break=s_break,
            window=window,
            marginals=marginals
        )
        db.session.add(collocation)
        db.session.commit()
    else:
        current_app.logger.debug("collocation object already exists")

    ret = get_or_create_counts(collocation, remove_focus_cpos=True)
    if isinstance(ret, bool):
        if not ret:
            current_app.logger.error("collocation analysis based on empty cotext")
            abort(406, 'empty cotext')

    if semantic_map_init:
        ccc_semmap_init(collocation, semantic_map_id)

    return CollocationOut().dump(collocation), 200
