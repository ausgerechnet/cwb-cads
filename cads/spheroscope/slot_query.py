#! /usr/bin/env python
# -*- coding: utf-8 -*-

import json
import re
import os

from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, Nested, String
from apiflask.validators import OneOf
from ccc.cqpy import cqpy_load

from flask import current_app as app

from .. import db
from ..database import Corpus
from ..users import auth
from .database import SlotQuery

bp = APIBlueprint('slot_query', __name__, url_prefix='/slot-query')


def ccc_get_library(slot_query, wordlists=[], macros=[]):

    """TODO find out the exact purpose of this function
    
    This function runs a slot query and dumps the macros and word lists
    defined within it?"""

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
    cqp.Exec('set PrettyPrint off;')
    cqp.Exec("set SpheroscopeDebug on;")
    cqp.Exec("set SpheroscopeDebug;")

    result = cqp.Exec(slot_query.cqp_query)
    cqp.__del__()

    wordlists = list()
    macros = list()
    for line in result.split("\n"):
        if line.startswith("WORDLIST"):
            wordlists.append(line.split(" ")[-1])
        elif line.startswith("MACRO"):
            macros.append(line.split(" ")[-1])

    return {
        'wordlists': wordlists,
        'macros': macros
    }


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
        app.logger.error('invalid query')
        return dump

    # valid query, but no matches
    if len(dump.df) == 0:
        app.logger.warning(f'no results for query {slot_query.id}')

    return dump.df


def import_slot_query(path, corpus_id):

    query = cqpy_load(path)

    slots = [{'slot': key, 'start': str(value[0]), 'end': str(value[1])} for key, value in query['anchors']['slots'].items()]
    corrections = [{'anchor': str(key), 'correction': int(value)} for key, value in query['anchors']['corrections'].items()]

    # app.logger.debug(f"importing query {query['cqp']}")

    macro_matches = re.finditer(r"/([a-zA-Z_][a-zA-Z0-9_\-]*)\[.*?\]", query['cqp'])
    macro_calls = {m[1] for m in macro_matches}
    # app.logger.debug(f"\tcontains calls to macros '{macro_calls}'")

    slot_query = SlotQuery(
        corpus_id=corpus_id,
        cqp_query=query['cqp'],
        name=query['meta']['name'],
        _slots=json.dumps(slots),
        _corrections=json.dumps(corrections)
    )
    db.session.add(slot_query)
    db.session.commit()
    slot_query.write()


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
