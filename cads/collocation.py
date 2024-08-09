#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Float, Integer, List, Nested, String
from apiflask.validators import OneOf
from association_measures import measures
from flask import current_app
from pandas import DataFrame, read_sql

from . import db
from .database import (Collocation, CollocationItem, CollocationItemScore,
                       CotextLines, SemanticMap)
from .semantic_map import (CoordinatesOut, SemanticMapOut, ccc_semmap,
                           ccc_semmap_update)
from .users import auth
from .utils import AMS_DICT

bp = APIBlueprint('collocation', __name__, url_prefix='/collocation')


def get_or_create_counts(collocation, remove_focus_cpos=True):
    """makes sure that CollocationItems exist for collocation analysis = query + context

    """

    from .query import get_or_create_cotext

    current_app.logger.debug("get_or_create_counts :: getting counts")
    old = CollocationItem.query.filter_by(collocation_id=collocation.id)
    if old.first():
        current_app.logger.debug("get_or_create_counts :: counts already exist")
        return
        # TODO remove existing counts when forcing rerun
        # current_app.logger.debug("deleting old ones")
        # CollocationItems.query.filter_by(collocation_id=collocation.id).delete()
        # current_app.logger.debug("deleted")
        # db.session.commit()

    # get relevant objects
    focus_query = collocation._query
    window = collocation.window
    s_break = collocation.s_break

    # corpus / subcorpus
    if focus_query.subcorpus and collocation.marginals == 'local':
        corpus = collocation._query.subcorpus.ccc()
    else:
        corpus = collocation._query.corpus.ccc()

    ###################
    # (1) GET CONTEXT #
    ###################
    current_app.logger.debug(f'get_or_create_counts :: getting context of query {focus_query.id}')
    cotext = get_or_create_cotext(focus_query, window, s_break, return_df=True)
    cotext_lines = CotextLines.query.filter(CotextLines.cotext_id == cotext.id,
                                            CotextLines.offset <= window,
                                            CotextLines.offset >= -window)
    df_cooc = read_sql(cotext_lines.statement, con=db.engine, index_col='id').reset_index(drop=True)
    if remove_focus_cpos:
        discourseme_cpos = set(df_cooc.loc[df_cooc['offset'] == 0]['cpos'])  # focus can only match in context
    df_cooc = df_cooc.drop_duplicates(subset='cpos')
    if remove_focus_cpos:
        current_app.logger.debug('get_or_create_counts :: removing filter cpos')
        df_cooc = df_cooc.loc[~df_cooc['cpos'].isin(discourseme_cpos)]

    ###################
    # (2) COUNT ITEMS #
    ###################
    current_app.logger.debug(f'get_or_create_counts :: counting items in context for window {window}')

    # create context counts of items for window
    f = corpus.counts.cpos(df_cooc['cpos'], [collocation.p])[['freq']].rename(columns={'freq': 'f'})

    # add marginals
    f2 = corpus.marginals(f.index, [collocation.p])[['freq']].rename(columns={'freq': 'f2'})
    counts = f.join(f2).fillna(0, downcast='infer')
    counts['f1'] = len(df_cooc)
    counts['N'] = corpus.size()

    ###################
    # (3) SAVE COUNTS #
    ###################
    current_app.logger.debug(f'get_or_create_counts :: saving {len(counts)} items to database')
    counts['collocation_id'] = collocation.id
    counts.reset_index().to_sql('collocation_item', con=db.engine, if_exists='append', index=False)
    db.session.commit()

    ###################
    # (4) SAVE SCORES #
    ###################
    current_app.logger.debug('get_or_create_counts :: adding scores')
    counts = DataFrame([vars(s) for s in collocation.items], columns=['id', 'f', 'f1', 'f2', 'N']).set_index('id')
    scores = measures.score(counts, freq=True, per_million=True, digits=6, boundary='poisson', vocab=len(counts)).reset_index()
    scores = scores.melt(id_vars=['id'], var_name='measure', value_name='score').rename({'id': 'collocation_item_id'}, axis=1)
    scores['collocation_id'] = collocation.id
    scores.to_sql('collocation_item_score', con=db.engine, if_exists='append', index=False)
    db.session.commit()

    return scores


# def ccc_collocates_conflate(collocation):
#     """conflate items in context


#     """

#     records = [{'item': item.item, 'window': item.window, 'am': item.am, 'value': item.value} for item in collocation.items]
#     df_collocates = DataFrame.from_records(records).pivot(index=['item', 'window'], columns='am', values='value').reset_index()
#     for discourseme in collocation.constellation.highlight_discoursemes:

#         disc_label = f"(ID: {discourseme.id})"
#         disc_items = discourseme.items.split("\t")

#         # DELETE IF EXISTS
#         CollocationItems.query.filter_by(collocation_id=collocation.id, item=disc_label).delete()
#         db.session.commit()

#         # CONFLATE
#         df = df_collocates.loc[df_collocates['item'].isin(disc_items)]
#         df = df.groupby('window').agg({'O11': 'sum', 'O21': 'sum', 'R1': 'mean', 'R2': 'mean', 'in_nodes': 'sum', 'marginal': 'mean'})
#         df = df.rename({'O11': 'f1', 'O21': 'f2', 'R1': 'N1', 'R2': 'N2'}, axis=1)
#         df = measures.score(df, freq=True, per_million=True, digits=6, boundary='poisson', vocab=len(collocation.items))
#         df = df.reset_index().fillna(0)
#         df['item'] = disc_label

#         # ADD TO DATABASE
#         df = df.melt(id_vars=['item', 'window'], var_name='am')
#         for row in df.iterrows():
#             items = dict(row[1])
#             items['collocation_id'] = collocation.id
#             db.session.add(CollocationItems(**items))

#     db.session.commit()


################
# API schemata #
################
class CollocationIn(Schema):

    # constellation_id = Integer(required=False)
    semantic_map_id = Integer(required=False)

    p = String(required=True)
    window = Integer(required=False, load_default=10)
    s_break = String(required=False)
    marginals = String(required=False, load_default='local', validate=OneOf(['local', 'global']))

    # filtering for second-order collocation
    filter_item = String(metadata={'nullable': True}, required=False)
    filter_item_p_att = String(load_default='lemma', required=False)
    filter_discourseme_ids = List(Integer, load_default=[], required=False)


class CollocationOut(Schema):

    id = Integer()

    # constellation_id = Integer(metadata={'nullable': True})
    semantic_map_id = Integer(metadata={'nullable': True})

    marginals = String(validate=OneOf(['local', 'global']))
    p = String()
    s_break = String()

    nr_items = Integer()


# IDENTICAL TO KEYWORDS ↓
class CollocationPatchIn(Schema):

    semantic_map_id = Integer(required=False, load_default=None)


class CollocationItemsIn(Schema):

    sort_order = String(load_default='descending', required=False, validate=OneOf(['ascending', 'descending']))
    sort_by = String(load_default='conservative_log_ratio', required=False, validate=OneOf(AMS_DICT.keys()))
    page_size = Integer(load_default=10, required=False)
    page_number = Integer(load_default=1, required=False)


class CollocationScoreOut(Schema):

    measure = String()
    score = Float()


class CollocationItemOut(Schema):

    item = String()
    scores = Nested(CollocationScoreOut(many=True))


class CollocationItemsOut(Schema):

    id = Integer()

    sort_by = String()
    nr_items = Integer()
    page_size = Integer()
    page_number = Integer()
    page_count = Integer()

    items = Nested(CollocationItemOut(many=True), required=False)
    coordinates = Nested(CoordinatesOut(many=True), required=False, metadata={'nullable': True})


#################
# API endpoints #
#################
@bp.get('/')
@bp.output(CollocationOut(many=True))
@bp.auth_required(auth)
def get_all_collocation():
    """Get all collocations.

    """

    collocations = Collocation.query.all()

    return [CollocationOut().dump(collocation) for collocation in collocations], 200


@bp.get('/<id>/')
@bp.output(CollocationOut)
@bp.auth_required(auth)
def get_collocation(id):
    """Get one collocation analysis.

    """

    collocation = db.get_or_404(Collocation, id)

    return CollocationOut().dump(collocation), 200


@bp.delete('/<id>/')
@bp.auth_required(auth)
def delete_collocation(id):
    """Delete collocation.

    """

    collocation = db.get_or_404(Collocation, id)
    db.session.delete(collocation)
    db.session.commit()

    return 'Deletion successful.', 200


@bp.patch('/<id>/')
@bp.input(CollocationPatchIn)
@bp.output(CollocationOut)
@bp.auth_required(auth)
def patch_collocation(id, json_data):
    """Patch a collocation analysis. Use for updating semantic map.

    """

    collocation = db.get_or_404(Collocation, id)

    for attr, value in json_data.items():
        setattr(collocation, attr, value)
    db.session.commit()

    return CollocationOut().dump(collocation), 200


@bp.get("/<id>/items")
@bp.input(CollocationItemsIn, location='query')
@bp.output(CollocationItemsOut)
@bp.auth_required(auth)
def get_collocation_items(id, query_data):
    """Get scored items of collocation analysis.

    """

    collocation = db.get_or_404(Collocation, id)

    # pagination settings
    page_size = query_data.pop('page_size')
    page_number = query_data.pop('page_number')
    sort_order = query_data.pop('sort_order')
    sort_by = query_data.pop('sort_by')

    # scores
    scores = CollocationItemScore.query.filter(
        CollocationItemScore.collocation_id == collocation.id,
        CollocationItemScore.measure == sort_by
    )

    # order
    if sort_order == 'ascending':
        scores = scores.order_by(CollocationItemScore.score)
    elif sort_order == 'descending':
        scores = scores.order_by(CollocationItemScore.score.desc())

    # paginate
    scores = scores.paginate(page=page_number, per_page=page_size)
    nr_items = scores.total
    page_count = scores.pages

    # format
    df_scores = DataFrame([vars(s) for s in scores], columns=['collocation_item_id'])
    items = [CollocationItemOut().dump(CollocationItem.query.filter_by(id=id).first()) for id in df_scores['collocation_item_id']]

    # coordinates
    coordinates = list()
    if collocation.semantic_map:
        requested_items = [item['item'] for item in items]
        ccc_semmap_update(collocation.semantic_map, requested_items)
        coordinates = [CoordinatesOut().dump(coordinates) for coordinates in collocation.semantic_map.coordinates if coordinates.item in requested_items]

    # TODO: also return ranks (to ease frontend pagination)?
    collocation_items = {
        'id': collocation.id,
        'sort_by': sort_by,
        'nr_items': nr_items,
        'page_size': page_size,
        'page_number': page_number,
        'page_count': page_count,
        'items': items,
        'coordinates': coordinates
    }

    return CollocationItemsOut().dump(collocation_items), 200


@bp.post('/<id>/semantic-map/')
@bp.input({'semantic_map_id': Integer(load_default=None)}, location='query')
@bp.output(SemanticMapOut)
@bp.auth_required(auth)
def create_semantic_map(id, query_data):
    """Create new semantic map for collocation items or make sure there are coordinates for all items on an existing map.

    """

    collocation = db.get_or_404(Collocation, id)

    if query_data['semantic_map_id']:
        collocation.semantic_map = db.get_or_404(SemanticMap, query_data['semantic_map_id'])
        db.session.commit()

        scores = CollocationItemScore.query.filter(
            CollocationItemScore.collocation_id == collocation.id,
            CollocationItemScore.measure == 'conservative_log_ratio'
        ).order_by(CollocationItemScore.score.desc()).paginate(page=1, per_page=500)
        df_scores = DataFrame([vars(s) for s in scores], columns=['collocation_item_id'])
        new_items = [CollocationItem.query.filter_by(id=id).first() for id in df_scores['collocation_item_id']]
        ccc_semmap_update(collocation.semantic_map, [item.item for item in new_items])

    else:
        ccc_semmap([collocation.id], sort_by="conservative_log_ratio", number=500)

    return SemanticMapOut().dump(collocation.semantic_map), 200
