#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import Schema
from apiflask.fields import Boolean, Dict, Integer, List, Nested, String
from apiflask.validators import OneOf
from ccc import SubCorpus
from flask import current_app
from pandas import DataFrame
from collections import defaultdict

from .database import Matches


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
            'out_of_window': False if offset <= window else True
        })

    row = {
        'tokens': tokens,
        'structural': structural,
        'id': match,
        'contextid': contextid
    }

    return row


def ccc_concordance(filter_queries, primary, secondary, window, extended_window, page_number=None, page_size=None,
                    context_break=None, match_id=None, highlight_queries=[]):

    if len(filter_queries) > 1 and match_id:
        raise ValueError("can't filter for more than one query with specific match id")

    query = filter_queries[0]

    # get s-attribute settings
    s_show = query.corpus.s_annotations

    # get specified match
    if match_id:
        matches = Matches.query.filter_by(match=match_id, query_id=query.id).all()
        nr_lines = 1
        page_count = 1

    # get lines
    else:

        if len(filter_queries) == 1:
            matches = Matches.query.filter_by(query_id=query.id)

        else:
            contextids = list()
            for fq in filter_queries[1:]:
                contextids.append({s.contextid for s in fq.matches})
            contextids = set.intersection(*contextids)
            matches = Matches.query.filter(Matches.query_id == query.id, Matches.contextid.in_(contextids))

        matches = matches.paginate(page=page_number, per_page=page_size)
        nr_lines = matches.total
        page_count = matches.pages

    # actual concordancing
    df_dump = DataFrame([vars(s) for s in matches], columns=['match', 'matchend', 'contextid']).set_index(['match', 'matchend'])
    lines = SubCorpus(
        subcorpus_name=None,
        df_dump=df_dump,
        corpus_name=query.corpus.cwb_id,
        cqp_bin=current_app.config['CCC_CQP_BIN'],
        registry_dir=current_app.config['CCC_REGISTRY_DIR'],
        data_dir=current_app.config['CCC_DATA_DIR'],
        overwrite=False,
        lib_dir=None
    ).set_context(
        context=extended_window,
        context_break=context_break if context_break else query.s
    ).concordance(
        form='dict',
        p_show=[primary, secondary],
        s_show=s_show
    )
    lines = lines.apply(lambda line: ccc2attributes(line, primary, secondary, s_show, window), axis=1)

    # highlighting
    for fq in filter_queries:
        if fq not in highlight_queries:
            highlight_queries.append(fq)
    discourseme_ranges = defaultdict(list)
    filter_item_cpos = set()
    # get info
    for query in highlight_queries:
        hd_matches = Matches.query.filter(Matches.query_id == query.id,
                                          Matches.contextid.in_(list(df_dump['contextid']))).all()
        for match in hd_matches:
            if not query.discourseme:
                filter_item_cpos.add(match.match)
            else:
                discourseme_ranges[match.contextid].append({
                    'discourseme_id': query.discourseme.id,
                    'start': match.match,
                    'end': match.matchend
                })
    # format each line
    for line in lines:
        line['discourseme_ranges'] = discourseme_ranges.get(line['contextid'], [])
        for token in line['tokens']:
            if token['cpos'] in filter_item_cpos:
                token['is_filter_item'] = True

    concordance = {
        'lines': [ConcordanceLineOut().dump(line) for line in lines],
        'nr_lines': nr_lines,
        'page_size': page_size,
        'page_number': page_number,
        'page_count': page_count
    }

    return concordance


class ConcordanceIn(Schema):

    window = Integer(load_default=10, required=False)
    extended_window = Integer(load_default=20, required=False)

    primary = String(load_default='word', required=False)
    secondary = String(load_default='lemma', required=False)

    page_size = Integer(load_default=10, required=False)
    page_number = Integer(load_default=1, required=False)

    sort_order = String(load_default='random', required=False, validate=OneOf(['random', 'ascending', 'descending']))

    sort_by_offset = Integer(load_default=0, required=False)
    sort_by_p_att = String(load_default='word', required=False)

    filter_item = String(metadata={'nullable': True}, required=False)
    filter_item_p_att = String(load_default='lemma', required=False)

    filter_discourseme_ids = List(Integer, load_default=[], required=False)


class ConcordanceLineIn(Schema):

    window = Integer(load_default=10, required=False)
    extended_window = Integer(load_default=50, required=False)
    extended_context_break = String(load_default='text', required=False)  # or determine via corpus settings

    primary = String(load_default='word', required=False)
    secondary = String(load_default='lemma', required=False)


class DiscoursemeRangeOut(Schema):

    discourseme_id = Integer()
    start = Integer()
    end = Integer()


class TokenOut(Schema):

    cpos = Integer()
    offset = Integer()
    primary = String()
    secondary = String()
    out_of_window = Boolean(dump_default=False)
    is_filter_item = Boolean(dump_default=False)


class ConcordanceLineOut(Schema):

    id = Integer()
    tokens = Nested(TokenOut(many=True))
    structural = Dict()
    discourseme_ranges = Nested(DiscoursemeRangeOut(many=True))


class ConcordanceOut(Schema):

    nr_lines = Integer()
    page_size = Integer()
    page_number = Integer()
    page_count = Integer()

    lines = Nested(ConcordanceLineOut(many=True))
