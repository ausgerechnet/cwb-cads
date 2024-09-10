#! /usr/bin/env python
# -*- coding: utf-8 -*-

import json
import os
from glob import glob

import click
from apiflask import APIBlueprint, Schema, abort
from apiflask.fields import Boolean, Float, Integer, List, Nested, String
from .database import WordList, Macro, WordListWords, Corpus
from .users import auth
from . import db

from .spheroscope.slot_query import import_slot_query


bp = APIBlueprint('library', __name__, url_prefix='/library', cli_group='library')


def import_macro(path, corpus_id):

    name = path.split("/")[-1].split(".")[0]
    with open(path, "rt") as f:
        macro = f.read().strip()

    macro = Macro(
        name=name,
        version=1,
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
        version=1,
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


################
# API schemata #
################

class MacroOut(Schema):

    id = Integer()
    modified = String()
    corpus_id = Integer()
    name = String()
    version = Integer()
    comment = String()
    macro = String()


class WordListOut(Schema):
    
    id = Integer()
    modified = String()
    corpus_id = Integer()
    name = String()
    version = Integer()
    comment = String()
    words = List(String())

#################
# API endpoints #
#################

@bp.get("/<corpus_id>/macros/<id>")
@bp.output(MacroOut)
@bp.auth_required(auth)
def get_macro(corpus_id, id):

    """Gets a single macro for a specified corpus"""

    corpus = db.get_or_404(Corpus, corpus_id) 

    try:
        macro = Macro.query \
                .filter(Macro.corpus_id == corpus.id) \
                .filter(Macro.id == id) \
                .one()

        return MacroOut().dump(macro), 200
    except:
        return abort(404, message=f"Macro with id {id} does not exist for corpus with id {corpus_id} in database")


@bp.get("/<corpus_id>/macros")
@bp.output(MacroOut(many=True))
@bp.auth_required(auth)
def get_macros(corpus_id):

    """Gets all macros for a specified corpus"""

    corpus = db.get_or_404(Corpus, corpus_id) 

    macros = Macro.query \
            .filter(Macro.corpus_id == corpus.id) \
            .all()

    return [MacroOut().dump(m) for m in macros], 200


@bp.get("/<corpus_id>/wordlists/<id>")
@bp.output(WordListOut)
@bp.auth_required(auth)
def get_word_list(corpus_id, id):

    """Gets a single wordlist for a specified corpus"""

    corpus = db.get_or_404(Corpus, corpus_id) 

    try:
        wl = WordList.query \
                .filter(WordList.corpus_id == corpus.id) \
                .filter(WordList.id == id) \
                .one()

        return WordListOut().dump(wl), 200
    except:
        return abort(404, message=f"Word list with id {id} does not exist for corpus with id {corpus_id} in database")


@bp.get("/<corpus_id>/wordlists")
@bp.output(WordListOut(many=True))
@bp.auth_required(auth)
def get_word_lists(corpus_id):

    """Gets all wordlists for a specified corpus"""

    corpus = db.get_or_404(Corpus, corpus_id) 

    wls = WordList.query \
            .filter(WordList.corpus_id == corpus.id) \
            .all()

    return [WordListOut().dump(wl) for wl in wls], 200


################
# CLI commands #
################

@bp.cli.command('import-library')
@click.option('--corpus_id', default=1)
@click.option('--lib_dir', default='tests/library/')
def import_library_cmd(corpus_id, lib_dir): 

    username = 'admin'

    import_library(lib_dir, corpus_id, username)
