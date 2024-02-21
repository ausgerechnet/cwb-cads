#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Boolean, Dict, Integer, List, Nested, String
from ccc import Corpus, SubCorpus
from flask import current_app
from pandas import DataFrame

from . import db
from .database import Matches, Query
from .users import auth

bp = APIBlueprint('concordance', __name__, url_prefix='/<query_id>/concordance')


def ccc_concordance(query, context_break, p_show=['word', 'lemma'],
                    s_show=[], highlight_discoursemes=[],
                    filter_queries={}, order=42, cut_off=500,
                    window=None, htmlify_meta=True, cwb_ids=False,
                    bools=False, cwb_id=None, topic_query=None,
                    match_strategy='longest', p_items='lemma'):
    """Retrieve concordance lines.

    if query is given: get all relevant info from query

    else: cwb_id, topic_query, match_strategy

    """

    cwb_id = query.corpus.cwb_id if query else cwb_id
    topic_query = query.cqp_query if query else topic_query if topic_query else ""
    match_strategy = query.match_strategy if query else match_strategy

    corpus = Corpus(corpus_name=cwb_id,
                    cqp_bin=current_app.config['CCC_CQP_BIN'],
                    registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                    data_dir=current_app.config['CCC_DATA_DIR'])

    # activate subcorpus
    if query and query.nqr_cqp:
        # TODO: check that exists
        corpus = corpus.subcorpus(query.nqr_cqp)

    current_app.logger.debug('ccc_concordance :: quick concordancing')
    lines = corpus.quick_conc(
        topic_query=topic_query,
        filter_queries=filter_queries,
        highlight_queries={},
        s_context=context_break,
        window=window,
        cut_off=cut_off,
        order=order,
        p_show=p_show,
        s_show=s_show,
        match_strategy=match_strategy,
        htmlify_meta=htmlify_meta,
        cwb_ids=cwb_ids
    )

    current_app.logger.debug(f'ccc_concordance :: highlighting {len(highlight_discoursemes)} discoursemes')
    lines = highlight(lines, highlight_discoursemes, p_att=p_items, bools=bools)

    return lines


def find_subseq(subseq, seq):
    """Return all starting positions of `subseq`uence in the `seq`uence.

    """
    i, n, m = -1, len(seq), len(subseq)
    out = []
    try:
        while True:
            i = seq.index(subseq[0], i + 1, n - m + 1)
            if subseq == seq[i:i + m]:
                out.append(i)
    except ValueError:
        pass
    return out


def highlight(lines, discoursemes, p_att='lemma', bools=True):
    """Highlight all discoursemes in lines.

    """
    items = dict()
    for discourseme in discoursemes:
        items[str(discourseme.id)] = discourseme.get_items()

    for line in lines:
        if bools:
            for discourseme in items.keys():
                line[discourseme + "_BOOL"] = False
        for discourseme, disc_items in items.items():
            for disc_item in disc_items:
                disc_item = disc_item.split(" ")
                indices = find_subseq(disc_item, line[p_att])
                if len(indices) > 0:
                    if bools:
                        line[discourseme + "_BOOL"] = True
                    for ind in indices:
                        for role in line['role'][ind:(ind+len(disc_item))]:
                            role.extend([discourseme])

    return lines


def ccc2attributes(line, primary, secondary, s_show):

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
            'out_of_window': False
        })

    row = {
        'tokens': tokens,
        'structural': structural
    }

    return row


class ConcordanceIn(Schema):

    # these two parameters determine 'out_of_window'
    context_break = String(load_default='text', required=False)
    window = Integer(load_default=20, required=False)

    # NB the absolute context break ("more context") is determined via corpus settings
    s_show = List(String, load_default=[], required=False)  # TODO: get from corpus settings

    primary = String(load_default='word', required=False)
    secondary = String(load_default='lemma', required=False)

    page_size = Integer(load_default=10, required=False)
    page_number = Integer(load_default=1, required=False)

    sort_order = Integer(load_default=42, metadata={'nullable': True}, required=False)  # random_seed / first = ascending / last = descending
    sort_by = Integer(load_default=0, required=False)  # offset to sort on (always on secondary)

    filter_item = String(metadata={'nullable': True}, required=False)  # search on secondary p-att
    filter_discourseme_ids = List(Integer, dump_default=[], required=False)


class ConcordanceContextIn(Schema):

    context_break = String(load_default='text', required=False)
    window = Integer(load_default=20, required=False)

    # NB the absolute context break ("more context") is determined via corpus settings
    s_show = List(String, load_default=[], required=False)  # TODO: get from corpus settings

    primary = String(load_default='word', required=False)
    secondary = String(load_default='lemma', required=False)


class ConcordanceLinesOutMMDA(Schema):

    match = Integer()
    meta = String()

    cpos = List(Integer)
    offset = List(Integer)
    word = List(String)
    lemma = List(String)
    role = List(List(String))


class DiscoursemeRangeOut(Schema):

    discourseme_id = Integer()
    start = Integer()
    end = Integer()


class TokenOut(Schema):

    cpos = Integer()
    offset = Integer()
    primary = String()
    secondary = String()
    out_of_window = Boolean()

    # is_highlight / search (also for concordance in!)


class ConcordanceLineOut(Schema):

    id = Integer()
    tokens = Nested(TokenOut(many=True))
    structural = Dict()       # key-value pairs ohne entsprechende "Types"
    discourseme_ranges = Nested(DiscoursemeRangeOut(many=True))
    nr_lines_total = Integer(required=False)
    # local_filter_ranges =


@bp.get("/")
@bp.input(ConcordanceIn, location='query')
@bp.output(ConcordanceLineOut(many=True))
@bp.auth_required(auth)
def lines(query_id, data):
    """Get concordance lines.

    """

    # display options
    context_break = data.get('context_break')
    window = data.get('window')
    s_show = data.get('s_show')
    primary = data.get('primary')
    secondary = data.get('secondary')

    # pagination
    page_size = data.get('page_size')
    page_number = data.get('page_number')

    # TODO: Concordance Sorting and Filtering
    # - concordance lines are sorted by ConcordanceSort
    # - sort keys are created on demand
    # - sorting according to {p-att} on {offset}
    # - default: cpos at match
    # - ascending / descending

    # sort_order = data.get('sort_order')
    # try:
    #     sort_order = int(sort_order)
    # except TypeError:
    #     pass
    # sort_by = data.get('sort_by')
    # filter_item = data.get('filter_item')
    # filter_discourseme_ids = data.get('filter_discourseme_ids')

    query = db.get_or_404(Query, query_id)
    matches = Matches.query.filter_by(query_id=query.id).paginate(page=page_number, per_page=page_size)
    nr_lines_total = matches.total
    df_dump = DataFrame([vars(s) for s in matches], columns=['match', 'matchend']).set_index(['match', 'matchend'])

    lines = SubCorpus(
        subcorpus_name=None,
        df_dump=df_dump,
        corpus_name=query.corpus.cwb_id,
        cqp_bin=current_app.config['CCC_CQP_BIN'],
        registry_dir=current_app.config['CCC_REGISTRY_DIR'],
        data_dir=current_app.config['CCC_DATA_DIR'],
        overwrite=False
    ).set_context(context=window, context_break=context_break)

    lines = lines.concordance(form='dict', p_show=[primary, secondary], s_show=s_show)

    rows = list()
    for line in lines.iterrows():
        match = line[0][0]
        row = ccc2attributes(line[1], primary, secondary, s_show)
        row['id'] = match
        row['discourseme_ranges'] = []
        row['nr_lines_total'] = nr_lines_total
        rows.append(row)

    return [ConcordanceLineOut().dump(line) for line in rows], 200


@bp.get("/<id>")
@bp.input(ConcordanceContextIn, location='query')
@bp.output(ConcordanceLineOut)
@bp.auth_required(auth)
def context(query_id, id, data):
    """Get (additional context of) one concordance line.

    """

    # display options
    context_break = data.get('context_break')
    window = data.get('window')
    s_show = data.get('s_show')
    primary = data.get('primary')
    secondary = data.get('secondary')

    query = db.get_or_404(Query, query_id)
    matches = Matches.query.filter_by(match=id, query_id=query.id).all()
    df_dump = DataFrame([vars(s) for s in matches], columns=['match', 'matchend']).set_index(['match', 'matchend'])

    lines = SubCorpus(
        subcorpus_name=None,
        df_dump=df_dump,
        corpus_name=query.corpus.cwb_id,
        cqp_bin=current_app.config['CCC_CQP_BIN'],
        registry_dir=current_app.config['CCC_REGISTRY_DIR'],
        data_dir=current_app.config['CCC_DATA_DIR'],
        overwrite=False
    ).set_context(context=window, context_break=context_break)

    line = lines.concordance(form='dict', p_show=[primary, secondary], s_show=s_show).iloc[0]

    row = ccc2attributes(line, primary, secondary, s_show)
    row['id'] = id
    row['discourseme_ranges'] = []

    return ConcordanceLineOut().dump(row), 200
