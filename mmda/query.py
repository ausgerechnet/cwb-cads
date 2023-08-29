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


def ccc_query(query):

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

    return matches


class QueryIn(Schema):

    discourseme_id = Integer()
    corpus_id = Integer()
    match_strategy = String()
    cqp_query = String()


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


@bp.get('/')
@bp.output(QueryOut(many=True))
@bp.auth_required(auth)
def get_queries():
    """Get all queries.

    """

    queries = Query.query.all()

    return [QueryOut().dump(query) for query in queries], 200


@bp.get('/<id>')
@bp.output(QueryOut)
@bp.auth_required(auth)
def get_query(id):
    """Get details of a query.

    """

    query = db.get_or_404(Query, id)

    return QueryOut().dump(query), 200


@bp.delete('/<id>')
@bp.auth_required(auth)
def delete_query(id):
    """Delete a query.

    """

    query = db.get_or_404(Query, id)
    db.session.delete(query)
    db.session.commit()

    return 'Deletion successful.', 200


@bp.post('/<id>/execute')
@bp.output(QueryOut)
@bp.auth_required(auth)
def execute(id):
    """Execute query: create matches.

    """

    query = db.get_or_404(Query, id)
    ccc_query(query)

    return QueryOut().dump(query), 200
