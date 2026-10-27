#! /usr/bin/env python
# -*- coding: utf-8 -*-

import json
import os
import re
from glob import glob

import click
from apiflask import APIBlueprint, Schema, abort
from apiflask.fields import Boolean, Integer, List, Nested, String
from flask import current_app as app

from . import db
from .database import (Corpus, Macro, MacroCall, NestedMacro, NestedWordList,
                       Query, WordList, WordListCall, WordListWords,
                       current_macro, current_wordlist, resolve_macro_body)
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


UNCHANGED, CREATED, RESTORED = 'unchanged', 'created', 'restored'


def latest_version_number(model, corpus_id, name, valency=None):
    """Returns the highest version number of a word list or macro (0 if there is none)"""

    query = db.session.query(db.func.max(model.version)).filter(model.corpus_id == corpus_id, model.name == name)
    if model is Macro:
        query = query.filter(Macro.valency == valency)

    return query.scalar() or 0


def create_wordlist(name, words, corpus_id, comment=None):
    """Makes a word list with these words the current version: returns the
    current version if it is identical (UNCHANGED), makes an identical older
    version current again (RESTORED), or creates a new version (CREATED).
    Comments are ignored when comparing.

    Returns the word list and the status. A changed word list remembers the
    previously current version (attribute previous_current, possibly None).
    Adds to the session but does not commit or write to disk.
    """

    if not identifier.fullmatch(name):
        raise ValueError(f"invalid word list name '{name}'")

    words = [w.strip() for w in words if w.strip()]

    current = current_wordlist(corpus_id, name)
    if current and current.word_list == words:
        return current, UNCHANGED

    identical = [wl for wl in WordList.query.filter_by(corpus_id=corpus_id, name=name).order_by(WordList.version.desc())
                 if wl.word_list == words]
    if identical:
        wordlist, status = identical[0], RESTORED
    else:
        wordlist, status = WordList(
            name=name,
            version=latest_version_number(WordList, corpus_id, name) + 1,
            corpus_id=corpus_id,
            comment=comment
        ), CREATED
        wordlist.words = [WordListWords(word=word) for word in words]
    wordlist.activate()
    wordlist.previous_current = current

    return wordlist, status


def create_macro(name, body, corpus_id, valency=None, argument_names=None, comment=None):
    """Makes a macro with this definition the current version: returns the
    current version if it is identical (UNCHANGED), makes an identical older
    version current again (RESTORED), or creates a new version (CREATED).
    Versions are identical if they have the same mangled body and argument
    names (comments are ignored). Nested word lists and macros are resolved to
    their current versions.

    Returns the macro and the status. A changed macro remembers the
    previously current version (attribute previous_current, possibly None).
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

    def is_identical(macro):
        return macro.body == mangled_body and macro.argument_names == argument_names

    current = current_macro(corpus_id, name, valency)
    if current and is_identical(current):
        return current, UNCHANGED

    identical = Macro.query.filter_by(corpus_id=corpus_id, name=name, valency=valency) \
        .filter(Macro.body == mangled_body) \
        .order_by(Macro.version.desc())
    identical = [m for m in identical if is_identical(m)]
    if identical:
        macro, status = identical[0], RESTORED
    else:
        macro, status = Macro(
            name=name,
            valency=valency,
            argument_names=argument_names,
            version=latest_version_number(Macro, corpus_id, name, valency) + 1,
            corpus_id=corpus_id,
            body=body,
            comment=comment
        ), CREATED
    macro.activate()
    macro.previous_current = current

    return macro, status


def create_macros(macros, corpus_id, comment=None):
    """Creates several macros (dictionaries with keys name, valency,
    argument_names, body). Macros whose dependencies cannot be resolved are
    retried after the others, so the order of definitions does not matter.

    Returns the list of macros, the list of changed (created or restored)
    versions among them, and the list of errors (if any).
    """

    results = list()
    created = list()
    pending = list(macros)
    while pending:
        errors = list()
        failed = list()
        for m in pending:
            try:
                macro, status = create_macro(m['name'], m['body'], corpus_id, m['valency'], m['argument_names'], comment)
                results.append(macro)
                if status != UNCHANGED:
                    created.append(macro)
            except ValueError as e:
                errors.append(f"macro '{m['name']}' with valency {m['valency']}: {e}")
                failed.append(m)
        if len(failed) == len(pending):
            return results, created, errors
        pending = failed

    return results, created, []


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

    from .spheroscope.slot_query import import_slot_query

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

    macros, _, errors = create_macros(macros, corpus_id, comment="imported via CLI")
    for error in errors:
        app.logger.error(f"could not import {error}")
    db.session.commit()
    for macro in macros:
        macro.write()

    for path in paths_queries:
        import_slot_query(path, corpus_id)


def macros_using(macro_ids):
    """Returns the ids of all macros that (transitively) nest any of the given macros"""

    found = set()
    frontier = set(macro_ids)
    while frontier:
        parents = {n.macro_id for n in NestedMacro.query.filter(NestedMacro.nested_id.in_(frontier))}
        frontier = parents - found
        found |= parents

    return found


def macros_depending_on(macro_ids=set(), wordlist_ids=set()):
    """Returns the ids of all macros that (transitively) use any of the given macros or word lists"""

    direct = {n.macro_id for n in NestedWordList.query.filter(NestedWordList.wordlist_id.in_(wordlist_ids))}

    return direct | macros_using(direct | set(macro_ids))


def usage(macro_ids=set(), wordlist_ids=set()):
    """Returns macros and queries that (transitively) use any of the given macros or word lists"""

    macros = macros_depending_on(macro_ids, wordlist_ids)

    query_ids = {c.query_id for c in WordListCall.query.filter(WordListCall.wordlist_id.in_(wordlist_ids))} | \
        {c.query_id for c in MacroCall.query.filter(MacroCall.macro_id.in_(macros | set(macro_ids)))}

    return (
        Macro.query.filter(Macro.id.in_(macros)).order_by(Macro.id).all(),
        Query.query.filter(Query.id.in_(query_ids)).order_by(Query.id).all()
    )


###############
# propagation #
###############

def dependency_changes(old, new, path=[]):
    """Compares two dependency trees (see Query.dependencies) and returns the
    word lists and macros with different versions as a list of dictionaries
    with keys kind, name, valency (macros only), from, to, and path (names of
    the macros via which it is used, outermost first)

    """

    changes = list()

    before = {wl['name']: wl for wl in old['wordlists']}
    for wl in new['wordlists']:
        if wl['name'] in before and before[wl['name']]['version'] != wl['version']:
            changes.append({'kind': 'wordlist', 'name': wl['name'],
                            'from': before[wl['name']]['version'], 'to': wl['version'], 'path': path})

    before = {(m['name'], m['valency']): m for m in old['macros']}
    for m in new['macros']:
        key = (m['name'], m['valency'])
        if key in before and before[key]['version'] != m['version']:
            changes.append({'kind': 'macro', 'name': m['name'], 'valency': m['valency'],
                            'from': before[key]['version'], 'to': m['version'], 'path': path})
            changes.extend(dependency_changes(before[key], m, path + [m['name']]))

    return changes


def describe_changes(changes):
    """Splits dependency changes into the ones that triggered an update (word
    lists, and macros without changes in their own dependencies) and the macros
    they are used by. Returns the triggering changes and a comment, e.g.
    'auto: speech_verbs v1 → v2 (via speech_verb v1 → v2, speech_vg v2 → v3)'

    """

    def below(change, other):
        through = change['path'] + [change['name']]
        return other['path'][:len(through)] == through

    triggers = list()
    via = list()
    for change in changes:
        if change['kind'] == 'macro' and any(below(change, other) for other in changes if other is not change):
            via.append(change)
        else:
            triggers.append(change)

    def describe(changes):
        return ", ".join(dict.fromkeys(f"{c['name']} v{c['from']} → v{c['to']}" for c in changes))

    comment = f"auto: {describe(triggers)}"
    if via:
        # innermost first
        comment += f" (via {describe(sorted(via, key=lambda c: -len(c['path'])))})"

    return triggers, comment


def propagate_macros(corpus_id, created):
    """Makes all current macros that use the previously current version of any
    of the changed (created or restored) word lists or macros (directly or
    nested) use the current versions: with the same definition resolved to
    the current versions, an identical older version is made current again,
    otherwise a new version is created. Macros are processed in dependency
    order, so each one is changed once.

    Returns the changed macros. Adds to the session but does not commit.
    """

    previous = [obj.previous_current for obj in created if getattr(obj, 'previous_current', None) is not None]
    wordlist_ids = {p.id for p in previous if isinstance(p, WordList)}
    macro_ids = {p.id for p in previous if isinstance(p, Macro)}

    ids = macros_depending_on(macro_ids, wordlist_ids)
    pending = {m.id: m for m in Macro.query.filter(Macro.id.in_(ids)).order_by(Macro.id)
               if m.current and not m.up_to_date}

    macros = list()
    while pending:
        ready = [m for m in pending.values() if not any(n.nested_id in pending for n in m.nested_macro)]
        if not ready:
            raise ValueError(f"circular macro dependencies: {[m.canonical_name for m in pending.values()]}")
        for old in ready:
            macro, status = create_macro(old.name, old.definition, corpus_id, old.valency, old.argument_list)
            if status == CREATED:
                macro.comment = describe_changes(dependency_changes(old.dependencies, macro.dependencies))[1]
            if status != UNCHANGED:
                macros.append(macro)
            del pending[old.id]

    return macros


def current_history_queries(corpus_id):
    """Returns the slot queries on this corpus that are the current (newest
    and up-to-date) entries of query histories, as a list of (history, query).
    Must be called before new versions are created.

    """

    from .spheroscope.query_history import current_queries

    return current_queries(corpus_id)


def propagate(corpus_id, created, snapshot):
    """Propagates the changed (created or restored) word lists and macros to the current macros and
    the current queries in query histories (snapshot, see
    current_history_queries) that use their previous versions.

    Returns a dictionary with the new macros and records of the new queries.
    Adds to the session but does not commit.
    """

    from .spheroscope.query_history import propagate_queries

    macros = propagate_macros(corpus_id, created)
    queries = propagate_queries(snapshot)

    return {'macros': macros, 'queries': queries}


def change_library(corpus_id, propagate_changes, change):
    """Runs change() in one transaction, propagates its changed (created or
    restored) versions (unless propagate_changes is false), commits, and writes
    all word lists and macros to the library directory. change() returns the
    word lists and macros to write and the changed versions among them.
    Aborts (400) on ValueError.

    Returns the objects, the changed versions, and the propagated macros and
    queries (None if not propagated).
    """

    snapshot = current_history_queries(corpus_id) if propagate_changes else None

    try:
        objects, created = change()
        propagated = propagate(corpus_id, created, snapshot) if propagate_changes else None
    except ValueError as e:
        db.session.rollback()
        abort(400, message=str(e))

    db.session.commit()
    for obj in objects + (propagated['macros'] if propagated else []):
        obj.write()

    return objects, created, propagated


################
# API schemata #
################

class WordListDependency(Schema):

    id = Integer()
    name = String()
    version = Integer()
    latest_version = Integer(metadata={'description': 'highest version number'})
    current_version = Integer(metadata={'description': 'version used when resolving calls (the one activated last)'})


class MacroDependency(Schema):

    id = Integer()
    name = String()
    valency = Integer()
    version = Integer()
    latest_version = Integer(metadata={'description': 'highest version number'})
    current_version = Integer(metadata={'description': 'version used when resolving calls (the one activated last)'})
    wordlists = Nested(WordListDependency(many=True))
    macros = List(Nested(lambda: MacroDependency()))


class DependenciesOut(Schema):

    wordlists = Nested(WordListDependency(many=True))
    macros = Nested(MacroDependency(many=True))


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
    body = String(metadata={'description': 'body as executed, with versioned identifiers of nested word lists and macros'})
    definition = String(metadata={'description': 'body with plain identifiers, as it can be posted again'})
    dependencies = Nested(DependenciesOut)
    up_to_date = Boolean(metadata={'description': 'whether all nested word lists and macros are the current versions'})
    current = Boolean(metadata={'description': 'whether this is the current version'})


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
    current = Boolean(metadata={'description': 'whether this is the current version'})


class LibraryImportIn(Schema):

    macros = String(required=False, load_default="",
                    metadata={'description': 'CQP macro definitions (contents of one or more macro files)'})
    wordlists = List(Nested(WordListIn), required=False, load_default=[])


class QueryUsage(Schema):

    id = Integer()
    type = String()
    name = String(allow_none=True)
    corpus_id = Integer()
    cqp_query = String()


class UsageOut(Schema):

    macros = Nested(MacroOut(many=True))
    queries = Nested(QueryUsage(many=True))


class PropagateIn(Schema):

    propagate = Boolean(load_default=True, metadata={
        'description': 'update macros and current history queries that use the previously current versions'
    })


class PropagatedQuery(Schema):

    id = Integer(metadata={'description': 'new query'})
    previous_id = Integer(metadata={'description': 'outdated query it replaces'})
    history_ids = List(Integer(), metadata={'description': 'query histories it was added to'})


class PropagatedOut(Schema):

    macros = Nested(MacroOut(many=True))
    queries = Nested(PropagatedQuery(many=True))


class WordListCreatedOut(WordListOut):

    restored = Boolean(metadata={'description': 'an identical older version was made current again'})
    propagated = Nested(PropagatedOut, metadata={'description': 'only if propagate is set'})


class MacroCreatedOut(MacroOut):

    restored = Boolean(metadata={'description': 'an identical older version was made current again'})
    propagated = Nested(PropagatedOut, metadata={'description': 'only if propagate is set'})


class LibraryImportOut(Schema):

    wordlists = Nested(WordListOut(many=True))
    macros = Nested(MacroOut(many=True))
    propagated = Nested(PropagatedOut, metadata={'description': 'only if propagate is set'})


#################
# API endpoints #
#################

def created_out(corpus_id, propagate_changes, change):
    """Runs a change creating (or reusing) a single word list or macro (see
    change_library); change() returns its object and status. Returns it, with
    the propagated macros and queries, and status 201 for a new version or 200
    if an identical version is (made) current."""

    statuses = list()

    def change_one():
        obj, status = change()
        statuses.append(status)
        return [obj], [obj] if status != UNCHANGED else []

    objects, _, propagated = change_library(corpus_id, propagate_changes, change_one)
    obj = objects[0]
    obj.restored = statuses[0] == RESTORED
    if propagated is not None:
        obj.propagated = propagated

    return obj, 201 if statuses[0] == CREATED else 200


@bp.get("/<corpus_id>/macros/<id>")
@bp.output(MacroOut)
@bp.auth_required(auth)
def get_macro(corpus_id, id):

    """Gets a single macro for a specified corpus"""

    corpus = db.get_or_404(Corpus, corpus_id)
    macro = Macro.query.filter(Macro.corpus_id == corpus.id, Macro.id == id).first()
    if not macro:
        return abort(404, message=f"Macro with id {id} does not exist for corpus with id {corpus_id} in database")

    return macro, 200


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
@bp.input(PropagateIn, location='query')
@bp.output(MacroCreatedOut, status_code=201)
@bp.auth_required(auth)
@write_access_required
def create_macro_endpoint(corpus_id, json_data, query_data):

    """Creates a new version of a macro for a specified corpus.
    Returns the current version (status 200) if it is identical; makes an identical older version
    current again (status 200, restored) instead of creating a duplicate.
    Nested word lists and macros are resolved to their current versions.
    A changed current version is propagated to the macros and current history queries using the previous one."""

    corpus = db.get_or_404(Corpus, corpus_id)

    def change():
        return create_macro(corpus_id=corpus.id, **json_data)

    return created_out(corpus.id, query_data['propagate'], change)


@bp.post("/<corpus_id>/macros/<id>/restore")
@bp.input(PropagateIn, location='query')
@bp.output(MacroCreatedOut, status_code=201)
@bp.auth_required(auth)
@write_access_required
def restore_macro(corpus_id, id, query_data):

    """Makes a macro with the definition of the given version current, like posting that definition
    (nested word lists and macros are resolved to their current versions): the given version itself
    if its nested versions are current, otherwise an identical or new version.
    The change is propagated like any other."""

    corpus = db.get_or_404(Corpus, corpus_id)
    old = Macro.query.filter(Macro.corpus_id == corpus.id, Macro.id == id).first()
    if not old:
        return abort(404, message=f"Macro with id {id} does not exist for corpus with id {corpus_id} in database")

    def change():
        return create_macro(old.name, old.definition, corpus.id, old.valency, old.argument_list,
                            comment=f"restore v{old.version}")

    return created_out(corpus.id, query_data['propagate'], change)


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


@bp.get("/<corpus_id>/macros/<id>/usage")
@bp.output(UsageOut)
@bp.auth_required(auth)
def get_macro_usage(corpus_id, id):

    """Gets macros and queries that use a macro version (directly or via nested macros)"""

    corpus = db.get_or_404(Corpus, corpus_id)
    macro = Macro.query.filter(Macro.corpus_id == corpus.id, Macro.id == id).first()
    if not macro:
        return abort(404, message=f"Macro with id {id} does not exist for corpus with id {corpus_id} in database")

    macros, queries = usage(macro_ids={macro.id})

    return {'macros': macros, 'queries': queries}, 200


@bp.get("/<corpus_id>/wordlists/<id>")
@bp.output(WordListOut)
@bp.auth_required(auth)
def get_word_list(corpus_id, id):

    """Gets a single wordlist for a specified corpus"""

    corpus = db.get_or_404(Corpus, corpus_id)
    wordlist = WordList.query.filter(WordList.corpus_id == corpus.id, WordList.id == id).first()
    if not wordlist:
        return abort(404, message=f"Word list with id {id} does not exist for corpus with id {corpus_id} in database")

    return wordlist, 200


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
@bp.input(PropagateIn, location='query')
@bp.output(WordListCreatedOut, status_code=201)
@bp.auth_required(auth)
@write_access_required
def create_word_list(corpus_id, json_data, query_data):

    """Creates a new version of a word list for a specified corpus.
    Returns the current version (status 200) if it is identical; makes an identical older version
    current again (status 200, restored) instead of creating a duplicate.
    A changed current version is propagated to the macros and current history queries using the previous one."""

    corpus = db.get_or_404(Corpus, corpus_id)

    def change():
        return create_wordlist(corpus_id=corpus.id, **json_data)

    return created_out(corpus.id, query_data['propagate'], change)


@bp.post("/<corpus_id>/wordlists/<id>/restore")
@bp.input(PropagateIn, location='query')
@bp.output(WordListCreatedOut, status_code=201)
@bp.auth_required(auth)
@write_access_required
def restore_word_list(corpus_id, id, query_data):

    """Makes the given version of a word list current again (like posting its words).
    The change is propagated like any other."""

    corpus = db.get_or_404(Corpus, corpus_id)
    old = WordList.query.filter(WordList.corpus_id == corpus.id, WordList.id == id).first()
    if not old:
        return abort(404, message=f"Word list with id {id} does not exist for corpus with id {corpus_id} in database")

    def change():
        return create_wordlist(old.name, old.word_list, corpus.id, comment=f"restore v{old.version}")

    return created_out(corpus.id, query_data['propagate'], change)


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


@bp.get("/<corpus_id>/wordlists/<id>/usage")
@bp.output(UsageOut)
@bp.auth_required(auth)
def get_word_list_usage(corpus_id, id):

    """Gets macros and queries that use a word list version (directly or via nested macros)"""

    corpus = db.get_or_404(Corpus, corpus_id)
    wordlist = WordList.query.filter(WordList.corpus_id == corpus.id, WordList.id == id).first()
    if not wordlist:
        return abort(404, message=f"Word list with id {id} does not exist for corpus with id {corpus_id} in database")

    macros, queries = usage(wordlist_ids={wordlist.id})

    return {'macros': macros, 'queries': queries}, 200


@bp.post("/<corpus_id>/import")
@bp.input(LibraryImportIn)
@bp.input(PropagateIn, location='query')
@bp.output(LibraryImportOut)
@bp.auth_required(auth)
@write_access_required
def import_definitions(corpus_id, json_data, query_data):

    """Imports CQP macro definitions and word lists for a specified corpus.
    Changed definitions are imported as new versions, identical ones (current or older) are reused.
    Word lists are imported first; macros may be defined in any order.
    Nothing is imported if any definition fails.
    Changed current versions are propagated to the macros and current history queries using the previous ones."""

    corpus = db.get_or_404(Corpus, corpus_id)
    wordlists = list()
    macros = list()

    def change():
        created = list()
        for wl in json_data['wordlists']:
            wordlist, status = create_wordlist(wl['name'], wl['words'], corpus.id,
                                               comment=wl['comment'] or "imported via API")
            wordlists.append(wordlist)
            if status != UNCHANGED:
                created.append(wordlist)

        definitions = parse_macro_file(json_data['macros'])
        imported, new_macros, errors = create_macros(definitions, corpus.id, comment="imported via API")
        if errors:
            raise ValueError("; ".join(errors))
        macros.extend(imported)

        return wordlists + macros, created + new_macros

    _, _, propagated = change_library(corpus.id, query_data['propagate'], change)

    out = {'wordlists': wordlists, 'macros': macros}
    if propagated is not None:
        out['propagated'] = propagated

    return out, 200


################
# CLI commands #
################

@bp.cli.command('import')
@click.option('--corpus_id', default=1)
@click.option('--lib_dir', default='tests/library/')
def import_library_cmd(corpus_id, lib_dir):

    username = 'admin'

    import_library(lib_dir, corpus_id, username)
