#!/usr/bin/python3
# -*- coding: utf-8 -*-

from collections import defaultdict

from apiflask import Schema
from apiflask.fields import Boolean, Dict, Integer, List, Nested, String
from apiflask.validators import OneOf
from ccc import SubCorpus
from flask import current_app
from pandas import DataFrame

from . import db
from .database import Concordance, ConcordanceLines, Matches


def ccc2attributes(line, primary, secondary, s_show, window):

    match = line.name[0]
    contextid = line['contextid']
    structural = dict()
    for s_att in s_show:
        structural[s_att] = line[s_att]

    line = line['dict']
    tokens = list()
    for cpos, offset, prim, sec in zip(line['cpos'], line['offset'], line[primary], line[secondary]):
        tokens.append({
            'cpos': cpos,
            'offset': offset,
            'primary': prim,
            'secondary': sec,
            'out_of_window': False if abs(offset) <= window else True
        })

    row = {
        'tokens': tokens,
        'structural': structural,
        'id': match,
        'contextid': contextid
    }

    return row


def sort_matches(query, sort_by, sort_offset=0):

    random_seed = query.random_seed
    concordance = Concordance.query.filter_by(query_id=query.id, sort_by=sort_by, sort_offset=sort_offset, random_seed=random_seed).first()

    if not concordance:

        concordance = Concordance(query_id=query.id, sort_by=sort_by, sort_offset=sort_offset, random_seed=random_seed)
        db.session.add(concordance)
        db.session.commit()

        if not sort_by:
            sort_clause = f"sort {query.nqr_cqp} randomize {random_seed}"

        else:
            if sort_offset > 0:
                sort_clause = f"sort {query.nqr_cqp} by {sort_by} on matchend[{sort_offset}] .. match"
            elif sort_offset < 0:
                sort_clause = f"sort {query.nqr_cqp} by {sort_by} on match[{sort_offset}] .. matchend"
            else:
                sort_clause = f"sort {query.nqr_cqp} by {sort_by} on match .. matchend"

        subcorpus = SubCorpus(
            subcorpus_name=query.nqr_cqp,
            df_dump=None,
            corpus_name=query.corpus.cwb_id,
            cqp_bin=current_app.config['CCC_CQP_BIN'],
            registry_dir=current_app.config['CCC_REGISTRY_DIR'],
            data_dir=current_app.config['CCC_DATA_DIR'],
            overwrite=False,
            lib_dir=None
        )
        cqp = subcorpus.start_cqp()
        cqp.Exec(sort_clause)
        concordance_lines = cqp.Dump(query.nqr_cqp)
        cqp.__del__()

        concordance_lines = concordance_lines.reset_index()[['match']]
        concordance_lines['contextid'] = concordance_lines['match'].apply(lambda x: subcorpus.cpos2sid(x + sort_offset, query.s))
        concordance_lines['concordance_id'] = concordance.id
        concordance_lines.to_sql('concordance_lines', con=db.engine, if_exists='append', index=False)

    return concordance


def ccc_concordance(focus_query,
                    primary, secondary,
                    window, extended_window, context_break=None,
                    filter_queries=dict(), highlight_queries=dict(),
                    match_id=None, page_number=None, page_size=None,
                    sort_by=None, sort_offset=0, sort_order='ascending', sort_by_s_att=None,
                    overlap='partial'):
    """Central concordance function.

    :param Query focus_query: focus in KWIC view

    :param str primary: primary p-attribute to display
    :param str secondary: secondary p-attribtue to display
    :param int window: tokens outside of window will be marked "out of window" (also used for filtering)
    :param int extended_window: maximum number of tokens
    :param str context_break: return context until this s-attribute (or extended_window) (also used for filtering)

    :param dict[Query] filter_queries: further queries that must match in context (defined by window and context_break & query.s)
    :param dict[Query] highlight_queries: queries to highlight in (extended) context

    :param int match_id: return specific match?
    :param int page_number: pagination page number
    :param int page_size: pagination page size

    :param str sort_by: p-attribute to sort on
    :param int sort_offset: offset of token resp. match (negative) or matchend (positive) to sort on
    :param str sort_order: ascending / descending / random
    :param str sort_by_s_att: s-attribute to sort on

    :param str overlap: which concordance lines to consider when filtering (partial | full | match | matchend)

    """

    current_app.logger.debug("ccc_concordance :: enter")

    # check parameters
    if sort_order == 'random' and (sort_by or sort_by_s_att):
        raise ValueError("ccc_concordance :: either get random or sorted concordance lines, not both")

    if len(filter_queries) > 0 and match_id:
        raise ValueError("ccc_concordance :: cannot filter with specific match id")

    if sort_by and sort_by_s_att:
        raise NotImplementedError("ccc_concordance :: cannot sort by s-att and p-att")

    # get s-attribute settings
    s_show = focus_query.corpus.s_annotations

    # get specified match
    if match_id:
        current_app.logger.debug(f"ccc_concordance :: getting match {match_id}")
        matches = Matches.query.filter_by(match=match_id, query_id=focus_query.id).all()
        nr_lines = 1
        page_count = 1

    else:

        from .query import filter_matches

        # filtering
        matches = filter_matches(focus_query, filter_queries, window, overlap)
        if not matches:
            return

        # sorting
        current_app.logger.debug("ccc_concordance :: sorting")
        if sort_order != 'first':
            concordance = sort_matches(focus_query, sort_by, sort_offset)
            matches = matches.join(
                ConcordanceLines,
                (ConcordanceLines.concordance_id == concordance.id) &
                (ConcordanceLines.match == Matches.match) &
                (ConcordanceLines.contextid == Matches.contextid)
            )
        if sort_order == 'ascending':
            matches = matches.order_by(ConcordanceLines.id)
        elif sort_order == 'descending':
            matches = matches.order_by(ConcordanceLines.id.desc())

        matches = matches.paginate(page=page_number, per_page=page_size)
        nr_lines = matches.total
        page_count = matches.pages

    # actual concordancing
    current_app.logger.debug("ccc_concordance :: creating selected concordances")
    df_dump = DataFrame([vars(s) for s in matches], columns=['match', 'matchend', 'contextid']).set_index(['match', 'matchend'])
    lines = SubCorpus(
        subcorpus_name=None,
        df_dump=df_dump,
        corpus_name=focus_query.corpus.cwb_id,
        cqp_bin=current_app.config['CCC_CQP_BIN'],
        registry_dir=current_app.config['CCC_REGISTRY_DIR'],
        data_dir=current_app.config['CCC_DATA_DIR'],
        overwrite=False,
        lib_dir=None
    ).set_context(
        context=extended_window,
        context_break=context_break
    ).concordance(
        form='dict',
        p_show=[primary, secondary],
        s_show=s_show,
        order='asis'
    )
    lines = lines.apply(lambda line: ccc2attributes(line, primary, secondary, s_show, window), axis=1)

    # highlighting
    highlight_ranges = defaultdict(list)
    filter_item_cpos = set()
    for key, hq in highlight_queries.items():
        hd_matches = Matches.query.filter(Matches.query_id == hq.id,
                                          Matches.contextid.in_(list(df_dump['contextid']))).all()
        for match in hd_matches:
            if key == '_FILTER':
                filter_item_cpos.add(match.match)
            else:
                highlight_ranges[match.contextid].append({
                    'discourseme_id': key,
                    'start': match.match,
                    'end': match.matchend
                })

    for line in lines:
        line['match_id'] = line.pop('id')
        line['discourseme_ranges'] = highlight_ranges.get(line['contextid'], [])
        for token in line['tokens']:
            if token['cpos'] in filter_item_cpos:
                token['is_filter_item'] = True

    current_app.logger.debug("ccc_concordance :: exit")

    return {
        'lines': [ConcordanceLineOut().dump(line) for line in lines],
        'nr_lines': nr_lines,
        'page_size': page_size,
        'page_number': page_number,
        'page_count': page_count
    }


################
# API schemata #
################

# Input
class ConcordanceIn(Schema):

    window = Integer(required=False, load_default=10)
    extended_window = Integer(required=False, load_default=50)

    primary = String(required=False, load_default='word')
    secondary = String(required=False, load_default='lemma')

    page_size = Integer(required=False, load_default=10)
    page_number = Integer(required=False, load_default=1)

    sort_order = String(required=False, load_default='random', validate=OneOf(['first', 'random', 'ascending', 'descending']))

    sort_by_offset = Integer(required=False, load_default=0)
    sort_by_p_att = String(required=False, load_default=None)
    sort_by_s_att = String(required=False, load_default=None)

    filter_item = String(required=False, metadata={'nullable': True})
    filter_item_p_att = String(required=False, load_default='lemma')

    filter_query_ids = List(Integer, required=False, load_default=[])
    highlight_query_ids = List(Integer, required=False, load_default=[])


class ConcordanceLineIn(Schema):

    window = Integer(required=False, load_default=10)
    extended_window = Integer(required=False, load_default=50)
    extended_context_break = String(required=False)

    primary = String(required=False, load_default='word')
    secondary = String(required=False, load_default='lemma')


# Output
class DiscoursemeRangeOut(Schema):

    discourseme_id = Integer(required=True)
    start = Integer(required=True)
    end = Integer(required=True)


class TokenOut(Schema):

    cpos = Integer(required=True)
    offset = Integer(required=True)
    primary = String(required=True)
    secondary = String(required=True)
    out_of_window = Boolean(required=True, dump_default=False)
    is_filter_item = Boolean(required=True, dump_default=False)


class ConcordanceLineOut(Schema):

    match_id = Integer(required=True)
    tokens = Nested(TokenOut(many=True), required=True, dump_default=[])
    structural = Dict(required=True, dump_default={})
    discourseme_ranges = Nested(DiscoursemeRangeOut(many=True), required=True, dump_default=[])


class ConcordanceOut(Schema):

    nr_lines = Integer(required=True)
    page_size = Integer(required=True)
    page_number = Integer(required=True)
    page_count = Integer(required=True)

    lines = Nested(ConcordanceLineOut(many=True), required=True, dump_default=[])
