#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, String
from ccc import Corpus, SubCorpus
from ccc.collocates import Collocates
from flask import current_app, jsonify
from pandas import DataFrame

from . import db
from .database import Collocation, CollocationItems, Query, SemanticMap
from .semantic_map import SemanticMapIn, SemanticMapOut
from .users import auth

bp = APIBlueprint('collocation', __name__, url_prefix='/<query_id>/collocation')


def ccc_collocates(collocation, window=None):

    window = collocation.context if window is None else window
    filter_query = collocation._query
    # filter_discoursemes_ids = [d.id for d in constellation.filter_discoursemes]
    # filter_queries = Query.query.filter(Query.discourseme_id.in_(filter_discoursemes_ids),
    #                                     Query.corpus_id == collocation.corpus_id).all()

    # if len(filter_queries) == 0:
    #     raise ValueError()

    # if len(filter_queries) > 1:
    #     raise NotImplementedError()

    ###########
    # CONTEXT #
    ###########
    # filter_query = filter_queries[0]
    matches = filter_query.matches
    df_dump = DataFrame([vars(s) for s in matches], columns=['match', 'matchend'])
    df_dump['context'] = df_dump['match']
    df_dump['contextend'] = df_dump['matchend']
    df_dump = df_dump.set_index(['match', 'matchend'])

    # matches
    subcorpus = SubCorpus('Temp',
                          df_dump,
                          corpus_name=filter_query.corpus.cwb_id,
                          lib_dir=None,
                          cqp_bin=current_app.config['CCC_CQP_BIN'],
                          registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                          data_dir=current_app.config['CCC_DATA_DIR'],
                          overwrite=False)
    subcorpus = subcorpus.set_context(context=collocation.context, context_break=collocation.s_break)
    df_dump = subcorpus.df

    # cotext
    # TODO: save and retrieve from CACHE
    # print(collocates.df_cooc)
    # print(collocates.f1_set)
    # print(collocates.node_freq)
    collocates = Collocates(Corpus(corpus_name=filter_query.corpus.cwb_id,
                                   lib_dir=None,
                                   cqp_bin=current_app.config['CCC_CQP_BIN'],
                                   registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                                   data_dir=current_app.config['CCC_DATA_DIR']),
                            df_dump,
                            [collocation.p],
                            mws=collocation.context)

    ##########
    # WINDOW #
    ##########
    collocates = collocates.show(window=window,
                                 order='O11',
                                 cut_off=None,
                                 ams=None,
                                 min_freq=2,
                                 flags=None,
                                 marginals='corpus')

    # wide to long
    collocates = collocates.reset_index()
    collocates['window'] = window
    collocates = collocates.melt(id_vars=['item', 'window'], var_name='am')

    # add items to database
    for row in collocates.iterrows():
        items = dict(row[1])
        items['collocation_id'] = collocation.id
        db.session.add(CollocationItems(**items))
    db.session.commit()

    return collocates


class CollocationIn(Schema):

    query_id = Integer()
    p = String()
    s_break = String()
    context = Integer()


class CollocationOut(Schema):

    id = Integer()
    corpus_id = Integer()
    p = String()
    s_break = String()
    context = Integer()
    sem_map_id = Integer()
    constellation_id = Integer()


class CollocationItemsOut(Schema):

    id = Integer()
    collocation_id = Integer()
    item = String()
    ams = None


@bp.post('/')
@bp.input(CollocationIn)
@bp.output(CollocationOut)
@bp.auth_required(auth)
def create(query_id, data):
    """Create new collocation analysis.

    """
    collocation = Collocation(query_id=query_id, **data)
    db.session.add(collocation)
    db.session.commit()

    return CollocationOut().dump(collocation), 200


@bp.get('/')
@bp.output(CollocationOut(many=True))
@bp.auth_required(auth)
def get_collocations(query_id):
    """Get collocation.

    """

    query = db.get_or_404(Query, query_id)

    return [CollocationOut().dump(collocation) for collocation in query.collocations], 200


@bp.get('/<id>')
@bp.output(CollocationOut)
@bp.auth_required(auth)
def get_collocation(query_id, id):
    """Get collocation.

    """

    collocation = db.get_or_404(Collocation, id)

    return CollocationOut().dump(collocation), 200


@bp.delete('/<id>')
@bp.auth_required(auth)
def delete_collocation(query_id, id):
    """Delete collocation.

    """

    collocation = db.get_or_404(Collocation, id)
    db.session.delete(collocation)
    db.session.commit()

    return 'Deletion successful.', 200


@bp.post('/<id>/collocates')
@bp.output(CollocationOut)
@bp.auth_required(auth)
def execute(query_id, id):
    """Execute collocation: Get collocation items.

    """

    collocation = db.get_or_404(Collocation, id)
    ccc_collocates(collocation)

    return CollocationOut().dump(collocation), 200


@bp.get("/<id>/collocates")
# @bp.output(CollocationOut)
@bp.auth_required(auth)
def get_collocation_items(query_id, id):
    """Get collocation items.

    """

    collocation = db.get_or_404(Collocation, id)
    records = [{'item': item.item, 'am': item.am, 'value': item.value} for item in collocation.items]
    df_collocation = DataFrame.from_records(records).pivot(index='item', columns='am', values='value')

    return jsonify(df_collocation.to_json()), 200


@bp.post('/<id>/semantic_map/')
@bp.input(SemanticMapIn)
@bp.output(SemanticMapOut)
@bp.auth_required(auth)
def create_semantic_map(query_id, collocation_id, data):
    """Create new semantic map for collocation items.

    """
    collocation = db.get_or_404(Collocation, collocation_id)
    embeddings = collocation.query.corpus.embeddings
    semanticmap = SemanticMap(collocation_id=collocation_id, embeddings=embeddings, **data)
    db.session.add(semanticmap)
    db.session.commit()

    return SemanticMapOut().dump(semanticmap), 200


@bp.get('/<id>/semantic_map/')
@bp.output(SemanticMapOut(many=True))
@bp.auth_required(auth)
def get_semanticmaps(query_id, collocation_id):
    """Get all semantic maps of collocation.

    """

    collocation = db.get_or_404(Collocation, collocation_id)
    return [SemanticMapOut().dump(semanticmap) for semanticmap in collocation.semanticmaps], 200
