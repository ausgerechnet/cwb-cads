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
from .collocation import DiscoursemeScoresOut
from .database import Keyword, KeywordItem, KeywordItemScore
from .semantic_map import CoordinatesOut, ccc_init_semmap, ccc_semmap_update
from .users import auth
from .utils import AMS_DICT

bp = APIBlueprint('keyword', __name__, url_prefix='/keyword')


def ccc_keywords(keyword):
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
    scores = measures.score(counts, freq=True, per_million=True, digits=6, boundary='poisson', vocab=len(counts)).reset_index()
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
class KeywordIn(Schema):

    # constellation_id = Integer(required=False, load_default=None)
    semantic_map_id = Integer(required=False, load_default=None)

    corpus_id = Integer(required=True)
    subcorpus_id = Integer(required=False, load_default=None)
    p = String(required=False, load_default='lemma')

    corpus_id_reference = Integer(required=True)
    subcorpus_id_reference = Integer(required=False, load_default=None)
    p_reference = String(required=False, load_default='lemma')

    sub_vs_rest = Boolean(required=False, load_default=True)
    min_freq = Integer(required=False, load_default=3)


class KeywordOut(Schema):

    id = Integer()

    # constellation_id = Integer(metadata={'nullable': True})
    semantic_map_id = Integer(metadata={'nullable': True})

    corpus_id = Integer()
    subcorpus_id = Integer()
    p = String()

    corpus_id_reference = Integer()
    subcorpus_id_reference = Integer()
    p_reference = String()

    sub_vs_rest = Boolean()
    min_freq = Integer()

    nr_items = Integer()


class KeywordPatchIn(Schema):

    constellation_id = Integer(required=False, load_default=None)
    semantic_map_id = Integer(required=False, load_default=None)


class KeywordItemsIn(Schema):

    sort_order = String(required=False, load_default='descending', validate=OneOf(['ascending', 'descending']))
    sort_by = String(required=False, load_default='conservative_log_ratio', validate=OneOf(AMS_DICT.keys()))
    page_size = Integer(required=False, load_default=10)
    page_number = Integer(required=False, load_default=1)


class KeywordScoreOut(Schema):

    measure = String()
    score = Float()


class KeywordItemOut(Schema):

    item = String()
    scores = Nested(KeywordScoreOut(many=True))


class KeywordItemsOut(Schema):

    id = Integer()

    sort_by = String()
    nr_items = Integer()
    page_size = Integer()
    page_number = Integer()
    page_count = Integer()

    items = Nested(KeywordItemOut(many=True), required=False)
    coordinates = Nested(CoordinatesOut(many=True), required=False, metadata={'nullable': True})
    discourseme_scores = Nested(DiscoursemeScoresOut(many=True), required=False, metadata={'nullable': True})


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
    """Get one keyword analysis.

    """

    keyword = db.get_or_404(Keyword, id)
    db.session.delete(keyword)
    db.session.commit()

    return 'Deletion successful.', 200


@bp.patch('/<id>/')
@bp.input(KeywordPatchIn)
@bp.output(KeywordOut)
@bp.auth_required(auth)
def patch_keyword(id, json_data):
    """Patch a keyword analysis. Use for updating semantic map and/or constellation.

    """

    keyword = db.get_or_404(Keyword, id)

    for attr, value in json_data.items():
        setattr(keyword, attr, value)
    db.session.commit()

    return KeywordOut().dump(keyword), 200


@bp.get('/<id>/items')
@bp.input(KeywordItemsIn, location='query')
@bp.output(KeywordItemsOut)
@bp.auth_required(auth)
def get_keyword_items(id, query_data):
    """Get scored items of a keyword analysis.

    """

    keyword = db.get_or_404(Keyword, id)

    page_size = query_data.pop('page_size')
    page_number = query_data.pop('page_number')
    sort_order = query_data.pop('sort_order')
    sort_by = query_data.pop('sort_by')

    # get scores
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

    # discourseme scores
    discourseme_scores = list()
    # if keyword.constellation:
    #     ccc_discourseme_counts(keyword, keyword.constellation.highlight_discoursemes)
    #     discourseme_scores = keyword.discourseme_scores
    #     for s in discourseme_scores:
    #         s['item_scores'] = [KeywordItemOut().dump(sc) for sc in s['item_scores']]
    #         s['unigram_item_scores'] = [KeywordItemOut().dump(sc) for sc in s['unigram_item_scores']]
    #     discourseme_scores = [DiscoursemeScoresOut().dump(s) for s in discourseme_scores]

    # TODO: also return ranks (to ease frontend pagination)?
    keyword_items = {
        'id': keyword.id,
        'sort_by': sort_by,
        'nr_items': nr_items,
        'page_size': page_size,
        'page_number': page_number,
        'page_count': page_count,
        'items': items,
        'coordinates': coordinates,
        'discourseme_scores': discourseme_scores
    }

    return KeywordItemsOut().dump(keyword_items), 200


@bp.post('/')
@bp.input(KeywordIn)
@bp.output(KeywordOut)
@bp.auth_required(auth)
def create_keyword(json_data):
    """Create keyword analysis.

    """

    # constellation and semantic map
    # constellation_id = json_data.get('constellation_id')
    semantic_map_id = json_data.get('semantic_map_id')

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
        # constellation_id=constellation_id,
        semantic_map_id=semantic_map_id,
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
    ccc_init_semmap(keyword, semantic_map_id)
    # if keyword.constellation:
    #     ccc_discourseme_counts(keyword, keyword.constellation.highlight_discoursemes)

    return KeywordOut().dump(keyword), 200


@bp.post('/<id>/semantic-map/')
@bp.input({'semantic_map_id': Integer(load_default=None)}, location='query')
@bp.output(KeywordOut)
@bp.auth_required(auth)
def create_semantic_map(id, query_data):
    """Create new semantic map for keyword items or associate with existing semantic map.

    """

    keyword = db.get_or_404(Keyword, id)
    keyword.semantic_map_id = None
    db.session.commit()

    semantic_map_id = query_data['semantic_map_id']
    ccc_init_semmap(keyword, semantic_map_id)

    return KeywordOut().dump(keyword), 200
