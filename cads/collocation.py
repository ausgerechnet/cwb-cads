#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Float, Integer, Nested, String
from apiflask.validators import OneOf
from association_measures import measures
from ccc import Corpus
from flask import current_app
from pandas import DataFrame, concat, read_sql

from . import db
from .database import CollocationItems, CotextLines, ItemScore
# from .semantic_map import (CoordinatesOut, SemanticMapOut, ccc_semmap,
#                            ccc_semmap_discoursemes, ccc_semmap_update)
# from .users import auth
from .utils import AMS_DICT

bp = APIBlueprint('collocation', __name__, url_prefix='/collocation')


def score_counts(counts, cut_off=200, min_freq=3, show_negative=False, rename=True):

    df = measures.score(counts, freq=True, per_million=True, digits=6, boundary='poisson', vocab=len(counts))
    df = df.loc[df['O11'] >= min_freq]

    if not show_negative:
        df = df.loc[df['O11'] >= df['E11']]

    if rename:

        # select columns
        df = df[list(AMS_DICT.keys())]

        # select items (top cut_off of each AM)
        items = set()
        for am in AMS_DICT.keys():
            if am not in ['O11', 'E11', 'ipm', 'ipm_expected']:
                df = df.sort_values(by=[am, 'item'], ascending=[False, True])
                items = items.union(set(df.head(cut_off).index))
        df = df.loc[list(items)]

        # rename columns
        df = df.rename(AMS_DICT, axis=1)

    elif cut_off:
        raise NotImplementedError("cannot use cut-off value when not rename=True")

    return df


def get_or_create_counts(collocation):
    """get CollocationItems for collocation analysis and given window

    (1) get context of collocation._query

    (2) get matches of collocation.constellation.highlight_discoursemes in collocation._query.corpus

    (3) count items and discoursemes separately

    """
    from .query import (ccc_query, get_or_create_cotext,
                        get_or_create_query_discourseme)

    current_app.logger.debug("get_or_create_counts :: getting counts")
    # TODO only create if necessary!

    window = collocation.window

    # remove existing collocation items from database
    old = CollocationItems.query.filter_by(collocation_id=collocation.id)
    if old.first():
        current_app.logger.debug("get_or_create_counts :: counts already exist")
        return
        # current_app.logger.debug("deleting old ones")
        # CollocationItems.query.filter_by(collocation_id=collocation.id).delete()
        # current_app.logger.debug("deleted")
        # db.session.commit()

    # get relevant objects
    filter_query = collocation._query
    highlight_discoursemes = collocation.constellation.highlight_discoursemes if collocation.constellation else []
    match_strategy = filter_query.match_strategy

    corpus = Corpus(filter_query.corpus.cwb_id,
                    cqp_bin=current_app.config['CCC_CQP_BIN'],
                    registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                    data_dir=current_app.config['CCC_DATA_DIR'])

    ###################
    # (1) GET CONTEXT #
    ###################
    current_app.logger.debug(f'get_or_create_counts :: getting context of query {filter_query.id}')
    cotext = get_or_create_cotext(filter_query, window, collocation._query.s, return_df=True)
    cotext_lines = CotextLines.query.filter(CotextLines.cotext_id == cotext.id,
                                            CotextLines.offset <= window,
                                            CotextLines.offset >= -window)
    df_cooc = read_sql(cotext_lines.statement, con=db.engine, index_col='id').reset_index(drop=True)
    discourseme_cpos = set(df_cooc.loc[df_cooc['offset'] == 0]['cpos'])  # filter can only match in context
    df_cooc = df_cooc.drop_duplicates(subset='cpos')

    #####################################
    # (2) GET HIGHLIGHTING_DISCOURSEMES #
    #####################################
    # for each discourseme (including filter):
    # - get cpos consumed within and outside context
    # - get frequency breakdown within and outside context
    current_app.logger.debug('get_or_create_counts :: getting highlighting discoursemes')

    # get or create subcorpus of context
    highlight_breakdowns = list()
    for discourseme in highlight_discoursemes:

        # TODO: auto-execute breakdown when querying, then retrieve
        current_app.logger.debug(f'get_or_create_counts :: .. checking discourseme {discourseme.name}')
        corpus_query = get_or_create_query_discourseme(
            filter_query.corpus, discourseme, collocation.s_break, match_strategy
        )
        corpus_matches_df = ccc_query(corpus_query, p_breakdown=collocation.p).reset_index()
        corpus_matches_df['match_in_context'] = corpus_matches_df['match'].isin(df_cooc['cpos'])
        corpus_matches_df['matchend_in_context'] = corpus_matches_df['matchend'].isin(df_cooc['cpos'])
        corpus_matches_df['in_context'] = corpus_matches_df['match_in_context'] + \
            corpus_matches_df['matchend_in_context']
        subcorpus_matches_df = corpus_matches_df.loc[corpus_matches_df['in_context']]

        corpus_matches_df = corpus_matches_df[['match', 'matchend']].set_index(['match', 'matchend'])
        subcorpus_matches_df = subcorpus_matches_df[['match', 'matchend']].set_index(['match', 'matchend'])

        # create breakdown
        current_app.logger.debug('get_or_create_counts :: .. creating breakdowns')
        corpus_matches = corpus.subcorpus(df_dump=corpus_matches_df, overwrite=False)
        subcorpus_matches = corpus.subcorpus(df_dump=subcorpus_matches_df, overwrite=False)
        corpus_matches_breakdown = corpus_matches.breakdown(p_atts=[collocation.p]).rename({'freq': 'f2'}, axis=1)
        subcorpus_matches_breakdown = subcorpus_matches.breakdown(p_atts=[collocation.p]).rename({'freq': 'f'}, axis=1)

        # create combined breakdown
        current_app.logger.debug('get_or_create_counts :: ..  creating combined breakdowns')
        df = corpus_matches_breakdown.join(subcorpus_matches_breakdown)
        if 'f' not in df.columns:
            df['f'] = 0         # empty queries

        df['discourseme_id'] = discourseme.id
        highlight_breakdowns.append(df)

        # update set of cpos of highlight_discoursemes
        discourseme_cpos.update(corpus_matches.matches())

    ####################################
    # (3) COUNT ITEMS AND DISCOURSEMES #
    ####################################
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
    scores = score_counts(counts, cut_off=None, min_freq=0)
    counts = counts.loc[list(scores.index)]
    current_app.logger.debug(f'ccc_collocates :: selected {len(counts)} items')

    if len(highlight_breakdowns) > 0:
        current_app.logger.debug(f'ccc_collocates :: counting {len(highlight_breakdowns)} discourseme items')
        # add discourseme breakdowns
        df = concat(highlight_breakdowns).fillna(0, downcast='infer')
        df['f1'] = f1_discoursemes
        df['N'] = corpus.corpus_size
        df = df.fillna(0)
        counts = concat([counts, df])

        # concat
        # TODO: items can belong to several discoursemes
        # assumption: if an item belongs to a discourseme, it always does → cannot be part of item counts
        # here: just keep it once, even if actual association might be different (if part of MWU in discourseme(s))
        # counts = counts.drop('discourseme_id', axis=1)
        # counts = counts[~counts.index.duplicated(keep='first')]

        disc_counts = counts.groupby('discourseme_id').agg({'f': sum, 'f2': sum, 'N': max, 'f1': max}).reset_index().fillna(0)
        disc_counts['discourseme_id'] = disc_counts['discourseme_id'].astype(int)
        disc_counts['item'] = 'DISCOURSEME ' + disc_counts['discourseme_id'].astype(str)
        disc_counts = disc_counts.set_index('item')
        counts = concat([counts, disc_counts])

    ###############
    # SAVE COUNTS #
    ###############
    current_app.logger.debug(f'ccc_collocates :: saving {len(counts)} items to database')
    counts['collocation_id'] = collocation.id
    collocation_items = counts.reset_index()
    collocation_items.to_sql('collocation_items', con=db.engine, if_exists='append', index=False)
    db.session.commit()

    ###############
    # SAVE SCORES #
    ###############
    counts = DataFrame([vars(s) for s in collocation.items], columns=['id', 'f', 'f1', 'f2', 'N']).set_index('id')
    scores = measures.score(counts, freq=True, per_million=True, digits=6, boundary='poisson', vocab=len(counts)).reset_index()
    scores = scores.melt(id_vars=['id'], var_name='measure', value_name='score').rename({'id': 'collocation_item_id'}, axis=1)
    scores['collocation_id'] = collocation.id
    scores.to_sql('item_score', con=db.engine, if_exists='append', index=False)


def ccc_collocates(collocation, sort_by, sort_order, page_size, page_number):

    get_or_create_counts(collocation)

    scores = ItemScore.query.filter_by(collocation_id=collocation.id, measure=sort_by)
    if sort_order == 'ascending':
        scores = scores.order_by(ItemScore.score)
    elif sort_order == 'descending':
        scores = scores.order_by(ItemScore.score.desc())
    scores = scores.paginate(page=page_number, per_page=page_size)
    nr_items = scores.total
    page_count = scores.pages

    df_scores = DataFrame([vars(s) for s in scores], columns=['collocation_item_id'])
    items = [CollocationItemOut().dump(CollocationItems.query.filter_by(id=id).first()) for id in df_scores['collocation_item_id']]

    return {
        'id': collocation.id,
        'p': collocation.p,
        'window': collocation.window,
        'nr_items': nr_items,
        'page_size': page_size,
        'page_number': page_number,
        'page_count': page_count,
        'items': items
    }


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


################
# API schemata #
################
class CollocationIn(Schema):

    constellation_id = Integer(required=False)
    sem_map_id = Integer(required=False)

    p = String(required=True)
    window = Integer(required=True)

    sort_order = String(load_default='descending', required=False, validate=OneOf(['ascending', 'descending']))
    sort_by = String(load_default='conservative_log_ratio', required=False, validate=OneOf(AMS_DICT.keys()))
    page_size = Integer(load_default=10, required=False)
    page_number = Integer(load_default=1, required=False)


class CollocationScoreOut(Schema):

    measure = String()
    score = Float()


class CollocationItemOut(Schema):

    item = String()
    scores = Nested(CollocationScoreOut(many=True))


class CollocationOut(Schema):

    id = Integer()
    p = String()
    window = Integer()

    nr_items = Integer()
    page_size = Integer()
    page_number = Integer()
    page_count = Integer()

    items = Nested(CollocationItemOut(many=True))


# #################
# # API endpoints #
# #################
# @bp.get('/')
# @bp.output(CollocationOut(many=True))
# @bp.auth_required(auth)
# def get_collocations():
#     """Get all collocations.

#     """

#     collocations = Collocation.query.all()

#     return [CollocationOut().dump(collocation) for collocation in collocations], 200


# @bp.get('/<id>')
# @bp.output(CollocationOut)
# @bp.auth_required(auth)
# def get_collocation(id):
#     """Get collocation.

#     """

#     collocation = db.get_or_404(Collocation, id)

#     return CollocationOut().dump(collocation), 200


# @bp.delete('/<id>')
# @bp.auth_required(auth)
# def delete_collocation(id):
#     """Delete collocation.

#     """

#     collocation = db.get_or_404(Collocation, id)
#     db.session.delete(collocation)
#     db.session.commit()

#     return 'Deletion successful.', 200


# @bp.post('/<id>/collocates')
# @bp.output(CollocationOut)
# @bp.auth_required(auth)
# def execute(id):
#     """Execute collocation: Create collocation items.

#     """

#     collocation = db.get_or_404(Collocation, id)
#     ccc_collocates(collocation, cut_off=None, min_freq=2)

#     return CollocationOut().dump(collocation), 200


# @bp.get("/<id>/collocates")
# # @bp.output(CollocationItemsOut)
# @bp.auth_required(auth)
# def get_collocation_items(id):
#     """Get collocation items.

#     """

#     collocation = db.get_or_404(Collocation, id)
#     counts = DataFrame([vars(s) for s in collocation.items], columns=['item', 'window', 'discourseme_id', 'f', 'f1', 'f2', 'N'])
#     df_collocates = score_counts(counts, cut_off=None, min_freq=1, show_negative=False, rename=False)
#     df_collocates = counts[['item', 'window', 'discourseme_id']].join(df_collocates, how='left')

#     # TODO: return long format (CollocationItemsOut)

#     return df_collocates.reset_index().to_json(orient='records'), 200


# @bp.post('/<id>/semantic_map/')
# @bp.output(SemanticMapOut)
# @bp.auth_required(auth)
# def create_semantic_map(id):
#     """Create new semantic map for collocation items.

#     """

#     collocation = db.get_or_404(Collocation, id)
#     embeddings = collocation._query.corpus.embeddings

#     coordinates = ccc_semmap(collocation, embeddings)

#     return [CoordinatesOut().dump(c) for c in coordinates]


# @bp.get('/<id>/semantic_map/')
# @bp.output(SemanticMapOut)
# @bp.auth_required(auth)
# def get_semantic_map(id):
#     """Get semantic map of collocation analysis.

#     TODO: allow many-to-many relationship

#     """

#     collocation = db.get_or_404(Collocation, id)
#     return SemanticMapOut().dump(collocation.semantic_map), 200


# @bp.put('/<id>/auto-associate')
# @bp.output(CollocationOut)
# @bp.auth_required(auth)
# def associate_discoursemes(id):

#     collocation = db.get_or_404(Collocation, id)
#     collocation_items = [item.item for item in collocation.items]
#     discoursemes = Discourseme.query.all()
#     for discourseme in discoursemes:
#         if len(set(discourseme.get_items()).intersection(collocation_items)) > 0:
#             if discourseme not in collocation.constellation.highlight_discoursemes and discourseme not in collocation.constellation.filter_discoursemes:
#                 collocation.constellation.highlight_discoursemes.append(discourseme)
#     db.session.commit()

#     counts = DataFrame([vars(s) for s in collocation.items], columns=['item', 'window', 'f', 'f1', 'f2', 'N']).set_index('item')
#     for window in set(counts['window']):
#         current_app.logger.info(f'Updating collocation :: window {window}')
#         ccc_collocates(collocation, window)

#     ccc_semmap_update(collocation)
#     ccc_semmap_discoursemes(collocation)
