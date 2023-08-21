#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, List, String
from flask import g

from . import db
from .database import Constellation, Discourseme
from .users import auth

bp = APIBlueprint('constellation', __name__, url_prefix='/constellation')


class ConstellationIn(Schema):

    name = String()
    description = String()
    filter_discoursemes = List(Integer)


class ConstellationOut(Schema):

    id = Integer()
    name = String()
    description = String()
    # filter_discoursemes = List(DiscoursemeOut)


class ConstellationItemsOut(Schema):

    id = Integer()
    constellation_id = Integer()
    item = String()
    freq = Integer()


@bp.post('/')
@bp.input(ConstellationIn)
@bp.output(ConstellationOut)
@bp.auth_required(auth)
def create(data):
    """Create new constellation.

    """
    filter_discoursemes = Discourseme.query.filter(Discourseme.id.in_(data['filter_discoursemes'])).all()
    constellation = Constellation(
        user_id=g.user.id,
        name=data['name'],
        description=data['description']
    )
    [constellation.filter_discoursemes.append(discourseme) for discourseme in filter_discoursemes]
    db.session.add(constellation)
    db.session.commit()

    return ConstellationOut().dump(constellation), 200


@bp.get('/<id>')
@bp.output(ConstellationOut)
@bp.auth_required(auth)
def get_constellation(id):
    """Get constellation.

    """

    constellation = db.get_or_404(Constellation, id)
    return ConstellationOut().dump(constellation), 200
