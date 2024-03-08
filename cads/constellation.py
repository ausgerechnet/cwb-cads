#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, List, Nested, String

from . import db
from .database import Constellation, Discourseme
from .discourseme import DiscoursemeOut
from .users import auth
from .database import Corpus
from .concordance import ConcordanceIn, ConcordanceOut, ccc_concordance
from .query import query_discourseme, query_item

bp = APIBlueprint('constellation', __name__, url_prefix='/constellation')


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


@bp.post('/')
@bp.input(ConstellationIn)
@bp.output(ConstellationOut)
@bp.auth_required(auth)
def create(data):
    """Create new constellation.

    """
    filter_discoursemes = Discourseme.query.filter(Discourseme.id.in_(data['filter_discourseme_ids'])).all()
    highlight_discoursemes = Discourseme.query.filter(Discourseme.id.in_(data.get('highlight_discourseme_ids'))).all()
    constellation = Constellation(
        user_id=auth.current_user.id,
        name=data.pop('name', '-'.join([d.name for d in filter_discoursemes])),
        description=data.pop('description', None),
    )
    [constellation.filter_discoursemes.append(discourseme) for discourseme in filter_discoursemes]
    [constellation.highlight_discoursemes.append(discourseme) for discourseme in highlight_discoursemes]
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


# @bp.patch('/<id>')
# @bp.input(ConstellationIn(partial=True))
# @bp.output(ConstellationOut)
# @bp.auth_required(auth)
# def create(data):
#     """Create new constellation.

#     """
#     filter_discoursemes = Discourseme.query.filter(Discourseme.id.in_(data['filter_discourseme_ids'])).all()
#     constellation = Constellation(
#         user_id=auth.current_user.id,
#         name=data.pop('name', '-'.join([d.name for d in filter_discoursemes])),
#         description=data.pop('description', None)
#     )
#     [constellation.filter_discoursemes.append(discourseme) for discourseme in filter_discoursemes]
#     db.session.add(constellation)
#     db.session.commit()

#     return ConstellationOut().dump(constellation), 200


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
def concordance_lines(id, corpus_id, data):
    """Get concordance lines.

    """

    constellation = db.get_or_404(Constellation, id)
    corpus = db.get_or_404(Corpus, corpus_id)

    # display options
    window = data.get('window')
    primary = data.get('primary')
    secondary = data.get('secondary')
    extended_window = data.get('extended_window')

    # pagination
    page_size = data.get('page_size')
    page_number = data.get('page_number')

    # FILTERING #
    #############
    filter_item = data.get('filter_item')
    filter_item_p_att = data.get('filter_item_p_att')
    filter_discourseme_ids = data.get('filter_discourseme_ids')

    filter_queries = set()

    # TODO:
    # filter queries should run on subcorpus and specify the corresponding match

    for fd in constellation.filter_discoursemes:
        fq = query_discourseme(fd, corpus)
        filter_queries.add(fq)

    for discourseme_id in filter_discourseme_ids:
        fd = db.get_or_404(Discourseme, discourseme_id)
        fq = query_discourseme(fd, corpus)
        filter_queries.add(fq)

    if filter_item:
        fq = query_item(filter_item, filter_item_p_att, next(iter(filter_queries)).s, corpus)
        filter_queries.add(fq)

    filter_queries = sorted(list(filter_queries), key=lambda x: x.number_matches)

    # HIGHLIGHTING #
    ################
    highlight_queries = list()
    for hd in constellation.highlight_discoursemes:
        highlight_queries.append(query_discourseme(hd, corpus))

    # SORTING #
    ###########
    # TODO
    # sort_order = data.get('sort_order')
    # sort_by = data.get('sort_by')
    # - concordance lines are sorted by ConcordanceSort
    # - sort keys are created on demand
    # - sorting according to {p-att} on {offset}
    # - default: cpos at match
    # - ascending / descending

    # actual concordancing
    concordance = ccc_concordance(filter_queries, primary, secondary, window, extended_window, page_number, page_size,
                                  highlight_queries=highlight_queries)

    return ConcordanceOut().dump(concordance), 200
