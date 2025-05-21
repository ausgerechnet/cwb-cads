#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Boolean, Float, Integer, Nested, String
from apiflask.validators import OneOf
from association_measures import measures
from flask import current_app
from pandas import DataFrame, read_sql, to_numeric
from sqlalchemy import select

from . import db
from .database import (Collocation, CollocationItem, CollocationItemScore,
                       CotextLines)
from .semantic_map import (CoordinatesOut, SemanticMapOut, ccc_semmap_init,
                           ccc_semmap_update)
from .users import auth
from .utils import AMS_DICT

bp = APIBlueprint('collocation', __name__, url_prefix='/collocation')


def get_filtered_cotext(focus_query, window, s_break, remove_focus_cpos=True):
    """retrieve cotext of focus query, removing duplicates and focus cpos if needed.

    """

    # get cotext as DataFrame
    from .query import get_or_create_cotext
    cotext = get_or_create_cotext(focus_query, window, s_break)
    if cotext is None:
        current_app.logger.error('get_filtered_cotext :: empty cotext')
        return None

    # query cotext lines
    cotext_lines_stmt = select(
        CotextLines.id, CotextLines.cpos, CotextLines.offset
    ).filter(
        CotextLines.cotext_id == cotext.id,
        CotextLines.offset.between(-window, window)
    )

    # convert query results to DataFrame
    current_app.logger.debug('get_filtered_cotext :: removing duplicates')
    df_cooc = read_sql(cotext_lines_stmt, con=db.engine).drop(columns=['id'])
    df_cooc['abs_offset'] = df_cooc['offset'].abs()
    df_cooc = df_cooc.sort_values(by='abs_offset')
    df_cooc = df_cooc.drop_duplicates(subset='cpos')
    df_cooc = df_cooc.drop('abs_offset', axis=1)

    # remove focus cpos if needed
    if remove_focus_cpos:
        current_app.logger.debug('get_filtered_cotext :: removing filter cpos')
        df_cooc = df_cooc[df_cooc['offset'] != 0]

    return df_cooc


def put_counts(collocation, remove_focus_cpos=True, include_negative=False, recount=False):
    """make sure that CollocationItems (counts and scores) exist for collocation analysis = query + context
    only creates if does not already exist (and recount is False)

    returns True except if cotext is empty (then False)
    """

    current_app.logger.debug("put_counts :: getting counts")
    old = CollocationItem.query.filter_by(collocation_id=collocation.id)
    if old.first():
        current_app.logger.debug("put_counts :: counts already exist")
        if recount:
            current_app.logger.debug("put_counts :: deleting counts")
            CollocationItem.query.filter_by(collocation_id=collocation.id).delete()
            db.session.commit()
            current_app.logger.debug("deleted")
        else:
            return True

    # parse parameters
    focus_query = collocation._query
    window = collocation.window
    s_break = collocation.s_break

    # create and return
    current_app.logger.debug(f'put_counts :: getting context of query {focus_query.id}')
    df_cooc = get_filtered_cotext(focus_query, window, s_break, remove_focus_cpos)
    if df_cooc is None:
        return False

    current_app.logger.debug(f'put_counts :: counting items in context for window {window}')
    if focus_query.subcorpus and collocation.marginals == 'local':
        corpus = collocation._query.subcorpus.ccc()
    else:
        corpus = collocation._query.corpus.ccc()
    # create context counts of items for window
    f = corpus.counts.cpos(df_cooc['cpos'], [collocation.p])[['freq']].rename(columns={'freq': 'f'})
    # add marginals
    f2 = corpus.marginals(f.index, [collocation.p])[['freq']].rename(columns={'freq': 'f2'})
    counts = f.join(f2)
    counts['f2'] = to_numeric(counts['f2'].fillna(0), downcast='integer')
    counts['f1'] = len(df_cooc)
    counts['N'] = corpus.size()

    current_app.logger.debug(f'put_counts :: saving {len(counts)} items to database')
    counts['collocation_id'] = collocation.id
    counts.reset_index().to_sql('collocation_item', con=db.engine, if_exists='append', index=False)
    db.session.commit()

    current_app.logger.debug('put_counts :: adding scores')
    counts = DataFrame([vars(s) for s in collocation.items], columns=['id', 'f', 'f1', 'f2', 'N']).set_index('id')
    scores = measures.score(counts, freq=True, digits=6, boundary='poisson', vocab=len(counts)).reset_index()
    if not include_negative:
        scores = scores.loc[scores.E11 <= scores.O11]
    scores = scores.drop(['O12', 'O21', 'O22', 'E12', 'E21', 'E22', 'R1', 'R2', 'C1', 'C2', 'N'], axis=1)
    scores = scores.melt(id_vars=['id'], var_name='measure', value_name='score').rename({'id': 'collocation_item_id'}, axis=1)
    scores['collocation_id'] = collocation.id

    current_app.logger.debug('put_counts :: saving scores')
    scores.to_sql('collocation_item_score', con=db.engine, if_exists='append', index=False)
    db.session.commit()

    return True


################
# API schemata #
################

# Input
class CollocationIn(Schema):

    semantic_map_id = Integer(required=False, load_default=None, allow_none=True)
    semantic_map_init = Boolean(required=False, load_default=True)

    p = String(required=True)
    window = Integer(required=False, load_default=10)
    marginals = String(required=False, load_default='local', validate=OneOf(['local', 'global']))
    s_break = String(required=False)

    # filtering for second-order collocation
    filter_item = String(required=False, allow_none=True)
    filter_item_p_att = String(required=False, load_default='lemma')
    filter_overlap = String(required=False, load_default='partial', validate=OneOf(['partial', 'full', 'match', 'matchend']))


# Output
class CollocationOut(Schema):

    id = Integer(required=True)

    semantic_map_id = Integer(required=True, allow_none=True, dump_default=None)
    query_id = Integer(required=True)

    p = String(required=True)
    window = Integer(required=True)
    marginals = String(required=True)
    s_break = String(required=True)

    nr_items = Integer(required=True)


# IDENTICAL TO KEYWORDS ↓

class CollocationItemsIn(Schema):

    sort_order = String(required=False, load_default='descending', validate=OneOf(['ascending', 'descending']))
    sort_by = String(required=False, load_default='conservative_log_ratio', validate=OneOf(AMS_DICT.keys()))
    page_size = Integer(required=False, load_default=10)
    page_number = Integer(required=False, load_default=1)
    min_score = Float(required=False, load_default=None, allow_none=True)


class CollocationScoreOut(Schema):

    measure = String(required=True)
    score = Float(required=True)


class CollocationItemOut(Schema):

    item = String(required=True)
    scores = Nested(CollocationScoreOut(many=True), required=True)
    raw_scores = Nested(CollocationScoreOut(many=True), required=True)
    scaled_scores = Nested(CollocationScoreOut(many=True), required=False)


class CollocationItemsOut(Schema):

    id = Integer(required=True)

    sort_by = String(required=True)
    nr_items = Integer(required=True)
    page_size = Integer(required=True)
    page_number = Integer(required=True)
    page_count = Integer(required=True)

    items = Nested(CollocationItemOut(many=True), required=True, dump_default=[])
    coordinates = Nested(CoordinatesOut(many=True), required=True, dump_default=[])


#################
# API endpoints #
#################
@bp.get('/')
@bp.output(CollocationOut(many=True))
@bp.auth_required(auth)
def get_all_collocation():
    """Get all collocation analyses.

    """

    collocations = Collocation.query.all()

    return [CollocationOut().dump(collocation) for collocation in collocations], 200


@bp.get('/<id>/')
@bp.output(CollocationOut)
@bp.auth_required(auth)
def get_collocation(id):
    """Get details of collocation analysis.

    """

    collocation = db.get_or_404(Collocation, id)

    return CollocationOut().dump(collocation), 200


@bp.delete('/<id>/')
@bp.auth_required(auth)
def delete_collocation(id):
    """Delete collocation analysis.

    """

    collocation = db.get_or_404(Collocation, id)
    db.session.delete(collocation)
    db.session.commit()

    return 'Deletion successful.', 200


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
@bp.input({'semantic_map_id': Integer(load_default=None),
           'method': String(required=False, load_default='tsne', validate=OneOf(['tsne', 'umap']))},
          location='query')
@bp.output(SemanticMapOut)
@bp.auth_required(auth)
def create_semantic_map(id, query_data):
    """Create new semantic map for collocation items or make sure there are coordinates for all items on an existing map.

    """

    collocation = db.get_or_404(Collocation, id)
    semantic_map_id = query_data['semantic_map_id']
    method = query_data.get('method')

    # remove old semantic map
    collocation.semantic_map_id = None
    db.session.commit()

    ccc_semmap_init(collocation, semantic_map_id, method=method)

    return CollocationOut().dump(collocation), 200
