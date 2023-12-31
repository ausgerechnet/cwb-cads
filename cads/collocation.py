#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, String
from association_measures import measures
from ccc import Corpus
from ccc.collocates import dump2cooc
from flask import current_app, jsonify
from pandas import DataFrame, concat, read_sql

from . import db
from .database import (Collocation, CollocationItems, Cotext, CotextLines,
                       Query, SemanticMap)
from .query import ccc_query, get_or_create_query
from .semantic_map import SemanticMapIn, SemanticMapOut
from .users import auth

bp = APIBlueprint('collocation', __name__, url_prefix='/<query_id>/collocation')


def score_counts(counts, cut_off=200, min_freq=3):

    ams_dict = {
        # preferred: LRC
        'conservative_log_ratio': 'Conservative LR',
        # frequencies
        'O11': 'obs.',
        'E11': 'exp.',
        'ipm': 'IPM (obs.)',
        'ipm_expected': 'IPM (exp.)',
        # asymptotic hypothesis tests
        'log_likelihood': 'LLR',
        'z_score': 'z-score',
        't_score': 't-score',
        'simple_ll': 'simple LL',
        # point estimates of association strength
        'dice': 'Dice',
        'log_ratio': 'log-ratio',
        'min_sensitivity': 'min. sensitivity',
        'liddell': 'Liddell',
        # information theory
        'mutual_information': 'MI',
        'local_mutual_information': 'local MI',
    }

    df = measures.score(counts, freq=True, per_million=True, digits=6, boundary='poisson', vocab=len(counts))
    df = df.loc[df['O11'] > min_freq]
    df = df.loc[df['O11'] >= df['E11']]

    # select columns
    df = df[list(ams_dict.keys())]

    # select items (top cut_off of each AM)
    items = set()
    for am in ams_dict.keys():
        if am not in ['O11', 'E11', 'ipm', 'ipm_expected']:
            df = df.sort_values(by=[am, 'item'], ascending=[False, True])
            items = items.union(set(df.head(cut_off).index))
    df = df.loc[list(items)]

    # rename columns
    df = df.rename(ams_dict, axis=1)

    return df


def get_or_create_cooc(collocation, window=None):
    """create Cotext, CotextLines of matches and save it to database (if it does not exist)

    """

    query_id = collocation._query.id
    context = collocation.context
    context_break = collocation.s_break
    cwb_id = collocation._query.corpus.cwb_id

    window = context if window is None else window

    cotext = Cotext.query.filter_by(query_id=query_id, context=context, context_break=context_break).first()

    if cotext is None:

        current_app.logger.debug("get_or_create_cooc :: creating cooc-table from scratch")
        cotext = Cotext(query_id=query_id, context=context, context_break=context_break)
        db.session.add(cotext)
        db.session.commit()

        matches_df = ccc_query(collocation._query)

        corpus = Corpus(corpus_name=cwb_id,
                        lib_dir=None,
                        cqp_bin=current_app.config['CCC_CQP_BIN'],
                        registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                        data_dir=current_app.config['CCC_DATA_DIR'])

        subcorpus_context = corpus.subcorpus(
            subcorpus_name=None, df_dump=matches_df, overwrite=False
        ).set_context(
            context, context_break, overwrite=False
        )

        current_app.logger.debug("get_or_create_cooc :: dump2cooc")
        df_cooc = dump2cooc(subcorpus_context.df, rm_nodes=False)
        df_cooc = df_cooc.rename({'match': 'match_pos'}, axis=1).reset_index(drop=True)
        df_cooc['cotext_id'] = cotext.id

        current_app.logger.debug(f"get_or_create_cooc :: saving {len(df_cooc)} lines to database")
        df_cooc.to_sql("cotext_lines", con=db.engine, if_exists='append', index=False)
        db.session.commit()
        current_app.logger.debug("get_or_create_cooc :: saved to database")

        df_cooc = df_cooc.loc[abs(df_cooc['offset']) <= window]
        df_cooc = df_cooc[['cotext_id', 'match_pos', 'cpos', 'offset']]

    else:
        current_app.logger.debug("get_or_create_cooc :: getting cooc-table from database")
        sql_query = CotextLines.query.filter(CotextLines.cotext_id == cotext.id, CotextLines.offset <= window, CotextLines.offset >= -window)
        df_cooc = read_sql(sql_query.statement, con=db.engine, index_col='id').reset_index(drop=True)
        current_app.logger.debug(f"get_or_create_cooc :: got {len(df_cooc)} lines from database")

    return df_cooc


def ccc_collocates(collocation, window=None, cut_off=500, min_freq=3):
    """get CollocationItems for collocation analysis and given window

    (1) get or create context of collocation._query

    (2) get or create matches of collocation.constellation.highlight_discoursemes in collocation._query.corpus

    (3) count items and discoursemes separately

    """

    window = collocation.context if window is None else window

    # remove existing collocation items from database
    CollocationItems.query.filter_by(collocation_id=collocation.id, window=window).delete()
    db.session.commit()

    # get relevant objects
    filter_query = collocation._query
    highlight_discoursemes = collocation.constellation.highlight_discoursemes
    match_strategy = filter_query.match_strategy

    corpus = Corpus(filter_query.corpus.cwb_id,
                    cqp_bin=current_app.config['CCC_CQP_BIN'],
                    registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                    data_dir=current_app.config['CCC_DATA_DIR'])

    ###########
    # CONTEXT #
    ###########
    df_cooc = get_or_create_cooc(collocation, window)
    discourseme_cpos = set(df_cooc.loc[df_cooc['offset'] == 0]['cpos'])  # filter can only match in context

    ############################################
    # GET MATCHES OF HIGHLIGHTING_DISCOURSEMES #
    ############################################
    # for each discourseme (including filter_discourseme):
    # - get frequency breakdown within and outside context
    # - collect cpos consumed within and outside context

    # get or create subcorpus of context
    highlight_breakdowns = list()
    for discourseme in highlight_discoursemes:

        current_app.logger.debug(f'ccc_collocates :: checking discourseme {discourseme.name}')
        corpus_query = get_or_create_query(
            filter_query.corpus, discourseme, collocation.s_break, collocation.p, match_strategy
        )
        corpus_matches_df = ccc_query(corpus_query).reset_index()
        corpus_matches_df['match_in_context'] = corpus_matches_df['match'].isin(df_cooc['cpos'])
        corpus_matches_df['matchend_in_context'] = corpus_matches_df['matchend'].isin(df_cooc['cpos'])
        corpus_matches_df['in_context'] = corpus_matches_df['match_in_context'] + \
            corpus_matches_df['matchend_in_context']
        subcorpus_matches_df = corpus_matches_df.loc[corpus_matches_df['in_context']]

        corpus_matches_df = corpus_matches_df[['match', 'matchend']].set_index(['match', 'matchend'])
        subcorpus_matches_df = subcorpus_matches_df[['match', 'matchend']].set_index(['match', 'matchend'])

        # create breakdown
        corpus_matches = corpus.subcorpus(df_dump=corpus_matches_df, overwrite=False)
        subcorpus_matches = corpus.subcorpus(df_dump=subcorpus_matches_df, overwrite=False)
        corpus_matches_breakdown = corpus_matches.breakdown(p_atts=[collocation.p]).rename({'freq': 'f2'}, axis=1)
        subcorpus_matches_breakdown = subcorpus_matches.breakdown(p_atts=[collocation.p]).rename({'freq': 'f'}, axis=1)

        # create combined breakdown
        df = corpus_matches_breakdown.join(subcorpus_matches_breakdown)
        if 'f' not in df.columns:
            df['f'] = 0         # empty queries

        df['discourseme'] = discourseme.id
        highlight_breakdowns.append(df)

        # update set of cpos of highlight_discoursemes
        discourseme_cpos.update(corpus_matches.matches())

    ################################
    # COUNT ITEMS AND DISCOURSEMES #
    ################################
    current_app.logger.debug(f'ccc_collocates :: counting items in context for window {window}')
    f1_discoursemes = len(df_cooc)           # for discourseme associations
    df_cooc = df_cooc.loc[~df_cooc['cpos'].isin(discourseme_cpos)]

    # create context counts of items for window, including cpos consumed by discoursemes
    f = corpus.counts.cpos(df_cooc['cpos'], [collocation.p])[['freq']].rename(columns={'freq': 'f'})
    f2 = corpus.marginals(f.index, [collocation.p])[['freq']].rename(columns={'freq': 'f2'})

    # get frequency of items at cpos consumed by discoursemes (includes filter)
    node_freq_corpus = corpus.counts.cpos(discourseme_cpos, [collocation.p])[['freq']].rename(
        columns={'freq': 'node_freq_corpus'}
    )

    # create dataframe
    counts = f.join(f2).fillna(0, downcast='infer')

    # add marginals
    counts['f1'] = len(df_cooc)
    counts['N'] = corpus.corpus_size - len(discourseme_cpos)

    # correct counts
    counts = counts.join(node_freq_corpus).fillna(0, downcast='infer')
    counts['f2'] = counts['f2'] - counts['node_freq_corpus']
    counts = counts.drop('node_freq_corpus', axis=1)

    # we score once here in order to only save relevant items
    current_app.logger.debug(f'ccc_collocates :: scoring {len(counts)} items')
    scores = score_counts(counts, cut_off=cut_off, min_freq=min_freq)
    counts = counts.loc[list(scores.index)]
    current_app.logger.debug(f'ccc_collocates :: selected {len(counts)} items')

    if len(highlight_breakdowns) > 0:
        current_app.logger.debug(f'ccc_collocates :: counting {len(highlight_breakdowns)} discourseme items')
        # add discourseme breakdowns
        df = concat(highlight_breakdowns).fillna(0, downcast='infer')
        df['f1'] = f1_discoursemes
        df['N'] = corpus.corpus_size
        df = df.fillna(0)

        # concat
        counts = concat([counts, df])
        # TODO: items can belong to several discoursemes
        # but assumption: if an item belongs to a discourseme, it always does → cannot be part of item counts
        # here: just keep it once, even if actual association might be different (if part of MWU in discourseme(s))
        counts = counts.drop('discourseme', axis=1)
        counts = counts[~counts.index.duplicated(keep='first')]

    ####################
    # SAVE TO DATABASE #
    ####################
    current_app.logger.debug(f'ccc_collocates :: saving {len(counts)} items to database')

    counts['collocation_id'] = collocation.id
    counts['window'] = window
    collocation_items = counts.reset_index()
    collocation_items.to_sql('collocation_items', con=db.engine, if_exists='append', index=False)
    db.session.commit()

    return counts


# def ccc_collocates_conflate(collocation):
#     """conflate items in context


#     """

#     records = [{'item': item.item, 'window': item.window, 'am': item.am, 'value': item.value} for item in collocation.items]
#     df_collocates = DataFrame.from_records(records).pivot(index=['item', 'window'], columns='am', values='value').reset_index()
#     for discourseme in collocation.constellation.highlight_discoursemes:

#         disc_label = f"(ID: {discourseme.id})"
#         disc_items = discourseme.items.split("\t")

#         # DELETE IF EXISTS
#         CollocationItems.query.filter_by(collocation_id=collocation.id, item=disc_label).delete()
#         db.session.commit()

#         # CONFLATE
#         df = df_collocates.loc[df_collocates['item'].isin(disc_items)]
#         df = df.groupby('window').agg({'O11': 'sum', 'O21': 'sum', 'R1': 'mean', 'R2': 'mean', 'in_nodes': 'sum', 'marginal': 'mean'})
#         df = df.rename({'O11': 'f1', 'O21': 'f2', 'R1': 'N1', 'R2': 'N2'}, axis=1)
#         df = measures.score(df, freq=True, per_million=True, digits=6, boundary='poisson', vocab=len(collocation.items))
#         df = df.reset_index().fillna(0)
#         df['item'] = disc_label

#         # ADD TO DATABASE
#         df = df.melt(id_vars=['item', 'window'], var_name='am')
#         for row in df.iterrows():
#             items = dict(row[1])
#             items['collocation_id'] = collocation.id
#             db.session.add(CollocationItems(**items))

#     db.session.commit()


class CollocationIn(Schema):

    query_id = Integer()
    constellation_id = Integer()
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
    counts = DataFrame([vars(s) for s in collocation.items], columns=['item', 'window', 'f', 'f1', 'f2', 'N']).set_index('item')
    df_collocation = measures.score(counts, freq=True, per_million=True, digits=6, boundary='poisson', vocab=len(counts))

    return jsonify(df_collocation.to_json()), 200


@bp.post('/<id>/semantic_map/')
@bp.input(SemanticMapIn)
@bp.output(SemanticMapOut)
@bp.auth_required(auth)
def create_semantic_map(query_id, collocation_id, data):
    """Create new semantic map for collocation items.

    """
    collocation = db.get_or_404(Collocation, collocation_id)
    embeddings = collocation._query.corpus.embeddings
    semanticmap = SemanticMap(embeddings=embeddings, **data)
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
