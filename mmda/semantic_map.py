# !/usr/bin/python3
# -*- coding: utf-8 -*-

from collections import Counter

from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, String
from ccc import Corpus
from flask import current_app
from semmap import SemanticSpace

from . import db
from .database import Collocation, SemanticMap, Coordinates
from .users import auth

bp = APIBlueprint('semantic_map', __name__, url_prefix='/<collocation_id>/semantic_map')


class SemanticMapIn(Schema):

    collocation_id = Integer()
    # embeddings = String()


class SemanticMapOut(Schema):

    id = Integer()
    collocation_id = Integer()
    p = String()


class CoordinatesOut(Schema):

    id = Integer()
    semanticmap_id = Integer()
    item = String()
    x = Integer()
    y = Integer()


@bp.post('/')
@bp.input(SemanticMapIn)
@bp.output(SemanticMapOut)
@bp.auth_required(auth)
def create(query_id, collocation_id, data):
    """Create new semanticmap for collocation items.

    """
    collocation = db.get_or_404(Collocation, collocation_id)
    embeddings = collocation.query.corpus.embeddings
    semanticmap = SemanticMap(collocation_id=collocation_id, embeddings=embeddings, **data)
    db.session.add(semanticmap)
    db.session.commit()

    return SemanticMapOut().dump(semanticmap), 200


@bp.get('/')
@bp.output(SemanticMapOut(many=True))
@bp.auth_required(auth)
def get_semanticmaps(query_id, collocation_id):
    """Get all semanticmaps of collocation.

    """

    collocation = db.get_or_404(Collocation, collocation_id)
    return [SemanticMapOut().dump(semanticmap) for semanticmap in collocation.semanticmaps], 200


@bp.get('/<id>')
@bp.output(SemanticMapOut)
@bp.auth_required(auth)
def get_semanticmap(query_id, collocation_id, id):
    """Get semanticmap.

    """

    semanticmap = db.get_or_404(SemanticMap, id)
    return SemanticMapOut().dump(semanticmap), 200


@bp.delete('/<id>')
@bp.auth_required(auth)
def delete_semanticmap(query_id, collocation_id, id):
    """Delete semanticmap.

    """

    semanticmap = db.get_or_404(SemanticMap, id)
    db.session.delete(semanticmap)
    db.session.commit()

    return 'Deletion successful.', 200


@bp.post('/<id>/execute')
@bp.output(SemanticMapOut)
@bp.auth_required(auth)
def execute(query_id, collocation_id, id):
    """Execute SemanticMap: Get positions of items.

    """

    semantic_map = db.get_or_404(SemanticMap, id)
    items = list(set([item.item for item in semantic_map.collocation.items]))

    semspace = SemanticSpace(semantic_map.embeddings)
    coordinates = semspace.generate2d(items, method='tsne', parameters=None)
    for item, (x, y) in coordinates.iterrows():
        db.session.add(
            Coordinates(
                semantic_map_id=semantic_map.id,
                item=item,
                x=x,
                y=y
            )
        )
    db.session.commit()

    return SemanticMapOut().dump(semantic_map), 200


@bp.get("/<id>/coordinates")
@bp.output(CoordinatesOut(many=True))
@bp.auth_required(auth)
def get_coordinates(query_id, collocation_id, id):
    """Get semanticmap items.

    """

    semantic_map = db.get_or_404(SemanticMap, id)

    return [CoordinatesOut().dump(coordinates) for coordinates in semantic_map.coordinates], 200
