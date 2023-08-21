#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, String
from ccc import Corpus, SubCorpus
from ccc.collocates import Collocates
from flask import current_app, g
from pandas import DataFrame

from . import db
from .database import Collocation, CollocationItems, Query
from .users import auth

bp = APIBlueprint('collocation', __name__, url_prefix='/collocation')


class CollocationIn(Schema):

    corpus_id = Integer()
    p = String()
    s_break = String()
    window = Integer()
    constellation_id = Integer()


class CollocationOut(Schema):

    id = Integer()
    corpus_id = Integer()
    p = String()
    s_break = String()
    window = Integer()
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
def create(data):
    """Create new collocation.

    """
    collocation = Collocation(
        user_id=g.user.id,
        **data
    )
    db.session.add(collocation)
    db.session.commit()

    return CollocationOut().dump(collocation), 200


@bp.get('/<id>')
@bp.output(CollocationOut)
@bp.auth_required(auth)
def get_collocation(id):
    """Get collocation.

    """

    collocation = db.get_or_404(Collocation, id)
    return CollocationOut().dump(collocation), 200


@bp.post('/<id>/execute')
@bp.output(CollocationOut)
@bp.auth_required(auth)
def execute(id):
    """Execute collocation.

    """

    mws = 20
    collocation = db.get_or_404(Collocation, id)
    constellation = collocation.constellation
    filter_discoursemes_ids = [d.id for d in constellation.filter_discoursemes]
    filter_queries = Query.query.filter(Query.discourseme_id.in_(filter_discoursemes_ids),
                                        Query.corpus_id == collocation.corpus_id).all()

    if len(filter_queries) == 0:
        raise ValueError()

    if len(filter_queries) > 1:
        raise NotImplementedError()

    filter_query = filter_queries[0]
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
    subcorpus = subcorpus.set_context(context=collocation.window, context_break=collocation.s_break)
    df_dump = subcorpus.df

    # cotext
    collocates = Collocates(Corpus(corpus_name=filter_query.corpus.cwb_id,
                                   lib_dir=None,
                                   cqp_bin=current_app.config['CCC_CQP_BIN'],
                                   registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                                   data_dir=current_app.config['CCC_DATA_DIR']),
                            df_dump,
                            [collocation.p],
                            mws=mws)
    # print(collocates.df_cooc)
    # print(collocates.f1_set)
    # print(collocates.node_freq)

    # collocates = subcorpus.collocates(p_query=[collocation.p], cut_off=None, show_negative=True)
    collocates = collocates.show(window=collocation.window,
                                 order='O11', cut_off=None, ams=None, min_freq=1, flags=None,
                                 marginals='corpus', show_negative=True)

    # wide to long
    collocates = collocates.reset_index()
    collocates = collocates.melt(id_vars=['item'], var_name='am')

    for row in collocates.iterrows():
        items = dict(row[1])
        items['collocation_id'] = collocation.id
        db.session.add(CollocationItems(**items))
    db.session.commit()

    return CollocationOut().dump(collocation), 200


@bp.get("/<id>/items")
@bp.auth_required(auth)
def get_collocation_items(id):

    collocation = db.get_or_404(Collocation, id)
    records = [{'item': item.item, 'am': item.am, 'value': item.value} for item in collocation.items]
    df_collocation = DataFrame.from_records(records).pivot(index='item', columns='am', values='value')

    return df_collocation.to_json(), 200
