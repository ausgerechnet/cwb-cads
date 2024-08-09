#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Float, Integer, Nested, String
from flask import current_app
from pandas import DataFrame

from . import db
from .database import BreakdownItems

bp = APIBlueprint('breakdown', __name__, url_prefix='/breakdown')


def ccc_breakdown(breakdown):

    current_app.logger.debug(f'ccc_breakdown :: breakdown {breakdown.id} in corpus {breakdown._query.corpus.cwb_id}')

    breakdown_items = BreakdownItems.query.filter_by(breakdown_id=breakdown.id)

    if not breakdown_items.first():

        # count matches
        from .query import ccc_query
        current_app.logger.debug('ccc_breakdown :: counting matches')
        matches_df = ccc_query(breakdown._query)
        if len(matches_df) == 0:
            current_app.logger.debug('ccc_breakdown :: 0 matches')
            return
        corpus = breakdown._query.corpus.ccc()
        matches = corpus.subcorpus(df_dump=matches_df, overwrite=False)

        # save breakdown
        breakdown_df = matches.breakdown(p_atts=[breakdown.p])
        breakdown_df['breakdown_id'] = breakdown.id
        current_app.logger.debug(f"ccc_breakdown :: saving {len(breakdown_df)} breakdown items to database")
        breakdown_df.to_sql("breakdown_items", con=db.engine, if_exists='append')
        db.session.commit()
        current_app.logger.debug("ccc_breakdown :: saved to database")

    else:
        current_app.logger.debug("ccc_breakdown :: getting breakdown items from database")
        breakdown_df = DataFrame([vars(s) for s in breakdown.items], columns=['freq', 'breakdown_id', 'item']).set_index(['item'])
        current_app.logger.debug(f"ccc_breakdown :: got {len(breakdown_df)} breakdown items from database")

    return breakdown_df


################
# API schemata #
################
class BreakdownIn(Schema):

    p = String(required=True)


class BreakdownItemsOut(Schema):

    id = Integer()
    breakdown_id = Integer()
    item = String()
    freq = Integer()
    nr_tokens = Integer()
    ipm = Float()


class BreakdownOut(Schema):

    id = Integer()
    query_id = Integer()
    p = String()
    items = Nested(BreakdownItemsOut(many=True))


# #################
# # API endpoints #
# #################
# @bp.get('/<id>')
# @bp.output(BreakdownOut)
# @bp.auth_required(auth)
# def get_breakdown(id):
#     """Get breakdown.

#     """

#     breakdown = db.get_or_404(Breakdown, id)
#     return BreakdownOut().dump(breakdown), 200


# @bp.delete('/<id>')
# @bp.auth_required(auth)
# def delete_breakdown(id):
#     """Delete breakdown.

#     """

#     breakdown = db.get_or_404(Breakdown, id)
#     db.session.delete(breakdown)
#     db.session.commit()

#     return 'Deletion successful.', 200


# @bp.post('/<id>/execute')
# @bp.output(BreakdownOut)
# @bp.auth_required(auth)
# def execute(id):
#     """Execute breakdown: Calculate frequencies of query matches.

#     """

#     breakdown = db.get_or_404(Breakdown, id)
#     ccc_breakdown(breakdown)

#     return BreakdownOut().dump(breakdown), 200


# @bp.get("/<id>/items")
# @bp.output(BreakdownItemsOut(many=True))
# @bp.auth_required(auth)
# def get_breakdown_items(id):
#     """Get breakdown items.

#     """

#     breakdown = db.get_or_404(Breakdown, id)

#     return [BreakdownItemsOut().dump(item) for item in breakdown.items], 200
