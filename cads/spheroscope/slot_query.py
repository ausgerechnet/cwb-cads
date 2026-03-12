#! /usr/bin/env python
# -*- coding: utf-8 -*-

import json

from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, Nested, String, Dict, List
from apiflask.validators import OneOf
from flask import current_app
from pandas import DataFrame, concat
from ccc import SubCorpus

from .. import db
from ..database import Corpus
from ..users import auth
from .database import SlotQuery

bp = APIBlueprint('slot_query', __name__, url_prefix='/slot-query')


def ccc_slot_query(slot_query, context=None):
    """run a slot query, get result as dataframe.

    - TODO force contextid?
    """

    crps = slot_query.corpus.ccc()

    corrections = dict()
    for d in slot_query.corrections:
        try:
            k = int(d['anchor'])
        except ValueError:
            k = d['anchor']
        corrections[k] = d['correction']

    dump = crps.query(
        cqp_query=slot_query.cqp_query,
        corrections=corrections,
        match_strategy=slot_query.match_strategy,
        propagate_error=True,
    )

    # invalid query
    if isinstance(dump, str):
        current_app.logger.error('invalid query')
        return dump

    # valid query, but no matches
    if len(dump.df) == 0:
        current_app.logger.warning(f'no results for query {slot_query.id}')

    return dump.df


def format_line(line, p_show, s_show):
    """format one line, provide dictionary of
    - context
    - contextend
    - tokens (list of dicts): cpos + word
    - structural (dict): s_show

    """

    context = line['context']
    contextend = line['contextend']
    structural = dict()
    for s_att in s_show:
        structural[s_att] = line[s_att]

    line = line['dict']

    tokens = list()
    for cpos, word in zip(line['cpos'], line['word']):
        tokens.append({'cpos': cpos, 'word': word})

    row = {
        'context': context,
        'contextend': contextend,
        'tokens': tokens,
        'structural': structural,
    }

    return row


def lexicalise(df_dump, cwb_id, p_show=["word", "lemma"], s_show=[]):

    lines = SubCorpus(
        subcorpus_name=None,
        df_dump=df_dump,
        corpus_name=cwb_id,
        cqp_bin=current_app.config['CCC_CQP_BIN'],
        registry_dir=current_app.config['CCC_REGISTRY_DIR'],
        data_dir=current_app.config['CCC_DATA_DIR'],
        overwrite=False,
        lib_dir=None
    ).concordance(
        form='dict',
        p_show=p_show,
        s_show=s_show,
        order='asis'
    )

    lines = lines.apply(lambda line: format_line(line, p_show, s_show), axis=1)

    return lines.to_list()


def merge_and_coalesce(df1, df2):
    """
    Merge df1 and df2 intervals (closed), coalesce overlapping/touching spans,
    include original columns, and compute min/max of 'context'/'contextend'.

    Both df1 and df2 must have MultiIndex: ['match', 'matchend'].

    Returns a dataframe with:
        - match, matchend: merged intervals
        - in_df1, in_df2: flags
        - df1_rows, df2_rows: list of contributing original rows
        - context_min: minimum of all context values from df1 and df2
        - context_max: maximum of all contextend values from df1 and df2
    """

    # Reset indices
    df1_reset = df1.reset_index()
    df2_reset = df2.reset_index()

    # Add presence flags
    df1_reset['in_df1'] = True
    df1_reset['in_df2'] = False
    df2_reset['in_df1'] = False
    df2_reset['in_df2'] = True

    # Combine spans
    all_spans = concat([df1_reset, df2_reset], ignore_index=True)
    all_spans = all_spans.sort_values('match').reset_index(drop=True)

    merged = []

    for _, row in all_spans.iterrows():
        s, e = row['match'], row['matchend']

        # Original columns (excluding flags and index)
        df1_cols = {k: row[k] for k in df1_reset.columns if k not in ['in_df1', 'in_df2']}
        df2_cols = {k: row[k] for k in df2_reset.columns if k not in ['in_df1', 'in_df2']}

        # Extract context/contextend if present
        context_val = row['context'] if 'context' in row else None
        contextend_val = row['contextend'] if 'contextend' in row else None

        if not merged:
            merged.append([
                s, e,
                row['in_df1'], row['in_df2'],
                [df1_cols] if row['in_df1'] else [],
                [df2_cols] if row['in_df2'] else [],
                [context_val] if context_val is not None else [],
                [contextend_val] if contextend_val is not None else []
            ])
            continue

        last = merged[-1]
        last_s, last_e, last_df1_flag, last_df2_flag, last_df1_rows, last_df2_rows, last_contexts, last_contextends = last

        if s <= last_e + 1:  # overlap or touching
            # Merge interval
            last[1] = max(last_e, e)
            last[2] = last_df1_flag or row['in_df1']
            last[3] = last_df2_flag or row['in_df2']

            # Append original row data
            if row['in_df1']:
                last[4].append(df1_cols)
            if row['in_df2']:
                last[5].append(df2_cols)

            # Append context/contextend
            if context_val is not None:
                last[6].append(context_val)
            if contextend_val is not None:
                last[7].append(contextend_val)

        else:
            merged.append([
                s, e,
                row['in_df1'], row['in_df2'],
                [df1_cols] if row['in_df1'] else [],
                [df2_cols] if row['in_df2'] else [],
                [context_val] if context_val is not None else [],
                [contextend_val] if contextend_val is not None else []
            ])

    # Build final dataframe
    merged_df = DataFrame(
        merged,
        columns=['match', 'matchend', 'in_df1', 'in_df2', 'df1_rows', 'df2_rows', 'context_list', 'contextend_list']
    )

    # Compute min/max across lists
    merged_df['context_min'] = merged_df['context_list'].apply(lambda x: min(x) if x else None)
    merged_df['context_max'] = merged_df['contextend_list'].apply(lambda x: max(x) if x else None)

    # Drop intermediate lists
    merged_df = merged_df.drop(columns=['context_list', 'contextend_list'])

    return merged_df


class AnchorCorrection(Schema):

    anchor = String()
    correction = Integer()


class AnchorSlot(Schema):

    slot = String()
    start = String()
    end = String()


class SlotQueryIn(Schema):

    corpus_id = Integer(required=True)
    cqp_query = String(required=True)
    name = String()
    slots = Nested(AnchorSlot(many=True))
    corrections = Nested(AnchorCorrection(many=True))
    match_strategy = String(dump_default='longest', required=False, validate=OneOf(['longest', 'shortest', 'standard']))


class SlotQueryOut(Schema):

    id = Integer()
    corpus_id = Integer()
    cqp_query = String()
    name = String()
    slots = Nested(AnchorSlot(many=True))
    corrections = Nested(AnchorCorrection(many=True))
    match_strategy = String(dump_default='longest', required=False, validate=OneOf(['longest', 'shortest', 'standard']))


class SlotDiffIn(Schema):

    id1 = Integer()
    id2 = Integer()


class TokenOut(Schema):

    cpos = Integer(required=True)
    word = String(required=True)


class DiffLine(Schema):

    source = String()
    context = Integer()
    contextend = Integer()
    tokens = Nested(TokenOut(many=True), required=True, dump_default=[])
    structural = Dict(required=True, dump_default={})
    meta_A = List(Dict(keys=String(), values=Integer()), required=True, dump_default=[])
    meta_B = List(Dict(keys=String(), values=Integer()), required=True, dump_default=[])


class ConcLine(Schema):

    tokens = Nested(TokenOut(many=True), required=True, dump_default=[])
    structural = Dict(required=True, dump_default={})
    meta = Dict(keys=String(), values=Integer(), required=True, dump_default=[])


class SlotQueryConcOut(Schema):

    id = Integer()
    lines = Nested(ConcLine(many=True))
    nr_lines = Integer()
    page_size = Integer()
    page_count = Integer()
    page_number = Integer()


class SlotDiffOut(Schema):

    id1 = Integer()
    id2 = Integer()
    lines = Nested(DiffLine(many=True))
    nr_lines = Integer()
    page_size = Integer()
    page_count = Integer()
    page_number = Integer()


@bp.get('/')
@bp.output(SlotQueryOut(many=True))
@bp.auth_required(auth)
def get_all():
    """Get all slot queries.

    """

    slot_queries = SlotQuery.query.all()

    return [SlotQueryOut().dump(q) for q in slot_queries], 200


@bp.post('/create')
@bp.input(SlotQueryIn)
@bp.output(SlotQueryOut)
@bp.auth_required(auth)
def create(json_data):
    """Create a new slot query.

    """

    corpus = db.get_or_404(Corpus, json_data['corpus_id'])
    slots = json_data.get('slots')
    corrections = json_data.get('corrections')
    slot_query = SlotQuery(
        cqp_query=json_data.get('cqp_query'),
        name=json_data.get('name'),
        corpus_id=corpus.id,
        match_strategy=json_data.get('match_strategy'),
        _slots=json.dumps(slots),
        _corrections=json.dumps(corrections),
    )
    db.session.add(slot_query)
    db.session.commit()

    return SlotQueryOut().dump(slot_query), 200


@bp.get('/<id>/')
@bp.output(SlotQueryOut)
@bp.auth_required(auth)
def get_one(id):
    """Get details of a slot query.

    """

    slot_query = db.get_or_404(SlotQuery, id)

    return SlotQueryOut().dump(slot_query), 200


@bp.get('/<id>/concordance')
@bp.output(SlotQueryConcOut)
@bp.auth_required(auth)
def concordance(id):
    """Get concordance lines of a slot query.

    """

    slot_query = db.get_or_404(SlotQuery, id)

    df = ccc_slot_query(slot_query)
    df['concordance'] = lexicalise(df, slot_query.corpus.cwb_id)
    df = df.reset_index()
    anchors = set(range(0, 10)).intersection(set(df.columns))

    def _combine(row):
        row['concordance']['meta'] = {str(k): int(row[k]) for k in anchors}
        row['concordance']['meta']['match'] = row['match']
        row['concordance']['meta']['matchend'] = row['matchend']
        row['concordance']['meta']['context'] = row['context']
        row['concordance']['meta']['contextend'] = row['contextend']
        return row

    lines = df.apply(lambda row: _combine(row), axis=1)['concordance'].to_list()

    print(lines)

    return SlotQueryConcOut().dump({
        'id': slot_query.id,
        'lines': lines,
        'nr_lines': len(lines),
        'page_size': len(lines),
        'page_number': 1,
        'page_count': len(lines)
    }), 200


@bp.get('/diff')
@bp.input(SlotDiffIn, location='query')
@bp.output(SlotDiffOut)
@bp.auth_required(auth)
def diff(query_data):
    """Get difference between two slot queries.

    """

    slot_query_1 = db.get_or_404(SlotQuery, query_data['id1'])
    slot_query_2 = db.get_or_404(SlotQuery, query_data['id2'])

    # check corpora
    assert slot_query_1.corpus.cwb_id == slot_query_2.corpus.cwb_id
    cwb_id = slot_query_1.corpus.cwb_id

    # gather query results and merge
    df1 = ccc_slot_query(slot_query_1)
    df2 = ccc_slot_query(slot_query_2)
    diff = merge_and_coalesce(df1, df2)
    diff['concordance'] = lexicalise(
        diff[['context_min', 'context_max']].rename({'context_min': 'match', 'context_max': 'matchend'}, axis=1).set_index(['match', 'matchend']),
        cwb_id
    )

    def _combine(row):
        row['concordance']['meta_A'] = [{str(k): int(v) for k, v in anchors.items()} for anchors in row['df1_rows']]
        row['concordance']['meta_B'] = [{str(k): int(v) for k, v in anchors.items()} for anchors in row['df2_rows']]
        row['concordance']['source'] = 'A' if len(row['df1_rows']) > 0 else ''
        row['concordance']['source'] += 'B' if len(row['df2_rows']) > 0 else ''
        return row

    conc = diff.apply(lambda row: _combine(row), axis=1)['concordance'].to_list()

    return SlotDiffOut().dump({
        'id1': slot_query_1.id,
        'id2': slot_query_2.id,
        'lines': conc,
        'nr_lines': diff.shape[0],
        'page_size': diff.shape[0],
        'page_number': 1,
        'page_count': diff.shape[0]
    }), 200
