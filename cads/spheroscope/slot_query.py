#! /usr/bin/env python
# -*- coding: utf-8 -*-

import os

from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, String, Nested
from apiflask.validators import OneOf

from flask import current_app
from .database import SlotQuery
from ..database import Corpus
from ..users import auth
from .. import db

bp = APIBlueprint('slot_query', __name__, url_prefix='/slot-query')


def ccc_get_library(slot_query, wordlists=[], macros=[]):

    crps = slot_query.corpus.ccc()
    cqp = crps.start_cqp()

    for wordlist in wordlists:
        name = wordlist.split('/')[-1].split('.')[0]
        abs_path = os.path.abspath(wordlist)
        cqp_exec = f'define ${name} < "{abs_path}";'
        cqp.Exec(cqp_exec)

    # macros
    for macro in macros:
        abs_path = os.path.abspath(macro)
        cqp_exec = f'define macro < "{abs_path}";'
        cqp.Exec(cqp_exec)
    # for wordlists defined in macros, it is necessary to execute the macro once
    macros = cqp.Exec("show macro;").split("\n")
    for macro in macros:
        # NB: this yields !cqp.Ok() if macro is not zero-valent
        cqp.Exec(macro.split("(")[0] + "();")

    cqp.Exec("set ParseOnly on;")
    cqp.Exec("set SpheroscopeDebug on;")
    cqp.Exec("set SpheroscopeDebug;")
    print(cqp.Ok())
    print(cqp.Exec(slot_query.cqp_query))
    print(cqp.Ok())
    cqp.__del__()


def ccc_slot_query(slot_query):

    crps = slot_query.corpus.ccc()

    # get dump
    dump = crps.query(
        cqp_query=slot_query.cqp_query,
        corrections=slot_query.corrections,
        match_strategy=slot_query.match_strategy,
        propagate_error=True
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
        _slots="",
        _corrections="",
    )
    import os
    from glob import glob

    wordlists = glob(os.path.join('tests', 'library', 'wordlists', '*.txt'))
    macros = glob(os.path.join('tests', 'library', 'macros', '*.txt'))

    ccc_get_library(slot_query, wordlists, macros)
    # ccc_slot_query(slot_query)

    return SlotQueryOut().dump(slot_query), 200
