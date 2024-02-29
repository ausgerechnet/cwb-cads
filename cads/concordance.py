#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Boolean, Dict, Integer, List, Nested, String
from apiflask.validators import OneOf
from ccc import SubCorpus
from flask import current_app
from pandas import DataFrame

from . import db
from .database import Matches, Query
from .users import auth

bp = APIBlueprint('concordance', __name__, url_prefix='/<query_id>/concordance')


def ccc2attributes(line, primary, secondary, s_show, window):

    match = line.name[0]
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
        'id': match
    }

    return row


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
    filter_item_p_att = String(required=False)

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


@bp.post("/shuffle")
@bp.auth_required(auth)
def shuffle(query_id):
    # TODO
    return {'msg': 'shuffled'}, 200


@bp.get("/")
@bp.input(ConcordanceIn, location='query')
@bp.output(ConcordanceOut)
@bp.auth_required(auth)
def lines(query_id, data):
    """Get concordance lines.

    """

    # display options
    window = data.get('window')
    primary = data.get('primary')
    secondary = data.get('secondary')
    extended_window = data.get('extended_window')

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
    # sort_by = data.get('sort_by')
    # filter_item = data.get('filter_item')
    # filter_discourseme_ids = data.get('filter_discourseme_ids')

    query = db.get_or_404(Query, query_id)
    s_show = query.corpus.s_annotations
    context_break = query.s

    matches = Matches.query.filter_by(query_id=query.id).paginate(page=page_number, per_page=page_size)

    nr_lines = matches.total
    page_count = matches.pages

    # actual concordancing
    df_dump = DataFrame([vars(s) for s in matches], columns=['match', 'matchend']).set_index(['match', 'matchend'])
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
        context_break=context_break
    ).concordance(
        form='dict',
        p_show=[primary, secondary],
        s_show=s_show
    )

    rows = lines.apply(lambda line: ccc2attributes(line, primary, secondary, s_show, window), axis=1)

    # for line in lines.iterrows():
    #     row['discourseme_ranges'] = []
    #     rows.append(row)

    concordance = {
        'lines': [ConcordanceLineOut().dump(line) for line in rows],
        'nr_lines': nr_lines,
        'page_size': page_size,
        'page_number': page_number,
        'page_count': page_count
    }

    return ConcordanceOut().dump(concordance), 200


@bp.get("/<id>")
@bp.input(ConcordanceLineIn, location='query')
@bp.output(ConcordanceLineOut)
@bp.auth_required(auth)
def context(query_id, id, data):
    """Get (additional context of) one concordance line.

    """

    # display options
    extended_context_break = data.get('extended_context_break')
    extended_window = data.get('extended_window')
    window = data.get('window')
    primary = data.get('primary')
    secondary = data.get('secondary')

    query = db.get_or_404(Query, query_id)
    s_show = query.corpus.s_annotations

    matches = Matches.query.filter_by(match=id, query_id=query.id).all()
    df_dump = DataFrame([vars(s) for s in matches], columns=['match', 'matchend']).set_index(['match', 'matchend'])

    line = SubCorpus(
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
        context_break=extended_context_break
    ).concordance(
        form='dict',
        p_show=[primary, secondary],
        s_show=s_show
    ).iloc[0]

    row = ccc2attributes(line, primary, secondary, s_show, window)
    # row['discourseme_ranges'] = []

    return ConcordanceLineOut().dump(row), 200
