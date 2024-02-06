#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Boolean, Integer, Nested, String
from ccc import Corpus
from flask import current_app

from . import db
from .database import Breakdown, Query
from .query import ccc_query
from .users import auth

bp = APIBlueprint('breakdown', __name__, url_prefix='/breakdown')


def ccc_breakdown(breakdown):

    matches_df = ccc_query(breakdown._query)
    corpus = Corpus(breakdown._query.corpus.cwb_id,
                    cqp_bin=current_app.config['CCC_CQP_BIN'],
                    registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                    data_dir=current_app.config['CCC_DATA_DIR'])

    matches = corpus.subcorpus(df_dump=matches_df, overwrite=False)
    breakdown_df = matches.breakdown(p_atts=[breakdown.p])
    breakdown_df['breakdown_id'] = breakdown.id
    breakdown_df.to_sql("breakdown_items", con=db.engine, if_exists='append')
    db.session.commit()

    return breakdown_df


class BreakdownIn(Schema):

    p = String(required=True)


class BreakdownItemsOut(Schema):

    id = Integer()
    breakdown_id = Integer()
    item = String()
    freq = Integer()


class BreakdownOut(Schema):

    id = Integer()
    query_id = Integer()
    p = String()
    items = Nested(BreakdownItemsOut(many=True))


@bp.get('/<id>')
@bp.output(BreakdownOut)
@bp.auth_required(auth)
def get_breakdown(id):
    """Get breakdown.

    """

    breakdown = db.get_or_404(Breakdown, id)
    return BreakdownOut().dump(breakdown), 200


@bp.delete('/<id>')
@bp.auth_required(auth)
def delete_breakdown(id):
    """Delete breakdown.

    """

    breakdown = db.get_or_404(Breakdown, id)
    db.session.delete(breakdown)
    db.session.commit()

    return 'Deletion successful.', 200


@bp.post('/<id>/execute')
@bp.output(BreakdownOut)
@bp.auth_required(auth)
def execute(id):
    """Execute breakdown: Calculate frequencies of query matches.

    """

    breakdown = db.get_or_404(Breakdown, id)
    ccc_breakdown(breakdown)

    return BreakdownOut().dump(breakdown), 200


@bp.get("/<id>/items")
@bp.output(BreakdownItemsOut(many=True))
@bp.auth_required(auth)
def get_breakdown_items(id):
    """Get breakdown items.

    """

    breakdown = db.get_or_404(Breakdown, id)

    return [BreakdownItemsOut().dump(item) for item in breakdown.items], 200


# QUERY
@bp.post('/query/<query_id>')
@bp.input(BreakdownIn)
@bp.input({'execute': Boolean(load_default=True)}, location='query')
@bp.output(BreakdownOut)
@bp.auth_required(auth)
def create(query_id, data, data_query):
    """Create new breakdown for query.

    """
    breakdown = Breakdown(query_id=query_id, **data)
    db.session.add(breakdown)
    db.session.commit()

    if data_query['execute']:
        ccc_breakdown(breakdown)

    return BreakdownOut().dump(breakdown), 200


@bp.get('/query/<query_id>')
@bp.output(BreakdownOut(many=True))
@bp.auth_required(auth)
def get_breakdowns(query_id):
    """Get all breakdowns of query.

    """

    query = db.get_or_404(Query, query_id)
    return [BreakdownOut().dump(breakdown) for breakdown in query.breakdowns], 200
