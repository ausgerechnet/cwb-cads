#! /usr/bin/env python
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema, abort
from apiflask.fields import Integer, String, Date, Nested
from apiflask.validators import OneOf
import json

from flask import current_app
from .database import QueryHistory, QueryHistoryEntry
from ..database import Corpus, Query
from ..users import auth
from .. import db

bp = APIBlueprint('query_history', __name__, url_prefix='/query-history')


class QueryHistoryEntryIn(Schema):

    query_id = Integer()

    comment = String()


class QueryHistoryEntryOut(Schema):

    history_id = Integer()
    query_id = Integer()

    time = String()
    comment = String()


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
        id = None,
        name = json_data.get("name")
    )

    db.session.add(query_history)
    db.session.commit()

    return QueryHistoryOut().dump(query_history), 200


@bp.get('/')
@bp.output(QueryHistoryOut(many=True))
@bp.auth_required(auth)
def get_all():
    """Get all query histories.

    """

    histories = QueryHistory.query.all()

    return [QueryHistoryOut().dump(h) for h in histories], 200


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
        return QueryHistoryOut().dump(history), 200
    except:
        return abort(400, message=f"Query with id {json_data.get('query_id')} does not exist in database")


@bp.get("/<id>")
@bp.output(QueryHistoryOut)
@bp.auth_required(auth)
def get_history(id):
    """Get all entries in a given query history.
    
    """

    history = db.get_or_404(QueryHistory, id)

    return QueryHistoryOut().dump(history), 200
