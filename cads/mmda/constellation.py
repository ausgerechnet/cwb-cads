#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, List, Nested, String

from .. import db
from ..users import auth
from .database import Constellation, Discourseme
from .discourseme import DiscoursemeOut

bp = APIBlueprint('constellation', __name__, url_prefix='/constellation')


################
# API schemata #
################

class ConstellationIn(Schema):

    name = String(required=False, metadata={'nullable': True})
    comment = String(required=False, metadata={'nullable': True})
    discourseme_ids = List(Integer, required=False, load_default=[])


class ConstellationOut(Schema):

    id = Integer(required=True)
    name = String(required=True, metadata={'nullable': True})
    comment = String(required=True, metadata={'nullable': True})
    discoursemes = Nested(DiscoursemeOut(many=True), required=True, dump_default=[])


#################
# API endpoints #
#################
@bp.post('/')
@bp.input(ConstellationIn)
@bp.output(ConstellationOut)
@bp.auth_required(auth)
def create_constellation(json_data):
    """Create new constellation.

    """

    discourseme_ids = json_data.get('discourseme_ids')
    discoursemes = [db.get_or_404(Discourseme, did) for did in discourseme_ids]

    default_name = '-'.join([d.name.replace(" ", "-") for d in discoursemes])[:200]

    constellation = Constellation(
        user_id=auth.current_user.id,
        name=json_data.get('name', default_name),
        comment=json_data.get('comment', None),
    )
    [constellation.discoursemes.append(discourseme) for discourseme in discoursemes]
    db.session.add(constellation)
    db.session.commit()

    return ConstellationOut().dump(constellation), 200


@bp.get('/<constellation_id>')
@bp.output(ConstellationOut)
@bp.auth_required(auth)
def get_constellation(constellation_id):
    """Get details of constellation.

    """

    constellation = db.get_or_404(Constellation, constellation_id)
    return ConstellationOut().dump(constellation), 200


@bp.get('/')
@bp.output(ConstellationOut(many=True))
@bp.auth_required(auth)
def get_all_constellations():
    """Get all constellations.

    """

    constellations = Constellation.query.all()
    return [ConstellationOut().dump(constellation) for constellation in constellations], 200


@bp.delete('/<constellation_id>')
@bp.auth_required(auth)
def delete_constellation(constellation_id):
    """Delete constellation.

    """

    constellation = db.get_or_404(Constellation, constellation_id)
    db.session.delete(constellation)
    db.session.commit()

    return 'Deletion successful.', 200


@bp.patch('/<constellation_id>')
@bp.input(ConstellationIn(partial=True))
@bp.output(ConstellationOut)
@bp.auth_required(auth)
def patch_constellation(constellation_id, json_data):
    """Patch constellation. Use for updating name, comment, or discoursemes.

    """
    constellation = db.get_or_404(Constellation, constellation_id)

    # if constellation.user_id != auth.current_user.id:
    #     return abort(409, 'constellation does not belong to user')

    constellation.name = json_data.get('name') if json_data.get('name') else constellation.name
    constellation.comment = json_data.get('comment') if json_data.get('comment') else constellation.comment

    discourseme_ids = json_data.get('discourseme_ids')
    if discourseme_ids:
        discoursemes = [db.get_or_404(Discourseme, disc) for disc in discourseme_ids]

        # remove old ones
        for disc in constellation.discoursemes:
            constellation.discoursemes.remove(disc)

        # add new ones
        for disc in discoursemes:
            constellation.discoursemes.append(disc)

    db.session.commit()

    return ConstellationOut().dump(constellation), 200


@bp.patch('/<constellation_id>/add-discourseme')
@bp.input(ConstellationIn(partial=True))
@bp.output(ConstellationOut)
@bp.auth_required(auth)
def patch_constellation_add(constellation_id, json_data):
    """Patch constellation: add discourseme(s).

    """
    constellation = db.get_or_404(Constellation, id)
    discoursemes_ids = json_data.get('discourseme_ids', [])
    discoursemes = [db.get_or_404(Discourseme, did) for did in discoursemes_ids]
    for disc in discoursemes:
        constellation.discoursemes.append(disc)
    db.session.commit()

    return ConstellationOut().dump(constellation), 200


@bp.patch('/<constellation_id>/remove-discourseme')
@bp.input(ConstellationIn(partial=True))
@bp.output(ConstellationOut)
@bp.auth_required(auth)
def patch_constellation_remove(constellation_id, json_data):
    """Patch constellation: remove discourseme(s).

    """

    constellation = db.get_or_404(Constellation, constellation_id)
    discoursemes_ids = json_data.get('discourseme_ids', [])
    discoursemes = [db.get_or_404(Discourseme, did) for did in discoursemes_ids]

    for discourseme in discoursemes:
        constellation.discoursemes.remove(discourseme)
    db.session.commit()

    return ConstellationOut().dump(constellation), 200
