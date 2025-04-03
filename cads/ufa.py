#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Float, Integer, String
from apiflask.validators import OneOf
from association_measures.comparisons import rbo

from .database import CollocationItemScore, KeywordItemScore
from .users import auth
from .utils import AMS_DICT

bp = APIBlueprint('ufa', __name__, url_prefix='/ufa')


class UFAComparisonIn(Schema):

    collocation_id_left = Integer(required=False)
    collocation_id_right = Integer(required=False)
    keyword_id_left = Integer(required=False)
    keyword_id_right = Integer(required=False)
    max_depth = Integer(required=False, load_default=50)
    p = Float(required=False, load_default=.95)
    sort_by = String(required=False, load_default='conservative_log_ratio', validate=OneOf(AMS_DICT.keys()))


class UFAComparisonOut(Schema):

    collocation_id_left = Integer(required=False)
    collocation_id_right = Integer(required=False)
    keyword_id_left = Integer(required=False)
    keyword_id_right = Integer(required=False)
    max_depth = Integer(required=True)
    p = Float(required=True)
    sort_by = String(required=True)
    score = Float(required=True)


def get_scores(model, item_attr, id_field, id_value, sort_by, max_depth):

    if id_value is None:
        return []
    return [
        (score.score, getattr(score, item_attr).item)
        for score in model.query.filter(
            getattr(model, id_field) == id_value,
            model.measure == sort_by
        ).order_by(model.score.desc())
        .paginate(page=1, per_page=max_depth)
    ]


@bp.get("/score")
@bp.input(UFAComparisonIn, location='query')
@bp.output(UFAComparisonOut)
@bp.auth_required(auth)
def get_score(query_data):

    collocation_id_left = query_data.get('collocation_id_left')
    collocation_id_right = query_data.get('collocation_id_right')
    keyword_id_left = query_data.get('keyword_id_left')
    keyword_id_right = query_data.get('keyword_id_right')
    max_depth = query_data.get('max_depth')
    p = query_data.get('p')
    sort_by = query_data.get('sort_by')

    if not ((collocation_id_left is None) ^ (keyword_id_left is None)):
        raise ValueError()

    if not ((collocation_id_right is None) ^ (keyword_id_right is None)):
        raise ValueError()

    scores_left = get_scores(CollocationItemScore, "collocation_item", "collocation_id", collocation_id_left, sort_by, max_depth) \
        or get_scores(KeywordItemScore, "keyword_item", "keyword_id", keyword_id_left, sort_by, max_depth)

    scores_right = get_scores(CollocationItemScore, "collocation_item", "collocation_id", collocation_id_right, sort_by, max_depth) \
        or get_scores(KeywordItemScore, "keyword_item", "keyword_id", keyword_id_right, sort_by, max_depth)

    items_left = [score[1] for score in scores_left if score[0] > 0]
    items_right = [score[1] for score in scores_right if score[0] > 0]

    if len(set(items_left).intersection(set(items_right))) == 0:
        score = 0.0
    else:
        score = rbo(items_left, items_right, p=p)[2]

    return UFAComparisonOut().dump({
        'score': score,
        'p': p,
        'max_depth': max_depth,
        'sort_by': sort_by,
        'collocation_id_left': collocation_id_left,
        'collocation_id_right': collocation_id_right,
        'keyword_id_left': keyword_id_left,
        'keyword_id_right': keyword_id_right
    })
