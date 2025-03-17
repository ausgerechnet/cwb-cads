#!/usr/bin/python3
# -*- coding: utf-8 -*-

from collections import defaultdict

from apiflask import Schema
from apiflask.fields import Boolean, Dict, Integer, List, Nested, String
from apiflask.validators import OneOf
from ccc import SubCorpus
from flask import current_app
from pandas import DataFrame, concat

from . import db
from .database import Concordance, ConcordanceLines, Matches


def ccc2attributes(line, p_show, s_show):

    if len(p_show) != 2:
        raise NotImplementedError()

    match = line.name[0]
    contextid = line['contextid']
    context = line['context']
    contextend = line['contextend']
    structural = dict()
    for s_att in s_show:
        structural[s_att] = line[s_att]

    line = line['dict']
    tokens = list()

    primary = p_show[0]
    secondary = p_show[1]

    for cpos, offset, prim, sec in zip(line['cpos'], line['offset'], line[primary], line[secondary]):
        tokens.append({
            'cpos': cpos,
            'offset': offset,
            'primary': prim,
            'secondary': sec,
            'out_of_window': False if cpos >= context and cpos <= contextend else True
        })

    row = {
        'tokens': tokens,
        'structural': structural,
        'id': match,
        'contextid': contextid
    }

    return row


def sort_matches(query, sort_by_offset, sort_by_p_att, sort_by_s_att=None):
    """

    """

    if sort_by_s_att:
        raise NotImplementedError()

    # retrieve from database if possible
    random_seed = query.random_seed
    concordance = Concordance.query.filter_by(query_id=query.id, sort_by=sort_by_p_att, sort_offset=sort_by_offset, random_seed=random_seed).first()

    if not concordance:

        # create concordance
        concordance = Concordance(query_id=query.id, sort_offset=sort_by_offset, sort_by=sort_by_p_att, random_seed=random_seed)
        db.session.add(concordance)
        db.session.commit()

        # sort randomly
        if not sort_by_p_att and not sort_by_s_att:
            sort_clause = f"sort {query.nqr_cqp} randomize {random_seed}"

        else:
            # sorting on p-attribute
            if sort_by_offset > 0:
                sort_clause = f"sort {query.nqr_cqp} by {sort_by_p_att} on matchend[{sort_by_offset}] .. match"
            elif sort_by_offset < 0:
                sort_clause = f"sort {query.nqr_cqp} by {sort_by_p_att} on match[{sort_by_offset}] .. matchend"
            else:
                sort_clause = f"sort {query.nqr_cqp} by {sort_by_p_att} on match .. matchend"

        # get concordance from cwb-ccc
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

        # take care of context
        concordance_lines = concordance_lines.reset_index()[['match']]
        concordance_lines['contextid'] = concordance_lines['match'].apply(lambda x: subcorpus.cpos2sid(x, query.s))
        if sort_by_offset is not None:
            # move the lines where sort position is out of context to the top
            concordance_lines['contextid_sort'] = concordance_lines['match'].apply(lambda x: subcorpus.cpos2sid(x + sort_by_offset, query.s))
            concordance_lines['contextid_sort'] = concordance_lines['contextid_sort'] == concordance_lines['contextid']
            concordance_lines = concat([
                concordance_lines.loc[~ concordance_lines['contextid_sort']],
                concordance_lines.loc[concordance_lines['contextid_sort']]
            ]).drop('contextid_sort', axis=1)
        concordance_lines['concordance_id'] = concordance.id

        # and save to database
        concordance_lines.to_sql('concordance_lines', con=db.engine, if_exists='append', index=False)

    return concordance


def ccc_concordance(focus_query,
                    p_show, s_show,
                    window, context_break=None,
                    extended_window=None, extended_context_break=None,
                    highlight_queries=dict(),
                    match_id=None,
                    filter_queries=dict(), overlap='partial',
                    page_number=None, page_size=None,
                    sort_order='random',
                    sort_by_offset=0, sort_by_p_att=None, sort_by_s_att=None):
    """Central concordance function.

    :param Query focus_query: focus in KWIC view

    :param str p_show: positional attributes to show
    :param str s_show: structural attributes to show

    :param int window: tokens outside of window will be marked "out of window" (also used for filtering)
    :param str context_break: tokens in s-att instances other than the one at match will be marked "out of window" (also used for filtering)

    :param int extended_window: maximum number of tokens to display
    :param int extended_context_break: structural attribute to break extended context

    :param dict[Query] highlight_queries: queries to highlight in (extended) context

    :param int match_id: return specific match?

    :param dict[Query] filter_queries: queries that must match in context (defined by window & context_break & query.s)
    :param str overlap: which overlaps of discoursemes with context to consider when filtering (partial | full | match | matchend)

    :param int page_number: pagination page number
    :param int page_size: pagination page size

    :param str sort_order: ascending / descending (alphabetical order of attribute) or random / first / last (based on cpos)

    :param int sort_by_offset: offset of token resp. to match (negative) or matchend (positive) to sort on
    :param str sort_by_p_att: p-attribute to sort on
    :param str sort_by_s_att: s-attribute to sort on


    """

    current_app.logger.debug("ccc_concordance :: enter")

    # CHECK PARAMETERS
    if sort_order in ('random', 'first', 'last') and (sort_by_p_att or sort_by_s_att):
        # TODO 400
        raise ValueError(f"ccc_concordance :: cpos-based '{sort_order}' not compatible with sorting on attribute, use 'ascending' or 'descending' instead")

    if len(filter_queries) > 0 and match_id:
        # TODO 400
        raise ValueError("ccc_concordance :: cannot filter with specific match id")

    if sort_by_p_att and sort_by_s_att:
        raise NotImplementedError("ccc_concordance :: cannot sort by s-att and p-att")

    if sort_by_offset is None and (sort_by_p_att or sort_by_s_att):
        # default to sorting on match if sorting
        sort_by_offset = 0

    # SELECT MATCHES
    if match_id:
        current_app.logger.debug(f"ccc_concordance :: getting match {match_id}")
        matches = Matches.query.filter_by(match=match_id, query_id=focus_query.id).all()
        nr_lines = 1
        page_count = 1

    else:

        # FILTERING
        from .query import filter_matches
        matches = filter_matches(focus_query, filter_queries, window, overlap)
        if matches is None or not matches.first():
            return {
                'lines': [],
                'nr_lines': 0,
                'page_size': page_size,
                'page_number': page_number,
                'page_count': 0
            }

        # SORTING
        current_app.logger.debug("ccc_concordance :: sorting")
        if sort_order == 'first':
            pass
        elif sort_order == 'last':
            matches = matches.order_by(Matches.id.desc())
        elif sort_order in ('random', 'ascending', 'descending'):
            concordance = sort_matches(focus_query, sort_by_offset, sort_by_p_att, sort_by_s_att)
            matches = matches.join(
                ConcordanceLines,
                (ConcordanceLines.concordance_id == concordance.id) &
                (ConcordanceLines.match == Matches.match)  # &
                # (ConcordanceLines.contextid == Matches.contextid)
            )
            if sort_order == 'ascending' or sort_order == 'random':
                matches = matches.order_by(ConcordanceLines.id)
            elif sort_order == 'descending':
                matches = matches.order_by(ConcordanceLines.id.desc())
        else:
            raise ValueError()

        # PAGINATION
        matches = matches.paginate(page=page_number, per_page=page_size)
        nr_lines = matches.total
        page_count = matches.pages

    # RETRIEVE DATA FROM CWB-CCC
    current_app.logger.debug("ccc_concordance :: creating selected concordances")
    df_dump = DataFrame(
        [vars(s) for s in matches], columns=['match', 'matchend', 'contextid']
    ).set_index(['match', 'matchend'])
    if len(df_dump) == 0:
        return {
            'lines': [],
            'nr_lines': 0,
            'page_size': page_size,
            'page_number': page_number,
            'page_count': 0
        }
    lines = SubCorpus(
        subcorpus_name=None,
        df_dump=df_dump,
        corpus_name=focus_query.corpus.cwb_id,
        cqp_bin=current_app.config['CCC_CQP_BIN'],
        registry_dir=current_app.config['CCC_REGISTRY_DIR'],
        data_dir=current_app.config['CCC_DATA_DIR'],
        overwrite=False,
        lib_dir=None
    )
    lines_in_context = lines.set_context(
        context=window,
        context_break=context_break
    ).concordance(
        form='dict',
        p_show=p_show,
        s_show=s_show,
        order='asis'
    )
    lines_in_extended_context = lines.set_context(
        context=extended_window,
        context_break=extended_context_break
    ).concordance(
        form='dict',
        p_show=p_show,
        s_show=s_show,
        order='asis'
    )
    lines = lines_in_extended_context.drop(['context', 'contextend'], axis=1).join(lines_in_context[['context', 'contextend']])

    # FORMATTING
    lines = lines.apply(lambda line: ccc2attributes(line, p_show, s_show), axis=1)

    # HIGHLIGHTING
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
        'nr_lines': nr_lines if nr_lines else 0,
        'page_size': page_size,
        'page_number': page_number,
        'page_count': page_count
    }


################
# API schemata #
################

# Input
class ConcordanceLineIn(Schema):

    window = Integer(
        required=False, load_default=10,
        metadata={'description': 'tokens outside of window will be marked "out of window" (also used for filtering)'}
    )
    context_break = String(
        required=False, load_default=None,
        metadata={'description': 'tokens in s-att instances other than the one at match will be marked "out of window" (also used for filtering)'}
    )

    extended_window = Integer(
        required=False, load_default=25,
        metadata={'description': 'maximum number of tokens to display'}
    )
    extended_context_break = String(
        required=False, load_default=None,
        metadata={'description': 'structural attribute to break extended context'}
    )

    primary = String(
        required=False, load_default='word',
        metadata={'description': 'primary positional attribute'}

    )
    secondary = String(
        required=False, load_default='lemma',
        metadata={'description': 'secondary positional attribute'}
    )

    highlight_query_ids = List(
        Integer, required=False, load_default=[],
        metadata={'description': 'queries to highlight in (extended) context'}
    )


class ConcordanceIn(ConcordanceLineIn):

    page_size = Integer(
        required=False, load_default=10,
        metadata={'description': 'page size'}
    )
    page_number = Integer(
        required=False, load_default=1,
        metadata={'description': 'page number'}
    )

    sort_order = String(
        required=False, load_default='random', validate=OneOf(['random', 'first', 'last', 'ascending', 'descending']),
        metadata={'description': 'sort on alphabetical order of attribute (ascending / descending) or based on cpos (random / first / last)'}
    )

    sort_by_offset = Integer(
        required=False, load_default=None,
        metadata={'description': 'offset of token resp. to match (negative) or matchend (positive) to sort on'}
    )
    sort_by_p_att = String(
        required=False, load_default=None,
        metadata={'description': 'p-attribute to sort on'}
    )
    sort_by_s_att = String(
        required=False, load_default=None,
        metadata={'description': 's-attribute to sort on'}
    )

    filter_item = String(
        required=False,
        metadata={'description': 'item that must match in context (defined by window & context_break & query.s)'}
    )
    filter_item_p_att = String(
        required=False, load_default='lemma',
        metadata={'description': 'p-attribute to search filter-item on'}
    )

    filter_query_ids = List(
        Integer, required=False, load_default=[],
        metadata={'description': 'queries that must match in context (defined by window & context_break / query.s)'}
    )


# Output
class DiscoursemeRangeOut(Schema):  # rename to 'RangeOut'

    discourseme_id = Integer(required=True)  # rename to 'identifier' (→ query, discourseme, filter_item)
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
    discourseme_ranges = Nested(DiscoursemeRangeOut(many=True), required=True, dump_default=[])  # rename to 'ranges'


class ConcordanceOut(Schema):

    nr_lines = Integer(required=True)
    page_size = Integer(required=True)
    page_number = Integer(required=True)
    page_count = Integer(required=True)

    lines = Nested(ConcordanceLineOut(many=True), required=True, dump_default=[])
