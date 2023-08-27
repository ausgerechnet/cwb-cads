#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, String
from ccc import Corpus
from ccc.collocates import Collocates
from flask import current_app, jsonify
from pandas import DataFrame
from association_measures import measures
from pandas import concat
from ccc.utils import format_cqp_query
from ccc.collocates import dump2cooc

from . import db
from .database import Collocation, CollocationItems, Query, SemanticMap, Matches
from .semantic_map import SemanticMapIn, SemanticMapOut
from .users import auth


bp = APIBlueprint('collocation', __name__, url_prefix='/<query_id>/collocation')


def ccc_collocates(collocation, window=None):

    window = collocation.context if window is None else window

    filter_query = collocation._query
    matches = filter_query.matches

    ###########
    # CONTEXT #
    ###########
    # post-process matches
    df_dump = DataFrame([vars(s) for s in matches], columns=['match', 'matchend'])
    df_dump['context'] = df_dump['match']
    df_dump['contextend'] = df_dump['matchend']
    df_dump = df_dump.set_index(['match', 'matchend'])

    # create corpus and set context
    corpus = Corpus(corpus_name=filter_query.corpus.cwb_id,
                    lib_dir=None,
                    cqp_bin=current_app.config['CCC_CQP_BIN'],
                    registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                    data_dir=current_app.config['CCC_DATA_DIR'])
    matches = corpus.subcorpus(subcorpus_name='Temp', df_dump=df_dump, overwrite=False)
    matches = matches.set_context(context=collocation.context, context_break=collocation.s_break)
    df_dump = matches.df

    #########################
    # INITIAL COTEXT COUNTS #
    #########################
    df_cooc, f1_set = dump2cooc(df_dump)

    ########################################
    # SUBCORPUS OF COTEXT OF QUERY MATCHES #
    ########################################
    cotext_of_matches = matches.set_matches(subcorpus_name='Temp', overwrite=True)

    ######################################
    # CONFLATE HIGHLIGHTING DISCOURSEMES #
    ######################################
    highlight_counts = list()
    for discourseme in collocation.constellation.highlight_discoursemes:

        disc_query = Query(
            discourseme_id=discourseme.id,
            corpus_id=filter_query.corpus.id,
            cqp_query=format_cqp_query(discourseme.items.split("\t"), 'lemma')
        )
        db.session.add(disc_query)
        db.session.commit()

        # matches on corpus
        corpus_matches = corpus.query(cqp_query=disc_query.cqp_query, context_break=collocation.s_break)
        corpus_matches_df = corpus_matches.df.reset_index()[['match', 'matchend']]
        corpus_matches_df['query_id'] = disc_query.id
        for m in corpus_matches_df.to_dict(orient='records'):
            db.session.add(Matches(**m))
        db.session.commit()

        # matches on subcorpus
        subcorpus_matches = cotext_of_matches.query(cqp_query=disc_query.cqp_query, context_break=collocation.s_break)
        subcorpus_matches_df = subcorpus_matches.df.reset_index()[['match', 'matchend']]
        subcorpus_matches_df['query_id'] = disc_query.id
        for m in subcorpus_matches_df.to_dict(orient='records'):
            db.session.add(Matches(**m))
        db.session.commit()

        # update f1_set
        f1_set.update(corpus_matches.matches())

        # create breakdown
        df = corpus_matches.breakdown().rename({'freq': 'C1'}, axis=1).join(
            subcorpus_matches.breakdown().rename({'freq': 'O11'}, axis=1)
        )
        df['discourseme'] = discourseme.id
        highlight_counts.append(df)

    df_cooc = df_cooc.loc[~df_cooc.cpos.isin(f1_set)]
    node_freq = corpus.counts.cpos(f1_set, [collocation.p])

    # cotext
    # TODO: save and retrieve from CACHE
    collocates = Collocates(corpus,
                            df_dump=None,
                            p_query=[collocation.p],
                            mws=collocation.context,
                            df_cooc=df_cooc,
                            f1_set=f1_set,
                            node_freq=node_freq)

    ##########
    # WINDOW #
    ##########
    collocates = collocates.show(window=window,
                                 order='O11',
                                 cut_off=None,
                                 ams=None,
                                 min_freq=2,
                                 flags=None,
                                 marginals='corpus').reset_index()

    ###############################
    # ADD DISCOURSEME-ITEM SCORES #
    ###############################
    if len(highlight_counts) > 0:
        df = concat(highlight_counts)
        df['R1'] = collocates.head(1)['R1'][0]
        df['R2'] = collocates.head(1)['R2'][0]
        df['O21'] = df['C1'] - df['O11']
        df = df.rename({'O11': 'f1', 'O21': 'f2', 'R1': 'N1', 'R2': 'N2'}, axis=1)
        df = measures.score(
            df, freq=True, per_million=True, digits=6, boundary='poisson', vocab=len(collocation.items)
        )
        df = df.reset_index().fillna(0)
        collocates = concat([collocates, df])

    # wide to long
    collocates['window'] = window
    collocates = collocates.melt(id_vars=['item', 'window'], var_name='am')

    # add items to database
    for row in collocates.iterrows():
        items = dict(row[1])
        items['collocation_id'] = collocation.id
        db.session.add(CollocationItems(**items))
    db.session.commit()

    return collocates


def ccc_collocates_update(collocation):

    records = [{'item': item.item, 'window': item.window, 'am': item.am, 'value': item.value} for item in collocation.items]
    df_collocates = DataFrame.from_records(records).pivot(index=['item', 'window'], columns='am', values='value').reset_index()
    for discourseme in collocation.constellation.highlight_discoursemes:

        disc_label = f"(ID: {discourseme.id})"
        disc_items = discourseme.items.split("\t")

        # DELETE IF EXISTS
        CollocationItems.query.filter_by(collocation_id=collocation.id, item=disc_label).delete()
        db.session.commit()

        # CONFLATE
        df = df_collocates.loc[df_collocates['item'].isin(disc_items)]
        df = df.groupby('window').agg({'O11': 'sum', 'O21': 'sum', 'R1': 'mean', 'R2': 'mean', 'in_nodes': 'sum', 'marginal': 'mean'})
        df = df.rename({'O11': 'f1', 'O21': 'f2', 'R1': 'N1', 'R2': 'N2'}, axis=1)
        df = measures.score(df, freq=True, per_million=True, digits=6, boundary='poisson', vocab=len(collocation.items))
        df = df.reset_index().fillna(0)
        df['item'] = disc_label
        df = df.melt(id_vars=['item', 'window'], var_name='am')
        for row in df.iterrows():
            items = dict(row[1])
            items['collocation_id'] = collocation.id
            db.session.add(CollocationItems(**items))

    db.session.commit()


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
