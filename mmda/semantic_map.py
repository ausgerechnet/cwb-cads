# !/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, String, Float
from semmap import SemanticSpace
from pandas import DataFrame

from . import db
from .database import SemanticMap, Coordinates
from .users import auth

bp = APIBlueprint('semantic_map', __name__, url_prefix='/semantic_map')


def ccc_semmap(semantic_map):

    items = list(set([item.item for item in semantic_map.collocation.items]))

    semspace = SemanticSpace(semantic_map.embeddings)
    coordinates = semspace.generate2d(items, method=semantic_map.method, parameters=None)
    for item, (x, y) in coordinates.iterrows():
        db.session.add(Coordinates(semantic_map_id=semantic_map.id, item=item, x=x, y=y))
    db.session.commit()

    return coordinates


def ccc_semmap_update(semantic_map):

    coordinates = DataFrame([CoordinatesOut().dump(coordinate) for coordinate in semantic_map.coordinates])
    items = set([item.item for item in semantic_map.collocation.items if item.item not in set(coordinates['item'])])
    if len(items) == 0:
        return None

    # get old coordinates
    semspace = SemanticSpace(semantic_map.embeddings)
    semspace.coordinates = coordinates[['x', 'y']]

    # get new coordinates and add to database
    new_coordinates = semspace.add(items)
    for item, (x, y) in new_coordinates.iterrows():
        db.session.add(Coordinates(semantic_map_id=semantic_map.id, item=item, x=x, y=y))
    db.session.commit()

    return new_coordinates


class SemanticMapIn(Schema):

    collocation_id = Integer()
    # embeddings = String()


class SemanticMapOut(Schema):

    id = Integer()
    collocation_id = Integer()
    p = String()


class CoordinatesOut(Schema):

    id = Integer()
    semantic_map_id = Integer()
    item = String()
    x = Float()
    y = Float()
    x_user = Float()
    y_user = Float()


@bp.get('/<id>')
@bp.output(SemanticMapOut)
@bp.auth_required(auth)
def get_semantic_map(id):
    """Get semantic map.

    """

    semanticmap = db.get_or_404(SemanticMap, id)
    return SemanticMapOut().dump(semanticmap), 200


@bp.delete('/<id>')
@bp.auth_required(auth)
def delete_semantic_map(id):
    """Delete semantic map.

    """

    semanticmap = db.get_or_404(SemanticMap, id)
    db.session.delete(semanticmap)
    db.session.commit()

    return 'Deletion successful.', 200


@bp.post('/<id>')
@bp.output(SemanticMapOut)
@bp.auth_required(auth)
def execute(id):
    """Execute semantic map: Get positions of items.

    """

    semantic_map = db.get_or_404(SemanticMap, id)
    ccc_semmap(semantic_map)

    return SemanticMapOut().dump(semantic_map), 200


@bp.get("/<id>/coordinates")
@bp.output(CoordinatesOut(many=True))
@bp.auth_required(auth)
def get_coordinates(id):
    """Get coordinates of semantic map.

    """

    semantic_map = db.get_or_404(SemanticMap, id)

    return [CoordinatesOut().dump(coordinates) for coordinates in semantic_map.coordinates], 200
