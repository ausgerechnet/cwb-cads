#!/usr/bin/python3
# -*- coding: utf-8 -*-

from collections import Counter

from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, String
from ccc import Corpus
from flask import current_app

from . import db
from .database import Breakdown, BreakdownItems, Query
from .users import auth

bp = APIBlueprint('breakdown', __name__, url_prefix='/<query_id>/breakdown')


def ccc_breakdown(breakdown):

    matches = breakdown._query.matches

    if len(matches) == 0:
        raise ValueError()

    # get frequency counts
    corpus = Corpus(breakdown._query.corpus.cwb_id,
                    cqp_bin=current_app.config['CCC_CQP_BIN'],
                    registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                    data_dir=current_app.config['CCC_DATA_DIR'])
    items = list()
    for match in matches:
        items.append(" ".join(["_".join(corpus.cpos2patts(cpos, [breakdown.p])) for cpos in range(match.match, match.matchend + 1)]))
    counts = Counter(items)

    # add breakdown items to database
    for item, freq in counts.items():
        db.session.add(
            BreakdownItems(
                item=item,
                freq=freq,
                breakdown_id=breakdown.id
            )
        )
    db.session.commit()


class BreakdownIn(Schema):

    query_id = Integer()
    p = String()


class BreakdownOut(Schema):

    id = Integer()
    query_id = Integer()
    p = String()


class BreakdownItemsOut(Schema):

    id = Integer()
    breakdown_id = Integer()
    item = String()
    freq = Integer()


@bp.post('/')
@bp.input(BreakdownIn)
@bp.output(BreakdownOut)
@bp.auth_required(auth)
def create(query_id, data):
    """Create new breakdown for query.

    """
    breakdown = Breakdown(query_id=query_id, **data)
    db.session.add(breakdown)
    db.session.commit()

    return BreakdownOut().dump(breakdown), 200


@bp.get('/')
@bp.output(BreakdownOut(many=True))
@bp.auth_required(auth)
def get_breakdowns(query_id):
    """Get all breakdowns of query.

    """

    query = db.get_or_404(Query, query_id)
    return [BreakdownOut().dump(breakdown) for breakdown in query.breakdowns], 200


@bp.get('/<id>')
@bp.output(BreakdownOut)
@bp.auth_required(auth)
def get_breakdown(query_id, id):
    """Get breakdown.

    """

    breakdown = db.get_or_404(Breakdown, id)
    return BreakdownOut().dump(breakdown), 200


@bp.delete('/<id>')
@bp.auth_required(auth)
def delete_breakdown(query_id, id):
    """Delete breakdown.

    """

    breakdown = db.get_or_404(Breakdown, id)
    db.session.delete(breakdown)
    db.session.commit()

    return 'Deletion successful.', 200


@bp.post('/<id>/execute')
@bp.output(BreakdownOut)
@bp.auth_required(auth)
def execute(query_id, id):
    """Execute breakdown: Calculate frequencies of query matches.

    """

    breakdown = db.get_or_404(Breakdown, id)
    ccc_breakdown(breakdown)

    return BreakdownOut().dump(breakdown), 200


@bp.get("/<id>/items")
@bp.output(BreakdownItemsOut(many=True))
@bp.auth_required(auth)
def get_breakdown_items(query_id, id):
    """Get breakdown items.

    """

    breakdown = db.get_or_404(Breakdown, id)

    return [BreakdownItemsOut().dump(item) for item in breakdown.items], 200
