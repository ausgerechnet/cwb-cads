#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, String
from ccc import Corpus
from flask import current_app, request

from . import db
from .database import Matches, Query
from .users import auth

bp = APIBlueprint('query', __name__, url_prefix='/query')


class QueryIn(Schema):

    discourseme_id = Integer()
    corpus_id = Integer()
    match_strategy = String()
    cqp_query = String()
    cqp_id = String()


class QueryOut(Schema):

    id = Integer()
    discourseme_id = Integer()
    corpus_id = Integer()
    match_strategy = String()
    cqp_query = String()
    cqp_id = String()


@bp.post('/')
@bp.input(QueryIn)
@bp.output(QueryOut)
@bp.auth_required(auth)
def create(data):
    """Create new query.

    """
    query = Query(**request.json)
    db.session.add(query)
    db.session.commit()

    return QueryOut().dump(query), 200


@bp.get('/<id>')
@bp.output(QueryOut)
@bp.auth_required(auth)
def get_query(id):
    """Get a query.

    """

    query = db.get_or_404(Query, id)

    return QueryOut().dump(query), 200


@bp.post('/<id>/execute')
@bp.output(QueryOut)
@bp.auth_required(auth)
def execute(id):
    """Execute query: get matches

    """

    query = db.get_or_404(Query, id)

    corpus = Corpus(query.corpus.cwb_id,
                    cqp_bin=current_app.config['CCC_CQP_BIN'],
                    registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                    data_dir=current_app.config['CCC_DATA_DIR'])
    result = corpus.query(query.cqp_query, match_strategy=query.match_strategy)

    if result is None:
        raise ValueError()

    matches = result.df.drop(['context', 'contextend'], axis=1)
    matches['query_id'] = query.id
    for m in matches.reset_index().to_dict(orient='records'):
        db.session.add(Matches(**m))
    db.session.commit()

    return QueryOut().dump(query), 200
