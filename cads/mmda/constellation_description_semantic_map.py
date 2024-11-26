#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint
from pandas import DataFrame

from .. import db
from ..breakdown import ccc_breakdown
from ..database import Breakdown, SemanticMap, get_or_create
from ..semantic_map import ccc_semmap_update
from ..users import auth
from .database import ConstellationDescription, DiscoursemeCoordinates
from .discourseme_description import (DiscoursemeCoordinatesIn,
                                      DiscoursemeCoordinatesOut)

bp = APIBlueprint('semantic-map', __name__, url_prefix='/<description_id>/semantic-map/')


def get_discourseme_coordinates(semantic_map, discourseme_descriptions, p=None):
    """

    # TODO check that all items in the breakdown have coordinates
    """

    output = list()
    for desc in discourseme_descriptions:

        discourseme_coordinates = DiscoursemeCoordinates.query.filter_by(semantic_map_id=semantic_map.id,
                                                                         discourseme_id=desc.discourseme.id).first()

        if not discourseme_coordinates:

            if p is None:
                raise ValueError()

            # item coordinates
            query = desc._query
            breakdown = get_or_create(Breakdown, query_id=query.id, p=p)
            df_breakdown = ccc_breakdown(breakdown)
            if df_breakdown is not None:
                items = list(df_breakdown.reset_index()['item'])
            else:
                continue
            ccc_semmap_update(semantic_map, items)  # just to be sure
            coordinates = DataFrame([vars(s) for s in semantic_map.coordinates], columns=['x', 'y', 'x_user', 'y_user', 'item']).set_index('item')
            item_coordinates = coordinates.loc[items]

            # discourseme coordinates = centroid of items
            if len(item_coordinates) == 0:
                mean = {'x': 0, 'y': 0}
            else:
                # TODO check this syntax, use fillna instead
                item_coordinates.loc[~ item_coordinates['x_user'].isna(), 'x'] = item_coordinates['x_user']
                item_coordinates.loc[~ item_coordinates['y_user'].isna(), 'y'] = item_coordinates['y_user']
                mean = item_coordinates[['x', 'y']].mean(axis=0)

            # save
            discourseme_coordinates = DiscoursemeCoordinates(discourseme_id=desc.discourseme.id,
                                                             semantic_map_id=semantic_map.id,
                                                             x=mean['x'], y=mean['y'])
            db.session.add(discourseme_coordinates)
            db.session.commit()

        output.append(discourseme_coordinates)

    return output


# SEMANTIC MAP
###############
@bp.get("/<semantic_map_id>/coordinates/")
@bp.output(DiscoursemeCoordinatesOut(many=True))
@bp.auth_required(auth)
def get_coordinates(constellation_id, description_id, semantic_map_id):
    """Get discourseme coordinates.

    """

    description = db.get_or_404(ConstellationDescription, description_id)
    semantic_map = db.get_or_404(SemanticMap, semantic_map_id)
    discourseme_coordinates = get_discourseme_coordinates(semantic_map, description.discourseme_descriptions)

    return [DiscoursemeCoordinatesOut().dump(c) for c in discourseme_coordinates], 200


@bp.put("/<semantic_map_id>/coordinates/")
@bp.input(DiscoursemeCoordinatesIn)
@bp.output(DiscoursemeCoordinatesOut(many=True))
@bp.auth_required(auth)
def set_coordinates(constellation_id, description_id, semantic_map_id, json_data):
    """Set coordinates of a discourseme.

    """

    semantic_map = db.get_or_404(SemanticMap, semantic_map_id)
    description = db.get_or_404(ConstellationDescription, description_id)
    discourseme_id = json_data.get('discourseme_id')
    x_user = json_data.get('x_user')
    y_user = json_data.get('y_user')

    discourseme_coordinates = DiscoursemeCoordinates.query.filter(DiscoursemeCoordinates.discourseme_id == discourseme_id,
                                                                  DiscoursemeCoordinates.semantic_map_id == semantic_map.id).first()
    discourseme_coordinates.x_user = x_user
    discourseme_coordinates.y_user = y_user
    db.session.commit()

    discourseme_coordinates = get_discourseme_coordinates(semantic_map, description.discourseme_descriptions)

    return [DiscoursemeCoordinatesOut().dump(c) for c in discourseme_coordinates], 200
