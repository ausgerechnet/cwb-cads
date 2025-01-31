#! /usr/bin/env python
# -*- coding: utf-8 -*-

from functools import lru_cache

from flask import current_app
from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, String, Boolean, Nested, Dict, List, Raw

from ..database import Query
from ..users import auth
from .. import db

from flexiconc import Concordance

bp = APIBlueprint('flexiconc', __name__, url_prefix='/flexiconc')


#########################
# FLexiConc integration #
#########################


@lru_cache(maxsize=20)
def get_flexiconc_session(query_id, user_id):

    current_app.logger.debug(f"flexiconc :: initializing with concordances for query {query_id} for user {user_id}")

    query = Query.query.get(query_id)
    if not query:
        raise ValueError(f"No query with id in database {query_id}")

    c = Concordance()
    c.retrieve_from_cwb(query=query.mangled_query, corpus=query.corpus.ccc())

    return c


################
# API schemata #
################


class AlgorithmOut(Schema):
    algorithm_name = String(required=True)
    args = Dict(required=True)


class AlgorithmsOut(Schema):
    ordering = Nested(AlgorithmOut, many=True)
    grouping = Nested(AlgorithmOut, many=True)


class ArgOut(Schema):
    type = String()
    description = String()
    default = Raw()


class ArgsSchemaOut(Schema):
    required = List(String)
    properties = Dict(String, Nested(ArgOut))


class AlgorithmDetailsOut(Schema):
    full_name = String()
    algorithm_type = String()
    function = String()
    scope = String()
    args_schema = Nested(ArgsSchemaOut)


class TreeNodeOut(Schema):
    id = Integer(required=True)
    label = String(required=True)
    node_type = String(required=True)
    bookmarked = Boolean(required=True)
    line_count = Integer()
    children = Nested(lambda: TreeNodeOut(), many=True)
    algorithms = Nested(AlgorithmsOut)


class DetailedNodeOut(Schema):
    id = Integer(required=True)
    label = String(required=True)
    node_type = String(required=True)
    bookmarked = Boolean(required=True)
    line_count = Integer()
    algorithms = Nested(AlgorithmsOut)



#################
# API endpoints #
#################


@bp.get('/<query_id>')
# @bp.output()
@bp.auth_required(auth)
def get(query_id):
    return f'flexiconc for query {query_id} and user {auth.current_user.id}', 200


@bp.get('/<query_id>/tree')
@bp.output(TreeNodeOut)
@bp.auth_required(auth)
def get_tree(query_id):
    
    query = db.get_or_404(Query, query_id)
    c = get_flexiconc_session(query.id, auth.current_user.id)

    return TreeNodeOut().dump(c.root), 200


@bp.get('/<query_id>/tree/<node_id>')
@bp.output(TreeNodeOut)
@bp.auth_required(auth)
def get_node(query_id, node_id):

    query = db.get_or_404(Query, query_id)
    c = get_flexiconc_session(query.id, auth.current_user.id)

    node = c.find_node_by_id(int(node_id))
    if node:
        return TreeNodeOut().dump(node), 200
    else:
        return f"No tree node with id {node_id}", 404


@bp.get('/<query_id>/tree/<node_id>/available-algorithms')
@bp.output(AlgorithmDetailsOut(many=True))
@bp.auth_required(auth)
def get_available(query_id, node_id):

    query = db.get_or_404(Query, query_id)
    c = get_flexiconc_session(query.id, auth.current_user.id)

    node = c.find_node_by_id(int(node_id))
    if node:
        algos = list(node.available_algorithms().values())
        return [AlgorithmDetailsOut().dump(a) for a in algos], 200
    else:
        return f"No tree node with id {node_id}", 404
