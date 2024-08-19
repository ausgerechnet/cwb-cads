#! /usr/bin/env python
# -*- coding: utf-8 -*-

import os
from glob import glob
import click
from flask import Blueprint
from ccc.cqpy import cqpy_load
from .database import WordList, Macro, SlotQuery, WordListWords
from .. import db
import json

bp = Blueprint('library', __name__, url_prefix='/library', cli_group='library')


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


def import_macro(path):

    name = path.split("/")[-1].split(".")[0]
    with open(path, "rt") as f:
        macro = f.read().strip()

    macro = Macro(
        name=name,
        macro=macro,
        comment='imported macro'
    )
    db.session.add(macro)
    db.session.commit()
    macro.write()


def import_wordlist(path):

    name = path.split('/')[-1].split('.')[0]
    with open(path, "rt") as f:
        words = f.read().strip().split("\n")

    wordlist = WordList(
        name=name,
        comment='imported wordlist'
    )
    db.session.add(wordlist)
    db.session.commit()
    for word in words:
        db.session.add(WordListWords(wordlist_id=wordlist.id, word=word))
    db.session.commit()
    wordlist.write()


def import_query(path, corpus_id):

    query = cqpy_load(path)

    slots = [{'slot': key, 'start': str(value[0]), 'end': str(value[1])} for key, value in query['anchors']['slots'].items()]
    corrections = [{'anchor': str(key), 'correction': int(value)} for key, value in query['anchors']['corrections'].items()]

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


def import_library(lib_dir, corpus_id, username):

    paths_macros = glob(os.path.join(lib_dir, "macros", "*.txt"))
    paths_wordlists = glob(os.path.join(lib_dir, "wordlists", "*.txt"))
    paths_queries = glob(os.path.join(lib_dir, "queries", "*.cqpy"))

    for path in paths_macros:
        import_macro(path)
    for path in paths_wordlists:
        import_wordlist(path)
    for path in paths_queries:
        import_query(path, corpus_id)


@bp.cli.command('import-library')
@click.option('--lib_dir', default='tests/library/')
def import_library_cmd(lib_dir):

    corpus_id = 1               # TODO
    username = 'admin'

    import_library(lib_dir, corpus_id, username)
