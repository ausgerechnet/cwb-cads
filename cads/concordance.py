#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, List, String
from ccc import Corpus
from ccc.utils import format_cqp_query
from flask import current_app, request

from . import db
from .database import Query
from .users import auth

bp = APIBlueprint('concordance', __name__, url_prefix='/<query_id>/concordance')


def ccc_concordance(query, context_break, p_show=['word', 'lemma'], s_show=[],
                    highlight_discoursemes=[], filter_queries={},
                    order=42, cut_off=500, window=None):

    corpus = Corpus(corpus_name=query.corpus.cwb_id,
                    cqp_bin=current_app.config['CCC_CQP_BIN'],
                    registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                    data_dir=current_app.config['CCC_DATA_DIR'])

    highlight_queries = dict()
    if highlight_discoursemes:
        for discourseme in highlight_discoursemes:
            if str(discourseme.id) not in filter_queries.keys():
                highlight_queries[str(discourseme.id)] = format_cqp_query(discourseme.items.split("\t"), 'lemma', escape=False)

    lines = corpus.quick_conc(
        topic_query=query.cqp_query,
        filter_queries=filter_queries,
        highlight_queries=highlight_queries,
        s_context=context_break,
        window=window,
        cut_off=cut_off,
        order=order,
        p_show=p_show,
        s_show=s_show,
        match_strategy='longest'
    )

    return lines


class ConcordanceIn(Schema):

    context_break = String(default='text', required=False)
    p_show = List(String, default=['word', 'lemma'], required=False)
    s_show = List(String, default=[], required=False)
    order = Integer(default=42, required=False)
    cut_off = Integer(default=500, required=False)
    window = Integer(default=20, required=False)


class ConcordanceLinesOut(Schema):

    match = Integer()
    meta = String()

    cpos = List(Integer)
    offset = List(Integer)
    word = List(String)
    lemma = List(String)
    role = List(List(String))


@bp.post("/")
@bp.input(ConcordanceIn)
@bp.output(ConcordanceLinesOut(many=True))
@bp.auth_required(auth)
def lines(query_id, data):
    """Get concordance lines.

    """

    query = db.get_or_404(Query, query_id)

    concordance_lines = ccc_concordance(query,
                                        context_break=request.args.get('context_break', 's'),
                                        p_show=request.args.getlist('p_show', ['word', 'lemma']),
                                        s_show=request.args.getlist('s_show', []),
                                        highlight_discoursemes=[],
                                        filter_queries={},
                                        order=int(request.args.get('order', 42)),
                                        cut_off=int(request.args.get('cut_off', 500)),
                                        window=int(request.args.get('window', 5)))

    return [ConcordanceLinesOut().dump(line) for line in concordance_lines], 200
