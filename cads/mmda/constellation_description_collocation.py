#!/usr/bin/python3
# -*- coding: utf-8 -*-

from itertools import chain

from apiflask import APIBlueprint, Schema
from apiflask.fields import Boolean, Float, Integer, List, Nested, String
from association_measures import measures
from flask import current_app
from pandas import DataFrame, concat, merge, read_sql, to_numeric

from .. import db
from ..collocation import (CollocationIn, CollocationItemOut,
                           CollocationItemsIn, CollocationItemsOut,
                           CollocationOut, get_or_create_counts)
from ..database import (Collocation, CollocationItem, CollocationItemScore,
                        CotextLines, Query, get_or_create)
from ..query import (ccc_query, get_or_create_cotext, get_or_create_query_item,
                     iterative_query)
from ..semantic_map import CoordinatesOut, ccc_semmap_init, ccc_semmap_update
from ..users import auth
from .constellation_description import expand_scores_dataframe
from .constellation_description_semantic_map import get_discourseme_coordinates
from .database import (CollocationDiscoursemeItem, Constellation,
                       ConstellationDescription, Discourseme,
                       DiscoursemeDescription)
from .discourseme_description import (DiscoursemeCoordinatesOut,
                                      DiscoursemeScoresOut,
                                      discourseme_template_to_description)

bp = APIBlueprint('collocation', __name__, url_prefix='/<description_id>/collocation')


def query_discourseme_cotext(collocation, df_cotext, discourseme_description, overlap='partial'):
    """ensure that CollocationDiscoursemeItems exist for discourseme description

    TODO: if no matches in cotext, still create counts!
    """

    # only if scores don't exist
    counts_from_sql = CollocationDiscoursemeItem.query.filter_by(collocation_id=collocation.id,
                                                                 discourseme_description_id=discourseme_description.id)
    if counts_from_sql.first():
        current_app.logger.debug(f'query_discourseme_cotext :: counts for discourseme "{discourseme_description.discourseme.name}" already exist')
        return

    focus_query = collocation._query
    corpus = focus_query.corpus
    subcorpus = focus_query.subcorpus
    p_description = collocation.p

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
                discourseme_description.s,
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
    df['f'] = 0 if 'f' not in df.columns else to_numeric(df['f'].fillna(0), downcast='integer')  # empty queries
    df['f2'] = to_numeric(df['f2'].fillna(0), downcast='integer')
    df['discourseme_description_id'] = discourseme_description.id
    df['collocation_id'] = collocation.id
    df['f1'] = len(df_cotext)
    df['N'] = corpus.size()

    current_app.logger.debug('query_discourseme_cotext :: .. saving item counts and scoring')
    counts = df.reset_index()[['collocation_id', 'discourseme_description_id', 'item', 'f', 'f1', 'f2', 'N']]
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
            _raw_scores = list()
            for measure in _unigram_item_scores[item].keys():
                if measure in ['O11', 'O12', 'O21', 'O22', 'E11', 'E12', 'E21', 'E22', 'R1', 'R2', 'C1', 'C2', 'N']:
                    _raw_scores.append({'measure': measure, 'score': _unigram_item_scores[item][measure]})
                else:
                    _scores.append({'measure': measure, 'score': _unigram_item_scores[item][measure]})
                if measure in ['O11', 'E11']:  # also include in scores
                    _scores.append({'measure': measure, 'score': _unigram_item_scores[item][measure]})
            unigram_item_scores.append({
                'item': item,
                'scores': _scores,
                'raw_scores': _raw_scores
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


def get_collocation_discourseme_scores_2(collocation_id, discourseme_description_ids):
    """get discourseme scores for collocation analysis

    """

    global_scores = list()
    unigram_item_scores = list()
    item_scores = list()
    for discourseme_description_id in discourseme_description_ids:

        discourseme_description = db.get_or_404(DiscoursemeDescription, discourseme_description_id)
        discourseme_id = discourseme_description.discourseme_id
        discourseme = db.get_or_404(Discourseme, discourseme_id)

        # discourseme items
        discourseme_items = CollocationDiscoursemeItem.query.filter_by(collocation_id=collocation_id, discourseme_description_id=discourseme_description_id)
        df_discourseme_items = DataFrame([CollocationItemOut().dump(discourseme_item) for discourseme_item in discourseme_items])
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

    return {
        'item_scores': concat(item_scores),
        'unigram_item_scores': concat(unigram_item_scores),
        'global_scores': concat(global_scores)
    }


################
# API schemata #
################

# INPUT
class ConstellationCollocationIn(CollocationIn):

    focus_discourseme_id = Integer(required=True)
    filter_discourseme_ids = List(Integer(), load_default=[], required=False)
    include_negative = Boolean(required=False, load_default=False)


# OUTPUT
class ConstellationCollocationOut(CollocationOut):

    focus_discourseme_id = Integer(required=True)
    filter_discourseme_ids = List(Integer(), required=True, dump_default=[])


class ConstellationCollocationItemsOut(CollocationItemsOut):

    discourseme_scores = Nested(DiscoursemeScoresOut(many=True), required=True, dump_default=[])
    discourseme_coordinates = Nested(DiscoursemeCoordinatesOut(many=True), required=True, dump_default=[])


class ConstellationMapItemOut(Schema):

    item = String(required=True)
    discourseme_id = Integer(required=True, metadata={'nullable': True})
    source = String(required=True)
    x = Float(required=True)
    y = Float(required=True)
    score = Float(required=True)
    scaled_score = Float(required=True)


class ConstellationMapOut(Schema):

    id = Integer(required=True)
    semantic_map_id = Integer(required=True)
    sort_by = String(required=True)
    nr_items = Integer(required=True)
    page_size = Integer(required=True)
    page_number = Integer(required=True)
    page_count = Integer(required=True)
    map = Nested(ConstellationMapItemOut(many=True))


#################
# API endpoints #
#################

@bp.post("/")
@bp.input(ConstellationCollocationIn)
@bp.output(ConstellationCollocationOut)
@bp.auth_required(auth)
def create_collocation(constellation_id, description_id, json_data):
    """DEPRECATED. USE PUT INSTEAD.

    Create collocation analysis of constellation description.

    """

    current_app.logger.warning("deprecated call to POST /mmda/constellation/.../description/.../collocation/")

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

    # filter?
    if len(filter_queries) > 0:
        focus_query = iterative_query(focus_query, filter_queries, window, description.overlap)
        # we create a new discourseme description for the filtered focus discourseme here
        get_or_create(
            DiscoursemeDescription,
            discourseme_id=json_data['focus_discourseme_id'],
            corpus_id=description.corpus_id,
            subcorpus_id=description.subcorpus_id,
            s=description.s,
            filter_sequence=focus_query.filter_sequence,
            match_strategy=description.match_strategy,
            query_id=focus_query.id
        )
        # if discourseme_description not in description.discourseme_descriptions:
        #     description.discourseme_descriptions.append(discourseme_description)
        #     db.session.commit()

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


@bp.put("/")
@bp.input(ConstellationCollocationIn)
@bp.output(ConstellationCollocationOut)
@bp.auth_required(auth)
def get_or_create_collocation(constellation_id, description_id, json_data):
    """Get collocation analysis of constellation description; create if necessary.

    """

    # constellation = db.get_or_404(Constellation, id)  # TODO: needed?
    description = db.get_or_404(ConstellationDescription, description_id)

    # context options
    window = json_data.get('window')
    p = json_data.get('p')
    s = description.s

    # marginals
    marginals = json_data.get('marginals', 'local')

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

    # filter?
    if len(filter_queries) > 0:
        current_app.logger.debug("second-order collocation mode")
        focus_query = iterative_query(focus_query, filter_queries, window, description.overlap)
        get_or_create(
            DiscoursemeDescription,
            discourseme_id=json_data['focus_discourseme_id'],
            corpus_id=description.corpus_id,
            subcorpus_id=description.subcorpus_id,
            s=description.s,
            filter_sequence=focus_query.filter_sequence,
            match_strategy=description.match_strategy,
            query_id=focus_query.id
        )
        # if discourseme_description not in description.discourseme_descriptions:
        #     description.discourseme_descriptions.append(discourseme_description)
        #     db.session.commit()

    if semantic_map_id is None:
        collocation = Collocation.query.filter_by(
            query_id=focus_query.id,
            p=p,
            s_break=s,
            window=window,
            marginals=marginals
        ).order_by(Collocation.id.desc()).first()
    else:
        collocation = Collocation.query.filter_by(
            semantic_map_id=semantic_map_id,
            query_id=focus_query.id,
            p=p,
            s_break=s,
            window=window,
            marginals=marginals
        ).order_by(Collocation.id.desc()).first()

    if not collocation:
        current_app.logger.debug("collocation object does not exist, creating new one")
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

    else:
        current_app.logger.debug("collocation object already exists")

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


@bp.get("/")
@bp.output(ConstellationCollocationOut(many=True))
@bp.auth_required(auth)
def get_all_collocation(constellation_id, description_id):
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


@bp.get("/<collocation_id>/items")
@bp.input(CollocationItemsIn, location='query')
@bp.input({'hide_focus': Boolean(required=False, load_default=True),
           'hide_filter': Boolean(required=False, load_default=True)}, location='query', arg_name='query_hide')
@bp.output(ConstellationCollocationItemsOut)
@bp.auth_required(auth)
def get_collocation_items(constellation_id, description_id, collocation_id, query_data, query_hide):
    """Get scored items and discourseme scores of constellation collocation analysis.

    TODO also return ranks (to ease frontend pagination)?
    """

    description = db.get_or_404(ConstellationDescription, description_id)
    collocation = db.get_or_404(Collocation, collocation_id)

    hide_focus = query_hide.get("hide_focus", True)
    hide_filter = query_hide.get("hide_filter", True)

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

    focus_query_id = collocation.query_id
    blacklist = []
    if hide_focus:
        focus_discourseme_description = DiscoursemeDescription.query.filter_by(query_id=focus_query_id).first()
        focus_unigrams = [i for i in chain.from_iterable(
            [a.split(" ") for a in focus_discourseme_description.breakdown(collocation.p).index]
        )]
        blacklist_focus = CollocationItem.query.filter(
            CollocationItem.collocation_id == collocation.id,
            CollocationItem.item.in_(focus_unigrams)
        )
        blacklist += [b.id for b in blacklist_focus]

    focus_query = db.get_or_404(Query, focus_query_id)
    if hide_filter and focus_query.filter_sequence is not None:
        filter_query_ids = [int(x) for x in focus_query.filter_sequence.lstrip("Q-").split("-")[1:]]
        filter_descriptions = [d for d in description.discourseme_descriptions if d.query_id in filter_query_ids]
        for desc in filter_descriptions:
            desc_unigrams = [i for i in chain.from_iterable(
                [a.split(" ") for a in desc.breakdown(collocation.p).index]
            )]
            blacklist_desc = CollocationItem.query.filter(
                CollocationItem.collocation_id == collocation.id,
                CollocationItem.item.in_(desc_unigrams)
            )
            blacklist += [b.id for b in blacklist_desc]

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


@bp.get("/<collocation_id>/map")
@bp.input(CollocationItemsIn, location='query')
@bp.output(ConstellationMapOut)
@bp.auth_required(auth)
def get_collocation_map(constellation_id, description_id, collocation_id, query_data):
    """Get scored items and discourseme scores of constellation collocation analysis.

    TODO also return ranks (to ease frontend pagination)?
    """

    description = db.get_or_404(ConstellationDescription, description_id)
    collocation = db.get_or_404(Collocation, collocation_id)

    page_size = query_data.pop('page_size')
    page_number = query_data.pop('page_number')
    sort_order = query_data.pop('sort_order')
    sort_by = query_data.pop('sort_by')

    # discourseme scores (set here to use for creating blacklist if necessary)
    set_collocation_discourseme_scores(collocation, description.discourseme_descriptions, overlap=description.overlap)

    # filter out all items that are included in any discourseme unigram breakdown
    blacklist = []
    for desc in description.discourseme_descriptions:
        if desc.breakdown(collocation.p) is not None:
            desc_unigrams = [i for i in chain.from_iterable(
                [a.split(" ") for a in desc.breakdown(collocation.p).index]
            )]
            blacklist_desc = CollocationItem.query.filter(
                CollocationItem.collocation_id == collocation.id,
                CollocationItem.item.in_(desc_unigrams)
            )
            blacklist += [b.id for b in blacklist_desc]

    # retrieve scores (without blacklist)
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

    # pagination
    scores = scores.paginate(page=page_number, per_page=page_size)
    nr_items = scores.total
    page_count = scores.pages

    # format
    df_scores = DataFrame([vars(s) for s in scores], columns=['collocation_item_id'])
    df_scores = DataFrame([CollocationItemOut().dump(db.get_or_404(CollocationItem, id)) for id in df_scores['collocation_item_id']])
    df_scores = expand_scores_dataframe(df_scores)
    df_scores['discourseme_id'] = None
    df_scores['source'] = 'items'

    # combine
    discourseme_scores = get_collocation_discourseme_scores_2(
        collocation_id,
        [desc.id for desc in description.discourseme_descriptions]
    )
    df_discourseme_item_scores = discourseme_scores['item_scores']
    df_discourseme_unigram_item_scores = discourseme_scores['unigram_item_scores']
    df_discourseme_global_scores = discourseme_scores['global_scores']

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
    if collocation.semantic_map:

        # make sure there's coordinates for all requested items
        requested_items = list(df_scores['item'].values)
        requested_items += list(df_discourseme_item_scores['item'].values)
        requested_items += list(df_discourseme_unigram_item_scores['item'])
        ccc_semmap_update(collocation.semantic_map, list(set(requested_items)))
        coordinates = DataFrame(
            [CoordinatesOut().dump(coordinates) for coordinates in collocation.semantic_map.coordinates if coordinates.item in requested_items]
        )
        df_scores = merge(df_scores, coordinates, on='item', how='left')
        df_discourseme_item_scores = merge(df_discourseme_item_scores, coordinates, on='item', how='left')
        df_discourseme_unigram_item_scores = merge(df_discourseme_unigram_item_scores, coordinates, on='item', how='left')

        # discourseme coordinates
        discourseme_coordinates = get_discourseme_coordinates(collocation.semantic_map, description.discourseme_descriptions, collocation.p)
        discourseme_coordinates = DataFrame([DiscoursemeCoordinatesOut().dump(c) for c in discourseme_coordinates])
        df_discourseme_global_scores = merge(df_discourseme_global_scores, discourseme_coordinates, on='discourseme_id', how='left')

    df = concat([df_scores, df_discourseme_item_scores, df_discourseme_unigram_item_scores, df_discourseme_global_scores])
    df['x_user'] = df['x_user'].fillna(df['x'])
    df['y_user'] = df['y_user'].fillna(df['y'])
    df = df.rename({sort_by: 'score', f'{sort_by}_scaled': 'scaled_score'}, axis=1)
    df = df[['item', 'discourseme_id', 'source', 'x_user', 'y_user', 'score', 'scaled_score']]
    df = df.rename({'x_user': 'x', 'y_user': 'y'}, axis=1)

    collocation_map = {
        'id': collocation.id,
        'semantic_map_id': collocation.semantic_map_id,
        'sort_by': sort_by,
        'nr_items': nr_items,
        'page_size': page_size,
        'page_number': page_number,
        'page_count': page_count,
        'map': [ConstellationMapItemOut().dump(d) for d in df.to_dict(orient='records')]
    }

    return ConstellationMapOut().dump(collocation_map), 200


@bp.put('/<collocation_id>/auto-associate')
@bp.auth_required(auth)
@bp.output(ConstellationCollocationOut)
def associate_discoursemes(constellation_id, description_id, collocation_id):
    """Automatically associate discoursemes that occur in the top collocational profile with this constellation.

    """

    constellation = db.get_or_404(Constellation, constellation_id)
    description = db.get_or_404(ConstellationDescription, description_id)
    collocation = db.get_or_404(Collocation, collocation_id)
    collocation_items = collocation.top_items()

    discoursemes = Discourseme.query.all()
    for discourseme in discoursemes:
        current_app.logger.debug(f'associate_discoursemes :: discourseme "{discourseme.name}"?')
        # TODO first query all discoursemes in corpus?
        # here: just look at unigrams of item.surface in discourseme template
        # TODO at least check if item.p is the same
        discourseme_items = [item.surface for item in discourseme.template]
        discourseme_items = [unigram for item in discourseme_items for unigram in item.split(" ")]
        if len(set(discourseme_items).intersection(collocation_items)) > 0:
            current_app.logger.debug(f'associate_discoursemes :: put discourseme "{discourseme.name}"')
            if discourseme not in constellation.discoursemes:
                current_app.logger.debug(f'associate_discoursemes :: post discourseme "{discourseme.name}"')
                constellation.discoursemes.append(discourseme)
                discourseme_description = discourseme_template_to_description(
                    discourseme, [], description.corpus_id, description.subcorpus_id, description.s, description.match_strategy
                )
                description.discourseme_descriptions.append(discourseme_description)
            else:
                current_app.logger.debug(f'associate_discoursemes :: discourseme "{discourseme.name}" already associated')

    db.session.commit()

    return ConstellationCollocationOut().dump(collocation), 200
