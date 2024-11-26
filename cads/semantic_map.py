# !/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Float, Integer, List, String
from apiflask.validators import OneOf
from flask import current_app
from pandas import DataFrame
from semmap import SemanticSpace

from . import db
from .database import Collocation, Coordinates, Keyword, SemanticMap
from .users import auth

bp = APIBlueprint('semantic-map', __name__, url_prefix='/semantic-map')


def ccc_semmap(analyses, embeddings, per_am=200, method='tsne', blacklist_items=[]):
    """create a combined semantic map for all top items in all analyses

    """

    # create new semantic map
    semantic_map = SemanticMap(embeddings=embeddings, method=method)
    db.session.add(semantic_map)
    db.session.commit()

    current_app.logger.debug('ccc_semmap :: selecting items')
    all_items = set()
    for analysis in analyses:

        # set semantic map of the analysis
        analysis.semantic_map_id = semantic_map.id
        db.session.commit()

        items = analysis.top_items(per_am)
        items = [item for item in items if item not in blacklist_items]
        if len(items) < 10:
            current_app.logger.error('ccc_semmap :: no enough items after considering blacklist')
        all_items = all_items.union(items)

    current_app.logger.debug(f'ccc_semmap :: creating coordinates for {len(all_items)} items')
    semspace = SemanticSpace(semantic_map.embeddings, normalise=True)
    coordinates = semspace.generate2d(all_items, method=semantic_map.method, parameters=None)
    coordinates.index.name = 'item'
    coordinates['semantic_map_id'] = semantic_map.id
    coordinates.to_sql('coordinates', con=db.engine, if_exists='append')
    db.session.commit()
    current_app.logger.debug('ccc_semmap :: ... exit')

    return semantic_map


def ccc_semmap_update(semantic_map, items):
    """make sure there's coordinates for all items on the semantic map

    """

    coordinates = DataFrame([vars(s) for s in semantic_map.coordinates], columns=['x', 'y', 'x_user', 'y_user', 'item'])
    coordinates = coordinates.set_index('item')
    coordinates = coordinates.loc[~coordinates.index.duplicated()]  # remove duplicates if necessary

    # items without coordinates
    new_items = list(set(items) - set(coordinates.index))
    if len(new_items) > 0:
        current_app.logger.debug(f'ccc_semmap_update :: creating coordinates for {len(new_items)} new items')
        semspace = SemanticSpace(semantic_map.embeddings, normalise=True)
        semspace.coordinates = coordinates[['x', 'y']]
        new_coordinates = semspace.add(new_items)
        new_coordinates.index.name = 'item'
        new_coordinates['semantic_map_id'] = semantic_map.id
        new_coordinates.to_sql('coordinates', con=db.engine, if_exists='append')
        db.session.commit()
    else:
        current_app.logger.debug('ccc_semmap_update :: all requested items already have coordinates')

    current_app.logger.debug('ccc_semmap_update :: exit')


def ccc_semmap_init(analysis, semantic_map_id=None, per_am=200, method='tsne'):
    """create a new semantic map for analysis or make sure there are coordinates for top items on an existing map.

    analysis = keyword / collocation analysis (database model) with following methods / properties:
    - .top_items()
    - .corpus
    - .semantic_map(_id)

    """

    items = analysis.top_items(per_am)

    if semantic_map_id:
        current_app.logger.debug('ccc_semmap_init :: associating existing semantic map with analysis')
        semantic_map = db.get_or_404(SemanticMap, semantic_map_id)
        analysis.semantic_map = semantic_map
        db.session.commit()

    if analysis.semantic_map:
        ccc_semmap_update(analysis.semantic_map, items)

    else:
        current_app.logger.debug('ccc_semmap_init :: creating new semantic map')
        semantic_map = SemanticMap(embeddings=analysis.corpus.embeddings, method=method)
        db.session.add(semantic_map)
        db.session.commit()

        analysis.semantic_map_id = semantic_map.id
        db.session.commit()

        semspace = SemanticSpace(semantic_map.embeddings, normalise=True)
        coordinates = semspace.generate2d(items, method=semantic_map.method, parameters=None)
        coordinates.index.name = 'item'
        coordinates['semantic_map_id'] = semantic_map.id
        coordinates.to_sql('coordinates', con=db.engine, if_exists='append')
        db.session.commit()


# def ccc_semmap_discoursemes(collocation, sigma_wiggle=1):
#     """update coordinates of items belonging to a discourseme

#     """

#     semantic_map = collocation.semantic_map
#     coordinates = DataFrame([vars(s) for s in semantic_map.coordinates], columns=['x', 'y', 'x_user', 'y_user', 'item'])
#     coordinates = coordinates.set_index('item')
#     coordinates = coordinates.loc[~coordinates.index.duplicated()]

#     # update positions of discourseme items
#     current_app.logger.debug('ccc_semmap_discoursemes :: update discourseme coordinates')
#     for discourseme in collocation.constellation.highlight_discoursemes:
#         discourseme_items = discourseme.get_items()
#         index_items = coordinates.index.isin(discourseme_items)
#         user_coordinates = coordinates.loc[index_items & ~ coordinates['x_user'].isna()]
#         if len(user_coordinates) > 0:
#             # if user coordinates: move to center of all user coordinates
#             x_center = user_coordinates['x_user'].mean()
#             y_center = user_coordinates['y_user'].mean()
#         else:
#             # else: move to center of all coordinates
#             x_center = coordinates.loc[index_items, 'x'].mean()
#             y_center = coordinates.loc[index_items, 'y'].mean()
#         coordinates.loc[index_items, 'x_user'] = x_center + normal(0, sigma_wiggle, sum(index_items))
#         coordinates.loc[index_items, 'y_user'] = y_center + normal(0, sigma_wiggle, sum(index_items))

#     coordinates['semantic_map_id'] = semantic_map.id
#     coordinates.index.name = 'item'

#     # delete old coordinates
#     [db.session.delete(c) for c in semantic_map.coordinates]
#     db.session.commit()

#     # add new coordinates
#     coordinates.to_sql('coordinates', con=db.engine, if_exists='append')
#     db.session.commit()


################
# API schemata #
################

# INPUT
class SemanticMapIn(Schema):

    collocation_ids = List(Integer(), required=False, load_default=[])
    keyword_ids = List(Integer(), required=False, load_default=[])

    method = String(required=False, load_default='tsne', validate=OneOf(['tsne', 'umap']))


class CoordinatesIn(Schema):

    item = String(required=True)
    x_user = Float(required=False, load_default=None)
    y_user = Float(required=False, load_default=None)


# OUTPUT
class SemanticMapOut(Schema):

    id = Integer(required=True)
    p = String(required=True)
    method = String(required=True)


class CoordinatesOut(Schema):

    semantic_map_id = Integer(required=True)
    item = String(required=True)
    x = Float(required=True)
    y = Float(required=True)
    x_user = Float(required=True, dump_default=None, metadata={'nullable': True})
    y_user = Float(required=True, dump_default=None, metadata={'nullable': True})


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
@bp.input(SemanticMapIn)
@bp.output(SemanticMapOut)
@bp.auth_required(auth)
def create_semantic_map(json_data):
    """Create semantic map for all top items in the provided keyword and collocation analyses.

    """

    method = json_data.get('method')

    collocation_ids = json_data.get('collocation_ids')
    collocations = [db.get_or_404(Collocation, collocation_id) for collocation_id in collocation_ids]
    keyword_ids = json_data.get('keyword_ids')
    keywords = [db.get_or_404(Keyword, keyword_id) for keyword_id in keyword_ids]

    analyses = collocations + keywords
    embeddings = analyses[0].corpus.embeddings

    semantic_map = ccc_semmap(analyses, embeddings, per_am=200, method=method)

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


@bp.get("/<id>/coordinates/")
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
