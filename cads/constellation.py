#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, List, String, Nested

from . import db
from .database import Constellation, Discourseme
from .discourseme import DiscoursemeOut
from .users import auth

bp = APIBlueprint('constellation', __name__, url_prefix='/constellation')


class ConstellationIn(Schema):

    name = String(required=False)
    description = String(required=False)
    filter_discourseme_ids = List(Integer)
    highlight_discourseme_ids = List(Integer, required=False)


class ConstellationOut(Schema):

    id = Integer()
    name = String()
    description = String()
    # filter_discoursemes = List(DiscoursemeOut)
    highlight_discoursemes = Nested(DiscoursemeOut(many=True))


@bp.post('/')
@bp.input(ConstellationIn)
@bp.output(ConstellationOut)
@bp.auth_required(auth)
def create(data):
    """Create new constellation.

    """
    filter_discoursemes = Discourseme.query.filter(Discourseme.id.in_(data['filter_discourseme_ids'])).all()
    constellation = Constellation(
        user_id=auth.current_user.id,
        name=data.pop('name', '-'.join([d.name for d in filter_discoursemes])),
        description=data.pop('description', None)
    )
    [constellation.filter_discoursemes.append(discourseme) for discourseme in filter_discoursemes]
    db.session.add(constellation)
    db.session.commit()

    return ConstellationOut().dump(constellation), 200


@bp.get('/<id>')
@bp.output(ConstellationOut)
@bp.auth_required(auth)
def get_constellation(id):
    """Get details of a constellation.

    """

    constellation = db.get_or_404(Constellation, id)
    return ConstellationOut().dump(constellation), 200


@bp.delete('/<id>')
@bp.auth_required(auth)
def delete_constellation(id):
    """Delete one constellation.

    """

    constellation = db.get_or_404(Constellation, id)
    db.session.delete(constellation)
    db.session.commit()

    return 'Deletion successful.', 200


@bp.get('/')
@bp.output(ConstellationOut(many=True))
@bp.auth_required(auth)
def get_constellations():
    """Get all constellations.

    """

    constellations = Constellation.query.all()
    return [ConstellationOut().dump(constellation) for constellation in constellations], 200
