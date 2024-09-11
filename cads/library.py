#! /usr/bin/env python
# -*- coding: utf-8 -*-

import json
import os
from glob import glob
import re

import click
from flask import current_app as app
from apiflask import APIBlueprint, Schema, abort
from apiflask.fields import Boolean, Float, Integer, List, Nested, String
from .database import Macro, NestedMacro, WordList, WordListWords, Corpus
from .users import auth
from . import db

from .spheroscope.slot_query import import_slot_query


bp = APIBlueprint('library', __name__, url_prefix='/library', cli_group='library')


argstring_simple = re.compile(r"\d|10")
argstring_named = re.compile(r"\d=([a-zA-Z_][a-zA-Z0-9_\-]*)")

def parse_macro_arguments(argstring):
    print(argstring)
    match = argstring_simple.match(argstring)
    if match:
        return int(argstring), None
    else:
        args = argstring_named.findall(argstring)
        return len(args), args if args else None


# macros are fun macros are fun macros are fun
def import_macro(name, valency, argument_names, body, corpus_id):

    macro = Macro(
        name=name,
        valency=valency,
        argument_names=json.dumps(argument_names) if argument_names else None,
        version=1,
        corpus_id=corpus_id,
        body=body,
        comment='imported via CLI'
    )

    db.session.add(macro)
    db.session.commit()

    # handle nested macros
    nested_identifiers = {m[1] for m in re.finditer(r"/([a-zA-Z_][a-zA-Z0-9_\-]*)\[.*?\]", macro.body)}
    if nested_identifiers:
        app.logger.debug(f"\tcontains nested macro calls: '{nested_identifiers}'")

    nested_macros = []
    for unmangled in nested_identifiers:
        # check if macro with this identifier is in db
        # and get latest version
        nm = Macro.query \
                .filter(Macro.name == unmangled) \
                .order_by(Macro.version.desc()) \
                .first()
        
        if not nm:
            # abort and delete macro if it cannot be called
            app.logger.error(f"could not import macro {name} because it contains undefined nested macro calls")
            db.session.delete(macro)
            db.session.commit()
            return
        else:
            # mangle and replace identifiers in the macro definition
            pattern = fr"/{unmangled}\[(.*?)\]"
            repl = fr"/{nm.name}__v{nm.version}[\1]"
            macro.body = re.sub(pattern, repl, macro.body, flags=re.S)

            # save the dependency in the db
            record = NestedMacro(
                macro_id=macro.id,
                nested_id=nm.id
            )
            nested_macros.append(record)

    db.session.bulk_save_objects(nested_macros)
    db.session.commit()

    # write macro to disk so it can be loaded by CQP
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
        # load the file
        with open(path, "rt") as f:
            file = f.read().strip()

        # break up into individual macros and import
        for match in re.finditer(r"MACRO ([a-zA-Z_][a-zA-Z0-9_\-]*)\((.*?)\)(.+?);", file, flags=re.S):
            name = match[1]
            arguments = match[2]
            body = match[3]

            valency, argument_names = parse_macro_arguments(arguments)

            # process body to remove indentation
            body = body.strip()
            body = "\n".join(line.strip() for line in body.split("\n"))
            body += "\n"

            if argument_names:
                app.logger.debug(f"Importing macro '{name}' with arguments {argument_names} from file '{path}'")
            else:
                app.logger.debug(f"Importing macro '{name}' with {valency} arguments from file '{path}'")
            
            import_macro(name, valency, argument_names, body, corpus_id)

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
