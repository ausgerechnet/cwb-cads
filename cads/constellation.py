#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema, abort
from apiflask.fields import Integer, List, Nested, String
from flask import redirect, url_for

from . import db
from .concordance import ConcordanceIn, ConcordanceOut
from .database import Constellation, Corpus, Discourseme
from .discourseme import DiscoursemeOut
from .query import get_or_create_query_discourseme
from .users import auth

bp = APIBlueprint('constellation', __name__, url_prefix='/constellation')


# constellations have exactly one filter-discourseme


################
# API schemata #
################
class ConstellationIn(Schema):

    name = String(required=False)
    description = String(required=False)
    filter_discourseme_ids = List(Integer, required=True)
    highlight_discourseme_ids = List(Integer, required=False, load_default=[])


class ConstellationOut(Schema):

    id = Integer()
    name = String()
    description = String()
    filter_discoursemes = Nested(DiscoursemeOut(many=True))
    highlight_discoursemes = Nested(DiscoursemeOut(many=True))


#################
# API endpoints #
#################
@bp.post('/')
@bp.input(ConstellationIn)
@bp.output(ConstellationOut)
@bp.auth_required(auth)
def create(json_data):
    """Create new constellation.

    """
    # TODO: only one filter discourseme
    filter_discoursemes = Discourseme.query.filter(Discourseme.id.in_(json_data['filter_discourseme_ids'])).all()
    highlight_discoursemes = Discourseme.query.filter(Discourseme.id.in_(json_data.get('highlight_discourseme_ids'))).all()
    constellation = Constellation(
        user_id=auth.current_user.id,
        name=json_data.pop('name', '-'.join([d.name for d in filter_discoursemes])),
        description=json_data.pop('description', None),
    )
    # TODO: fill database table, do not append
    [constellation.filter_discoursemes.append(discourseme) for discourseme in filter_discoursemes]
    [constellation.highlight_discoursemes.append(discourseme) for discourseme in highlight_discoursemes]
    db.session.add(constellation)
    db.session.commit()

    return ConstellationOut().dump(constellation), 200


@bp.get('/<id>')
@bp.output(ConstellationOut)
@bp.auth_required(auth)
def get_constellation(id):
    """Get details of constellation.

    """

    constellation = db.get_or_404(Constellation, id)
    return ConstellationOut().dump(constellation), 200


@bp.delete('/<id>')
@bp.auth_required(auth)
def delete_constellation(id):
    """Delete constellation.

    """

    constellation = db.get_or_404(Constellation, id)
    db.session.delete(constellation)
    db.session.commit()

    return 'Deletion successful.', 200


@bp.patch('/<id>')
@bp.input(ConstellationIn(partial=True))
@bp.output(ConstellationOut)
@bp.auth_required(auth)
def patch_constellation(json_data):
    """Patch constellation. Use for updating name / description / highlight-discoursemes.

    """
    constellation = db.get_or_404(Constellation, id)

    if constellation.user_id != auth.current_user.id:
        return abort(409, 'constellation does not belong to user')

    if len(json_data.get('filter_discourseme_ids')) > 0:
        return abort(409, 'cannot change filter discourseme, create a new constellation instead')

    constellation.name = json_data.get('name') if json_data.get('name') else constellation.name
    constellation.description = json_data.get('description') if json_data.get('description') else constellation.description

    highlight_discoursemes_ids = json_data.get('highlight_discourseme_ids')
    if len(highlight_discoursemes_ids) > 0:
        highlight_discoursemes = [db.get_or_404(Discourseme, did) for did in highlight_discoursemes_ids]
        constellation.highlight_discoursemes = []
        [constellation.highlight_discoursemes.append(discourseme) for discourseme in highlight_discoursemes]
        db.session.commit()

    return ConstellationOut().dump(constellation), 200


@bp.get('/')
@bp.output(ConstellationOut(many=True))
@bp.auth_required(auth)
def get_constellations():
    """Get all constellations.

    """

    constellations = Constellation.query.all()
    return [ConstellationOut().dump(constellation) for constellation in constellations], 200


@bp.get("/<id>/corpus/<corpus_id>/concordance/")
@bp.input(ConcordanceIn, location='query')
@bp.output(ConcordanceOut)
@bp.auth_required(auth)
def concordance_lines(id, corpus_id, query_data):
    """Get concordance lines of constellation in corpus. Redirects to query endpoint.

    """

    constellation = db.get_or_404(Constellation, id)
    corpus = db.get_or_404(Corpus, corpus_id)
    # TODO: constellations should really only have one filter_discourseme
    filter_discourseme = constellation.filter_discoursemes[0]
    query_id = get_or_create_query_discourseme(corpus, filter_discourseme).id

    # append highlight and discoursemes
    query_data['highlight_discourseme_ids'] = query_data.get('highlight_discourseme_ids') + \
        [d.id for d in constellation.highlight_discoursemes]

    return redirect(url_for('query.concordance_lines', query_id=query_id, **query_data))
