#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, Nested, String
from ccc import Corpus
from flask import current_app
from pandas import DataFrame

from . import db
from .database import BreakdownItems

# from .users import auth

bp = APIBlueprint('breakdown', __name__, url_prefix='/breakdown')


def ccc_breakdown(breakdown, return_df=True):

    current_app.logger.debug(f'ccc_breakdown :: breakdown {breakdown._query.id} in corpus {breakdown._query.corpus.cwb_id}')

    breakdown_items = BreakdownItems.query.filter_by(breakdown_id=breakdown.id)

    if not breakdown_items.first():

        # count matches
        from .query import ccc_query
        current_app.logger.debug('ccc_breakdown :: counting matches')
        matches_df = ccc_query(breakdown._query, return_df=True)
        corpus = Corpus(breakdown._query.corpus.cwb_id,
                        cqp_bin=current_app.config['CCC_CQP_BIN'],
                        registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                        data_dir=current_app.config['CCC_DATA_DIR'])
        matches = corpus.subcorpus(df_dump=matches_df, overwrite=False)

        # save breakdown
        breakdown_df = matches.breakdown(p_atts=[breakdown.p])
        breakdown_df['breakdown_id'] = breakdown.id
        current_app.logger.debug(f"ccc_breakdown :: saving {len(breakdown_df)} breakdown items to database")
        breakdown_df.to_sql("breakdown_items", con=db.engine, if_exists='append')
        db.session.commit()
        current_app.logger.debug("ccc_breakdown :: saved to database")

    elif return_df:
        current_app.logger.debug("ccc_breakdown :: getting breakdown items from database")
        breakdown_df = DataFrame([vars(s) for s in breakdown.items], columns=['match', 'matchend']).set_index(['match', 'matchend'])
        current_app.logger.debug(f"ccc_breakdown :: got {len(breakdown_df)} matches from database")

    else:
        current_app.logger.debug("ccc_breakdown :: breakdown already exist in database")
        breakdown_df = None

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
