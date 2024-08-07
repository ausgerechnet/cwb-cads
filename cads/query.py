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
from .semantic_map import ccc_init_semmap
from .users import auth

bp = APIBlueprint('query', __name__, url_prefix='/query')


def ccc_query(query, return_df=True):
    """create or get matches of this query

    """

    current_app.logger.debug(f'ccc_query :: query {query.id} in corpus {query.corpus.cwb_id}')

    if query.zero_matches:
        current_app.logger.debug("ccc_query :: query has zero matches")
        return None

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

        if isinstance(matches, str):  # ERROR
            current_app.logger.error(f"{matches}")
            query.zero_matches = True
            query.error = True
            # db.session.delete(query)
            db.session.commit()
            return matches

        if len(matches.df) == 0:  # no matches
            current_app.logger.debug("0 matches")
            query.zero_matches = True
            db.session.commit()
            return None

        # save matches
        query.nqr_cqp = matches.subcorpus_name
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
        matches_df = DataFrame([vars(s) for s in query.matches], columns=['match', 'matchend']).set_index(['match', 'matchend'])
        current_app.logger.debug(f"ccc_query :: got {len(matches_df)} matches from database")

    else:
        current_app.logger.debug("ccc_query :: matches already exist in database")
        matches_df = None

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


def iterative_query(focus_query, filter_queries, window):

    filter_sequence = "Q-" + "-".join([str(focus_query.id)] + [str(fq.id) for fq in filter_queries.values()])
    # TODO retrieve if necessary

    current_app.logger.debug("get_collocation :: second-order mode")
    matches = Matches.query.filter_by(query_id=focus_query.id)
    # TODO learn proper SQLalchemy (aliased anti-join)
    matches_tmp = matches.all()
    match_pos = set([m.match for m in matches_tmp])

    # get relevant cotext lines
    cotext = get_or_create_cotext(focus_query, window, focus_query.s)
    cotext_lines = CotextLines.query.filter(CotextLines.cotext_id == cotext.id,
                                            CotextLines.offset <= window,
                                            CotextLines.offset >= -window)

    for fq in filter_queries.values():

        current_app.logger.debug("get_collocation :: filtering cotext lines by joining matches")
        cotext_lines_tmp = cotext_lines.join(
            Matches,
            (Matches.query_id == fq.id) &
            (Matches.match == CotextLines.cpos)
        )
        match_pos = match_pos.intersection(set([c.match_pos for c in cotext_lines_tmp]))

        current_app.logger.debug("get_collocation :: filtering matches")

        matches = Matches.query.filter(
            Matches.query_id == focus_query.id,
            Matches.match.in_(match_pos)
            # Matches.matchend.in_(match_pos)
        )

        # if len(matches.all()) == 0:
        #     current_app.logger.error(f"no lines left after filtering for query {fq.cqp_query}")
        #     abort(404, 'no collocates')

    # create query
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

    # matches to database
    df_matches = read_sql(matches.statement, con=db.engine)[['contextid', 'match', 'matchend']]
    df_matches['query_id'] = query.id
    df_matches.to_sql('matches', con=db.engine, if_exists='append', index=False)

    return query


################
# API schemata #
################
class QueryIn(Schema):

    # discourseme_id = Integer(required=False, metadata={'nullable': True})
    corpus_id = Integer(required=True)
    subcorpus_id = Integer(required=False)

    match_strategy = String(dump_default='longest', required=False, validate=OneOf(['longest', 'shortest', 'standard']))

    cqp_query = String(required=True)

    s = String(required=False)


class QueryAssistedIn(Schema):

    # discourseme_id = Integer(required=False, metadata={'nullable': True})
    corpus_id = Integer(required=True)
    subcorpus_id = Integer(required=False)

    match_strategy = String(dump_default='longest', required=False, validate=OneOf(['longest', 'shortest', 'standard']))

    items = List(String, required=True)
    p = String(required=True)
    ignore_case = Boolean(dump_default=True, required=False)
    ignore_diacritics = Boolean(dump_default=True, required=False)
    escape = Boolean(dump_default=True, required=False)

    s = String(required=False)


class QueryOut(Schema):

    id = Integer()
    # discourseme_id = Integer(metadata={'nullable': True})
    # discourseme_name = String(metadata={'nullable': True})
    corpus_id = Integer()
    corpus_name = String()
    subcorpus_id = Integer(metadata={'nullable': True})
    subcorpus_name = String(metadata={'nullable': True})
    match_strategy = String()
    cqp_query = String()
    # nqr_cqp = String()
    random_seed = Integer()


class QueryMetaIn(Schema):

    level = String()
    key = String()
    p = String(required=False, load_default='word')


class QueryMetaOut(Schema):

    item = String()
    value = String()
    frequency = Integer()
    nr_tokens = Integer()
    nr_texts = Integer()
    ipm = Float()


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

    concordance = ccc_concordance(query,
                                  primary, secondary,
                                  window, extended_window,
                                  filter_queries=filter_queries, highlight_queries=highlight_queries,
                                  page_number=page_number, page_size=page_size,
                                  sort_by=sort_by, sort_offset=sort_offset, sort_order=sort_order, sort_by_s_att=sort_by_s_att)

    return ConcordanceOut().dump(concordance), 200


@bp.post("/<query_id>/concordance/shuffle")
@bp.auth_required(auth)
@bp.output(QueryOut)
def concordance_shuffle(query_id):
    """Shuffle concordance lines.

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
    extended_context_break = query_data.get('extended_context_break')
    extended_window = query_data.get('extended_window')
    window = query_data.get('window')
    primary = query_data.get('primary')
    secondary = query_data.get('secondary')

    # TODO highlighting for constellations, also shuffle

    concordance = ccc_concordance(query,
                                  primary, secondary,
                                  window, extended_window, context_break=extended_context_break,
                                  match_id=match_id)

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

    TODO: pagination needed?
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

    # constellation and semantic map
    # constellation_id = query_data.get('constellation_id', None)
    # constellation = db.get_or_404(Constellation, constellation_id) if constellation_id else None

    semantic_map_id = query_data.get('semantic_map_id', None)

    # filtering for second-order collocation
    filter_item = query_data.pop('filter_item', None)
    filter_item_p_att = query_data.pop('filter_item_p_att', None)
    # filter_discourseme_ids = query_data.pop('filter_discourseme_ids', None)

    # prepare filter queries
    filter_queries = set()

    # for discourseme_id in filter_discourseme_ids:
    #     # always run on whole corpus
    #     fd = db.get_or_404(Discourseme, discourseme_id)
    #     fq = get_or_create_query_discourseme(query.corpus, fd)
    #     filter_queries.add(fq)

    if filter_item:
        # TODO: run only on subcorpus → temporary
        fq = get_or_create_query_item(query.corpus, filter_item, filter_item_p_att, query.s)
        filter_queries.add(fq)

    if len(filter_queries) > 0:

        # note that the database scheme does not allow to have several filter queries
        # we thus name the actual query result here to be able to retrieve it
        nqr_name = "SOC" + "_" + "_q".join(["q" + str(query.id)] + [str(fq.id) for fq in filter_queries])
        # TODO retrieve if necessary

        current_app.logger.debug("get_collocation :: second-order mode")
        matches = Matches.query.filter_by(query_id=query.id)
        current_app.logger.debug("get_collocation :: filtering: getting matches")
        # TODO learn proper SQLalchemy (aliased anti-join)
        matches_tmp = matches.all()
        match_pos = set([m.match for m in matches_tmp])

        # get relevant cotext lines
        cotext = get_or_create_cotext(query, window, s_break)
        cotext_lines = CotextLines.query.filter(CotextLines.cotext_id == cotext.id,
                                                CotextLines.offset <= window,
                                                CotextLines.offset >= -window)

        for fq in filter_queries:

            current_app.logger.debug("get_collocation :: filtering cotext lines by joining matches")
            cotext_lines_tmp = cotext_lines.join(
                Matches,
                (Matches.query_id == fq.id) &
                (Matches.match == CotextLines.cpos)
            )
            match_pos = match_pos.intersection(set([c.match_pos for c in cotext_lines_tmp]))

            current_app.logger.debug("get_collocation :: filtering matches")

            matches = Matches.query.filter(
                Matches.query_id == query.id,
                Matches.match.in_(match_pos)
            )

            if len(matches.all()) == 0:
                current_app.logger.error(f"no lines left after filtering for query {fq.cqp_query}")
                abort(404, 'no collocates')

        # create query
        query = Query(
            corpus_id=query.corpus.id,
            subcorpus_id=query.subcorpus.id if query.subcorpus else None,
            soc_sequence=nqr_name,
            # discourseme_id=query.discourseme.id,
            match_strategy=query.match_strategy,
            s=query.s
        )
        db.session.add(query)
        db.session.commit()

        # matches to database
        df_matches = read_sql(matches.statement, con=db.engine)[['contextid', 'match', 'matchend']]
        df_matches['query_id'] = query.id
        df_matches.to_sql('matches', con=db.engine, if_exists='append', index=False)

    collocation = Collocation(
        # constellation_id=constellation_id,
        # semantic_map_id=semantic_map_id,
        query_id=query.id,
        p=p,
        s_break=s_break,
        window=window,
        marginals=marginals
    )
    db.session.add(collocation)
    db.session.commit()

    get_or_create_counts(collocation, remove_focus_cpos=True)
    ccc_init_semmap(collocation, semantic_map_id)

    # if constellation:
    #     discoursemes = constellation.highlight_discoursemes + constellation.filter_discoursemes
    #     ccc_discourseme_counts(collocation, discoursemes)

    return CollocationOut().dump(collocation), 200
