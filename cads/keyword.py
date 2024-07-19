#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Float, Integer, Nested, String
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


def ccc_keywords(keyword, sort_by, sort_order, page_size, page_number, highlight_queries=[]):

    # TODO
    KeywordItems.query.filter_by(keyword_id=keyword.id).delete()
    db.session.commit()

    if keyword.subcorpus_id:
        corpus = SubCorpus.query.filter_by(id=keyword.subcorpus_id).first().ccc()
    else:
        corpus = Corpus.query.filter_by(id=keyword.corpus_id).first().ccc()

    if keyword.subcorpus_id_reference:
        corpus_reference = SubCorpus.query.filter_by(id=keyword.subcorpus_id_reference).first().ccc()
    else:
        corpus_reference = Corpus.query.filter_by(id=keyword.corpus_id_reference).first().ccc()

    # get and merge both dataframes of counts
    current_app.logger.debug('ccc_keywords :: getting marginals')
    target = corpus.marginals(p_atts=[keyword.p])[['freq']].rename(columns={'freq': 'f1'})
    reference = corpus_reference.marginals(p_atts=[keyword.p_reference])[['freq']].rename(columns={'freq': 'f2'})

    current_app.logger.debug('ccc_keywords :: combining frequency lists')
    counts = target.join(reference, how='outer')
    counts['N1'] = target['f1'].sum()
    counts['N2'] = reference['f2'].sum()
    counts = counts.fillna(0, downcast='infer')

    current_app.logger.debug(f'ccc_keywords :: saving {len(counts)} items to database')
    counts['keyword_id'] = keyword.id

    counts.reset_index().to_sql('keyword_items', con=db.engine, if_exists='append', index=False)
    db.session.commit()

    current_app.logger.debug('ccc_keywords :: adding scores')
    counts = DataFrame([vars(s) for s in keyword.items], columns=['id', 'f1', 'N1', 'f2', 'N2']).set_index('id')
    scores = measures.score(counts, freq=True, per_million=True, digits=6, boundary='poisson', vocab=len(counts)).reset_index()
    scores = scores.melt(id_vars=['id'], var_name='measure', value_name='score').rename({'id': 'keyword_item_id'}, axis=1)
    scores['keyword_id'] = keyword.id
    scores.to_sql('keyword_item_score', con=db.engine, if_exists='append', index=False)
    db.session.commit()

    # scores from database
    scores = KeywordItemScore.query.filter(
        KeywordItemScore.keyword_id == Keyword.id,
        KeywordItemScore.measure == sort_by
    )

    # pagination
    current_app.logger.debug('ccc_keywords :: .. pagination')
    if sort_order == 'ascending':
        scores = scores.order_by(KeywordItemScore.score)
    elif sort_order == 'descending':
        scores = scores.order_by(KeywordItemScore.score.desc())
    scores = scores.paginate(page=page_number, per_page=page_size)
    nr_items = scores.total
    page_count = scores.pages
    df_scores = DataFrame([vars(s) for s in scores], columns=['keyword_item_id'])
    items = [KeywordItemOut().dump(KeywordItems.query.filter_by(id=id).first()) for id in df_scores['keyword_item_id']]

    current_app.logger.debug('ccc_keywords :: .. done')

    return {
        'id': keyword.id,
        # 'p': keyword.p,
        # 'p_reference': keyword.p_reference,
        'nr_items': nr_items,
        'page_size': page_size,
        'page_number': page_number,
        'page_count': page_count,
        'items': items,
        # 'discourseme_scores': discourseme_scores
    }


################
# API schemata #
################
class KeywordIn(Schema):

    constellation_id = Integer(required=False)
    semantic_map_id = Integer(required=False)

    corpus_id = Integer(required=True)
    subcorpus_id = Integer(required=False, load_default=None)
    p = String(required=True)

    corpus_id_reference = Integer(required=True)
    subcorpus_id_reference = Integer(required=False, load_default=None)
    p_reference = String(required=True)

    sort_order = String(load_default='descending', required=False, validate=OneOf(['ascending', 'descending']))
    sort_by = String(load_default='conservative_log_ratio', required=False, validate=OneOf(AMS_DICT.keys()))
    page_size = Integer(load_default=10, required=False)
    page_number = Integer(load_default=1, required=False)


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
    # p = String()
    # p_reference = String()

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
    """Get all keyword.

    """

    keywords = Keyword.query.all()

    return [KeywordOverviewOut().dump(keyword) for keyword in keywords], 200


@bp.post('/')
@bp.input(KeywordIn)
@bp.output(KeywordOut)
@bp.auth_required(auth)
def get_keyword(json_data):
    """Create keyword analysis. Will create if doesn't exist.

    """

    # pagination
    page_size = json_data.pop('page_size')
    page_number = json_data.pop('page_number')

    # sorting
    sort_order = json_data.pop('sort_order')
    sort_by = json_data.pop('sort_by')

    # constellation and semantic map
    constellation_id = json_data.get('constellation_id', None)
    semantic_map_id = json_data.get('semantic_map_id', None)

    # corpus
    corpus_id = json_data.get('corpus_id')
    subcorpus_id = json_data.get('subcorpus_id')
    p = json_data.get('p')

    # reference corpus
    corpus_id_reference = json_data.get('corpus_id_reference')
    subcorpus_id_reference = json_data.get('subcorpus_id_reference')
    p_reference = json_data.get('p_reference')

    keyword = get_or_create(Keyword,
                            constellation_id=constellation_id,
                            corpus_id=corpus_id,
                            subcorpus_id=subcorpus_id,
                            p=p,
                            corpus_id_reference=corpus_id_reference,
                            subcorpus_id_reference=subcorpus_id_reference,
                            p_reference=p_reference)

    if semantic_map_id:
        keyword.semantic_map_id = semantic_map_id
        db.session.commit()

    keyword = ccc_keywords(keyword, sort_by, sort_order, page_size, page_number)

    print(keyword)

    return KeywordOut().dump(keyword), 200
