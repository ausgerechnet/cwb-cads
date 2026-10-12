#! /usr/bin/env python
# -*- coding: utf-8 -*-

import json
import os
import re
from glob import glob

import click
from apiflask import APIBlueprint, Schema, abort
from apiflask.fields import Integer, List, Nested, String
from flask import current_app as app

from . import db
from .database import (Corpus, Macro, MacroCall, NestedMacro, NestedWordList,
                       WordList, WordListCall, WordListWords,
                       resolve_macro_body)
from .spheroscope.slot_query import import_slot_query
from .users import auth, write_access_required

bp = APIBlueprint('library', __name__, url_prefix='/library', cli_group='library')


argstring_simple = re.compile(r"\d|10")
argstring_named = re.compile(r"\d=([a-zA-Z_][a-zA-Z0-9_\-]*)")
identifier = re.compile(r"[a-zA-Z_][a-zA-Z0-9_\-]*")


def parse_macro_arguments(argstring):
    """Parses a macro definition to determine number and name of arguments"""

    match = argstring_simple.match(argstring)
    if match:
        return int(argstring), None
    else:
        args = argstring_named.findall(argstring)
        return len(args), args if args else None


def parse_macro_file(text):
    """Parses the contents of a CQP macro file (possibly containing several
    macro definitions) into a list of dictionaries with keys name, valency,
    argument_names, body"""

    macros = list()
    for match in re.finditer(r"MACRO ([a-zA-Z_][a-zA-Z0-9_\-]*)\((.*?)\)(.+?);", text, flags=re.S):
        valency, argument_names = parse_macro_arguments(match[2])
        macros.append(dict(
            name=match[1],
            valency=valency,
            argument_names=argument_names,
            body=match[3]
        ))

    return macros


def normalise_macro_body(body):
    """Removes indentation, adds trailing newline"""

    body = body.strip()
    body = "\n".join(line.strip() for line in body.split("\n"))

    return body + "\n"


def create_wordlist(name, words, corpus_id, comment=None):
    """Creates a new version of a word list, unless the latest version
    with this name is identical (comments are ignored).

    Returns the word list and whether it was created.
    Adds to the session but does not commit or write to disk.
    """

    if not identifier.fullmatch(name):
        raise ValueError(f"invalid word list name '{name}'")

    words = [w.strip() for w in words if w.strip()]

    latest = WordList.query \
        .filter(WordList.corpus_id == corpus_id) \
        .filter(WordList.name == name) \
        .order_by(WordList.version.desc()) \
        .first()

    if latest and latest.word_list == words:
        return latest, False

    wordlist = WordList(
        name=name,
        version=latest.version + 1 if latest else 1,
        corpus_id=corpus_id,
        comment=comment
    )
    wordlist.words = [WordListWords(word=word) for word in words]
    db.session.add(wordlist)
    db.session.flush()

    return wordlist, True


def create_macro(name, body, corpus_id, valency=None, argument_names=None, comment=None):
    """Creates a new version of a macro, unless the latest version with this
    name and valency is identical (same mangled body and argument names;
    comments are ignored). Nested word lists and macros are resolved to their
    latest versions.

    Returns the macro and whether it was created.
    Adds to the session but does not commit or write to disk.
    Raises ValueError if the definition is invalid or dependencies cannot be resolved.
    """

    if not identifier.fullmatch(name):
        raise ValueError(f"invalid macro name '{name}'")

    if argument_names:
        if valency is not None and valency != len(argument_names):
            raise ValueError(f"valency {valency} does not match argument names {argument_names}")
        for argument_name in argument_names:
            if not identifier.fullmatch(argument_name):
                raise ValueError(f"invalid argument name '{argument_name}'")
        valency = len(argument_names)
    if valency is None:
        raise ValueError("either valency or argument_names must be provided")

    body = normalise_macro_body(body)
    argument_names = json.dumps(argument_names) if argument_names else None
    mangled_body, _, _ = resolve_macro_body(body, corpus_id)

    latest = Macro.query \
        .filter(Macro.corpus_id == corpus_id) \
        .filter(Macro.name == name) \
        .filter(Macro.valency == valency) \
        .order_by(Macro.version.desc()) \
        .first()

    if latest and latest.body == mangled_body and latest.argument_names == argument_names:
        return latest, False

    macro = Macro(
        name=name,
        valency=valency,
        argument_names=argument_names,
        version=latest.version + 1 if latest else 1,
        corpus_id=corpus_id,
        body=body,
        comment=comment
    )

    return macro, True


def create_macros(macros, corpus_id, comment=None):
    """Creates several macros (dictionaries with keys name, valency,
    argument_names, body). Macros whose dependencies cannot be resolved are
    retried after the others, so the order of definitions does not matter.

    Returns the list of macros and the list of errors (if any).
    """

    results = list()
    pending = list(macros)
    while pending:
        errors = list()
        failed = list()
        for m in pending:
            try:
                macro, _ = create_macro(m['name'], m['body'], corpus_id, m['valency'], m['argument_names'], comment)
                results.append(macro)
            except ValueError as e:
                errors.append(f"macro '{m['name']}' with valency {m['valency']}: {e}")
                failed.append(m)
        if len(failed) == len(pending):
            return results, errors
        pending = failed

    return results, []


def save_wordlist(name, words, corpus_id, comment=None):
    """Creates (or reuses) a word list, commits, and writes it to the library directory"""

    wordlist, _ = create_wordlist(name, words, corpus_id, comment)
    db.session.commit()
    wordlist.write()

    return wordlist


def import_wordlist(path, corpus_id, comment="imported via CLI"):

    name = path.split('/')[-1].split('.')[0]
    with open(path, "rt") as f:
        words = f.read().strip().split("\n")

    return save_wordlist(name, words, corpus_id, comment)


def import_library(lib_dir, corpus_id, username):

    """Imports a library of macros, word lists and slot queries for a
    given corpus from a given directory"""

    paths_macros = sorted(glob(os.path.join(lib_dir, "macros", "*.txt")))
    paths_wordlists = sorted(glob(os.path.join(lib_dir, "wordlists", "*.txt")))
    paths_queries = sorted(glob(os.path.join(lib_dir, "queries", "*.cqpy")))

    for path in paths_wordlists:
        import_wordlist(path, corpus_id)

    macros = list()
    for path in paths_macros:
        app.logger.debug(f"Reading macros from file '{path}'")
        with open(path, "rt") as f:
            macros.extend(parse_macro_file(f.read()))

    macros, errors = create_macros(macros, corpus_id, comment="imported via CLI")
    for error in errors:
        app.logger.error(f"could not import {error}")
    db.session.commit()
    for macro in macros:
        macro.write()

    for path in paths_queries:
        import_slot_query(path, corpus_id)


################
# API schemata #
################

class MacroIn(Schema):

    name = String(required=True)
    body = String(required=True)
    valency = Integer(required=False, load_default=None)
    argument_names = List(String(), required=False, load_default=None)
    comment = String(required=False, load_default=None)


class MacroOut(Schema):

    id = Integer()
    modified = String()
    corpus_id = Integer()
    name = String()
    version = Integer()
    valency = Integer()
    argument_names = List(String(), attribute='argument_list', allow_none=True)
    comment = String()
    body = String()


class WordListIn(Schema):

    name = String(required=True)
    words = List(String(), required=True)
    comment = String(required=False, load_default=None)


class WordListOut(Schema):

    id = Integer()
    modified = String()
    corpus_id = Integer()
    name = String()
    version = Integer()
    comment = String()
    words = List(String(), attribute='word_list')


class LibraryImportIn(Schema):

    macros = String(required=False, load_default="",
                    metadata={'description': 'CQP macro definitions (contents of one or more macro files)'})
    wordlists = List(Nested(WordListIn), required=False, load_default=[])


class LibraryImportOut(Schema):

    wordlists = Nested(WordListOut(many=True))
    macros = Nested(MacroOut(many=True))


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

        return macro, 200
    except:
        return abort(404, message=f"Macro with id {id} does not exist for corpus with id {corpus_id} in database")


@bp.get("/<corpus_id>/macros")
@bp.output(MacroOut(many=True))
@bp.auth_required(auth)
def get_macros(corpus_id):

    """Gets all macros for a specified corpus"""

    corpus = db.get_or_404(Corpus, corpus_id)

    macros = Macro.query.\
        filter(Macro.corpus_id == corpus.id).\
        all()

    return macros, 200


@bp.post("/<corpus_id>/macros")
@bp.input(MacroIn)
@bp.output(MacroOut, status_code=201)
@bp.auth_required(auth)
@write_access_required
def create_macro_endpoint(corpus_id, json_data):

    """Creates a new version of a macro for a specified corpus.
    Returns the latest version (status 200) if it is identical.
    Nested word lists and macros are resolved to their latest versions."""

    corpus = db.get_or_404(Corpus, corpus_id)

    try:
        macro, created = create_macro(corpus_id=corpus.id, **json_data)
    except ValueError as e:
        db.session.rollback()
        return abort(400, message=str(e))

    db.session.commit()
    macro.write()

    return macro, 201 if created else 200


@bp.delete("/<corpus_id>/macros/<id>")
@bp.auth_required(auth)
@write_access_required
def delete_macro(corpus_id, id):

    """Deletes a single macro version, unless it is used by a query or another macro"""

    corpus = db.get_or_404(Corpus, corpus_id)
    macro = Macro.query.filter(Macro.corpus_id == corpus.id, Macro.id == id).first()
    if not macro:
        return abort(404, message=f"Macro with id {id} does not exist for corpus with id {corpus_id} in database")

    if MacroCall.query.filter(MacroCall.macro_id == macro.id).first() or \
       NestedMacro.query.filter(NestedMacro.nested_id == macro.id).first():
        return abort(409, message=f"Macro with id {id} is used by a query or another macro")

    path = macro.path
    db.session.delete(macro)
    db.session.commit()
    if os.path.exists(path):
        os.remove(path)

    return 'Deletion successful.', 200


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

        return wl, 200
    except:
        return abort(404, message=f"Word list with id {id} does not exist for corpus with id {corpus_id} in database")


@bp.get("/<corpus_id>/wordlists")
@bp.output(WordListOut(many=True))
@bp.auth_required(auth)
def get_word_lists(corpus_id):

    """Gets all wordlists for a specified corpus"""

    corpus = db.get_or_404(Corpus, corpus_id)

    wls = WordList.query.\
        filter(WordList.corpus_id == corpus.id).\
        all()

    return wls, 200


@bp.post("/<corpus_id>/wordlists")
@bp.input(WordListIn)
@bp.output(WordListOut, status_code=201)
@bp.auth_required(auth)
@write_access_required
def create_word_list(corpus_id, json_data):

    """Creates a new version of a word list for a specified corpus.
    Returns the latest version (status 200) if it is identical."""

    corpus = db.get_or_404(Corpus, corpus_id)

    try:
        wordlist, created = create_wordlist(corpus_id=corpus.id, **json_data)
    except ValueError as e:
        db.session.rollback()
        return abort(400, message=str(e))

    db.session.commit()
    wordlist.write()

    return wordlist, 201 if created else 200


@bp.delete("/<corpus_id>/wordlists/<id>")
@bp.auth_required(auth)
@write_access_required
def delete_word_list(corpus_id, id):

    """Deletes a single word list version, unless it is used by a query or a macro"""

    corpus = db.get_or_404(Corpus, corpus_id)
    wordlist = WordList.query.filter(WordList.corpus_id == corpus.id, WordList.id == id).first()
    if not wordlist:
        return abort(404, message=f"Word list with id {id} does not exist for corpus with id {corpus_id} in database")

    if WordListCall.query.filter(WordListCall.wordlist_id == wordlist.id).first() or \
       NestedWordList.query.filter(NestedWordList.wordlist_id == wordlist.id).first():
        return abort(409, message=f"Word list with id {id} is used by a query or a macro")

    path = wordlist.path
    db.session.delete(wordlist)
    db.session.commit()
    if os.path.exists(path):
        os.remove(path)

    return 'Deletion successful.', 200


@bp.post("/<corpus_id>/import")
@bp.input(LibraryImportIn)
@bp.output(LibraryImportOut)
@bp.auth_required(auth)
@write_access_required
def import_definitions(corpus_id, json_data):

    """Imports CQP macro definitions and word lists for a specified corpus.
    Changed definitions are imported as new versions, identical ones are reused.
    Word lists are imported first; macros may be defined in any order.
    Nothing is imported if any definition fails."""

    corpus = db.get_or_404(Corpus, corpus_id)

    try:
        wordlists = list()
        for wl in json_data['wordlists']:
            wordlist, _ = create_wordlist(wl['name'], wl['words'], corpus.id,
                                          comment=wl['comment'] or "imported via API")
            wordlists.append(wordlist)

        definitions = parse_macro_file(json_data['macros'])
        macros, errors = create_macros(definitions, corpus.id, comment="imported via API")
        if errors:
            raise ValueError("; ".join(errors))

    except ValueError as e:
        db.session.rollback()
        return abort(400, message=str(e))

    db.session.commit()
    for wordlist in wordlists:
        wordlist.write()
    for macro in macros:
        macro.write()

    return {'wordlists': wordlists, 'macros': macros}, 200


################
# CLI commands #
################

@bp.cli.command('import-library')
@click.option('--corpus_id', default=1)
@click.option('--lib_dir', default='tests/library/')
def import_library_cmd(corpus_id, lib_dir):

    username = 'admin'

    import_library(lib_dir, corpus_id, username)
