# !/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Float, Integer, String
from flask import current_app
from pandas import DataFrame
from semmap import SemanticSpace

from . import db
from .database import CollocationItems, SemanticMap
from .users import auth

bp = APIBlueprint('semantic_map', __name__, url_prefix='/semantic_map')


def ccc_semmap(collocation, embeddings):

    # create new semantic map
    semantic_map = SemanticMap(embeddings=embeddings, method='tsne')
    db.session.add(semantic_map)
    db.session.commit()
    # and set as semantic map of the collocation analysis
    collocation.semantic_map_id = semantic_map.id
    db.session.add(collocation)
    db.session.commit()

    items = list(set([item.item for item in collocation.items]))

    current_app.logger.debug(f'ccc_semmap :: creating coordinates for {len(items)} items')
    semspace = SemanticSpace(semantic_map.embeddings)
    coordinates = semspace.generate2d(items, method=semantic_map.method, parameters=None)
    coordinates.index.name = 'item'
    coordinates['semantic_map_id'] = semantic_map.id
    coordinates.to_sql('coordinates', con=db.engine, if_exists='append')
    db.session.commit()

    return coordinates


def ccc_semmap_update(collocation):

    semantic_map = collocation.semantic_map
    coordinates = DataFrame([vars(s) for s in semantic_map.coordinates], columns=['x', 'y', 'item'])
    coordinates = coordinates.set_index('item')

    # sometimes there's duplicates, but why?
    coordinates = coordinates.loc[~coordinates.index.duplicated()]

    new_items = list(set([
        item.item for item in CollocationItems.query.filter(
            CollocationItems.collocation_id == collocation.id,
            ~ CollocationItems.item.in_(coordinates.index)
        ).all()
    ]))
    if len(new_items) == 0:
        return None

    current_app.logger.debug(f'ccc_semmap_update :: creating coordinates for {len(new_items)} new items')
    semspace = SemanticSpace(semantic_map.embeddings)
    semspace.coordinates = coordinates
    new_coordinates = semspace.add(new_items)
    new_coordinates.index.name = 'item'
    new_coordinates['semantic_map_id'] = semantic_map.id
    new_coordinates.to_sql('coordinates', con=db.engine, if_exists='append')
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
    # TODO: get items
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
