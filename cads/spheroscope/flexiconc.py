#! /usr/bin/env python
# -*- coding: utf-8 -*-

from functools import lru_cache

from flask import current_app, request
from apiflask import APIBlueprint, Schema, abort
from apiflask.fields import Integer, String, Date, Nested
from apiflask.validators import OneOf
import json

from cads.query import QueryOut
from .database import QueryHistory, QueryHistoryEntry
from ..database import Corpus, Query
from ..users import auth
from .. import db

from flexiconc import Concordance

bp = APIBlueprint('flexiconc', __name__, url_prefix='/flexiconc')


#########################
# FLexiConc integration #
#########################


@lru_cache(maxsize=20)
def get_flexiconc_session(query_id, user_id):

    current_app.logger.debug(f"flexiconc :: initializing with concordances for {query_id} for {user_id}")

    query = Query.query.get(query_id)
    if not query:
        raise ValueError(f"No query with id in database {query_id}")

    c = Concordance()
    c.retrieve_from_cwb(query=query.mangled_query, corpus=query.corpus.ccc())

    return c


################
# API schemata #
################


#################
# API endpoints #
#################


@bp.get('/<query_id>')
# @bp.output()
@bp.auth_required(auth)
def get(query_id):
    return f'flexiconc for query {query_id} and user {auth.current_user.id}', 200


@bp.get('/<query_id>/tree')
# @bp.output()
@bp.auth_required(auth)
def get_tree(query_id):
    
    query = db.get_or_404(Query, query_id)
    c = get_flexiconc_session(query.id, auth.current_user.id)

    return "it worked?", 200
