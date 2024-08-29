#! /usr/bin/env python
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, String, Date, Nested
from apiflask.validators import OneOf
import json

from flask import current_app
from .database import QueryHistory, QueryHistoryEntry
from ..database import Corpus
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
    """
    
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
    """

    """

    histories = QueryHistory.query.all()

    return [QueryHistoryOut().dump(h) for h in histories], 200


@bp.put("/<id>/entry")
@bp.input(QueryHistoryEntryIn)
@bp.output(QueryHistoryEntryOut)
@bp.auth_required(auth)
def add_query(id, json_data):
    """
    
    """

    history = db.get_or_404(QueryHistory, id)

    entry = history.add_entry(
        json_data.get("query_id"),
        json_data.get("comment")
    )

    db.session.commit()

    return QueryHistoryEntryOut().dump(entry), 200


@bp.get("/<id>")
@bp.output(QueryHistoryEntryOut(many=True))
@bp.auth_required(auth)
def get_history(id):
    """
    
    """

    history = db.get_or_404(QueryHistory, id)

    current_app.logger.info(history.history_entries)

    return [QueryHistoryEntryOut().dump(h) for h in history.history_entries], 200
