#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema, abort
from apiflask.fields import Integer, List, Nested, String
from flask import redirect, url_for, current_app

from .. import db
from ..collocation import CollocationIn, CollocationOut
from ..concordance import ConcordanceIn, ConcordanceOut
from ..database import Corpus, SubCorpus
from .database import Constellation, Discourseme
from .discourseme import DiscoursemeOut
from ..query import get_or_create_query_discourseme
from ..users import auth

bp = APIBlueprint('constellation', __name__, url_prefix='/constellation')


################
# API schemata #
################
class ConstellationIn(Schema):

    name = String(required=False)
    comment = String(required=False)
    discourseme_ids = List(Integer, required=False, load_default=[])


class ConstellationOut(Schema):

    id = Integer()
    name = String(metadata={'nullable': True})
    comment = String(required=False, metadata={'nullable': True})
    discoursemes = Nested(DiscoursemeOut(many=True))


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

    discoursemes_ids = json_data.get('discourseme_ids')
    discoursemes = [db.get_or_404(Discourseme, did) for did in discoursemes_ids]
    constellation = Constellation(
        user_id=auth.current_user.id,
        name=json_data.pop('name', '-'.join([d.name for d in discoursemes])),
        description=json_data.pop('description', None),
    )
    [constellation.discoursemes.append(discourseme) for discourseme in discoursemes]
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
    """Patch constellation.

    """
    constellation = db.get_or_404(Constellation, id)

    # if constellation.user_id != auth.current_user.id:
    #     return abort(409, 'constellation does not belong to user')

    constellation.name = json_data.get('name') if json_data.get('name') else constellation.name
    constellation.description = json_data.get('comment') if json_data.get('comment') else constellation.comment

    discoursemes_ids = json_data.get('discourseme_ids')
    if len(discoursemes_ids) > 0:
        discoursemes = [db.get_or_404(Discourseme, did) for did in discoursemes_ids]
        [constellation.discoursemes.append(did) for did in discoursemes]
    db.session.commit()

    return ConstellationOut().dump(constellation), 200


@bp.patch('/<id>/add-discourseme')
@bp.input({'discourseme_id': Integer()}, schema_name='AddDiscoursemeIdIn')
@bp.output(ConstellationOut)
@bp.auth_required(auth)
def patch_add(id, json_data):
    """Patch constellation: add a highlight discourseme.

    """

    constellation = db.get_or_404(Constellation, id)
    discourseme = db.get_or_404(Discourseme, json_data['discourseme_id'])
    if discourseme not in constellation.discoursemes:
        constellation.discoursemes.append(discourseme)
    else:
        current_app.logger.debug(f"item {discourseme.id} already in description")
    db.session.commit()

    return ConstellationOut().dump(constellation), 200


@bp.patch('/<id>/remove-discourseme')
@bp.input({'discourseme_id': Integer()}, schema_name='RemoveDiscoursemeIdIn')
@bp.output(ConstellationOut)
@bp.auth_required(auth)
def patch_remove(id, json_data):
    """Patch constellation: remove a highlight discourseme.

    """
    constellation = db.get_or_404(Constellation, id)
    discourseme = db.get_or_404(Discourseme, json_data['discourseme_id'])
    try:
        constellation.discoursemes.remove(discourseme)
    except ValueError:
        return abort(404, 'no such discourseme')

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


#############################
# CONSTELLATION/DESCRIPTION #
#############################


@bp.get("/<id>/corpus/<corpus_id>/concordance/")
@bp.input(ConcordanceIn, location='query')
@bp.input({'subcorpus_id': Integer(load_default=None, required=False)}, location='query', arg_name='query_subcorpus')
@bp.output(ConcordanceOut)
@bp.auth_required(auth)
def concordance_lines(id, corpus_id, query_data, query_subcorpus):
    """Get concordance lines of constellation in corpus. Redirects to query endpoint.

    """

    constellation = db.get_or_404(Constellation, id)
    corpus = db.get_or_404(Corpus, corpus_id)
    subcorpus = db.get_or_404(SubCorpus, query_subcorpus['subcorpus_id']) if query_subcorpus['subcorpus_id'] else None

    filter_discourseme = constellation.filter_discoursemes[0]  # TODO

    query_id = get_or_create_query_discourseme(corpus, filter_discourseme, subcorpus).id

    # append highlight discoursemes
    query_data['highlight_discourseme_ids'] = query_data.get('highlight_discourseme_ids') + \
        [d.id for d in constellation.highlight_discoursemes]

    return redirect(url_for('query.concordance_lines', query_id=query_id, **query_data))


@bp.get("/<id>/corpus/<corpus_id>/collocation/")
@bp.input(CollocationIn, location='query')
@bp.input({'subcorpus_id': Integer(load_default=None, required=False)}, location='query', arg_name='query_subcorpus')
@bp.output(CollocationOut)
@bp.auth_required(auth)
def collocation(id, corpus_id, query_data, query_subcorpus):
    """Get collocation analysis of constellation in corpus. Redirects to query endpoint.

    """

    constellation = db.get_or_404(Constellation, id)
    corpus = db.get_or_404(Corpus, corpus_id)
    subcorpus = db.get_or_404(SubCorpus, query_subcorpus['subcorpus_id']) if query_subcorpus['subcorpus_id'] else None

    filter_discourseme = constellation.filter_discoursemes[0]  # TODO

    query_id = get_or_create_query_discourseme(corpus, filter_discourseme, subcorpus).id
    query_data['constellation_id'] = constellation.id

    return redirect(url_for('query.get_collocation', query_id=query_id, **query_data))
