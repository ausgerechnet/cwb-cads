#! /usr/bin/env python
# -*- coding: utf-8 -*-

from functools import lru_cache
import json

from flask import current_app
from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, String, Boolean, Nested, Dict, List, Raw

from ..database import Query
from ..users import auth
from .. import db

from flexiconc import Concordance

bp = APIBlueprint('flexiconc', __name__, url_prefix='/flexiconc')


### Caveat Emptor ###
#
#   The state of this integration is still very much experimental and it is barely working at this point.
#   As of now there is no real integration between the query portions of cads and flexiconc, i.e. flexiconc
#   is running its own queries at the moment and not caching results in the cads DB.
#
#   This fact might lead to doubled query execution or worse, flexiconc and the rest of cads working with
#   different query results. Since initializing FlexiConc is not trivial and neither FlexiConc nor the
#   SpheroscopeX frontend are in a stable state, this hacky state of things will stay like that for the
#   near future.
#
#   A proper, DB-centered implementation will be done once it's clear how SpheroscopeX needs to consume
#   query results and FlexiConc internals are stabilized.
#


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
    # TODO: work with actual concordance data frome the DB
    c.retrieve_from_cwb(query=query.mangled_query, corpus=query.corpus.ccc())
    # TODO: undump previous tree from DB/dump fresh tree to DB if null

    return c


################
# API schemata #
################


class AlgorithmOut(Schema):
    algorithm_name = String(required=True)
    args = Dict(required=True)


class AlgorithmsOut(Schema):
    ordering = Nested(AlgorithmOut, many=True)
    grouping = Nested(AlgorithmOut)
    subset = Nested(AlgorithmOut)


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


class BookmarkNodeIn(Schema):
    bookmarked = Boolean(required=True)


class AlgorithmIn(Schema):
    algorithm_name = String(required=True)
    args = Dict(required=True)


class AlgoFilterIn(Schema):
    algo_type = String(required=False)


#################
# API endpoints #
#################


@bp.get('/<query_id>/tree')
@bp.output(TreeNodeOut)
@bp.auth_required(auth)
def get_tree(query_id):
    
    query = db.get_or_404(Query, query_id)
    c = get_flexiconc_session(query.id, auth.current_user.id)

    return TreeNodeOut().dump(c.root), 200


# TODO: Endpoint for deleting/resetting the tree


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
    

# TODO: Endpoint for deleting an idividual node
# TODO: Endpoint for changing/patching algo parameters?


@bp.get('/<query_id>/tree/<node_id>/concordance')
# @bp.output(TreeNodeOut)
@bp.auth_required(auth)
def get_concordance(query_id, node_id):

    query = db.get_or_404(Query, query_id)
    c = get_flexiconc_session(query.id, auth.current_user.id)

    node = c.find_node_by_id(int(node_id))
    if node:
        # TODO: specify the output format for this endpoint
        # TODO: return actual concordance lines?
        return json.dumps(node.view()), 200     
    else:
        return f"No tree node with id {node_id}", 404 


@bp.post('/<query_id>/tree/<node_id>/bookmark')
@bp.input(BookmarkNodeIn, location='form')
@bp.output(TreeNodeOut)
@bp.auth_required(auth)
def bookmark_node(query_id, node_id, form_data):

    query = db.get_or_404(Query, query_id)
    c = get_flexiconc_session(query.id, auth.current_user.id)

    node = c.find_node_by_id(int(node_id))
    if node:
        node.bookmarked = form_data['bookmarked']
        return TreeNodeOut().dump(node), 200
    else:
        return f"No tree node with id {node_id}", 404


@bp.get('/<query_id>/tree/<node_id>/available-algorithms')
@bp.input(AlgoFilterIn, location='query')
@bp.output(AlgorithmDetailsOut(many=True))
@bp.auth_required(auth)
def get_available(query_id, node_id, query_data):

    query = db.get_or_404(Query, query_id)
    c = get_flexiconc_session(query.id, auth.current_user.id)

    node = c.find_node_by_id(int(node_id))
    if node:
        algos = list(node.available_algorithms().values())

        if 'algo_type' in query_data:
            algos = [a for a in algos if a['algorithm_type'] == query_data['algo_type']]

        return [AlgorithmDetailsOut().dump(a) for a in algos], 200
    else:
        return f"No tree node with id {node_id}", 404


@bp.post('/<query_id>/tree/<node_id>/arrangement')
@bp.input(AlgorithmIn)
@bp.output(TreeNodeOut)
@bp.auth_required(auth)
def add_arrangement_node(query_id, node_id, json_data):

    query = db.get_or_404(Query, query_id)
    c = get_flexiconc_session(query.id, auth.current_user.id)

    node = c.find_node_by_id(int(node_id))
    if node:
        try:
            node.add_arrangement_node(ordering=[json_data])
            # TODO: dump updated tree to DB
            return TreeNodeOut().dump(c.root), 200
        except Exception as e:
            print(e)
            return str(type(e)) + ': ' + str(e), 422
    else:
        return f"No tree node with id {node_id}", 404


@bp.post('/<query_id>/tree/<node_id>/subset')
@bp.input(AlgorithmIn)
@bp.output(TreeNodeOut)
@bp.auth_required(auth)
def add_subset_node(query_id, node_id, json_data):

    query = db.get_or_404(Query, query_id)
    c = get_flexiconc_session(query.id, auth.current_user.id)

    node = c.find_node_by_id(int(node_id))
    if node:
        try:
            node.add_subset_node(**json_data)
            # TODO: dump updated tree to DB
            return TreeNodeOut().dump(c.root), 200
        except Exception as e:
            print(e)
            return str(type(e)) + ': ' + str(e), 422
    else:
        return f"No tree node with id {node_id}", 404
