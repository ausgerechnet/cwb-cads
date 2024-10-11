#! /usr/bin/env python
# -*- coding: utf-8 -*-

import json

from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, Nested, String
from apiflask.validators import OneOf
from flask import current_app

from .. import db
from ..database import Corpus
from ..users import auth
from .database import SlotQuery

bp = APIBlueprint('slot_query', __name__, url_prefix='/slot-query')


def ccc_slot_query(slot_query):

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


class AnchorCorrection(Schema):

    anchor = String()
    correction = Integer()


class AnchorSlot(Schema):

    slot = String()
    start = String()
    end = String()


class SlotQueryIn(Schema):

    corpus_id = Integer(required=True)
    cqp_query = String()
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


@bp.get('/')
@bp.output(SlotQueryOut(many=True))
@bp.auth_required(auth)
def get_all():
    """

    """

    slot_queries = SlotQuery.query.all()

    return [SlotQueryOut().dump(q) for q in slot_queries], 200


@bp.post('/create')
@bp.input(SlotQueryIn)
@bp.output(SlotQueryOut)
@bp.auth_required(auth)
def create(json_data):
    """

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

    return SlotQueryOut().dump(slot_query), 200


@bp.post('/<id>/execute')
@bp.output(SlotQueryOut)
@bp.auth_required(auth)
def execute(id):
    """

    """

    slot_query = db.get_or_404(SlotQuery, id)

    # this is the dataframe with corpus positions of match, matchend (as index), anchors (0-9), and context and contextend:
    df = ccc_slot_query(slot_query)
    # TODO flexiconc integration
    print(df)

    return SlotQueryOut().dump(slot_query), 200
