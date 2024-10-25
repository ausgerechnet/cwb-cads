#!/usr/bin/python3
# -*- coding: utf-8 -*-

from itertools import chain

from apiflask import APIBlueprint, Schema  # , abort
from apiflask.fields import Boolean, Float, Integer, List, Nested, String
from apiflask.validators import OneOf
from association_measures import measures
from flask import current_app
from itertools import combinations
from pandas import DataFrame, read_sql

from .. import db
from ..breakdown import ccc_breakdown
from ..collocation import (CollocationIn, CollocationItemOut,
                           CollocationItemsIn, CollocationItemsOut,
                           CollocationOut, get_or_create_counts)
from ..concordance import ConcordanceIn, ConcordanceOut, ccc_concordance
from ..database import (Breakdown, Collocation, CollocationItem,
                        CollocationItemScore, Corpus, CotextLines, Keyword,
                        KeywordItem, KeywordItemScore, SemanticMap,
                        get_or_create)
from ..keyword import (KeywordItemOut, KeywordItemsIn, KeywordItemsOut,
                       KeywordOut, ccc_keywords)
from ..query import (ccc_query, get_or_create_cotext, get_or_create_query_item,
                     iterative_query)
from ..semantic_map import CoordinatesOut, ccc_semmap_init, ccc_semmap_update
from ..users import auth
from .database import (CollocationDiscoursemeItem, Constellation,
                       ConstellationDescription, Discourseme,
                       DiscoursemeCoordinates, DiscoursemeDescription,
                       KeywordDiscoursemeItem)
from .discourseme import (DiscoursemeCoordinatesIn, DiscoursemeCoordinatesOut,
                          DiscoursemeDescriptionOut, DiscoursemeOut,
                          DiscoursemeScoresOut,
                          discourseme_template_to_description)

bp = APIBlueprint('constellation', __name__, url_prefix='/constellation')


def pairwise_intersections(dict_of_sets):

    nt = lambda a, b: len(dict_of_sets[a].intersection(dict_of_sets[b]))
    res = dict([(t, nt(*t)) for t in combinations(dict_of_sets.keys(), 2)])
    return res


def get_discourseme_coordinates(semantic_map, discourseme_descriptions, p=None):
    """

    # TODO check that all items in the breakdown have coordinates
    """

    output = list()
    for desc in discourseme_descriptions:

        discourseme_coordinates = DiscoursemeCoordinates.query.filter_by(semantic_map_id=semantic_map.id,
                                                                         discourseme_id=desc.discourseme.id).first()

        if not discourseme_coordinates:

            if p is None:
                raise ValueError()

            # item coordinates
            query = desc._query
            breakdown = get_or_create(Breakdown, query_id=query.id, p=p)
            df_breakdown = ccc_breakdown(breakdown)
            if df_breakdown is not None:
                items = list(df_breakdown.reset_index()['item'])
            else:
                continue
            ccc_semmap_update(semantic_map, items)  # just to be sure
            coordinates = DataFrame([vars(s) for s in semantic_map.coordinates], columns=['x', 'y', 'x_user', 'y_user', 'item']).set_index('item')
            item_coordinates = coordinates.loc[items]

            # discourseme coordinates = centroid of items
            if len(item_coordinates) == 0:
                mean = {'x': 0, 'y': 0}
            else:
                item_coordinates.loc[~ item_coordinates['x_user'].isna(), 'x'] = item_coordinates['x_user']
                item_coordinates.loc[~ item_coordinates['y_user'].isna(), 'y'] = item_coordinates['y_user']
                mean = item_coordinates[['x', 'y']].mean(axis=0)

            # save
            discourseme_coordinates = DiscoursemeCoordinates(discourseme_id=desc.discourseme.id,
                                                             semantic_map_id=semantic_map.id,
                                                             x=mean['x'], y=mean['y'])
            db.session.add(discourseme_coordinates)
            db.session.commit()

        output.append(discourseme_coordinates)

    return output


def query_discourseme_corpora(keyword, discourseme_description):
    """ensure that KeywordDiscoursemeItems exist for discourseme description

    """

    # only if scores don't exist
    counts_from_sql = KeywordDiscoursemeItem.query.filter_by(keyword_id=keyword.id,
                                                             discourseme_description_id=discourseme_description.id)
    if counts_from_sql.first():
        current_app.logger.debug(f'query_discourseme_corpora :: counts for discourseme "{discourseme_description.discourseme.name}" already exist')
        return

    corpus = keyword.corpus
    corpus_reference = keyword.corpus_reference
    corpus_id_reference = keyword.corpus_id_reference
    subcorpus_id_reference = keyword.subcorpus_id_reference
    p_description = keyword.p
    match_strategy = discourseme_description.match_strategy
    s_query = discourseme_description.s

    # make sure discourseme description exists in reference corpus
    discourseme_description_reference = DiscoursemeDescription.query.filter_by(
        discourseme_id=discourseme_description.discourseme.id,
        corpus_id=corpus_id_reference,
        subcorpus_id=subcorpus_id_reference,
        filter_sequence=None,
        s=s_query,
        match_strategy=match_strategy
    ).first()
    if not discourseme_description_reference:
        discourseme_description_reference = discourseme_template_to_description(
            discourseme_description.discourseme,
            [{'surface': item.surface, 'p': item.p, 'cqp_query': item.cqp_query} for item in discourseme_description.items],
            corpus_id_reference,
            subcorpus_id_reference,
            s_query,
            match_strategy
        )

    # target
    target_matches_df = ccc_query(discourseme_description._query)
    if len(target_matches_df) == 0:
        target_breakdown = DataFrame(columns=['f1'])
        target_breakdown.index.name = 'item'
    else:
        target_matches = corpus.ccc().subcorpus(df_dump=target_matches_df, overwrite=False)
        target_breakdown = target_matches.breakdown(p_atts=[p_description]).rename({'freq': 'f1'}, axis=1).reset_index().set_index('item')

    # reference
    reference_matches_df = ccc_query(discourseme_description_reference._query)
    if len(reference_matches_df) == 0:
        reference_breakdown = DataFrame(columns=['f2'])
        reference_breakdown.index.name = 'item'
    else:
        reference_matches = corpus_reference.ccc().subcorpus(df_dump=reference_matches_df, overwrite=False)
        reference_breakdown = reference_matches.breakdown(p_atts=[p_description]).rename({'freq': 'f2'}, axis=1).reset_index().set_index('item')

    # combine
    discourseme_counts = target_breakdown.join(reference_breakdown).fillna(0, downcast='infer')
    if len(discourseme_counts) == 0:
        return
    discourseme_counts['discourseme_description_id'] = discourseme_description.id
    discourseme_counts['N1'] = keyword.subcorpus.nr_tokens if keyword.subcorpus else keyword.corpus.nr_tokens
    discourseme_counts['N2'] = keyword.subcorpus_reference.nr_tokens if keyword.subcorpus_reference else keyword.corpus_reference.nr_tokens
    discourseme_counts['keyword_id'] = keyword.id

    # sub_vs_rest correction
    sub_vs_rest = keyword.sub_vs_rest_strategy()
    if sub_vs_rest['sub_vs_rest']:
        current_app.logger.debug('ccc_discourseme_counts :: subcorpus vs. rest correction')
        if sub_vs_rest['target_is_subcorpus']:
            discourseme_counts['f2'] = discourseme_counts['f2'] - discourseme_counts['f1']
            discourseme_counts['N2'] = discourseme_counts['N2'] - discourseme_counts['N1']
        elif sub_vs_rest['reference_is_subcorpus']:
            discourseme_counts['f1'] = discourseme_counts['f1'] - discourseme_counts['f2']
            discourseme_counts['N1'] = discourseme_counts['N1'] - discourseme_counts['N2']

    # save to database
    discourseme_counts.to_sql('keyword_discourseme_item', con=db.engine, if_exists='append')

    # KeywordDiscoursemeItemScore
    counts_from_sql = KeywordDiscoursemeItem.query.filter_by(keyword_id=keyword.id)
    counts = DataFrame([vars(s) for s in counts_from_sql], columns=['id', 'f1', 'N1', 'f2', 'N2']).set_index('id')
    scores = measures.score(counts, freq=True, per_million=True, digits=6, boundary='poisson', vocab=len(counts)).reset_index()
    scores = scores.melt(id_vars=['id'], var_name='measure', value_name='score').rename(columns={'id': 'keyword_item_id'})
    scores['keyword_id'] = keyword.id
    scores.to_sql('keyword_discourseme_item_score', con=db.engine, if_exists='append', index=False)


def query_discourseme_cotext(collocation, df_cotext, discourseme_description, overlap='partial'):
    """ensure that CollocationDiscoursemeItems exist for discourseme description

    """

    # only if scores don't exist
    counts_from_sql = CollocationDiscoursemeItem.query.filter_by(collocation_id=collocation.id,
                                                                 discourseme_description_id=discourseme_description.id)
    if counts_from_sql.first():
        current_app.logger.debug(f'query_discourseme_cotext :: counts for discourseme "{discourseme_description.discourseme.name}" already exist')
        return

    focus_query = collocation._query
    # s_query = focus_query.s
    corpus = focus_query.corpus
    subcorpus = focus_query.subcorpus
    p_description = collocation.p
    # match_strategy = focus_query.match_strategy
    # items = [cqp_escape(item.item) for item in discourseme_description.items]

    # get matches of discourseme in whole corpus and in subcorpus of cotext; three possibilities:
    # - no subcorpus
    # - subcorpus and local marginals
    # - subcorpus and global marginals
    current_app.logger.debug(
        f'query_discourseme_cotext :: .. getting matches of discourseme "{discourseme_description.discourseme.name}" in whole corpus'
    )
    # no subcorpus or local marginals
    if not subcorpus or (subcorpus and collocation.marginals == 'local'):
        corpus_query = discourseme_description._query
    else:
        # subcorpus with global marginals
        discourseme_description_global = DiscoursemeDescription.query.filter_by(
            discourseme_id=discourseme_description.discourseme_id,
            corpus_id=discourseme_description.corpus_id,
            subcorpus_id=None,
            filter_sequence=None,
            s=discourseme_description.s,
            match_strategy=discourseme_description.match_strategy
        ).first()
        if not discourseme_description_global:
            discourseme_description_global = discourseme_template_to_description(
                discourseme_description.discourseme,
                [{'surface': item.surface, 'p': item.p, 'cqp_query': item.cqp_query} for item in discourseme_description.items],
                discourseme_description.corpus_id,
                None,
                discourseme_description.s_query,
                discourseme_description.match_strategy
            )
        corpus_query = discourseme_description_global._query

    corpus_matches_df = ccc_query(corpus_query).reset_index()
    if len(corpus_matches_df) == 0:
        return

    if overlap == 'partial':
        corpus_matches_df['in_context'] = corpus_matches_df['match'].isin(df_cotext['cpos']) | corpus_matches_df['matchend'].isin(df_cotext['cpos'])
    elif overlap == 'full':
        corpus_matches_df['in_context'] = corpus_matches_df['match'].isin(df_cotext['cpos']) & corpus_matches_df['matchend'].isin(df_cotext['cpos'])
    elif overlap == 'match':
        corpus_matches_df['in_context'] = corpus_matches_df['match'].isin(df_cotext['cpos'])
    elif overlap == 'matchend':
        corpus_matches_df['in_context'] = corpus_matches_df['matchend'].isin(df_cotext['cpos'])
    else:
        raise ValueError("overlap must be one of 'match', 'matchend', 'partial', or 'full'")

    current_app.logger.debug(
        f'query_discourseme_cotext :: .. getting matches of discourseme "{discourseme_description.discourseme.name}" in context'
    )
    subcorpus_matches_df = corpus_matches_df.loc[corpus_matches_df['in_context']]
    if len(subcorpus_matches_df) == 0:
        current_app.logger.debug(
            f'query_discourseme_cotext :: no matches in context for discourseme "{discourseme_description.discourseme.name}"'
        )
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

    current_app.logger.debug('query_discourseme_cotext :: .. creating breakdowns in context')
    subcorpus_matches_df = subcorpus_matches_df[['match', 'matchend']].set_index(['match', 'matchend'])
    subcorpus_matches = corpus.subcorpus(df_dump=subcorpus_matches_df, overwrite=False)
    subcorpus_matches_breakdown = subcorpus_matches.breakdown(p_atts=[p_description]).rename({'freq': 'f'}, axis=1)

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
    discourseme_item_scores = measures.score(counts, freq=True, per_million=True, digits=6, boundary='poisson').reset_index()
    discourseme_item_scores = discourseme_item_scores.melt(
        id_vars=['id'], var_name='measure', value_name='score'
    ).rename({'id': 'collocation_item_id'}, axis=1)
    discourseme_item_scores['collocation_id'] = collocation.id
    discourseme_item_scores.to_sql('collocation_discourseme_item_score', con=db.engine, if_exists='append', index=False)


def set_collocation_discourseme_scores(collocation, discourseme_descriptions, overlap='partial'):
    """ensure that CollocationDiscoursemeItems exist for each discourseme description

    """

    focus_query = collocation._query
    window = collocation.window
    s_break = collocation.s_break

    current_app.logger.debug(f'set_collocation_discourseme_scores :: getting context of query {focus_query.id}')
    cotext = get_or_create_cotext(focus_query, window, s_break, return_df=True)
    cotext_lines = CotextLines.query.filter(CotextLines.cotext_id == cotext.id, CotextLines.offset <= window, CotextLines.offset >= -window)
    df_cotext = read_sql(cotext_lines.statement, con=db.engine, index_col='id').reset_index(drop=True).drop_duplicates(subset='cpos')

    current_app.logger.debug('set_collocation_discourseme_scores :: looping through descriptions')
    for discourseme_description in discourseme_descriptions:
        query_discourseme_cotext(collocation, df_cotext, discourseme_description, overlap=overlap)


def get_collocation_discourseme_scores(collocation_id, discourseme_description_ids):
    """get discourseme scores for collocation analysis

    TODO define more reasonable output format
    TODO: make tests compliant with paper
    """

    discourseme_scores = []
    for discourseme_description_id in discourseme_description_ids:

        discourseme_description = db.get_or_404(DiscoursemeDescription, discourseme_description_id)
        discourseme_id = discourseme_description.discourseme_id

        # discourseme items
        discourseme_items = CollocationDiscoursemeItem.query.filter_by(
            collocation_id=collocation_id,
            discourseme_description_id=discourseme_description_id
        )
        df_discourseme_items = DataFrame([vars(s) for s in discourseme_items], columns=['item', 'f', 'f1', 'f2', 'N'])
        if len(df_discourseme_items) == 0:
            continue
        df_discourseme_items['discourseme_id'] = discourseme_id

        # discourseme unigram items
        df_discourseme_unigram_items = df_discourseme_items.copy()
        df_discourseme_unigram_items['item'] = df_discourseme_unigram_items['item'].str.split()
        df_discourseme_unigram_items = df_discourseme_unigram_items.explode('item')
        df_discourseme_unigram_items = df_discourseme_unigram_items.groupby('item').aggregate({'f': 'sum', 'f1': 'max', 'f2': 'sum', 'N': 'max'})
        df_unigram_item_scores = measures.score(df_discourseme_unigram_items, freq=True, per_million=True, digits=6, boundary='poisson')
        _unigram_item_scores = df_unigram_item_scores.to_dict(orient='index')
        unigram_item_scores = list()
        for item in _unigram_item_scores.keys():
            _scores = list()
            for measure in _unigram_item_scores[item].keys():
                _scores.append({'measure': measure, 'score': _unigram_item_scores[item][measure]})
            unigram_item_scores.append({
                'item': item,
                'scores': _scores
            })

        # global scores
        df_discourseme_global_scores = df_discourseme_items.groupby('discourseme_id').aggregate({'f': 'sum', 'f1': 'max', 'f2': 'sum', 'N': 'max'})
        # df_discourseme_global_scores = df_discourseme_unigram_items.groupby('discourseme_id').aggregate({'f': 'sum', 'f1': 'max', 'f2': 'sum', 'N': 'max'})
        df_global_scores = measures.score(df_discourseme_global_scores, freq=True, per_million=True, digits=6, boundary='poisson').reset_index()

        # output
        discourseme_scores.append({'discourseme_id': discourseme_id,
                                   'global_scores': df_global_scores.melt(var_name='measure', value_name='score').to_records(index=False),
                                   'item_scores': discourseme_items.all(),
                                   'unigram_item_scores': unigram_item_scores})

    return discourseme_scores


def set_keyword_discourseme_scores(keyword, discourseme_descriptions):
    """ensure that KeywordDiscoursemeItems exist for each discourseme description

    """

    current_app.logger.debug('set_keyword_discourseme_scores :: looping through descriptions')
    for discourseme_description in discourseme_descriptions:
        query_discourseme_corpora(keyword, discourseme_description)


def get_keyword_discourseme_scores(keyword_id, discourseme_description_ids):
    """get discourseme scores for keyword analysis

    TODO define more reasonable output format
    TODO make tests compliant with paper
    """

    discourseme_scores = []
    for discourseme_description_id in discourseme_description_ids:

        discourseme_description = db.get_or_404(DiscoursemeDescription, discourseme_description_id)
        discourseme_id = discourseme_description.discourseme_id

        # discourseme items
        discourseme_items = KeywordDiscoursemeItem.query.filter_by(
            keyword_id=keyword_id,
            discourseme_description_id=discourseme_description_id
        )
        df_discourseme_items = DataFrame([vars(s) for s in discourseme_items], columns=['item', 'f1', 'N1', 'f2', 'N2'])
        if len(df_discourseme_items) == 0:
            continue
        # THIS IS ACTUALLY ALREADY SAVED BUT I'M TOO STUPID TO RETRIEVE IT
        df_discourseme_items['discourseme_id'] = discourseme_id
        df_discourseme_items_scores = df_discourseme_items.set_index('item')
        df_discourseme_items_scores = measures.score(df_discourseme_items_scores, freq=True, per_million=True, digits=6, boundary='poisson')
        _discourseme_items_scores = df_discourseme_items_scores.to_dict(orient='index')
        discourseme_items_scores = list()
        for item in _discourseme_items_scores.keys():
            _scores = list()
            for measure in _discourseme_items_scores[item].keys():
                _scores.append({'measure': measure, 'score': _discourseme_items_scores[item][measure]})
            discourseme_items_scores.append({
                'item': item,
                'scores': _scores
            })

        # discourseme unigram items
        df_discourseme_unigram_items = df_discourseme_items.copy()
        df_discourseme_unigram_items['item'] = df_discourseme_unigram_items['item'].str.split()
        df_discourseme_unigram_items = df_discourseme_unigram_items.explode('item')
        df_discourseme_unigram_items = df_discourseme_unigram_items.groupby('item').aggregate({'f1': 'sum', 'N1': 'max', 'f2': 'sum', 'N2': 'max'})
        df_unigram_item_scores = measures.score(df_discourseme_unigram_items, freq=True, per_million=True, digits=6, boundary='poisson')
        _unigram_item_scores = df_unigram_item_scores.to_dict(orient='index')
        unigram_item_scores = list()
        for item in _unigram_item_scores.keys():
            _scores = list()
            for measure in _unigram_item_scores[item].keys():
                _scores.append({'measure': measure, 'score': _unigram_item_scores[item][measure]})
            unigram_item_scores.append({
                'item': item,
                'scores': _scores
            })

        df_discourseme_global_scores = df_discourseme_items.groupby('discourseme_id').aggregate({'f1': 'sum', 'N1': 'max', 'f2': 'sum', 'N2': 'max'})
        # df_discourseme_global_scores = df_discourseme_unigram_items.groupby('discourseme_id').aggregate({'f': 'sum', 'f1': 'max', 'f2': 'sum', 'N': 'max'})
        df_global_scores = measures.score(df_discourseme_global_scores, freq=True, per_million=True, digits=6, boundary='poisson').reset_index()

        # output
        discourseme_scores.append({'discourseme_id': discourseme_id,
                                   'global_scores': df_global_scores.melt(var_name='measure', value_name='score').to_records(index=False),
                                   'item_scores': discourseme_items_scores,
                                   'unigram_item_scores': unigram_item_scores})

    return discourseme_scores


################
# API schemata #
################

# INPUT
class ConstellationIn(Schema):

    name = String(required=False, metadata={'nullable': True})
    comment = String(required=False, metadata={'nullable': True})
    discourseme_ids = List(Integer, required=False, load_default=[])


class ConstellationDescriptionIn(Schema):

    corpus_id = Integer(required=True)
    subcorpus_id = Integer(required=False)

    semantic_map_id = Integer(required=False, load_default=None)
    s = String(required=False)
    match_strategy = String(load_default='longest', required=False, validate=OneOf(['longest', 'shortest', 'standard']))
    overlap = String(load_default='partial', required=False, validate=OneOf(['partial', 'full', 'match', 'matchend']))


class ConstellationDiscoursemeDescriptionIn(Schema):

    discourseme_description_ids = List(Integer(), required=False, load_default=[])


class ConstellationCollocationIn(CollocationIn):

    focus_discourseme_id = Integer(required=True)
    filter_discourseme_ids = List(Integer(), load_default=[], required=False)
    include_negative = Boolean(required=False, load_default=False)


class ConstellationKeywordIn(Schema):

    semantic_map_id = Integer(required=False, load_default=None)
    corpus_id_reference = Integer(required=True)
    subcorpus_id_reference = Integer(required=False, load_default=None)
    p = String(required=False, load_default='lemma')
    p_reference = String(required=False, load_default='lemma')
    sub_vs_rest = Boolean(required=False, load_default=True)
    min_freq = Integer(required=False, load_default=3)


# OUTPUT
class ConstellationOut(Schema):

    id = Integer(required=True)
    name = String(required=True, metadata={'nullable': True})
    comment = String(required=True, metadata={'nullable': True})
    discoursemes = Nested(DiscoursemeOut(many=True), required=True, dump_default=[])


class ConstellationDescriptionOut(Schema):

    id = Integer(required=True)
    # discourseme_ids = List(Integer(), required=True, dump_default=[])
    corpus_id = Integer(required=True)
    subcorpus_id = Integer(required=True, dump_default=None, metadata={'nullable': True})
    s = String(required=True)
    match_strategy = String(required=True)
    semantic_map_id = Integer(required=True, dump_default=None, metadata={'nullable': True})
    discourseme_descriptions = Nested(DiscoursemeDescriptionOut(many=True), required=True, dump_default=[])


class ConstellationCollocationOut(CollocationOut):

    focus_discourseme_id = Integer(required=True)
    filter_discourseme_ids = List(Integer(), required=True, dump_default=[])


class ConstellationCollocationItemsOut(CollocationItemsOut):

    discourseme_scores = Nested(DiscoursemeScoresOut(many=True), required=True, dump_default=[])
    discourseme_coordinates = Nested(DiscoursemeCoordinatesOut(many=True), required=True, dump_default=[])


class ConstellationKeywordItemsOut(KeywordItemsOut):

    discourseme_scores = Nested(DiscoursemeScoresOut(many=True), required=True, dump_default=[])
    discourseme_coordinates = Nested(DiscoursemeCoordinatesOut(many=True), required=True, dump_default=[])


class ConstellationAssociationsOut(Schema):

    node = Integer(required=True)
    candidate = Integer(required=True)
    measure = String(required=True)
    score = Float(required=True)


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

    discourseme_ids = json_data.get('discourseme_ids')
    discoursemes = [db.get_or_404(Discourseme, did) for did in discourseme_ids]
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
    """Patch constellation. Use for updating name, comment, or discoursemes.

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
    """Patch constellation: add discourseme(s).

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
    """Patch constellation: remove discourseme(s).

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
    semantic_map_id = json_data.get('semantic_map_id')

    s_query = json_data.get('s', corpus.s_default)
    match_strategy = json_data.get('match_strategy')
    overlap = json_data.get('overlap')

    description = ConstellationDescription(
        constellation_id=constellation.id,
        semantic_map_id=semantic_map_id,
        corpus_id=corpus.id,
        subcorpus_id=subcorpus_id,
        s=s_query,
        match_strategy=match_strategy,
        overlap=overlap
    )

    for discourseme in constellation.discoursemes:
        desc = DiscoursemeDescription.query.filter_by(discourseme_id=discourseme.id,
                                                      corpus_id=corpus_id,
                                                      subcorpus_id=subcorpus_id,
                                                      filter_sequence=None,
                                                      s=s_query,
                                                      match_strategy=match_strategy).first()
        if not desc:
            desc = discourseme_template_to_description(
                discourseme,
                [],
                corpus_id,
                subcorpus_id,
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
    """Get all descriptions of this constellation.

    """

    constellation = db.get_or_404(Constellation, id)
    descriptions = ConstellationDescription.query.filter_by(constellation_id=constellation.id).all()

    return [ConstellationDescriptionOut().dump(description) for description in descriptions]


@bp.get('/<id>/description/<description_id>/')
@bp.output(ConstellationDescriptionOut)
@bp.auth_required(auth)
def get_description(id, description_id):
    """Get constellation description.

    """

    # constellation = db.get_or_404(Constellation, id)  # TODO: needed?
    description = db.get_or_404(ConstellationDescription, description_id)

    return ConstellationDescriptionOut().dump(description)


@bp.delete('/<id>/description/<description_id>/')
@bp.auth_required(auth)
def delete_description(id, description_id):
    """Delete constellation description.

    """

    # constellation = db.get_or_404(Constellation, id)  # TODO: needed?
    description = db.get_or_404(ConstellationDescription, description_id)
    db.session.delete(description)
    db.session.commit()

    return 'Deletion successful.', 200


@bp.patch('/<id>/description/<description_id>/add-discourseme')
@bp.input(ConstellationDiscoursemeDescriptionIn)
@bp.output(ConstellationDescriptionOut(partial=True))
@bp.auth_required(auth)
def patch_description_add(id, description_id, json_data):
    """Patch constellation description: add discourseme description.

    """

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
    """Patch constellation description: remove discourseme description.

    """

    # discourseme = db.get_or_404(Discourseme, id)  # TODO: needed?
    description = db.get_or_404(ConstellationDescription, description_id)
    discourseme_description_ids = json_data.get("discourseme_description_ids")
    discourseme_descriptions = [db.get_or_404(DiscoursemeDescription, desc_id) for desc_id in discourseme_description_ids]
    for desc in discourseme_descriptions:
        description.discourseme_descriptions.remove(desc)
    db.session.commit()

    return ConstellationDescriptionOut().dump(description), 200


# CONCORDANCE
##############
@bp.get("/<id>/description/<description_id>/concordance/")
@bp.input(ConcordanceIn, location='query')
@bp.input({'focus_discourseme_id': Integer(required=True)}, location='query', arg_name='query_focus')
@bp.input({'filter_discourseme_ids': List(Integer(), load_default=[], required=False)}, location='query', arg_name='query_filter')
@bp.output(ConcordanceOut)
@bp.auth_required(auth)
def concordance_lines(id, description_id, query_data, query_focus, query_filter):
    """Get concordance lines of constellation in corpus.

    """

    # constellation = db.get_or_404(Constellation, id)  # TODO: needed?
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
    highlight_queries = {desc.discourseme.id: desc._query for desc in description.discourseme_descriptions if desc.filter_sequence is None}
    focus_query = highlight_queries[query_focus['focus_discourseme_id']]
    filter_queries = {disc_id: highlight_queries[disc_id] for disc_id in filter_discourseme_ids}
    if filter_item:
        filter_queries['_FILTER'] = get_or_create_query_item(description.corpus, filter_item, filter_item_p_att, description.s)

    concordance = ccc_concordance(focus_query,
                                  primary, secondary,
                                  window, extended_window, description.s,
                                  filter_queries=filter_queries, highlight_queries=highlight_queries,
                                  page_number=page_number, page_size=page_size,
                                  sort_by=sort_by, sort_offset=sort_offset, sort_order=sort_order, sort_by_s_att=sort_by_s_att,
                                  overlap=description.overlap)

    return ConcordanceOut().dump(concordance), 200


# COLLOCATION
##############
@bp.post("/<id>/description/<description_id>/collocation/")
@bp.input(ConstellationCollocationIn)
@bp.output(ConstellationCollocationOut)
@bp.auth_required(auth)
def create_collocation(id, description_id, json_data):
    """Create collocation analysis of constellation description.

    """

    # constellation = db.get_or_404(Constellation, id)  # TODO: needed?
    description = db.get_or_404(ConstellationDescription, description_id)

    # context options
    window = json_data.get('window')
    p = json_data.get('p')
    s = description.s

    # marginals
    marginals = json_data.get('marginals', 'global')

    # include items with E11 > O11?
    include_negative = json_data.get('include_negative', False)

    # semantic map
    semantic_map_id = json_data.get('semantic_map_id', None)
    semantic_map_id = description.semantic_map_id if not semantic_map_id else semantic_map_id

    # filtering
    filter_discourseme_ids = json_data.get('filter_discourseme_ids')
    filter_item = json_data.get('filter_item')
    filter_item_p_att = json_data.get('filter_item_p_att')

    # select and categorise queries
    highlight_queries = {desc.discourseme.id: desc._query for desc in description.discourseme_descriptions if desc.filter_sequence is None}
    focus_query = highlight_queries[json_data['focus_discourseme_id']]

    filter_queries = {disc_id: highlight_queries[disc_id] for disc_id in filter_discourseme_ids}
    if filter_item:
        filter_queries['_FILTER'] = get_or_create_query_item(description.corpus, filter_item, filter_item_p_att, description.s)
    if len(filter_queries) > 0:
        focus_query = iterative_query(focus_query, filter_queries, window, description.overlap)
        # we create a new discourseme description for the filtered focus discourseme here
        discourseme_description = DiscoursemeDescription(
            discourseme_id=json_data['focus_discourseme_id'],
            corpus_id=description.corpus_id,
            subcorpus_id=description.subcorpus_id,
            s=description.s,
            filter_sequence=focus_query.filter_sequence,
            match_strategy=description.match_strategy,
            query_id=focus_query.id
        )
        description.discourseme_descriptions.append(discourseme_description)
        db.session.add(discourseme_description)
        db.session.commit()

    # create collocation object
    collocation = Collocation(
        semantic_map_id=semantic_map_id,
        query_id=focus_query.id,
        p=p,
        s_break=s,
        window=window,
        marginals=marginals
    )
    db.session.add(collocation)
    db.session.commit()

    get_or_create_counts(collocation, remove_focus_cpos=False, include_negative=include_negative)
    set_collocation_discourseme_scores(collocation,
                                       [desc for desc in description.discourseme_descriptions if desc.filter_sequence is None],
                                       overlap=description.overlap)
    ccc_semmap_init(collocation, semantic_map_id)
    if description.semantic_map_id is None:
        description.semantic_map_id = collocation.semantic_map_id

    collocation.focus_discourseme_id = json_data['focus_discourseme_id']
    collocation.filter_discourseme_ids = json_data['filter_discourseme_ids']

    return ConstellationCollocationOut().dump(collocation), 200


@bp.get("/<id>/description/<description_id>/collocation/")
@bp.output(ConstellationCollocationOut(many=True))
@bp.auth_required(auth)
def get_all_collocation(id, description_id):
    """Get all collocation analyses of constellation description.

    """

    description = db.get_or_404(ConstellationDescription, description_id)

    collocations = list()
    for desc in description.discourseme_descriptions:
        collocations_with_this_focus = Collocation.query.filter_by(query_id=desc._query.id).all()
        for collocation in collocations_with_this_focus:
            collocation.focus_discourseme_id = desc.discourseme.id
            if desc._query.filter_sequence is not None:
                filter_discourseme_ids = [int(x) for x in desc._query.filter_sequence.lstrip("Q-").split("-")[1:]]
                collocation.filter_discourseme_ids = filter_discourseme_ids
            collocations.append(collocation)

    return [ConstellationCollocationOut().dump(collocation) for collocation in collocations], 200


@bp.get("/<id>/description/<description_id>/collocation/<collocation_id>/items")
@bp.input(CollocationItemsIn, location='query')
@bp.input({'hide_focus': Boolean(required=False, load_default=True)}, location='query', arg_name='query_hide')
@bp.output(ConstellationCollocationItemsOut)
@bp.auth_required(auth)
def get_collocation_items(id, description_id, collocation_id, query_data, query_hide):
    """Get scored items and discourseme scores of constellation collocation analysis.

    TODO also return ranks (to ease frontend pagination)?
    """

    description = db.get_or_404(ConstellationDescription, description_id)
    collocation = db.get_or_404(Collocation, collocation_id)

    hide_focus = query_hide.get("hide_focus", True)

    page_size = query_data.pop('page_size')
    page_number = query_data.pop('page_number')
    sort_order = query_data.pop('sort_order')
    sort_by = query_data.pop('sort_by')

    # discourseme scores
    set_collocation_discourseme_scores(collocation,
                                       [desc for desc in description.discourseme_descriptions if desc.filter_sequence is None],
                                       overlap=description.overlap)
    discourseme_scores = get_collocation_discourseme_scores(collocation_id, [d.id for d in description.discourseme_descriptions])
    for s in discourseme_scores:
        s['item_scores'] = [CollocationItemOut().dump(sc) for sc in s['item_scores']]
    discourseme_scores = [DiscoursemeScoresOut().dump(s) for s in discourseme_scores]

    blacklist = []
    if hide_focus:
        focus_query_id = collocation.query_id
        focus_discourseme_description = DiscoursemeDescription.query.filter_by(query_id=focus_query_id).first()
        focus_unigrams = [i for i in chain.from_iterable(
            [a.split(" ") for a in focus_discourseme_description.breakdown(collocation.p).index]
        )]
        blacklist_focus = CollocationItem.query.filter(
            CollocationItem.collocation_id == collocation.id,
            CollocationItem.item.in_(focus_unigrams)
        )
        blacklist += [b.id for b in blacklist_focus]

    scores = CollocationItemScore.query.filter(
        CollocationItemScore.collocation_id == collocation.id,
        CollocationItemScore.measure == sort_by,
        ~ CollocationItemScore.collocation_item_id.in_(blacklist)
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

    # coordinates
    coordinates = list()
    discourseme_coordinates = []
    if collocation.semantic_map:
        # make sure there's coordinates for all requested items and discourseme items
        requested_items = [item['item'] for item in items]
        for discourseme_score in discourseme_scores:
            requested_items.extend([d['item'] for d in discourseme_score['item_scores']])
        ccc_semmap_update(collocation.semantic_map, requested_items)
        coordinates = [CoordinatesOut().dump(coordinates) for coordinates in collocation.semantic_map.coordinates if coordinates.item in requested_items]

        # discourseme coordinates
        discourseme_coordinates = get_discourseme_coordinates(collocation.semantic_map, description.discourseme_descriptions, collocation.p)
        discourseme_coordinates = [DiscoursemeCoordinatesOut().dump(c) for c in discourseme_coordinates]

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
    """Automatically associate discoursemes that occur in the top collocational profile with this constellation.

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
##########
@bp.post("/<id>/description/<description_id>/keyword/")
@bp.input(ConstellationKeywordIn)
@bp.output(KeywordOut)
@bp.auth_required(auth)
def create_keyword(id, description_id, json_data):
    """Create keyword analysis for constellation description.

    """

    # description
    description = db.get_or_404(ConstellationDescription, description_id)

    # corpus
    corpus_id = description.corpus_id
    subcorpus_id = description.subcorpus_id
    p = json_data.get('p')

    # reference corpus
    corpus_id_reference = json_data.get('corpus_id_reference')
    subcorpus_id_reference = json_data.get('subcorpus_id_reference')
    p_reference = json_data.get('p_reference')

    # semantic map
    semantic_map_id = json_data.get('semantic_map_id', None)
    semantic_map_id = description.semantic_map_id if not semantic_map_id else semantic_map_id

    # settings
    sub_vs_rest = json_data.get('sub_vs_rest')
    min_freq = json_data.get('min_freq')

    keyword = Keyword(
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
    set_keyword_discourseme_scores(keyword, description.discourseme_descriptions)
    ccc_semmap_init(keyword, semantic_map_id)
    if description.semantic_map_id is None:
        description.semantic_map_id = keyword.semantic_map_id

    return KeywordOut().dump(keyword), 200


@bp.get("/<id>/description/<description_id>/keyword/")
@bp.output(KeywordOut(many=True))
@bp.auth_required(auth)
def get_all_keyword(id, description_id):
    """Get all keyword analyses featuring this constellation. (Not implemented.)

    """

    raise NotImplementedError()


@bp.get("/<id>/description/<description_id>/keyword/<keyword_id>/items")
@bp.input(KeywordItemsIn, location='query')
@bp.output(ConstellationKeywordItemsOut)
@bp.auth_required(auth)
def get_keyword_items(id, description_id, keyword_id, query_data):
    """Get scored items and discourseme scores of constellation keyword analysis.

    TODO find the bug: why are there duplicated measures?!
    TODO also return ranks (to ease frontend pagination)?
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
    set_keyword_discourseme_scores(keyword, description.discourseme_descriptions)
    discourseme_scores = get_keyword_discourseme_scores(keyword_id, [d.id for d in description.discourseme_descriptions])
    # for s in discourseme_scores:
    #     s['item_scores'] = [KeywordItemOut().dump(sc) for sc in s['item_scores']]
    discourseme_scores = [DiscoursemeScoresOut().dump(s) for s in discourseme_scores]

    # # from pprint import pprint
    # for sc in discourseme_scores:
    #     # pprint(sc['item_scores'])
    #     for s in sc['item_scores']:
    #         deduplicated_scores = list()
    #         for t in s['scores']:
    #             if t not in deduplicated_scores:
    #                 deduplicated_scores.append(t)
    #         s['scores'] = deduplicated_scores
    #         print(len(s['scores']))

    # coordinates
    coordinates = list()
    if keyword.semantic_map:
        # make sure there's coordinates for all requested items and discourseme items
        requested_items = [item['item'] for item in items]
        for discourseme_score in discourseme_scores:
            requested_items.extend([d['item'] for d in discourseme_score['item_scores']])
        ccc_semmap_update(keyword.semantic_map, requested_items)
        coordinates = [CoordinatesOut().dump(coordinates) for coordinates in keyword.semantic_map.coordinates if coordinates.item in requested_items]

        # discourseme coordinates
        discourseme_coordinates = get_discourseme_coordinates(keyword.semantic_map, description.discourseme_descriptions, keyword.p)
        discourseme_coordinates = [DiscoursemeCoordinatesOut().dump(c) for c in discourseme_coordinates]

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
    """Automatically associate discoursemes that occur in the top keyword profile with this constellation.

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
###############
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


# ASSOCIATIONS
###############
@bp.get("/<id>/description/<description_id>/associations")
@bp.output(ConstellationAssociationsOut(many=True))
@bp.auth_required(auth)
def get_constellation_associations(id, description_id):
    """Get pairwise association scores for discoursemes in constellation, based on s-attribute.

    """

    description = db.get_or_404(ConstellationDescription, description_id)

    context_ids = dict()
    for discourseme_description in description.discourseme_descriptions:
        matches_df = ccc_query(discourseme_description._query)
        context_ids[discourseme_description.discourseme.id] = set(matches_df['contextid'])

    current_app.logger.debug('get constellation associations :: calculating co-occurrences')
    N = len(description.corpus.ccc().attributes.attribute(description.s, 's'))
    records = list()
    for pair, f in pairwise_intersections(context_ids).items():
        pair = sorted(pair)
        f1 = len(context_ids[pair[0]])
        f2 = len(context_ids[pair[1]])
        records.append({'node': pair[0], 'candidate': pair[1], 'f': f, 'f1': f1, 'f2': f2, 'N': N})

    current_app.logger.debug('get constellation associations :: calculating co-occurrences')
    counts = DataFrame(records)
    counts['node'] = counts['node'].astype(int)
    counts['candidate'] = counts['candidate'].astype(int)
    counts = counts.set_index(['node', 'candidate'])
    scores = measures.score(counts, freq=True, digits=6, boundary='poisson', vocab=len(counts)).reset_index()
    scores = scores.melt(id_vars=['node', 'candidate'], var_name='measure', value_name='score')

    return scores.to_dict(orient='records'), 200
