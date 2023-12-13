#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, List, String
from ccc import Corpus
from flask import current_app
from json import dumps

from . import db
from .database import Query
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
    if query and query.nqr_name:
        # TODO: check that exists
        corpus = corpus.subcorpus(query.nqr_name)

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


class ConcordanceIn(Schema):

    context_break = String(dump_default='text', required=False)
    p_show = List(String, default=['word', 'lemma'], required=False)
    s_show = List(String, default=[], required=False)
    order = Integer(default=42, required=False)
    cut_off = Integer(default=500, required=False)
    window = Integer(default=20, required=False)


class ConcordanceLinesOutMMDA(Schema):

    match = Integer()
    meta = String()

    cpos = List(Integer)
    offset = List(Integer)
    word = List(String)
    lemma = List(String)
    role = List(List(String))


class ConcordanceLinesOut(Schema):

    match = Integer()

    positional = String()       # jsonified dict of: cpos, offset, role, word, lemma, ...
    structural = String()       # jsonified dict of: text_id, text_id_cwbid, ...


@bp.get("/")
@bp.input(ConcordanceIn)
@bp.output(ConcordanceLinesOut(many=True))
@bp.auth_required(auth)
def lines(query_id, data):
    """Get concordance lines.

    """

    query = db.get_or_404(Query, query_id)

    order = data.get('order', 42)
    try:
        order = int(order)
    except TypeError:
        pass

    cut_off = data.get('cut_off', None)
    try:
        cut_off = int(cut_off)
    except TypeError:
        pass

    p_show = data.get('p_show', ['word', 'lemma'])
    s_show = data.get('s_show', [])

    concordance_lines = ccc_concordance(query,
                                        context_break=data.get('context_break', 's'),
                                        p_show=p_show,
                                        s_show=s_show,
                                        highlight_discoursemes=[],
                                        filter_queries={},
                                        order=order,
                                        cut_off=cut_off,
                                        window=int(data.get('window', 5)),
                                        htmlify_meta=False,
                                        cwb_ids=True)

    rows = list()
    for line in concordance_lines:

        positional = dict()
        for p_att in ['cpos', 'offset', 'role'] + p_show:
            positional[p_att] = line[p_att]

        structural = dict()
        for s_att in s_show + [s + "_cwbid" for s in s_show]:
            structural[s_att] = line[s_att]

        rows.append({
            'match': line['match'],
            'positional': dumps(positional),
            'structural': dumps(structural)
        })

    return [ConcordanceLinesOut().dump(line) for line in rows], 200
