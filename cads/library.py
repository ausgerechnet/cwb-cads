#! /usr/bin/env python
# -*- coding: utf-8 -*-

import json
import os
from glob import glob

import click
from flask import Blueprint
from .database import WordList, Macro, WordListWords
from . import db
import json

from .spheroscope.slot_query import import_slot_query

bp = Blueprint('library', __name__, url_prefix='/library', cli_group='library')


def import_macro(path, corpus_id):

    name = path.split("/")[-1].split(".")[0]
    with open(path, "rt") as f:
        macro = f.read().strip()

    macro = Macro(
        name=name,
        corpus_id=corpus_id,
        macro=macro,
        comment='imported via CLI'
    )
    db.session.add(macro)
    db.session.commit()
    macro.write()


def import_wordlist(path, corpus_id):

    name = path.split('/')[-1].split('.')[0]
    with open(path, "rt") as f:
        words = f.read().strip().split("\n")

    wordlist = WordList(
        name=name,
        corpus_id=corpus_id,
        comment='imported via CLI'
    )
    db.session.add(wordlist)
    db.session.commit()
    for word in words:
        db.session.add(WordListWords(wordlist_id=wordlist.id, word=word))
    db.session.commit()
    wordlist.write()


def import_library(lib_dir, corpus_id, username):

    """Imports a library of macros, word lists and slot queries for a
    given corpus from a given directory"""

    paths_macros = glob(os.path.join(lib_dir, "macros", "*.txt"))
    paths_wordlists = glob(os.path.join(lib_dir, "wordlists", "*.txt"))
    paths_queries = glob(os.path.join(lib_dir, "queries", "*.cqpy"))

    for path in paths_macros:
        import_macro(path, corpus_id)
    for path in paths_wordlists:
        import_wordlist(path, corpus_id)
    for path in paths_queries:
        import_slot_query(path, corpus_id)


@bp.cli.command('import-library')
@click.option('--corpus_id', default=1)
@click.option('--lib_dir', default='tests/library/')
def import_library_cmd(corpus_id, lib_dir):

    username = 'admin'

    import_library(lib_dir, corpus_id, username)
