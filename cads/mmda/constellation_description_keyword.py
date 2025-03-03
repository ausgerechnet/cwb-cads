#!/usr/bin/python3
# -*- coding: utf-8 -*-

from itertools import chain

from apiflask import APIBlueprint, Schema
from apiflask.fields import Boolean, Integer, Nested, String
from association_measures import measures
from flask import current_app
from pandas import DataFrame, concat, merge, to_numeric

from .. import db
from ..database import Keyword, KeywordItem, KeywordItemScore
from ..keyword import (KeywordItemOut, KeywordItemsIn, KeywordItemsOut,
                       KeywordOut, ccc_keywords)
from ..query import ccc_query
from ..semantic_map import CoordinatesOut, ccc_semmap_init, ccc_semmap_update
from ..users import auth
from .constellation_description import expand_scores_dataframe
from .constellation_description_collocation import (ConstellationMapItemOut,
                                                    ConstellationMapOut)
from .constellation_description_semantic_map import get_discourseme_coordinates
from .database import (Constellation, ConstellationDescription, Discourseme,
                       DiscoursemeDescription, KeywordDiscoursemeItem)
from .discourseme_description import (DiscoursemeCoordinatesOut,
                                      DiscoursemeScoresOut,
                                      discourseme_template_to_description)

bp = APIBlueprint('keyword', __name__, url_prefix='/<description_id>/keyword')


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
    discourseme_counts = target_breakdown.join(reference_breakdown)
    discourseme_counts['f2'] = to_numeric(discourseme_counts['f2'].fillna(0), downcast='integer')
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


def set_keyword_discourseme_scores(keyword, discourseme_descriptions):
    """ensure that KeywordDiscoursemeItems exist for each discourseme description

    """

    current_app.logger.debug('set_keyword_discourseme_scores :: looping through descriptions')
    for discourseme_description in discourseme_descriptions:
        query_discourseme_corpora(keyword, discourseme_description)


def get_keyword_discourseme_scores(keyword_id, discourseme_description_ids):
    """get discourseme scores for keyword analysis

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


def get_keyword_discourseme_scores_2(keyword_id, discourseme_description_ids):
    """get discourseme scores for keyword analysis

    """

    global_scores = list()
    unigram_item_scores = list()
    item_scores = list()
    for discourseme_description_id in discourseme_description_ids:

        discourseme_description = db.get_or_404(DiscoursemeDescription, discourseme_description_id)
        discourseme_id = discourseme_description.discourseme_id
        discourseme = db.get_or_404(Discourseme, discourseme_id)

        # discourseme items
        discourseme_items = KeywordDiscoursemeItem.query.filter_by(keyword_id=keyword_id, discourseme_description_id=discourseme_description_id)
        df_discourseme_items = DataFrame([KeywordItemOut().dump(discourseme_item) for discourseme_item in discourseme_items])
        if len(df_discourseme_items) == 0:
            continue
        df_discourseme_items = expand_scores_dataframe(df_discourseme_items)
        df_discourseme_items['discourseme_id'] = discourseme_id
        df_discourseme_items['source'] = 'discourseme_items'
        item_scores.append(df_discourseme_items)

        # discourseme unigram items
        df_discourseme_unigram_items = df_discourseme_items.copy()
        df_discourseme_unigram_items = df_discourseme_unigram_items.rename({'O11': 'f', 'R1': 'f1', 'C1': 'f2', 'N': 'N'}, axis=1)
        df_discourseme_unigram_items['item'] = df_discourseme_unigram_items['item'].str.split()
        df_discourseme_unigram_items = df_discourseme_unigram_items.explode('item')
        df_discourseme_unigram_items = df_discourseme_unigram_items.groupby('item').aggregate({'f': 'sum', 'f1': 'max', 'f2': 'sum', 'N': 'max'})
        df_unigram_item_scores = measures.score(df_discourseme_unigram_items, freq=True, per_million=True, digits=6, boundary='poisson').reset_index()
        df_unigram_item_scores['discourseme_id'] = discourseme_id
        df_unigram_item_scores['source'] = 'discourseme_unigram_items'
        unigram_item_scores.append(df_unigram_item_scores)

        # global discourseme scores
        df_discourseme_global_scores = df_discourseme_items.rename({'O11': 'f', 'R1': 'f1', 'C1': 'f2', 'N': 'N'}, axis=1)
        df_discourseme_global_scores = df_discourseme_global_scores.groupby('discourseme_id').aggregate({'f': 'sum', 'f1': 'max', 'f2': 'sum', 'N': 'max'})
        df_global_scores = measures.score(df_discourseme_global_scores, freq=True, per_million=True, digits=6, boundary='poisson').reset_index()
        df_global_scores['item'] = discourseme.name
        df_global_scores['source'] = 'discoursemes'
        global_scores.append(df_global_scores)

    if len(item_scores) == 0:
        return {
            'item_scores': DataFrame(),
            'unigram_item_scores': DataFrame(),
            'global_scores': DataFrame()
        }

    return {
        'item_scores': concat(item_scores),
        'unigram_item_scores': concat(unigram_item_scores),
        'global_scores': concat(global_scores)
    }


################
# API schemata #
################

# INPUT
class ConstellationKeywordIn(Schema):

    semantic_map_id = Integer(required=False, load_default=None)
    corpus_id_reference = Integer(required=True)
    subcorpus_id_reference = Integer(required=False, load_default=None)
    p = String(required=False, load_default='lemma')
    p_reference = String(required=False, load_default='lemma')
    sub_vs_rest = Boolean(required=False, load_default=True)
    min_freq = Integer(required=False, load_default=3)


# OUTPUT
class ConstellationKeywordItemsOut(KeywordItemsOut):

    discourseme_scores = Nested(DiscoursemeScoresOut(many=True), required=True, dump_default=[])
    discourseme_coordinates = Nested(DiscoursemeCoordinatesOut(many=True), required=True, dump_default=[])


#################
# API endpoints #
#################

@bp.post("/")
@bp.input(ConstellationKeywordIn)
@bp.output(KeywordOut)
@bp.auth_required(auth)
def create_keyword(constellation_id, description_id, json_data):
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


@bp.get("/")
@bp.output(KeywordOut(many=True))
@bp.auth_required(auth)
def get_all_keyword(constellation_id, description_id):
    """Get all keyword analyses featuring this constellation. (Not implemented.)

    """

    raise NotImplementedError()


@bp.get("/<keyword_id>/items")
@bp.input(KeywordItemsIn, location='query')
@bp.output(ConstellationKeywordItemsOut)
@bp.auth_required(auth)
def get_keyword_items(constellation_id, description_id, keyword_id, query_data):
    """Get scored items and discourseme scores of constellation keyword analysis.

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
    discourseme_scores = [DiscoursemeScoresOut().dump(s) for s in discourseme_scores]

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


@bp.get("/<keyword_id>/map")
@bp.input(KeywordItemsIn, location='query')
@bp.output(ConstellationMapOut)
@bp.auth_required(auth)
def get_keyword_map(constellation_id, description_id, keyword_id, query_data):
    """Get scored items and discourseme scores of constellation keyword analysis.

    TODO also return ranks (to ease frontend pagination)?
    """

    description = db.get_or_404(ConstellationDescription, description_id)
    keyword = db.get_or_404(Keyword, keyword_id)

    page_size = query_data.pop('page_size')
    page_number = query_data.pop('page_number')
    sort_order = query_data.pop('sort_order')
    sort_by = query_data.pop('sort_by')

    # discourseme scores (set here to use for creating blacklist if necessary)
    set_keyword_discourseme_scores(keyword, description.discourseme_descriptions)

    # filter out all items that are included in any discourseme unigram breakdown
    blacklist = []
    for desc in description.discourseme_descriptions:
        if desc.breakdown(keyword.p) is not None:
            desc_unigrams = [i for i in chain.from_iterable(
                [a.split(" ") for a in desc.breakdown(keyword.p).index]
            )]
            blacklist_desc = KeywordItem.query.filter(
                KeywordItem.keyword_id == keyword.id,
                KeywordItem.item.in_(desc_unigrams)
            )
            blacklist += [b.id for b in blacklist_desc]

    # retrieve scores (without blacklist)
    scores = KeywordItemScore.query.filter(
        KeywordItemScore.keyword_id == keyword.id,
        KeywordItemScore.measure == sort_by,
        ~ KeywordItemScore.keyword_item_id.in_(blacklist)
    )

    # order
    if sort_order == 'ascending':
        scores = scores.order_by(KeywordItemScore.score)
    elif sort_order == 'descending':
        scores = scores.order_by(KeywordItemScore.score.desc())

    # pagination
    scores = scores.paginate(page=page_number, per_page=page_size)
    nr_items = scores.total
    page_count = scores.pages

    # format
    df_scores = DataFrame([vars(s) for s in scores], columns=['keyword_item_id'])
    df_scores = DataFrame([KeywordItemOut().dump(db.get_or_404(KeywordItem, id)) for id in df_scores['keyword_item_id']])
    df_scores = expand_scores_dataframe(df_scores)
    df_scores['discourseme_id'] = None
    df_scores['source'] = 'items'

    # combine
    discourseme_scores = get_keyword_discourseme_scores_2(
        keyword_id,
        [desc.id for desc in description.discourseme_descriptions]
    )
    df_discourseme_item_scores = discourseme_scores['item_scores']
    df_discourseme_unigram_item_scores = discourseme_scores['unigram_item_scores']
    df_discourseme_global_scores = discourseme_scores['global_scores']

    if len(df_discourseme_item_scores) == 0:
        # empty result
        _map = []
    else:
        # scale
        max_disc_score = max([
            df_discourseme_item_scores[sort_by].max(),
            df_discourseme_unigram_item_scores[sort_by].max(),
            df_discourseme_global_scores[sort_by].max(),
        ])
        df_discourseme_item_scores[f'{sort_by}_scaled'] = df_discourseme_item_scores[sort_by] / max_disc_score
        df_discourseme_unigram_item_scores[f'{sort_by}_scaled'] = df_discourseme_unigram_item_scores[sort_by] / max_disc_score
        df_discourseme_global_scores[f'{sort_by}_scaled'] = df_discourseme_global_scores[sort_by] / max_disc_score

        # coordinates
        if keyword.semantic_map:

            # make sure there's coordinates for all requested items
            requested_items = list(df_scores['item'].values)
            requested_items += list(df_discourseme_item_scores['item'].values)
            requested_items += list(df_discourseme_unigram_item_scores['item'])
            ccc_semmap_update(keyword.semantic_map, list(set(requested_items)))
            coordinates = DataFrame(
                [CoordinatesOut().dump(coordinates) for coordinates in keyword.semantic_map.coordinates if coordinates.item in requested_items]
            )
            df_scores = merge(df_scores, coordinates, on='item', how='left')
            df_discourseme_item_scores = merge(df_discourseme_item_scores, coordinates, on='item', how='left')
            df_discourseme_unigram_item_scores = merge(df_discourseme_unigram_item_scores, coordinates, on='item', how='left')

            # discourseme coordinates
            discourseme_coordinates = get_discourseme_coordinates(keyword.semantic_map, description.discourseme_descriptions, keyword.p)
            discourseme_coordinates = DataFrame([DiscoursemeCoordinatesOut().dump(c) for c in discourseme_coordinates])
            df_discourseme_global_scores = merge(df_discourseme_global_scores, discourseme_coordinates, on='discourseme_id', how='left')

        df = concat([df_scores, df_discourseme_item_scores, df_discourseme_unigram_item_scores, df_discourseme_global_scores])
        df['x_user'] = df['x_user'].fillna(df['x'])
        df['y_user'] = df['y_user'].fillna(df['y'])
        df = df.rename({sort_by: 'score', f'{sort_by}_scaled': 'scaled_score'}, axis=1)
        df = df[['item', 'discourseme_id', 'source', 'x_user', 'y_user', 'score', 'scaled_score']]
        df = df.rename({'x_user': 'x', 'y_user': 'y'}, axis=1)

        _map = [ConstellationMapItemOut().dump(d) for d in df.to_dict(orient='records')]

    keyword_map = {
        'id': keyword.id,
        'sort_by': sort_by,
        'nr_items': nr_items,
        'page_size': page_size,
        'page_number': page_number,
        'page_count': page_count,
        'map': _map
    }

    return ConstellationMapOut().dump(keyword_map), 200


@bp.put('/<keyword_id>/auto-associate')
@bp.auth_required(auth)
def associate_discoursemes_keyword(constellation_id, description_id, keyword_id):
    """Automatically associate discoursemes that occur in the top keyword profile with this constellation.

    """

    constellation = db.get_or_404(Constellation, constellation_id)
    keyword = db.get_or_404(Keyword, keyword_id)
    keyword_items = keyword.top_items()
    discoursemes = Discourseme.query.all()

    for discourseme in discoursemes:
        discourseme_items = [item.surface for item in discourseme.template]
        if len(set(discourseme_items).intersection(keyword_items)) > 0:
            if discourseme not in constellation.discoursemes:
                constellation.discoursemes.append(discourseme)
    db.session.commit()

    return {"id": int(id)}, 200
