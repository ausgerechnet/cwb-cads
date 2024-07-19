#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Boolean, Float, Integer, Nested, String
from apiflask.validators import OneOf
from association_measures import measures
from flask import current_app
from pandas import DataFrame

from . import db
# from .collocation import DiscoursemeScoresOut
from .database import (Corpus, Keyword, KeywordItems, KeywordItemScore,
                       SubCorpus, get_or_create)
# from .semantic_map import CoordinatesOut
from .users import auth
from .utils import AMS_DICT

bp = APIBlueprint('keyword', __name__, url_prefix='/keyword')


def ccc_keywords(keyword, min_freq=0, sub_vs_rest=True):
    """perform keyword analysis using cwb-ccc

    """

    current_app.logger.debug('ccc_keywords :: enter')

    # delete old ones
    KeywordItems.query.filter_by(keyword_id=keyword.id).delete()
    db.session.commit()

    # get corpora
    if keyword.subcorpus_id:
        corpus = SubCorpus.query.filter_by(id=keyword.subcorpus_id).first()
        target_is_subcorpus = True
    else:
        corpus = Corpus.query.filter_by(id=keyword.corpus_id).first()
        target_is_subcorpus = False

    if keyword.subcorpus_id_reference:
        corpus_reference = SubCorpus.query.filter_by(id=keyword.subcorpus_id_reference).first()
        reference_is_subcorpus = True
    else:
        corpus_reference = Corpus.query.filter_by(id=keyword.corpus_id_reference).first()
        reference_is_subcorpus = False

    # check if one corpus is a subcorpus of the other
    if sub_vs_rest and (target_is_subcorpus ^ reference_is_subcorpus):  # xor
        sub_vs_rest = False
        if target_is_subcorpus:
            if corpus.corpus.id == corpus_reference.id:
                sub_vs_rest = True
        if reference_is_subcorpus:
            if corpus_reference.corpus.id == corpus.id:
                sub_vs_rest = True

    # get and merge both dataframes of counts
    current_app.logger.debug('ccc_keywords :: getting marginals')
    corpus = corpus.ccc()
    corpus_reference = corpus_reference.ccc()
    target = corpus.marginals(p_atts=[keyword.p])[['freq']].rename(columns={'freq': 'f1'})
    target = target.loc[target['f1'] > min_freq]
    reference = corpus_reference.marginals(p_atts=[keyword.p_reference])[['freq']].rename(columns={'freq': 'f2'})

    # combine frequency lists
    current_app.logger.debug('ccc_keywords :: combining frequency lists')
    counts = target.join(reference, how='outer')
    counts['N1'] = corpus.size()
    counts['N2'] = corpus_reference.size()
    counts = counts.fillna(0, downcast='infer')

    # sub vs rest correction
    if sub_vs_rest:
        current_app.logger.debug('ccc_keywords :: subcorpus vs. rest correction')
        if target_is_subcorpus:
            counts['f2'] = counts['f2'] - counts['f1']
            counts['N1'] = counts['N2'] - counts['N1']
        if reference_is_subcorpus:
            counts['f1'] = counts['f1'] - counts['f2']
            counts['N2'] = counts['N1'] - counts['N2']

    # save counts
    current_app.logger.debug(f'ccc_keywords :: saving {len(counts)} items to database')
    counts['keyword_id'] = keyword.id
    counts.reset_index().to_sql('keyword_items', con=db.engine, if_exists='append', index=False)
    db.session.commit()

    # calculate scores
    current_app.logger.debug('ccc_keywords :: calculating scores')
    counts = DataFrame([vars(s) for s in keyword.items], columns=['id', 'f1', 'N1', 'f2', 'N2']).set_index('id')
    scores = measures.score(counts, freq=True, per_million=True, digits=6, boundary='poisson', vocab=len(counts)).reset_index()
    scores = scores.melt(id_vars=['id'], var_name='measure', value_name='score').rename({'id': 'keyword_item_id'}, axis=1)
    scores['keyword_id'] = keyword.id

    # save scores
    current_app.logger.debug('ccc_keywords :: saving scores')
    scores.to_sql('keyword_item_score', con=db.engine, if_exists='append', index=False)
    db.session.commit()

    current_app.logger.debug('ccc_keywords :: exit')


################
# API schemata #
################
class KeywordIn(Schema):

    constellation_id = Integer(required=False, load_default=None)
    semantic_map_id = Integer(required=False, load_default=None)

    corpus_id = Integer(required=True)
    subcorpus_id = Integer(required=False, load_default=None)
    p = String(required=True)

    corpus_id_reference = Integer(required=True)
    subcorpus_id_reference = Integer(required=False, load_default=None)
    p_reference = String(required=True)

    sub_vs_rest = Boolean(required=False, load_default=True)
    min_freq = Integer(required=False, load_default=3)


class KeywordItemsIn(Schema):

    sort_order = String(required=False, load_default='descending', validate=OneOf(['ascending', 'descending']))
    sort_by = String(required=False, load_default='conservative_log_ratio', validate=OneOf(AMS_DICT.keys()))
    page_size = Integer(required=False, load_default=10)
    page_number = Integer(required=False, load_default=1)


class KeywordOverviewOut(Schema):

    id = Integer()

    corpus_id = Integer()
    subcorpus_id = Integer()
    p = String()

    corpus_id_reference = Integer()
    subcorpus_id_reference = Integer()
    p_reference = String()

    nr_items = Integer()


class KeywordScoreOut(Schema):

    measure = String()
    score = Float()


class KeywordItemOut(Schema):

    item = String()
    scores = Nested(KeywordScoreOut(many=True))


class KeywordOut(Schema):

    id = Integer()

    nr_items = Integer()
    page_size = Integer()
    page_number = Integer()
    page_count = Integer()

    items = Nested(KeywordItemOut(many=True), required=False)
    # discourseme_scores = Nested(DiscoursemeScoresOut(many=True), required=False, metadata={'nullable': True})
    # coordinates = Nested(CoordinatesOut(many=True), required=False, metadata={'nullable': True})


#################
# API endpoints #
#################
@bp.get('/')
@bp.output(KeywordOverviewOut(many=True))
@bp.auth_required(auth)
def get_all_keyword():
    """Get all keyword analyses.

    """

    keywords = Keyword.query.all()

    return [KeywordOverviewOut().dump(keyword) for keyword in keywords], 200


@bp.get('/<id>/')
@bp.output(KeywordOverviewOut)
@bp.auth_required(auth)
def get_keyword(id):
    """Get one keyword analysis.

    """

    keyword = db.get_or_404(Keyword, id)

    return KeywordOverviewOut().dump(keyword), 200


@bp.get('/<id>/items')
@bp.input(KeywordItemsIn, location='query')
@bp.output(KeywordOut)
@bp.auth_required(auth)
def get_keyword_items(id, query_data):
    """Get scored items of a keyword analysis.

    """

    keyword = db.get_or_404(Keyword, id)

    # pagination and sorting
    page_size = query_data.pop('page_size')
    page_number = query_data.pop('page_number')
    sort_order = query_data.pop('sort_order')
    sort_by = query_data.pop('sort_by')

    # get scores from database
    scores = KeywordItemScore.query.filter(
        KeywordItemScore.keyword_id == Keyword.id,
        KeywordItemScore.measure == sort_by
    )

    # paginate
    current_app.logger.debug('keywords :: .. pagination')
    if sort_order == 'ascending':
        scores = scores.order_by(KeywordItemScore.score)
    elif sort_order == 'descending':
        scores = scores.order_by(KeywordItemScore.score.desc())
    scores = scores.paginate(page=page_number, per_page=page_size)
    nr_items = scores.total
    page_count = scores.pages
    df_scores = DataFrame([vars(s) for s in scores], columns=['keyword_item_id'])
    items = [KeywordItemOut().dump(KeywordItems.query.filter_by(id=id).first()) for id in df_scores['keyword_item_id']]

    keyword = {
        'id': keyword.id,
        'nr_items': nr_items,
        'page_size': page_size,
        'page_number': page_number,
        'page_count': page_count,
        'items': items,
        # 'discourseme_scores': discourseme_scores
    }

    return KeywordOut().dump(keyword), 200


@bp.post('/')
@bp.input(KeywordIn)
@bp.output(KeywordOverviewOut)
@bp.auth_required(auth)
def create_keyword(json_data):
    """Create keyword analysis.

    """

    # constellation and semantic map
    constellation_id = json_data.get('constellation_id')
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

    # TODO: only create if not exists?
    keyword = get_or_create(Keyword,
                            constellation_id=constellation_id,
                            corpus_id=corpus_id,
                            subcorpus_id=subcorpus_id,
                            p=p,
                            corpus_id_reference=corpus_id_reference,
                            subcorpus_id_reference=subcorpus_id_reference,
                            p_reference=p_reference,
                            min_freq=min_freq,
                            sub_vs_rest=sub_vs_rest)

    if semantic_map_id:
        keyword.semantic_map_id = semantic_map_id
        db.session.commit()

    ccc_keywords(keyword, min_freq, sub_vs_rest)

    return KeywordOverviewOut().dump(keyword), 200
