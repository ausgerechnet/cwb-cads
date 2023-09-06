#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, List, String
from ccc import Corpus
from ccc.utils import format_cqp_query, cqp_escape
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

    for line in lines:
        line['lemma'] = [cqp_escape(lemma) for lemma in line['lemma']]

    return lines


class ConcordanceLinesOut(Schema):

    match = Integer()
    meta = String()

    cpos = List(Integer)
    offset = List(Integer)
    word = List(String)
    lemma = List(String)
    role = List(List(String))


@bp.get("/concordance")
@bp.output(ConcordanceLinesOut(many=True))
@bp.auth_required(auth)
def lines(query_id):
    """Get concordance lines.

    """

    query = db.get_or_404(Query, query_id)

    concordance_lines = ccc_concordance(query,
                                        context_break=request.args.get('context_break', None),
                                        p_show=request.args.getlist('p_show', ['word', 'lemma']),
                                        s_show=request.args.getlist('s_show', []),
                                        highlight_discoursemes=[],
                                        filter_queries={},
                                        order=request.args.get('order'),
                                        cut_off=request.args.get('cut_off'),
                                        window=request.args.get('window'))

    return [ConcordanceLinesOut().dump(line) for line in concordance_lines], 200
