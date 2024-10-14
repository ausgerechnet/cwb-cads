#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Boolean, Float, Integer, Nested, String
from apiflask.validators import OneOf
from association_measures import measures
from flask import current_app
from numpy import array_split
from pandas import DataFrame

from . import db
from .database import Keyword, KeywordItem, KeywordItemScore
from .semantic_map import CoordinatesOut, ccc_semmap_init, ccc_semmap_update
from .users import auth
from .utils import AMS_DICT

bp = APIBlueprint('keyword', __name__, url_prefix='/keyword')


def ccc_keywords(keyword, include_negative=False):
    """perform keyword analysis using cwb-ccc.

    """

    current_app.logger.debug('ccc_keywords :: enter')

    # delete old ones
    KeywordItem.query.filter_by(keyword_id=keyword.id).delete()
    db.session.commit()

    # get target and reference corpora
    sub_vs_rest = keyword.sub_vs_rest_strategy()
    corpus = sub_vs_rest['target'].ccc()
    corpus_reference = sub_vs_rest['reference'].ccc()

    # get and merge both dataframes of counts
    current_app.logger.debug('ccc_keywords :: getting marginals')
    target = corpus.marginals(p_atts=[keyword.p])[['freq']].rename(columns={'freq': 'f1'})
    reference = corpus_reference.marginals(p_atts=[keyword.p_reference])[['freq']].rename(columns={'freq': 'f2'})

    # combine frequency lists
    current_app.logger.debug('ccc_keywords :: combining frequency lists')
    counts = target.join(reference, how='outer')
    counts = counts.loc[counts['f1'] > keyword.min_freq]
    counts['N1'] = corpus.size()
    counts['N2'] = corpus_reference.size()
    counts = counts.fillna(0, downcast='infer')

    # sub vs rest correction
    if sub_vs_rest['sub_vs_rest']:
        current_app.logger.debug('ccc_keywords :: subcorpus vs. rest correction')
        if sub_vs_rest['target_is_subcorpus']:
            counts['f2'] = counts['f2'] - counts['f1']
            counts['N2'] = counts['N2'] - counts['N1']
        elif sub_vs_rest['reference_is_subcorpus']:
            counts['f1'] = counts['f1'] - counts['f2']
            counts['N1'] = counts['N1'] - counts['N2']

    # save counts
    current_app.logger.debug(f'ccc_keywords :: saving {len(counts)} items to database')
    counts['keyword_id'] = keyword.id
    counts.reset_index().to_sql('keyword_item', con=db.engine, if_exists='append', index=False)
    db.session.commit()

    # calculate scores
    current_app.logger.debug('ccc_keywords :: calculating scores')
    counts = DataFrame([vars(s) for s in keyword.items], columns=['id', 'f1', 'N1', 'f2', 'N2']).set_index('id')
    scores = measures.score(counts, freq=True, digits=6, boundary='poisson', vocab=len(counts)).reset_index()
    if not include_negative:
        scores = scores.loc[scores.E11 <= scores.O11]
    scores = scores.drop(['O12', 'O21', 'O22', 'E12', 'E21', 'E22', 'R1', 'R2', 'C1', 'C2', 'N'], axis=1)
    scores = scores.melt(id_vars=['id'], var_name='measure', value_name='score').rename({'id': 'keyword_item_id'}, axis=1)
    scores['keyword_id'] = keyword.id

    # save scores
    current_app.logger.debug(f'ccc_keywords :: saving {len(scores)} scores')
    nr_arrays = int(len(scores) / 10000000) + 1
    dfs = array_split(scores, nr_arrays)
    for i, df in enumerate(dfs):
        current_app.logger.debug(f'.. batch {i+1} of {len(dfs)}')
        df.to_sql('keyword_item_score', con=db.engine, if_exists='append', index=False)
    db.session.commit()

    current_app.logger.debug('ccc_keywords :: exit')


################
# API schemata #
################

# Input
class KeywordIn(Schema):

    semantic_map_id = Integer(required=False, load_default=None, metadata={'nullable': True})
    semantic_map_init = Boolean(required=False, load_default=True)

    corpus_id = Integer(required=True)
    subcorpus_id = Integer(required=False, load_default=None, metadata={'nullable': True})
    p = String(required=False, load_default='lemma')

    corpus_id_reference = Integer(required=True)
    subcorpus_id_reference = Integer(required=False, load_default=None, metadata={'nullable': True})
    p_reference = String(required=False, load_default='lemma')

    sub_vs_rest = Boolean(required=False, load_default=True)
    min_freq = Integer(required=False, load_default=3)


# Output
class KeywordOut(Schema):

    id = Integer(required=True)

    semantic_map_id = Integer(required=True, metadata={'nullable': True})

    corpus_id = Integer(required=True)
    corpus_name = String(required=True)
    subcorpus_id = Integer(required=True, dump_default=None, metadata={'nullable': True})
    subcorpus_name = String(required=True, dump_default=None, metadata={'nullable': True})
    p = String(required=True)

    corpus_id_reference = Integer(required=True)
    corpus_name_reference = String(required=True)
    subcorpus_id_reference = Integer(required=True, dump_default=None, metadata={'nullable': True})
    subcorpus_name_reference = String(required=True, dump_default=None, metadata={'nullable': True})
    p_reference = String(required=True)

    sub_vs_rest = Boolean(required=True)
    min_freq = Integer(required=True)

    nr_items = Integer(required=True)


# IDENTICAL TO COLLOCATION ↓
# class KeywordPatchIn(Schema):

#     semantic_map_id = Integer(required=False, load_default=None)


class KeywordItemsIn(Schema):

    sort_order = String(required=False, load_default='descending', validate=OneOf(['ascending', 'descending']))
    sort_by = String(required=False, load_default='conservative_log_ratio', validate=OneOf(AMS_DICT.keys()))
    page_size = Integer(required=False, load_default=10)
    page_number = Integer(required=False, load_default=1)


class KeywordScoreOut(Schema):

    measure = String(required=True)
    score = Float(required=True)


class KeywordItemOut(Schema):

    item = String(required=True)
    scores = Nested(KeywordScoreOut(many=True), required=True)
    raw_scores = Nested(KeywordScoreOut(many=True), required=True)


class KeywordItemsOut(Schema):

    id = Integer(required=True)

    sort_by = String(required=True)
    nr_items = Integer(required=True)
    page_size = Integer(required=True)
    page_number = Integer(required=True)
    page_count = Integer(required=True)

    items = Nested(KeywordItemOut(many=True), required=True, dump_default=[])
    coordinates = Nested(CoordinatesOut(many=True), required=True, dump_default=[])


#################
# API endpoints #
#################
@bp.get('/')
@bp.output(KeywordOut(many=True))
@bp.auth_required(auth)
def get_all_keyword():
    """Get all keyword analyses.

    """

    keywords = Keyword.query.all()

    return [KeywordOut().dump(keyword) for keyword in keywords], 200


@bp.get('/<id>/')
@bp.output(KeywordOut)
@bp.auth_required(auth)
def get_keyword(id):
    """Get one keyword analysis.

    """

    keyword = db.get_or_404(Keyword, id)

    return KeywordOut().dump(keyword), 200


@bp.delete('/<id>/')
@bp.output(KeywordOut)
@bp.auth_required(auth)
def delete_keyword(id):
    """Delete keyword analysis.

    """

    keyword = db.get_or_404(Keyword, id)
    db.session.delete(keyword)
    db.session.commit()

    return 'Deletion successful.', 200


# @bp.patch('/<id>/')
# @bp.input(KeywordPatchIn)
# @bp.output(KeywordOut)
# @bp.auth_required(auth)
# def patch_keyword(id, json_data):
#     """Patch a keyword analysis. Use for updating semantic map.

#     """

#     keyword = db.get_or_404(Keyword, id)

#     for attr, value in json_data.items():
#         setattr(keyword, attr, value)
#     db.session.commit()

#     return KeywordOut().dump(keyword), 200


@bp.get('/<id>/items')
@bp.input(KeywordItemsIn, location='query')
@bp.output(KeywordItemsOut)
@bp.auth_required(auth)
def get_keyword_items(id, query_data):
    """Get scored items of a keyword analysis.

    """

    keyword = db.get_or_404(Keyword, id)

    # pagination settings
    page_size = query_data.pop('page_size')
    page_number = query_data.pop('page_number')
    sort_order = query_data.pop('sort_order')
    sort_by = query_data.pop('sort_by')

    # scores
    scores = KeywordItemScore.query.filter(
        KeywordItemScore.keyword_id == keyword.id,
        KeywordItemScore.measure == sort_by
    )

    # order
    if sort_order == 'ascending':
        scores = scores.order_by(KeywordItemScore.score)
    elif sort_order == 'descending':
        scores = scores.order_by(KeywordItemScore.score.desc())

    # paginate
    scores = scores.paginate(page=page_number, per_page=page_size)
    nr_items = scores.total
    page_count = scores.pages

    # format
    df_scores = DataFrame([vars(s) for s in scores], columns=['keyword_item_id'])
    items = [KeywordItemOut().dump(KeywordItem.query.filter_by(id=id).first()) for id in df_scores['keyword_item_id']]

    # coordinates
    coordinates = list()
    if keyword.semantic_map:
        requested_items = [item['item'] for item in items]
        ccc_semmap_update(keyword.semantic_map, requested_items)
        coordinates = [CoordinatesOut().dump(coordinates) for coordinates in keyword.semantic_map.coordinates if coordinates.item in requested_items]

    # TODO: also return ranks (to ease frontend pagination)?
    keyword_items = {
        'id': keyword.id,
        'sort_by': sort_by,
        'nr_items': nr_items,
        'page_size': page_size,
        'page_number': page_number,
        'page_count': page_count,
        'items': items,
        'coordinates': coordinates
    }

    return KeywordItemsOut().dump(keyword_items), 200


@bp.post('/')
@bp.input(KeywordIn)
@bp.output(KeywordOut)
@bp.auth_required(auth)
def create_keyword(json_data):
    """Create keyword analysis.

    """

    # semantic map
    semantic_map_id = json_data.get('semantic_map_id', None)
    semantic_map_init = json_data.get('semantic_map_init', True)

    # corpus
    corpus_id = json_data.get('corpus_id')
    subcorpus_id = json_data.get('subcorpus_id')
    p = json_data.get('p')

    # reference corpus
    corpus_id_reference = json_data.get('corpus_id_reference')
    subcorpus_id_reference = json_data.get('subcorpus_id_reference')
    p_reference = json_data.get('p_reference')

    # settings
    sub_vs_rest = json_data.get('sub_vs_rest')
    min_freq = json_data.get('min_freq')

    keyword = Keyword(
        corpus_id=corpus_id,
        subcorpus_id=subcorpus_id,
        p=p,
        corpus_id_reference=corpus_id_reference,
        subcorpus_id_reference=subcorpus_id_reference,
        p_reference=p_reference,
        min_freq=min_freq,
        sub_vs_rest=sub_vs_rest
    )
    db.session.add(keyword)
    db.session.commit()

    ccc_keywords(keyword)

    if semantic_map_init:
        ccc_semmap_init(keyword, semantic_map_id)

    return KeywordOut().dump(keyword), 200


@bp.post('/<id>/semantic-map/')
@bp.input({'semantic_map_id': Integer(load_default=None),
           'method': String(required=False, load_default='tsne', validate=OneOf(['tsne', 'umap']))},
          location='query')
@bp.output(KeywordOut)
@bp.auth_required(auth)
def create_semantic_map(id, query_data):
    """Create new semantic map for keyword items or make sure there are coordinates for all items on an existing map.

    """

    keyword = db.get_or_404(Keyword, id)
    semantic_map_id = query_data['semantic_map_id']
    method = query_data.get('method')

    # remove old semantic map
    keyword.semantic_map_id = None
    db.session.commit()

    ccc_semmap_init(keyword, semantic_map_id, method=method)

    return KeywordOut().dump(keyword), 200
