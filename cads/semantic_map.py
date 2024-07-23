# !/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Float, Integer, List, String
from flask import current_app
from numpy.random import normal
from pandas import DataFrame, concat
from semmap import SemanticSpace

from . import db
from .database import (Collocation, CollocationItem, CollocationItemScore,
                       SemanticMap, Coordinates)
from .users import auth

bp = APIBlueprint('semantic_map', __name__, url_prefix='/semantic-map')


def ccc_semmap(collocation_ids, sort_by, number, blacklist_items=[]):

    semantic_map = None
    dfs = list()
    embeddings_set = set()

    current_app.logger.debug('ccc_semmap :: selecting items')
    for collocation_id in collocation_ids:

        collocation = db.get_or_404(Collocation, collocation_id)
        embeddings = collocation._query.corpus.embeddings
        embeddings_set.add(embeddings)

        # create new semantic map
        if semantic_map is None:
            semantic_map = SemanticMap(embeddings=embeddings, method='tsne')
            db.session.add(semantic_map)
            db.session.commit()

        # and set as semantic map of the collocation analysis
        collocation.semantic_map_id = semantic_map.id
        db.session.add(collocation)
        db.session.commit()

        # get IDs of blacklist
        blacklist = CollocationItem.query.filter(
            CollocationItem.collocation_id == collocation.id,
            CollocationItem.item.in_(blacklist_items)
        )

        # get some items
        scores = CollocationItemScore.query.filter(
            CollocationItemScore.collocation_id == collocation.id,
            CollocationItemScore.measure == sort_by,
            ~ CollocationItemScore.collocation_item_id.in_([b.id for b in blacklist])
        ).order_by(CollocationItemScore.score.desc()).paginate(page=1, per_page=number)
        dfs.append(DataFrame([vars(s) for s in scores], columns=['collocation_item_id']))

    df_scores = concat(dfs)
    items = list(set([CollocationItem.query.filter_by(id=id).first().item for id in df_scores['collocation_item_id']]))

    current_app.logger.debug(f'ccc_semmap :: creating coordinates for {len(items)} items')
    semspace = SemanticSpace(semantic_map.embeddings)
    coordinates = semspace.generate2d(items, method=semantic_map.method, parameters=None)
    coordinates.index.name = 'item'
    coordinates['semantic_map_id'] = semantic_map.id
    coordinates.to_sql('coordinates', con=db.engine, if_exists='append')
    db.session.commit()
    current_app.logger.debug('ccc_semmap :: ... done')

    return semantic_map


def ccc_semmap_update(semantic_map, items):
    """
    make sure there's coordinates for all items
    """

    coordinates = DataFrame([vars(s) for s in semantic_map.coordinates], columns=['x', 'y', 'x_user', 'y_user', 'item'])
    coordinates = coordinates.set_index('item')
    coordinates = coordinates.loc[~coordinates.index.duplicated()]  # remove duplicates if necessary

    # items without coordinates
    new_items = list(set(items) - set(coordinates.index))
    if len(new_items) > 0:
        current_app.logger.debug(f'ccc_semmap_update :: creating coordinates for {len(new_items)} new items')
        semspace = SemanticSpace(semantic_map.embeddings)
        semspace.coordinates = coordinates[['x', 'y']]
        new_coordinates = semspace.add(new_items)
        new_coordinates.index.name = 'item'
        new_coordinates['semantic_map_id'] = semantic_map.id
        new_coordinates.to_sql('coordinates', con=db.engine, if_exists='append')
        db.session.commit()
    else:
        current_app.logger.debug('ccc_semmap_update :: all requested items already have coordinates')


def ccc_semmap_discoursemes(collocation, sigma_wiggle=1):
    """
    update coordinates of items belonging to a discourseme
    """

    semantic_map = collocation.semantic_map
    coordinates = DataFrame([vars(s) for s in semantic_map.coordinates], columns=['x', 'y', 'x_user', 'y_user', 'item'])
    coordinates = coordinates.set_index('item')
    coordinates = coordinates.loc[~coordinates.index.duplicated()]

    # update positions of discourseme items
    current_app.logger.debug('ccc_semmap_discoursemes :: update discourseme coordinates')
    for discourseme in collocation.constellation.highlight_discoursemes:
        discourseme_items = discourseme.get_items()
        index_items = coordinates.index.isin(discourseme_items)
        user_coordinates = coordinates.loc[index_items & ~ coordinates['x_user'].isna()]
        if len(user_coordinates) > 0:
            # if user coordinates: move to center of all user coordinates
            x_center = user_coordinates['x_user'].mean()
            y_center = user_coordinates['y_user'].mean()
        else:
            # else: move to center of all coordinates
            x_center = coordinates.loc[index_items, 'x'].mean()
            y_center = coordinates.loc[index_items, 'y'].mean()
        coordinates.loc[index_items, 'x_user'] = x_center + normal(0, sigma_wiggle, sum(index_items))
        coordinates.loc[index_items, 'y_user'] = y_center + normal(0, sigma_wiggle, sum(index_items))

    coordinates['semantic_map_id'] = semantic_map.id
    coordinates.index.name = 'item'

    # delete old coordinates
    [db.session.delete(c) for c in semantic_map.coordinates]
    db.session.commit()

    # add new coordinates
    coordinates.to_sql('coordinates', con=db.engine, if_exists='append')
    db.session.commit()


class SemanticMapOut(Schema):

    id = Integer()
    collocation_id = Integer()
    keyword_id = Integer()
    p = String()


class CoordinatesIn(Schema):

    item = String(required=True)
    x_user = Float(required=False, load_default=None)
    y_user = Float(required=False, load_default=None)


class CoordinatesOut(Schema):

    semantic_map_id = Integer()
    item = String()
    x = Float()
    y = Float()
    x_user = Float()
    y_user = Float()


#################
# API endpoints #
#################
@bp.get('/<id>')
@bp.output(SemanticMapOut)
@bp.auth_required(auth)
def get_semantic_map(id):
    """Get semantic map.

    """

    semantic_map = db.get_or_404(SemanticMap, id)
    return SemanticMapOut().dump(semantic_map), 200


@bp.put('/')
@bp.input({'collocation_ids': List(Integer)}, schema_name='CollocationIdsIn')
@bp.output(SemanticMapOut)
@bp.auth_required(auth)
def create_semantic_map(json_data):
    """Create semantic map for items in the provided collocation analyses.

    """

    semantic_map = ccc_semmap(json_data['collocation_ids'], sort_by='conservative_log_ratio', number=500)

    return SemanticMapOut().dump(semantic_map), 200


@bp.delete('/<id>')
@bp.auth_required(auth)
def delete_semantic_map(id):
    """Delete semantic map.

    """

    semantic_map = db.get_or_404(SemanticMap, id)
    db.session.delete(semantic_map)
    db.session.commit()

    return 'Deletion successful.', 200


@bp.get("/<id>/coordinates")
@bp.output(CoordinatesOut(many=True))
@bp.auth_required(auth)
def get_coordinates(id):
    """Get coordinates of semantic map.

    """

    semantic_map = db.get_or_404(SemanticMap, id)

    return [CoordinatesOut().dump(coordinates) for coordinates in semantic_map.coordinates], 200


@bp.put("/<id>/coordinates/")
@bp.input(CoordinatesIn)
@bp.output(CoordinatesOut(many=True))
@bp.auth_required(auth)
def set_coordinates(id, json_data):
    """Set coordinates of an item.

    """

    semantic_map = db.get_or_404(SemanticMap, id)
    item = json_data.get('item')
    x_user = json_data.get('x_user')
    y_user = json_data.get('y_user')

    item_coordinates = Coordinates.query.filter(Coordinates.item == item, Coordinates.semantic_map_id == semantic_map.id).first()
    item_coordinates.x_user = x_user
    item_coordinates.y_user = y_user
    db.session.commit()

    return [CoordinatesOut().dump(coordinates) for coordinates in semantic_map.coordinates], 200
