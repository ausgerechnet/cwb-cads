#!/usr/bin/python3
# -*- coding: utf-8 -*-

from collections import defaultdict

from apiflask import APIBlueprint, Schema  # , abort
from apiflask.fields import Boolean, Integer, List, Nested, String, Float
from apiflask.validators import OneOf
from association_measures import measures
from ccc.utils import cqp_escape
from flask import current_app
from pandas import DataFrame, concat, read_sql

from .. import db
from ..collocation import (CollocationIn, CollocationItemOut,
                           CollocationItemsIn, CollocationItemsOut, CollocationOut,
                           get_or_create_counts)
from ..concordance import ConcordanceIn, ConcordanceOut, ccc_concordance
from ..database import (Collocation, CollocationItem, CollocationItemScore,
                        Corpus, CotextLines, Keyword, KeywordItem,
                        KeywordItemScore, SemanticMap)
from ..keyword import (KeywordItemOut, KeywordItemsIn, KeywordItemsOut,
                       KeywordOut, ccc_keywords)
from ..query import (ccc_query, get_or_create_cotext, get_or_create_query_item,
                     iterative_query)
from ..semantic_map import CoordinatesOut, ccc_init_semmap, ccc_semmap_update
from ..users import auth
from .database import (CollocationDiscoursemeItem,
                       CollocationDiscoursemeUnigramItem, Constellation,
                       ConstellationDescription, Discourseme,
                       DiscoursemeDescription, KeywordDiscoursemeItem,
                       KeywordDiscoursemeUnigramItem, DiscoursemeCoordinates)
from .discourseme import (DiscoursemeOut, create_discourseme_description,
                          description_items_to_query, DiscoursemeScoresOut, DiscoursemeDescriptionOut)

bp = APIBlueprint('constellation', __name__, url_prefix='/constellation')


def get_discourseme_coordinates(semantic_map, discourseme_descriptions):
    """

    """

    output = list()
    for desc in discourseme_descriptions:

        discourseme_coordinates = DiscoursemeCoordinates.query.filter_by(semantic_map_id=semantic_map.id,
                                                                         discourseme_id=desc.discourseme.id).first()

        if not discourseme_coordinates:

            # item coordinates
            items = [item.item for item in desc.items]
            ccc_semmap_update(semantic_map, items)  # just to be sure
            coordinates = DataFrame([vars(s) for s in semantic_map.coordinates], columns=['x', 'y', 'x_user', 'y_user', 'item']).set_index('item')
            item_coordinates = coordinates.loc[items]
            item_coordinates.loc[~ item_coordinates['x_user'].isna(), 'x'] = item_coordinates['x_user']
            item_coordinates.loc[~ item_coordinates['y_user'].isna(), 'y'] = item_coordinates['y_user']

            # discourseme coordinates
            mean = item_coordinates[['x', 'y']].mean(axis=0)
            discourseme_coordinates = DiscoursemeCoordinates(discourseme_id=desc.discourseme.id,
                                                             semantic_map_id=semantic_map.id,
                                                             x=mean['x'], y=mean['y'])
            db.session.add(discourseme_coordinates)
            db.session.commit()

        output.append(discourseme_coordinates)

    return output


def query_discourseme_corpora(keyword, discourseme_description):
    """ensure that KeywordDiscoursemeItem and KeywordDiscoursemeUnigramItem exist

    """
    # only if scores don't exist
    unigram_counts_from_sql = KeywordDiscoursemeItem.query.filter_by(keyword_id=keyword.id,
                                                                     discourseme_description_id=discourseme_description.id)
    if unigram_counts_from_sql.first():
        current_app.logger.debug(f'query_discourseme_corpora :: counts for discourseme "{discourseme_description.discourseme.name}" already exist')
        return DataFrame(), DataFrame(), DataFrame(), DataFrame()

    corpus = keyword.corpus
    corpus_reference = keyword.corpus_reference
    corpus_id_reference = keyword.corpus_id_reference
    subcorpus_id_reference = keyword.subcorpus_id_reference
    p_description = keyword.p
    match_strategy = discourseme_description.match_strategy
    s_query = discourseme_description.s
    items = [cqp_escape(item.item) for item in discourseme_description.items]

    # target
    # TODO deal with zero matches in both cases
    if not discourseme_description._query:
        discourseme_description.update_from_items()
    target_query = discourseme_description._query
    target_matches_df = ccc_query(target_query)
    if not isinstance(target_matches_df, DataFrame):
        target_breakdown = DataFrame()
        target_unigram_breakdown = DataFrame()
    target_matches = corpus.ccc().subcorpus(df_dump=target_matches_df, overwrite=False)
    target_breakdown = target_matches.breakdown(p_atts=[p_description]).rename({'freq': 'f1'}, axis=1)
    target_unigram_breakdown = target_matches.breakdown(p_atts=[p_description], split=True).rename({'freq': 'f1'}, axis=1)

    # reference
    discourseme_description_reference = DiscoursemeDescription.query.filter_by(
        discourseme_id=discourseme_description.discourseme.id,
        corpus_id=corpus_id_reference,
        subcorpus_id=subcorpus_id_reference,
        p=p_description,
        s=s_query,
        match_strategy=match_strategy
    ).first()
    if not discourseme_description_reference:
        discourseme_description_reference = create_discourseme_description(discourseme_description.discourseme,
                                                                           items,
                                                                           corpus_id_reference, subcorpus_id_reference,
                                                                           p_description, s_query, match_strategy)

    if not discourseme_description_reference._query:
        discourseme_description_reference.update_from_items()
    reference_query = discourseme_description_reference._query
    reference_matches_df = ccc_query(reference_query)
    if not isinstance(reference_matches_df, DataFrame):
        reference_breakdown = DataFrame()
        reference_unigram_breakdown = DataFrame()
    else:
        reference_matches = corpus_reference.ccc().subcorpus(df_dump=reference_matches_df, overwrite=False)
        reference_breakdown = reference_matches.breakdown(p_atts=[p_description]).rename({'freq': 'f2'}, axis=1)
        reference_unigram_breakdown = reference_matches.breakdown(p_atts=[p_description], split=True).rename({'freq': 'f2'}, axis=1)

    return target_breakdown, target_unigram_breakdown, reference_breakdown, reference_unigram_breakdown


def keyword_discourseme_counts(keyword, discourseme_descriptions):
    """ensure that KeywordDiscoursemeItem and KeywordDiscoursemeUnigramItem exist for each discourseme

    """

    current_app.logger.debug('get_discourseme_counts :: enter')
    discourseme_counts_target = list()
    discourseme_unigram_counts_target = list()
    discourseme_counts_reference = list()
    discourseme_unigram_counts_reference = list()

    for discourseme_description in discourseme_descriptions:
        t_b, t_u_b, r_b, r_u_b = query_discourseme_corpora(keyword, discourseme_description)
        if len(t_b) > 0:
            t_b['discourseme_description_id'] = discourseme_description.id
            t_u_b['discourseme_description_id'] = discourseme_description.id
            discourseme_counts_target.append(t_b)
            discourseme_unigram_counts_target.append(t_u_b)
        if len(r_b) > 0:
            r_b['discourseme_description_id'] = discourseme_description.id
            r_u_b['discourseme_description_id'] = discourseme_description.id
            discourseme_counts_reference.append(r_b)
            discourseme_unigram_counts_reference.append(r_u_b)

    if len(discourseme_counts_target) == 0:
        return

    # counts
    discourseme_counts_target = concat(discourseme_counts_target).reset_index().set_index(['item', 'discourseme_description_id'])
    discourseme_counts_reference = concat(discourseme_counts_reference).reset_index().set_index(['item', 'discourseme_description_id'])
    discourseme_counts = discourseme_counts_target.join(discourseme_counts_reference).fillna(0, downcast='infer')
    discourseme_counts['N1'] = keyword.subcorpus.nr_tokens if keyword.subcorpus else keyword.corpus.nr_tokens
    discourseme_counts['N2'] = keyword.subcorpus_reference.nr_tokens if keyword.subcorpus_reference else keyword.corpus_reference.nr_tokens
    discourseme_counts['keyword_id'] = keyword.id

    discourseme_unigram_counts_target = concat(discourseme_unigram_counts_target).reset_index().set_index(['item', 'discourseme_description_id'])
    discourseme_unigram_counts_reference = concat(discourseme_unigram_counts_reference).reset_index().set_index(['item', 'discourseme_description_id'])
    discourseme_unigram_counts = discourseme_unigram_counts_target.join(discourseme_unigram_counts_reference).fillna(0, downcast='infer')
    discourseme_unigram_counts['N1'] = keyword.subcorpus.nr_tokens if keyword.subcorpus else keyword.corpus.nr_tokens
    discourseme_unigram_counts['N2'] = keyword.subcorpus_reference.nr_tokens if keyword.subcorpus_reference else keyword.corpus_reference.nr_tokens
    discourseme_unigram_counts['keyword_id'] = keyword.id

    # sub_vs_rest correction
    sub_vs_rest = keyword.sub_vs_rest_strategy()
    if sub_vs_rest['sub_vs_rest']:
        current_app.logger.debug('ccc_discourseme_counts :: subcorpus vs. rest correction')
        if sub_vs_rest['target_is_subcorpus']:
            discourseme_counts['f2'] = discourseme_counts['f2'] - discourseme_counts['f1']
            discourseme_counts['N2'] = discourseme_counts['N2'] - discourseme_counts['N1']
            discourseme_unigram_counts['f2'] = discourseme_unigram_counts['f2'] - discourseme_unigram_counts['f1']
            discourseme_unigram_counts['N2'] = discourseme_unigram_counts['N2'] - discourseme_unigram_counts['N1']
        elif sub_vs_rest['reference_is_subcorpus']:
            discourseme_counts['f1'] = discourseme_counts['f1'] - discourseme_counts['f2']
            discourseme_counts['N1'] = discourseme_counts['N1'] - discourseme_counts['N2']
            discourseme_unigram_counts['f1'] = discourseme_unigram_counts['f1'] - discourseme_unigram_counts['f2']
            discourseme_unigram_counts['N1'] = discourseme_unigram_counts['N1'] - discourseme_unigram_counts['N2']

    # save to database
    discourseme_counts.to_sql('keyword_discourseme_item', con=db.engine, if_exists='append')
    discourseme_unigram_counts.to_sql('keyword_discourseme_unigram_item', con=db.engine, if_exists='append')

    # KeywordDiscoursemeItemScore
    counts_from_sql = KeywordDiscoursemeItem.query.filter_by(keyword_id=keyword.id)
    counts = DataFrame([vars(s) for s in counts_from_sql], columns=['id', 'f1', 'N1', 'f2', 'N2']).set_index('id')
    scores = measures.score(counts, freq=True, per_million=True, digits=6, boundary='poisson', vocab=len(counts)).reset_index()
    scores = scores.melt(id_vars=['id'], var_name='measure', value_name='score').rename(columns={'id': 'keyword_item_id'})
    scores['keyword_id'] = keyword.id
    scores.to_sql('keyword_discourseme_item_score', con=db.engine, if_exists='append', index=False)

    # KeywordDiscoursemeUnigramItemScore
    counts_from_sql = KeywordDiscoursemeUnigramItem.query.filter_by(keyword_id=keyword.id)
    counts = DataFrame([vars(s) for s in counts_from_sql], columns=['id', 'f1', 'N1', 'f2', 'N2']).set_index('id')
    scores = measures.score(counts, freq=True, per_million=True, digits=6, boundary='poisson', vocab=len(counts)).reset_index()
    scores = scores.melt(id_vars=['id'], var_name='measure', value_name='score').rename(columns={'id': 'keyword_item_id'})
    scores['keyword_id'] = keyword.id
    scores.to_sql('keyword_discourseme_unigram_item_score', con=db.engine, if_exists='append', index=False)


def query_discourseme_cotext(collocation, df_cotext, discourseme_description, discourseme_matchend_in_context=True):
    """ensure that CollocationDiscoursemeItem and CollocationDiscoursemeUnigramItem exist

    """

    unigram_counts_from_sql = CollocationDiscoursemeUnigramItem.query.filter_by(collocation_id=collocation.id,
                                                                                discourseme_description_id=discourseme_description.id)
    if unigram_counts_from_sql.first():
        current_app.logger.debug(f'query_discourseme_cotext :: counts for discourseme "{discourseme_description.discourseme.name}" already exist')
        # TODO also check for item counts?
        return

    focus_query = collocation._query
    s_query = focus_query.s
    corpus = focus_query.corpus
    subcorpus = focus_query.subcorpus
    p_description = collocation.p
    match_strategy = focus_query.match_strategy
    items = [cqp_escape(item.item) for item in discourseme_description.items]

    # get matches of discourseme in whole corpus and in subcorpus of cotext
    # three possibilities:
    # - subcorpus and local marginals
    # - no subcorpus
    # - subcorpus and global marginals
    current_app.logger.debug(
        f'query_discourseme_cotext :: .. getting matches of discourseme "{discourseme_description.discourseme.name}" in whole corpus'
    )
    if not subcorpus or (subcorpus and collocation.marginals == 'local'):
        if not discourseme_description.query_id:
            corpus_query = description_items_to_query(items, p_description, s_query, corpus, subcorpus, match_strategy)
        else:
            corpus_query = discourseme_description._query
    else:
        # TODO: do not create, but check if available!
        corpus_query = description_items_to_query(items, p_description, s_query, corpus, None, match_strategy=match_strategy)

    corpus_matches_df = ccc_query(corpus_query).reset_index()
    corpus_matches_df['in_context'] = corpus_matches_df['match'].isin(df_cotext['cpos'])
    if discourseme_matchend_in_context:
        corpus_matches_df['in_context'] = corpus_matches_df['in_context'] & corpus_matches_df['matchend'].isin(df_cotext['cpos'])

    current_app.logger.debug(
        f'query_discourseme_cotext :: .. getting matches of discourseme "{discourseme_description.discourseme.name}" in context'
    )
    subcorpus_matches_df = corpus_matches_df.loc[corpus_matches_df['in_context']]
    if len(subcorpus_matches_df) == 0:
        current_app.logger.debug(
            f'query_discourseme_cotext :: no matches in context for discourseme "{discourseme_description.discourseme.name}"'
        )
        # TODO return corpus_matches_cpos
        return

    # corpus / subcorpus
    if subcorpus and collocation.marginals == 'local':
        corpus = subcorpus.ccc()
    else:
        corpus = corpus.ccc()

    current_app.logger.debug('query_discourseme_cotext :: .. creating breakdowns in whole corpus')
    corpus_matches_df = corpus_matches_df[['match', 'matchend']].set_index(['match', 'matchend'])
    corpus_matches = corpus.subcorpus(df_dump=corpus_matches_df, overwrite=False)
    corpus_matches_breakdown = corpus_matches.breakdown(p_atts=[p_description]).rename({'freq': 'f2'}, axis=1)
    corpus_matches_unigram_breakdown = corpus_matches.breakdown(p_atts=[p_description], split=True).rename({'freq': 'f2'}, axis=1)

    current_app.logger.debug('query_discourseme_cotext :: .. creating breakdowns in context')
    subcorpus_matches_df = subcorpus_matches_df[['match', 'matchend']].set_index(['match', 'matchend'])
    subcorpus_matches = corpus.subcorpus(df_dump=subcorpus_matches_df, overwrite=False)
    subcorpus_matches_breakdown = subcorpus_matches.breakdown(p_atts=[p_description]).rename({'freq': 'f'}, axis=1)
    # TODO just split the items of the full breakdown and combine
    subcorpus_matches_unigram_breakdown = subcorpus_matches.breakdown(p_atts=[p_description], split=True).rename({'freq': 'f'}, axis=1)

    # CollocationDiscoursemeUnigramItem
    current_app.logger.debug('query_discourseme_cotext :: .. combining subcorpus and corpus unigram counts')
    df = corpus_matches_unigram_breakdown.join(subcorpus_matches_unigram_breakdown)
    df['f'] = 0 if 'f' not in df.columns else df['f']  # empty queries
    df['discourseme_description_id'] = discourseme_description.id
    df['collocation_id'] = collocation.id
    df['f1'] = len(df_cotext)
    df['N'] = corpus.size()

    current_app.logger.debug('query_discourseme_cotext :: .. saving unigram counts and scoring')
    counts = df.reset_index().fillna(0, downcast='infer')[['collocation_id', 'discourseme_description_id', 'item', 'f', 'f1', 'f2', 'N']]
    counts.to_sql('collocation_discourseme_unigram_item', con=db.engine, if_exists='append', index=False)
    counts_from_sql = CollocationDiscoursemeUnigramItem.query.filter_by(collocation_id=collocation.id,
                                                                        discourseme_description_id=discourseme_description.id)
    counts = DataFrame([vars(s) for s in counts_from_sql], columns=['id', 'f', 'f1', 'f2', 'N']).set_index('id')
    vocab_size = len(counts)
    discourseme_unigram_item_scores = measures.score(counts, freq=True, per_million=True, digits=6, boundary='poisson', vocab=vocab_size).reset_index()
    discourseme_unigram_item_scores = discourseme_unigram_item_scores.melt(
        id_vars=['id'], var_name='measure', value_name='score'
    ).rename({'id': 'collocation_item_id'}, axis=1)
    discourseme_unigram_item_scores['collocation_id'] = collocation.id
    discourseme_unigram_item_scores.to_sql('collocation_discourseme_unigram_item_score', con=db.engine, if_exists='append', index=False)

    # CollocationDiscoursemeItem
    current_app.logger.debug('query_discourseme_cotext :: .. combining subcorpus and corpus item counts')
    df = corpus_matches_breakdown.join(subcorpus_matches_breakdown)
    df['f'] = 0 if 'f' not in df.columns else df['f']  # empty queries
    df['discourseme_description_id'] = discourseme_description.id
    df['collocation_id'] = collocation.id
    df['f1'] = len(df_cotext)
    df['N'] = corpus.size()

    current_app.logger.debug('query_discourseme_cotext :: .. saving item counts and scoring')
    counts = df.reset_index().fillna(0, downcast='infer')[['collocation_id', 'discourseme_description_id', 'item', 'f', 'f1', 'f2', 'N']]
    counts.to_sql('collocation_discourseme_item', con=db.engine, if_exists='append', index=False)
    counts_from_sql = CollocationDiscoursemeItem.query.filter_by(collocation_id=collocation.id,
                                                                 discourseme_description_id=discourseme_description.id)
    counts = DataFrame([vars(s) for s in counts_from_sql], columns=['id', 'f', 'f1', 'f2', 'N']).set_index('id')
    discourseme_item_scores = measures.score(counts, freq=True, per_million=True, digits=6, boundary='poisson', vocab=vocab_size).reset_index()
    discourseme_item_scores = discourseme_item_scores.melt(
        id_vars=['id'], var_name='measure', value_name='score'
    ).rename({'id': 'collocation_item_id'}, axis=1)
    discourseme_item_scores['collocation_id'] = collocation.id
    discourseme_item_scores.to_sql('collocation_discourseme_item_score', con=db.engine, if_exists='append', index=False)

    # TODO return corpus_matches_cpos
    return


def collocation_discourseme_counts(collocation, discourseme_descriptions):
    """ensure that CollocationDiscoursemeItem and CollocationDiscoursemeUnigramItem exist for each discourseme description

    """

    focus_query = collocation._query
    window = collocation.window
    s_break = collocation.s_break

    current_app.logger.debug(f'get_discourseme_counts :: getting context of query {focus_query.id}')
    cotext = get_or_create_cotext(focus_query, window, s_break, return_df=True)
    cotext_lines = CotextLines.query.filter(CotextLines.cotext_id == cotext.id, CotextLines.offset <= window, CotextLines.offset >= -window)
    df_cotext = read_sql(cotext_lines.statement, con=db.engine, index_col='id').reset_index(drop=True).drop_duplicates(subset='cpos')

    current_app.logger.debug('get_discourseme_counts :: getting discourseme counts')
    # discourseme_cpos = set()
    for discourseme_description in discourseme_descriptions:
        query_discourseme_cotext(collocation, df_cotext, discourseme_description)

    #   discourseme_matches = query_discourseme_cotext(collocation, df_cotext, discourseme_description)
    #     if isinstance(discourseme_matches, set):
    #         discourseme_cpos.update(discourseme_matches.matches())

    # if len(discourseme_cpos) > 0:

    #     current_app.logger.debug('get_discourseme_counts :: getting discoursemes_unigram_counts')
    #     if focus_query.subcorpus and collocation.marginals == 'local':
    #         corpus = collocation._query.subcorpus.ccc()
    #     else:
    #         corpus = collocation._query.corpus.ccc()
    #     discoursemes_unigram_counts = corpus.counts.cpos(discourseme_cpos, [collocation.p])[['freq']].rename(columns={'freq': 'f'})
    #     m = corpus.marginals(discoursemes_unigram_counts.index, [collocation.p])[['freq']].rename(columns={'freq': 'f2'})
    #     discoursemes_unigram_counts = discoursemes_unigram_counts.join(m)

    #     return discoursemes_unigram_counts


def collocation_discourseme_scores(collocation_id, discourseme_description_ids):
    """get discourseme scores for collocation analysis

    """

    # TODO
    discourseme_scores = []
    for discourseme_description_id in discourseme_description_ids:

        discourseme_description = db.get_or_404(DiscoursemeDescription, discourseme_description_id)
        discourseme_id = discourseme_description.discourseme_id

        discourseme_unigram_item_scores = defaultdict(list)
        discourseme_item_scores = defaultdict(list)

        discourseme_f = defaultdict(list)
        discourseme_f1 = defaultdict(list)
        discourseme_f2 = defaultdict(list)
        discourseme_N = defaultdict(list)

        discourseme_items = CollocationDiscoursemeItem.query.filter_by(
            collocation_id=collocation_id,
            discourseme_description_id=discourseme_description_id
        )

        # df_discourseme_items = read_sql(discourseme_items.statement, con=db.engine)
        # print(df_discourseme_items)

        discourseme_unigram_items = CollocationDiscoursemeUnigramItem.query.filter_by(
            collocation_id=collocation_id,
            discourseme_description_id=discourseme_description_id
        )

        # df_discourseme_unigram_items = read_sql(discourseme_unigram_items.statement, con=db.engine)
        # print(df_discourseme_unigram_items)

        for item in discourseme_items:
            discourseme_item_scores[discourseme_id].append(item)
            discourseme_f[discourseme_id].append(item.f)
            discourseme_f1[discourseme_id].append(item.f1)
            discourseme_f2[discourseme_id].append(item.f2)
            discourseme_N[discourseme_id].append(item.N)

        for item in discourseme_unigram_items:
            discourseme_unigram_item_scores[item.discourseme_description.discourseme_id].append(item)

        for discourseme_id in discourseme_item_scores.keys():
            global_counts = DataFrame({'f': [sum(discourseme_f[discourseme_id])],
                                       'f1': [max(discourseme_f1[discourseme_id])],
                                       'f2': [sum(discourseme_f2[discourseme_id])],
                                       'N': [max(discourseme_N[discourseme_id])],
                                       'item': None}).set_index('item')
            global_scores = measures.score(global_counts, freq=True, per_million=True, digits=6, boundary='poisson', vocab=len(global_counts)).reset_index()
            discourseme_scores.append({'discourseme_id': discourseme_id,
                                       'global_scores': global_scores.melt(var_name='measure', value_name='score').to_records(index=False),
                                       'item_scores': discourseme_item_scores[discourseme_id],
                                       'unigram_item_scores': discourseme_unigram_item_scores[discourseme_id]})

    return discourseme_scores


def keyword_discourseme_scores(keyword_id, discourseme_description_ids):
    """get discourseme scores for collocation analysis

    """

    # TODO
    discourseme_scores = []
    for discourseme_description_id in discourseme_description_ids:

        discourseme_description = db.get_or_404(DiscoursemeDescription, discourseme_description_id)
        discourseme_id = discourseme_description.discourseme_id

        discourseme_unigram_item_scores = defaultdict(list)
        discourseme_item_scores = defaultdict(list)

        discourseme_f1 = defaultdict(list)
        discourseme_N1 = defaultdict(list)
        discourseme_f2 = defaultdict(list)
        discourseme_N2 = defaultdict(list)

        discourseme_items = KeywordDiscoursemeItem.query.filter_by(
            keyword_id=keyword_id,
            discourseme_description_id=discourseme_description_id
        )

        # df_discourseme_items = read_sql(discourseme_items.statement, con=db.engine)
        # print(df_discourseme_items)

        discourseme_unigram_items = KeywordDiscoursemeUnigramItem.query.filter_by(
            keyword_id=keyword_id,
            discourseme_description_id=discourseme_description_id
        )

        # df_discourseme_unigram_items = read_sql(discourseme_unigram_items.statement, con=db.engine)
        # print(df_discourseme_unigram_items)

        for item in discourseme_items:
            discourseme_item_scores[discourseme_id].append(item)
            discourseme_f1[discourseme_id].append(item.f1)
            discourseme_N1[discourseme_id].append(item.N1)
            discourseme_f2[discourseme_id].append(item.f2)
            discourseme_N2[discourseme_id].append(item.N2)

        for item in discourseme_unigram_items:
            discourseme_unigram_item_scores[item.discourseme_description.discourseme_id].append(item)

        for discourseme_id in discourseme_item_scores.keys():
            global_counts = DataFrame({'f1': [sum(discourseme_f1[discourseme_id])],
                                       'N1': [max(discourseme_N1[discourseme_id])],
                                       'f2': [sum(discourseme_f2[discourseme_id])],
                                       'N2': [max(discourseme_N2[discourseme_id])],
                                       'item': None}).set_index('item')
            global_scores = measures.score(global_counts, freq=True, per_million=True, digits=6, boundary='poisson', vocab=len(global_counts)).reset_index()
            discourseme_scores.append({'discourseme_id': discourseme_id,
                                       'global_scores': global_scores.melt(var_name='measure', value_name='score').to_records(index=False),
                                       'item_scores': discourseme_item_scores[discourseme_id],
                                       'unigram_item_scores': discourseme_unigram_item_scores[discourseme_id]})

    return discourseme_scores


################
# API schemata #
################
class ConstellationIn(Schema):

    name = String(required=False)
    comment = String(required=False)
    discourseme_ids = List(Integer, required=False, load_default=[])


class ConstellationOut(Schema):

    id = Integer()
    name = String(metadata={'nullable': True})
    comment = String(required=False, metadata={'nullable': True})
    discoursemes = Nested(DiscoursemeOut(many=True))


class ConstellationDescriptionIn(Schema):

    corpus_id = Integer(required=True)
    subcorpus_id = Integer(required=False)

    p = String(required=False)
    s = String(required=False)
    match_strategy = String(load_default='longest', required=False, validate=OneOf(['longest', 'shortest', 'standard']))


class ConstellationDiscoursemeDescriptionIn(Schema):

    discourseme_description_ids = List(Integer())


class ConstellationDescriptionOut(Schema):

    id = Integer()
    discourseme_ids = List(Integer())
    corpus_id = Integer()
    subcorpus_id = Integer()
    p = String()
    s = String()
    match_strategy = String()
    semantic_map_id = Integer()
    discourseme_descriptions = Nested(DiscoursemeDescriptionOut(many=True))


class ConstellationCollocationIn(CollocationIn):

    focus_discourseme_id = Integer(required=True)
    filter_discourseme_ids = List(Integer(), load_default=[], required=False)


class ConstellationKeywordIn(Schema):

    semantic_map_id = Integer(required=False, load_default=None)
    corpus_id_reference = Integer(required=True)
    subcorpus_id_reference = Integer(required=False, load_default=None)
    p_reference = String(required=False, load_default='lemma')
    sub_vs_rest = Boolean(required=False, load_default=True)
    min_freq = Integer(required=False, load_default=3)


class DiscoursemeCoordinatesOut(Schema):

    semantic_map_id = Integer()
    discourseme_id = Integer()
    x = Float()
    y = Float()
    x_user = Float()
    y_user = Float()


class DiscoursemeCoordinatesIn(Schema):

    discourseme_id = Integer(required=True)
    x_user = Float()
    y_user = Float()


class ConstellationCollocationItemsOut(CollocationItemsOut):

    discourseme_scores = Nested(DiscoursemeScoresOut(many=True), required=False, metadata={'nullable': True})
    discourseme_coordinates = Nested(DiscoursemeCoordinatesOut(many=True), required=False, metadata={'nullable': True})


class ConstellationKeywordItemsOut(KeywordItemsOut):

    discourseme_scores = Nested(DiscoursemeScoresOut(many=True), required=False, metadata={'nullable': True})
    discourseme_coordinates = Nested(DiscoursemeCoordinatesOut(many=True), required=False, metadata={'nullable': True})


#################
# API endpoints #
#################
@bp.post('/')
@bp.input(ConstellationIn)
@bp.output(ConstellationOut)
@bp.auth_required(auth)
def create(json_data):
    """Create new constellation.

    """

    discoursemes_ids = json_data.get('discourseme_ids')
    discoursemes = [db.get_or_404(Discourseme, did) for did in discoursemes_ids]
    constellation = Constellation(
        user_id=auth.current_user.id,
        name=json_data.get('name', '-'.join([d.name.replace(" ", "-") for d in discoursemes])[:200]),
        comment=json_data.get('comment', None),
    )
    [constellation.discoursemes.append(discourseme) for discourseme in discoursemes]
    db.session.add(constellation)
    db.session.commit()

    return ConstellationOut().dump(constellation), 200


@bp.get('/<id>')
@bp.output(ConstellationOut)
@bp.auth_required(auth)
def get_constellation(id):
    """Get details of constellation.

    """

    constellation = db.get_or_404(Constellation, id)
    return ConstellationOut().dump(constellation), 200


@bp.delete('/<id>')
@bp.auth_required(auth)
def delete_constellation(id):
    """Delete constellation.

    """

    constellation = db.get_or_404(Constellation, id)
    db.session.delete(constellation)
    db.session.commit()

    return 'Deletion successful.', 200


@bp.patch('/<id>')
@bp.input(ConstellationIn(partial=True))
@bp.output(ConstellationOut)
@bp.auth_required(auth)
def patch_constellation(id, json_data):
    """Patch constellation.

    """
    constellation = db.get_or_404(Constellation, id)

    # if constellation.user_id != auth.current_user.id:
    #     return abort(409, 'constellation does not belong to user')

    constellation.name = json_data.get('name') if json_data.get('name') else constellation.name
    constellation.comment = json_data.get('comment') if json_data.get('comment') else constellation.comment

    discourseme_ids = json_data.get('discourseme_ids')
    if discourseme_ids:
        discoursemes = [db.get_or_404(Discourseme, disc) for disc in discourseme_ids]

        # remove old ones
        for disc in constellation.discoursemes:
            constellation.discoursemes.remove(disc)

        # add new ones
        for disc in discoursemes:
            constellation.discoursemes.append(disc)

    db.session.commit()

    return ConstellationOut().dump(constellation), 200


@bp.patch('/<id>/add-discourseme')
@bp.input(ConstellationIn(partial=True))
@bp.output(ConstellationOut)
@bp.auth_required(auth)
def patch_constellation_add(id, json_data):
    """Patch constellation.

    """
    constellation = db.get_or_404(Constellation, id)
    discoursemes_ids = json_data.get('discourseme_ids', [])
    discoursemes = [db.get_or_404(Discourseme, did) for did in discoursemes_ids]
    for disc in discoursemes:
        constellation.discoursemes.append(disc)
    db.session.commit()

    return ConstellationOut().dump(constellation), 200


@bp.patch('/<id>/remove-discourseme')
@bp.input(ConstellationIn(partial=True))
@bp.output(ConstellationOut)
@bp.auth_required(auth)
def patch_constellation_remove(id, json_data):
    """Patch constellation.

    """
    constellation = db.get_or_404(Constellation, id)
    discoursemes_ids = json_data.get('discourseme_ids', [])
    discoursemes = [db.get_or_404(Discourseme, did) for did in discoursemes_ids]
    for disc in discoursemes:
        constellation.discoursemes.remove(disc)
    db.session.commit()

    return ConstellationOut().dump(constellation), 200


@bp.get('/')
@bp.output(ConstellationOut(many=True))
@bp.auth_required(auth)
def get_constellations():
    """Get all constellations.

    """

    constellations = Constellation.query.all()
    return [ConstellationOut().dump(constellation) for constellation in constellations], 200


#############################
# CONSTELLATION/DESCRIPTION #
#############################
@bp.post('/<id>/description/')
@bp.input(ConstellationDescriptionIn)
@bp.output(ConstellationDescriptionOut)
@bp.auth_required(auth)
def create_description(id, json_data):
    """Create description of constellation in corpus. Makes sure individual discourseme descriptions exist.


    """

    constellation = db.get_or_404(Constellation, id)

    corpus_id = json_data.get('corpus_id')
    corpus = db.get_or_404(Corpus, corpus_id)
    subcorpus_id = json_data.get('subcorpus_id')
    # subcorpus = db.get_or_404(SubCorpus, subcorpus_id) if subcorpus_id else None

    p_description = json_data.get('p', corpus.p_default)
    s_query = json_data.get('s', corpus.s_default)
    match_strategy = json_data.get('match_strategy')

    description = ConstellationDescription(
        constellation_id=constellation.id,
        corpus_id=corpus.id,
        subcorpus_id=subcorpus_id,
        p=p_description,
        s=s_query,
        match_strategy=match_strategy
    )

    for discourseme in constellation.discoursemes:
        desc = DiscoursemeDescription.query.filter_by(discourseme_id=discourseme.id,
                                                      corpus_id=corpus_id,
                                                      subcorpus_id=subcorpus_id,
                                                      p=p_description,
                                                      s=s_query,
                                                      match_strategy=match_strategy).first()
        if not desc:
            desc = create_discourseme_description(
                discourseme,
                [],
                corpus_id,
                subcorpus_id,
                p_description,
                s_query,
                match_strategy
            )
        description.discourseme_descriptions.append(desc)

    db.session.add(description)
    db.session.commit()

    return ConstellationDescriptionOut().dump(description), 200


@bp.get('/<id>/description/')
@bp.output(ConstellationDescriptionOut(many=True))
@bp.auth_required(auth)
def get_all_descriptions(id):

    constellation = db.get_or_404(Constellation, id)
    descriptions = ConstellationDescription.query.filter_by(constellation_id=constellation.id).all()

    return [ConstellationDescriptionOut().dump(description) for description in descriptions]


@bp.get('/<id>/description/<description_id>/')
@bp.output(ConstellationDescriptionOut)
@bp.auth_required(auth)
def get_description(id, description_id):

    # discourseme = db.get_or_404(Discourseme, id)  # TODO: needed?
    description = db.get_or_404(ConstellationDescription, description_id)

    return ConstellationDescriptionOut().dump(description)


@bp.delete('/<id>/description/<description_id>/')
@bp.auth_required(auth)
def delete_description(id, description_id):

    # discourseme = db.get_or_404(Discourseme, id)  # TODO: needed?
    description = db.get_or_404(ConstellationDescription, description_id)
    db.session.delete(description)
    db.session.commit()

    return 'Deletion successful.', 200


@bp.patch('/<id>/description/<description_id>/add-discourseme')
@bp.input(ConstellationDiscoursemeDescriptionIn)
@bp.output(ConstellationDescriptionOut(partial=True))
@bp.auth_required(auth)
def patch_description_add(id, description_id, json_data):

    # discourseme = db.get_or_404(Discourseme, id)  # TODO: needed?
    description = db.get_or_404(ConstellationDescription, description_id)
    discourseme_description_ids = json_data.get("discourseme_description_ids")
    discourseme_descriptions = [db.get_or_404(DiscoursemeDescription, desc_id) for desc_id in discourseme_description_ids]
    for desc in discourseme_descriptions:
        description.discourseme_descriptions.append(desc)
    db.session.commit()

    return ConstellationDescriptionOut().dump(description), 200


@bp.patch('/<id>/description/<description_id>/remove-discourseme')
@bp.input(ConstellationDiscoursemeDescriptionIn)
@bp.output(ConstellationDescriptionOut(partial=True))
@bp.auth_required(auth)
def patch_description_remove(id, description_id, json_data):

    # discourseme = db.get_or_404(Discourseme, id)  # TODO: needed?
    description = db.get_or_404(ConstellationDescription, description_id)
    discourseme_description_ids = json_data.get("discourseme_description_ids")
    discourseme_descriptions = [db.get_or_404(DiscoursemeDescription, desc_id) for desc_id in discourseme_description_ids]
    for desc in discourseme_descriptions:
        description.discourseme_descriptions.remove(desc)
    db.session.commit()

    return ConstellationDescriptionOut().dump(description), 200


# CONCORDANCE
@bp.get("/<id>/description/<description_id>/concordance/")
@bp.input(ConcordanceIn, location='query')
@bp.input({'focus_discourseme_id': Integer(required=True)}, location='query', arg_name='query_focus')
@bp.input({'filter_discourseme_ids': List(Integer(), load_default=[], required=False)}, location='query', arg_name='query_filter')
@bp.output(ConcordanceOut)
@bp.auth_required(auth)
def concordance_lines(id, description_id, query_data, query_focus, query_filter):
    """Get concordance lines of constellation in corpus. Redirects to query endpoint.

    """

    # constellation = db.get_or_404(Constellation, id)  # TODO needed?
    description = db.get_or_404(ConstellationDescription, description_id)

    # display options
    window = query_data.get('window')
    primary = query_data.get('primary')
    secondary = query_data.get('secondary')
    extended_window = query_data.get('extended_window')

    # pagination
    page_size = query_data.get('page_size')
    page_number = query_data.get('page_number')

    # sorting
    sort_order = query_data.get('sort_order')
    sort_by = query_data.get('sort_by_p_att')
    sort_by_s_att = query_data.get('sort_by_s_att')
    sort_offset = query_data.get('sort_by_offset')

    # filtering
    filter_discourseme_ids = query_filter.get('filter_discourseme_ids')
    filter_item = query_data.get('filter_item')
    filter_item_p_att = query_data.get('filter_item_p_att')

    # select and categorise queries
    highlight_queries = {desc.discourseme.id: desc._query for desc in description.discourseme_descriptions}
    focus_query = highlight_queries[query_focus['focus_discourseme_id']]
    filter_queries = {disc_id: highlight_queries[disc_id] for disc_id in filter_discourseme_ids}
    if filter_item:
        filter_queries['_FILTER'] = get_or_create_query_item(description.corpus, filter_item, filter_item_p_att, description.s)

    concordance = ccc_concordance(focus_query,
                                  primary, secondary,
                                  window, extended_window, description.s,
                                  filter_queries=filter_queries, highlight_queries=highlight_queries,
                                  page_number=page_number, page_size=page_size,
                                  sort_by=sort_by, sort_offset=sort_offset, sort_order=sort_order, sort_by_s_att=sort_by_s_att)

    return ConcordanceOut().dump(concordance), 200


# COLLOCATION
@bp.post("/<id>/description/<description_id>/collocation/")
@bp.input(ConstellationCollocationIn)
@bp.output(CollocationOut)
@bp.auth_required(auth)
def create_collocation(id, description_id, json_data):
    """Create collocation analysis of constellation in corpus.

    """

    # constellation = db.get_or_404(Constellation, id)  # TODO needed?
    description = db.get_or_404(ConstellationDescription, description_id)

    # context options
    window = json_data.get('window')
    p = description.p
    s = description.s

    # marginals
    marginals = json_data.get('marginals', 'global')

    # semantic map
    semantic_map_id = json_data.get('semantic_map_id', None)

    # filtering
    filter_discourseme_ids = json_data.get('filter_discourseme_ids')
    filter_item = json_data.get('filter_item')
    filter_item_p_att = json_data.get('filter_item_p_att')

    # select and categorise queries
    highlight_queries = {desc.discourseme.id: desc._query for desc in description.discourseme_descriptions}
    focus_query = highlight_queries[json_data['focus_discourseme_id']]
    filter_queries = {disc_id: highlight_queries[disc_id] for disc_id in filter_discourseme_ids}
    if filter_item:
        filter_queries['_FILTER'] = get_or_create_query_item(description.corpus, filter_item, filter_item_p_att, description.s)

    if len(filter_queries) > 0:
        focus_query = iterative_query(focus_query, filter_queries, window)

    # create collocation object
    collocation = Collocation(
        # constellation_id=constellation_id,
        semantic_map_id=semantic_map_id,
        query_id=focus_query.id,
        p=p,
        s_break=s,
        window=window,
        marginals=marginals
    )
    db.session.add(collocation)
    db.session.commit()

    get_or_create_counts(collocation, remove_focus_cpos=False)
    collocation_discourseme_counts(collocation, description.discourseme_descriptions)
    ccc_init_semmap(collocation, semantic_map_id)

    return CollocationOut().dump(collocation), 200


@bp.get("/<id>/description/<description_id>/collocation/<collocation_id>/items")
@bp.input(CollocationItemsIn, location='query')
@bp.output(ConstellationCollocationItemsOut)
@bp.auth_required(auth)
def get_collocation_items(id, description_id, collocation_id, query_data):
    """Get scored items of collocation analysis.

    """

    description = db.get_or_404(ConstellationDescription, description_id)
    collocation = db.get_or_404(Collocation, collocation_id)

    page_size = query_data.pop('page_size')
    page_number = query_data.pop('page_number')
    sort_order = query_data.pop('sort_order')
    sort_by = query_data.pop('sort_by')

    # TODO filter out focus discourseme (traditional) or all discoursemes (correction of marginals needed!) or None?
    # # TODO anti-joins
    # unigram_items = CollocationDiscoursemeUnigramItem.query.filter_by(
    #     collocation_id=collocation.id,
    #     constellation_description_id=description_id
    # )
    # blacklist = CollocationItem.query.filter(
    #     CollocationItem.collocation_id == collocation.id,
    #     CollocationItem.item.in_([f.item for f in unigram_items])
    # )
    scores = CollocationItemScore.query.filter(
        CollocationItemScore.collocation_id == collocation.id,
        CollocationItemScore.measure == sort_by,
        # ~ CollocationItemScore.collocation_item_id.in_([b.id for b in blacklist])
    )

    # order
    if sort_order == 'ascending':
        scores = scores.order_by(CollocationItemScore.score)
    elif sort_order == 'descending':
        scores = scores.order_by(CollocationItemScore.score.desc())

    # paginate
    scores = scores.paginate(page=page_number, per_page=page_size)
    nr_items = scores.total
    page_count = scores.pages

    # format
    df_scores = DataFrame([vars(s) for s in scores], columns=['collocation_item_id'])
    items = [CollocationItemOut().dump(db.get_or_404(CollocationItem, id)) for id in df_scores['collocation_item_id']]

    # discourseme scores
    collocation_discourseme_counts(collocation, description.discourseme_descriptions)
    discourseme_scores = collocation_discourseme_scores(collocation_id, [d.id for d in description.discourseme_descriptions])
    # discourseme_scores = [s for s in collocation.discourseme_scores]  # if s['discourseme_id'] != focus_discourseme_id]
    for s in discourseme_scores:
        s['item_scores'] = [CollocationItemOut().dump(sc) for sc in s['item_scores']]
        s['unigram_item_scores'] = [CollocationItemOut().dump(sc) for sc in s['unigram_item_scores']]
    discourseme_scores = [DiscoursemeScoresOut().dump(s) for s in discourseme_scores]

    # coordinates
    coordinates = list()
    if collocation.semantic_map:
        # make sure there's coordinates for all requested items and discourseme items
        requested_items = [item['item'] for item in items]
        for discourseme_score in discourseme_scores:
            requested_items.extend([d['item'] for d in discourseme_score['item_scores']])
        ccc_semmap_update(collocation.semantic_map, requested_items)
        coordinates = [CoordinatesOut().dump(coordinates) for coordinates in collocation.semantic_map.coordinates if coordinates.item in requested_items]

        # discourseme coordinates
        discourseme_coordinates = get_discourseme_coordinates(collocation.semantic_map, description.discourseme_descriptions)
        discourseme_coordinates = [DiscoursemeCoordinatesOut().dump(c) for c in discourseme_coordinates]

    # TODO: also return ranks (to ease frontend pagination)?
    collocation_items = {
        'id': collocation.id,
        'sort_by': sort_by,
        'nr_items': nr_items,
        'page_size': page_size,
        'page_number': page_number,
        'page_count': page_count,
        'items': items,
        'coordinates': coordinates,
        'discourseme_scores': discourseme_scores,
        'discourseme_coordinates': discourseme_coordinates
    }

    return ConstellationCollocationItemsOut().dump(collocation_items), 200


@bp.put('/<id>/description/<description_id>/collocation/<collocation_id>/auto-associate')
@bp.auth_required(auth)
def associate_discoursemes(id, description_id, collocation_id):
    """automatically associate discoursemes that occur in the top collocational profile with this constellation

    Output: DiscoursemeDescription(many=True)
    """

    constellation = db.get_or_404(Constellation, id)
    collocation = db.get_or_404(Collocation, collocation_id)
    collocation_items = collocation.top_items()
    discoursemes = Discourseme.query.all()

    for discourseme in discoursemes:
        discourseme_items = [item.surface for item in discourseme.template]
        if len(set(discourseme_items).intersection(collocation_items)) > 0:
            if discourseme not in constellation.discoursemes:
                constellation.discoursemes.append(discourseme)

    db.session.commit()

    # counts = DataFrame([vars(s) for s in collocation.items], columns=['item', 'window', 'f', 'f1', 'f2', 'N']).set_index('item')
    # for window in set(counts['window']):
    #     current_app.logger.info(f'Updating collocation :: window {window}')
    #     ccc_collocates(collocation, window)

    # ccc_semmap_update(collocation)
    # ccc_semmap_discoursemes(collocation)

    return {"id": int(id)}, 200


# KEYWORD
@bp.post("/<id>/description/<description_id>/keyword/")
@bp.input(ConstellationKeywordIn)
@bp.output(KeywordOut)
def create_keyword(id, description_id, json_data):

    # description
    description = db.get_or_404(ConstellationDescription, description_id)

    # corpus
    corpus_id = description.corpus_id
    subcorpus_id = description.subcorpus_id
    p = description.p

    # reference corpus
    corpus_id_reference = json_data.get('corpus_id_reference')
    subcorpus_id_reference = json_data.get('subcorpus_id_reference')
    p_reference = json_data.get('p_reference')

    # semantic map
    semantic_map_id = json_data.get('semantic_map_id')

    # settings
    sub_vs_rest = json_data.get('sub_vs_rest')
    min_freq = json_data.get('min_freq')

    keyword = Keyword(
        # constellation_id=constellation_id,
        semantic_map_id=semantic_map_id,
        corpus_id=corpus_id,
        subcorpus_id=subcorpus_id,
        p=p,
        corpus_id_reference=corpus_id_reference,
        subcorpus_id_reference=subcorpus_id_reference,
        p_reference=p_reference,
        min_freq=min_freq,
        sub_vs_rest=sub_vs_rest
    )
    db.session.add(keyword)
    db.session.commit()

    ccc_keywords(keyword)
    keyword_discourseme_counts(keyword, description.discourseme_descriptions)
    ccc_init_semmap(keyword, semantic_map_id)

    return KeywordOut().dump(keyword), 200


@bp.get("/<id>/description/<description_id>/keyword/<keyword_id>/items")
@bp.input(KeywordItemsIn, location='query')
@bp.output(ConstellationKeywordItemsOut)
@bp.auth_required(auth)
def get_keyword_items(id, description_id, keyword_id, query_data):
    """Get scored items of collocation analysis.

    """

    description = db.get_or_404(ConstellationDescription, description_id)
    keyword = db.get_or_404(Keyword, keyword_id)

    page_size = query_data.pop('page_size')
    page_number = query_data.pop('page_number')
    sort_order = query_data.pop('sort_order')
    sort_by = query_data.pop('sort_by')

    scores = KeywordItemScore.query.filter(
        KeywordItemScore.keyword_id == keyword.id,
        KeywordItemScore.measure == sort_by
    )

    # order
    if sort_order == 'ascending':
        scores = scores.order_by(KeywordItemScore.score)
    elif sort_order == 'descending':
        scores = scores.order_by(KeywordItemScore.score.desc())

    # paginate
    scores = scores.paginate(page=page_number, per_page=page_size)
    nr_items = scores.total
    page_count = scores.pages

    # format
    df_scores = DataFrame([vars(s) for s in scores], columns=['keyword_item_id'])
    items = [KeywordItemOut().dump(db.get_or_404(KeywordItem, id)) for id in df_scores['keyword_item_id']]

    # discourseme scores
    keyword_discourseme_counts(keyword, description.discourseme_descriptions)
    discourseme_scores = keyword_discourseme_scores(keyword_id, [d.id for d in description.discourseme_descriptions])
    for s in discourseme_scores:
        s['item_scores'] = [KeywordItemOut().dump(sc) for sc in s['item_scores']]
        s['unigram_item_scores'] = [KeywordItemOut().dump(sc) for sc in s['unigram_item_scores']]
    discourseme_scores = [DiscoursemeScoresOut().dump(s) for s in discourseme_scores]

    # coordinates
    coordinates = list()
    discourseme_coordinates = list()
    if keyword.semantic_map:
        # make sure there's coordinates for all requested items and discourseme items
        requested_items = [item['item'] for item in items]
        for discourseme_score in discourseme_scores:
            requested_items.extend([d['item'] for d in discourseme_score['item_scores']])
        ccc_semmap_update(keyword.semantic_map, requested_items)
        coordinates = [CoordinatesOut().dump(coordinates) for coordinates in keyword.semantic_map.coordinates if coordinates.item in requested_items]

        # discourseme coordinates
        discourseme_coordinates = get_discourseme_coordinates(keyword.semantic_map, description.discourseme_descriptions)
        discourseme_coordinates = [DiscoursemeCoordinatesOut().dump(c) for c in discourseme_coordinates]

    # TODO: also return ranks (to ease frontend pagination)?
    keyword_items = {
        'id': keyword.id,
        'sort_by': sort_by,
        'nr_items': nr_items,
        'page_size': page_size,
        'page_number': page_number,
        'page_count': page_count,
        'items': items,
        'coordinates': coordinates,
        'discourseme_scores': discourseme_scores,
        'discourseme_coordinates': discourseme_coordinates
    }

    return ConstellationKeywordItemsOut().dump(keyword_items), 200


@bp.put('/<id>/description/<description_id>/keyword/<keyword_id>/auto-associate')
@bp.auth_required(auth)
def associate_discoursemes_keyword(id, description_id, keyword_id):
    """automatically associate discoursemes that occur in the top collocational profile with this constellation

    """

    constellation = db.get_or_404(Constellation, id)
    keyword = db.get_or_404(Keyword, keyword_id)
    keyword_items = keyword.top_items()
    discoursemes = Discourseme.query.all()

    for discourseme in discoursemes:
        discourseme_items = [item.surface for item in discourseme.template]
        if len(set(discourseme_items).intersection(keyword_items)) > 0:
            if discourseme not in constellation.discoursemes:
                constellation.discoursemes.append(discourseme)

    db.session.commit()

    # counts = DataFrame([vars(s) for s in keyword.items], columns=['item', 'window', 'f', 'f1', 'f2', 'N']).set_index('item')
    # for window in set(counts['window']):
    #     current_app.logger.info(f'Updating keyword :: window {window}')
    #     ccc_collocates(keyword, window)

    # ccc_semmap_update(keyword)
    # ccc_semmap_discoursemes(keyword)

    return {"id": int(id)}, 200


# SEMANTIC MAP
@bp.get("/<id>/description/<description_id>/semantic_map/<semantic_map_id>/coordinates/")
@bp.output(DiscoursemeCoordinatesOut(many=True))
@bp.auth_required(auth)
def get_coordinates(id, description_id, semantic_map_id):
    """Get discourseme coordinates.

    """

    description = db.get_or_404(ConstellationDescription, description_id)
    semantic_map = db.get_or_404(SemanticMap, semantic_map_id)
    discourseme_coordinates = get_discourseme_coordinates(semantic_map, description.discourseme_descriptions)

    return [DiscoursemeCoordinatesOut().dump(c) for c in discourseme_coordinates], 200


@bp.put("/<id>/description/<description_id>/semantic_map/<semantic_map_id>/coordinates/")
@bp.input(DiscoursemeCoordinatesIn)
@bp.output(DiscoursemeCoordinatesOut(many=True))
@bp.auth_required(auth)
def set_coordinates(id, description_id, semantic_map_id, json_data):
    """Set coordinates of a discourseme.

    """

    semantic_map = db.get_or_404(SemanticMap, semantic_map_id)
    description = db.get_or_404(ConstellationDescription, description_id)
    discourseme_id = json_data.get('discourseme_id')
    x_user = json_data.get('x_user')
    y_user = json_data.get('y_user')

    discourseme_coordinates = DiscoursemeCoordinates.query.filter(DiscoursemeCoordinates.discourseme_id == discourseme_id,
                                                                  DiscoursemeCoordinates.semantic_map_id == semantic_map.id).first()
    discourseme_coordinates.x_user = x_user
    discourseme_coordinates.y_user = y_user
    db.session.commit()

    discourseme_coordinates = get_discourseme_coordinates(semantic_map, description.discourseme_descriptions)

    return [DiscoursemeCoordinatesOut().dump(c) for c in discourseme_coordinates], 200
