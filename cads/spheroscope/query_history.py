#! /usr/bin/env python
# -*- coding: utf-8 -*-


from apiflask import APIBlueprint, Schema, abort
from apiflask.fields import Boolean, Dict, Integer, Nested, String

from .. import db
from ..library import dependency_changes, describe_changes
from ..users import auth
from .database import QueryHistory, QueryHistoryEntry, SlotQuery
from .slot_query import (SlotQueryOut, find_current_slot_query,
                         new_slot_query, slot_query_definition_of)

bp = APIBlueprint('query_history', __name__, url_prefix='/query-history')


def current_queries(corpus_id):
    """Returns the slot queries on this corpus that are the current (newest
    and up-to-date) entries of query histories, as a list of (history, query)

    """

    snapshot = list()
    for history in QueryHistory.query.order_by(QueryHistory.id):
        entry = history.current_entry
        if entry and isinstance(entry.query, SlotQuery) and entry.query.corpus_id == corpus_id \
           and entry.query.up_to_date:
            snapshot.append((history, entry.query))

    return snapshot


def propagate_queries(snapshot):
    """For every query in the snapshot (see current_queries) that is outdated
    now, creates a new query with the same definition (or reuses an existing
    up-to-date one) and adds it to the histories as an automatic entry, with a
    comment and trigger describing the library changes. Queries are not executed.

    Returns a list of dictionaries with keys id, previous_id, history_ids.
    Adds to the session but does not commit.
    """

    propagated = dict()
    for history, query in snapshot:

        if query.up_to_date:
            continue

        if query.id not in propagated:
            definition = slot_query_definition_of(query)
            new = find_current_slot_query(**definition) or new_slot_query(definition, query.name, query.comment)
            changes, comment = describe_changes(dependency_changes(query.dependencies, new.dependencies))
            propagated[query.id] = {
                'query': new, 'comment': comment, 'changes': changes,
                'record': {'id': new.id, 'previous_id': query.id, 'history_ids': []}
            }

        p = propagated[query.id]
        if any(entry.query_id == p['query'].id for entry in history.entries):
            continue
        history.add_entry(p['query'].id, p['comment'], auto=True,
                          trigger={'changes': p['changes'], 'previous_query_id': query.id})
        p['record']['history_ids'].append(history.id)

    db.session.flush()

    return [p['record'] for p in propagated.values()]


class QueryHistoryEntryIn(Schema):

    query_id = Integer()

    comment = String()


class QueryHistoryEntryOut(Schema):

    history_id = Integer()
    query_id = Integer()

    time = String()
    comment = String()
    auto = Boolean(metadata={'description': 'created automatically after a library change'})
    trigger = Dict(allow_none=True, metadata={
        'description': 'for automatic entries: library changes (with path of nested macros) and previous query'
    })

    query = Nested(SlotQueryOut)


class QueryHistoryIn(Schema):

    name = String()


class QueryHistoryOut(Schema):

    id = Integer()
    name = String()
    entries = Nested(QueryHistoryEntryOut(many=True))


@bp.post('/')
@bp.input(QueryHistoryIn)
@bp.output(QueryHistoryOut)
@bp.auth_required(auth)
def create(json_data):
    """Create a new quey history.

    """

    query_history = QueryHistory(
        id=None,
        name=json_data.get("name")
    )

    db.session.add(query_history)
    db.session.commit()

    return query_history, 200


@bp.get('/')
@bp.output(QueryHistoryOut(many=True))
@bp.auth_required(auth)
def get_all():
    """Get all query histories.

    """

    histories = QueryHistory.query.all()

    return histories, 200


@bp.put("/<id>/entry")
@bp.input(QueryHistoryEntryIn)
@bp.output(QueryHistoryOut)
@bp.auth_required(auth)
def add_query(id, json_data):
    """Create a new entry in a given query history.

    """

    history = db.get_or_404(QueryHistory, id)

    entry = history.add_entry(
        json_data.get("query_id"),
        json_data.get("comment")
    )

    try:
        db.session.commit()
        return history, 200
    except:
        return abort(400, message=f"Query with id {json_data.get('query_id')} does not exist in database")


@bp.get("/<id>")
@bp.output(QueryHistoryOut)
@bp.auth_required(auth)
def get_history(id):
    """Get all entries in a given query history.

    """

    history = db.get_or_404(QueryHistory, id)

    return history, 200


@bp.delete("/<id>")
@bp.auth_required(auth)
def delete_history(id):
    """ Deletes a given query history

    """

    history = db.get_or_404(QueryHistory, id)

    try:
        db.session.delete(history)
        db.session.commit()
        return f"Deleted QueryHistory with id {id} successfully", 200
    except:
        return abort(400, message=f"QueryHistory with id {id} could not be deleted")


@bp.delete("/<hid>/<qid>")
@bp.auth_required(auth)
def delete_history_entry(hid, qid):
    """ Deletes the given query from a history

    """

    entry = db.get_or_404(QueryHistoryEntry, (hid, qid))

    try:
        db.session.delete(entry)
        db.session.commit()
        return f"Deleted QueryHistoryEntry for query {qid} in history {hid} successfully", 200
    except:
        return abort(400, message=f"QueryHistoryEntry for query {qid} in history {hid} could not be deleted")
