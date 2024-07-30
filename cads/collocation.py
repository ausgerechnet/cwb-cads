#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Float, Integer, List, Nested, String
from apiflask.validators import OneOf
from association_measures import measures
from flask import current_app
from pandas import DataFrame, read_sql

from . import db
from .database import (Collocation, CollocationItem,
                       CollocationItemScore, CotextLines, SemanticMap)

from .mmda.database import CollocationDiscoursemeItem, CollocationDiscoursemeUnigramItem, Discourseme
from .semantic_map import (CoordinatesOut, SemanticMapOut, ccc_semmap,
                           ccc_semmap_update)
from .users import auth
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


def get_or_create_counts(collocation, remove_filter_cpos=True):
    """makes sure that CollocationItems exist for collocation analysis = query + context

    """

    from .query import get_or_create_cotext

    current_app.logger.debug("get_or_create_counts :: getting counts")
    old = CollocationItem.query.filter_by(collocation_id=collocation.id)
    if old.first():
        current_app.logger.debug("get_or_create_counts :: counts already exist")
        return
        # TODO remove existing counts when forcing rerun
        # current_app.logger.debug("deleting old ones")
        # CollocationItems.query.filter_by(collocation_id=collocation.id).delete()
        # current_app.logger.debug("deleted")
        # db.session.commit()

    # get relevant objects
    filter_query = collocation._query
    window = collocation.window
    s_break = collocation.s_break

    # corpus / subcorpus
    if collocation._query.subcorpus and collocation.marginals == 'local':
        corpus = collocation._query.subcorpus.ccc()
    else:
        corpus = collocation._query.corpus.ccc()

    ###################
    # (1) GET CONTEXT #
    ###################
    current_app.logger.debug(f'get_or_create_counts :: getting context of query {filter_query.id}')
    cotext = get_or_create_cotext(filter_query, window, s_break, return_df=True)
    cotext_lines = CotextLines.query.filter(CotextLines.cotext_id == cotext.id,
                                            CotextLines.offset <= window,
                                            CotextLines.offset >= -window)
    df_cooc = read_sql(cotext_lines.statement, con=db.engine, index_col='id').reset_index(drop=True)
    if remove_filter_cpos:
        discourseme_cpos = set(df_cooc.loc[df_cooc['offset'] == 0]['cpos'])  # filter can only match in context
    df_cooc = df_cooc.drop_duplicates(subset='cpos')

    ###################
    # (2) COUNT ITEMS #
    ###################
    current_app.logger.debug(f'get_or_create_counts :: counting items in context for window {window}')
    if remove_filter_cpos:
        current_app.logger.debug('get_or_create_counts :: removing filter cpos')
        df_cooc = df_cooc.loc[~df_cooc['cpos'].isin(discourseme_cpos)]

    # create context counts of items for window
    f = corpus.counts.cpos(df_cooc['cpos'], [collocation.p])[['freq']].rename(columns={'freq': 'f'})

    # add marginals
    f2 = corpus.marginals(f.index, [collocation.p])[['freq']].rename(columns={'freq': 'f2'})
    counts = f.join(f2).fillna(0, downcast='infer')
    counts['f1'] = len(df_cooc)
    counts['N'] = corpus.size()

    ###################
    # (3) SAVE COUNTS #
    ###################
    current_app.logger.debug(f'get_or_create_counts :: saving {len(counts)} items to database')
    counts['collocation_id'] = collocation.id
    counts.reset_index().to_sql('collocation_item', con=db.engine, if_exists='append', index=False)
    db.session.commit()

    ###################
    # (4) SAVE SCORES #
    ###################
    current_app.logger.debug('get_or_create_counts :: adding scores')
    counts = DataFrame([vars(s) for s in collocation.items], columns=['id', 'f', 'f1', 'f2', 'N']).set_index('id')
    scores = measures.score(counts, freq=True, per_million=True, digits=6, boundary='poisson', vocab=len(counts)).reset_index()
    scores = scores.melt(id_vars=['id'], var_name='measure', value_name='score').rename({'id': 'collocation_item_id'}, axis=1)
    scores['collocation_id'] = collocation.id
    scores.to_sql('collocation_item_score', con=db.engine, if_exists='append', index=False)
    db.session.commit()

    return scores


def query_discourseme_cotext(collocation, df_cotext, discourseme, discourseme_matchend_in_context=True):
    """get CollocationDiscoursemeItems and CollocationDiscoursemeUnigramItems

    """
    from .query import ccc_query, get_or_create_query_discourseme

    unigram_counts_from_sql = CollocationDiscoursemeUnigramItem.query.filter_by(collocation_id=collocation.id, discourseme_id=discourseme.id)
    if unigram_counts_from_sql.first():
        current_app.logger.debug(f'query_discourseme_cotext :: cotext unigram counts for discourseme "{discourseme.name}" already exist')
        # TODO also check for item counts?
        return

    filter_query = collocation._query
    corpus = filter_query.corpus
    match_strategy = filter_query.match_strategy
    s_query = filter_query.s
    p = collocation.p

    # get matches of discourseme in whole corpus and in subcorpus of cotext
    current_app.logger.debug(f'query_discourseme_cotext :: .. getting matches of discourseme "{discourseme.name}" in whole corpus')
    if collocation._query.subcorpus and collocation.marginals == 'local':
        tmp_subcorpus = collocation._query.subcorpus
    else:
        tmp_subcorpus = None
    corpus_query = get_or_create_query_discourseme(corpus, discourseme, subcorpus=tmp_subcorpus, s=s_query, match_strategy=match_strategy)
    corpus_matches_df = ccc_query(corpus_query).reset_index()
    corpus_matches_df['in_context'] = corpus_matches_df['match'].isin(df_cotext['cpos'])
    if discourseme_matchend_in_context:
        corpus_matches_df['in_context'] = corpus_matches_df['in_context'] & corpus_matches_df['matchend'].isin(df_cotext['cpos'])

    current_app.logger.debug(f'query_discourseme_cotext :: .. getting matches of discourseme "{discourseme.name}" in context')
    subcorpus_matches_df = corpus_matches_df.loc[corpus_matches_df['in_context']]
    if len(subcorpus_matches_df) == 0:
        current_app.logger.debug(f'query_discourseme_cotext :: no matches in context for discourseme "{discourseme.name}"')
        # TODO return corpus_matches_cpos
        return

    # corpus / subcorpus
    if collocation._query.subcorpus and collocation.marginals == 'local':
        corpus = collocation._query.subcorpus.ccc()
    else:
        corpus = collocation._query.corpus.ccc()

    current_app.logger.debug('query_discourseme_cotext :: .. creating breakdowns in whole corpus')
    corpus_matches_df = corpus_matches_df[['match', 'matchend']].set_index(['match', 'matchend'])
    corpus_matches = corpus.subcorpus(df_dump=corpus_matches_df, overwrite=False)
    corpus_matches_breakdown = corpus_matches.breakdown(p_atts=[p]).rename({'freq': 'f2'}, axis=1)
    corpus_matches_unigram_breakdown = corpus_matches.breakdown(p_atts=[p], split=True).rename({'freq': 'f2'}, axis=1)

    current_app.logger.debug('query_discourseme_cotext :: .. creating breakdowns in context')
    subcorpus_matches_df = subcorpus_matches_df[['match', 'matchend']].set_index(['match', 'matchend'])
    subcorpus_matches = corpus.subcorpus(df_dump=subcorpus_matches_df, overwrite=False)
    subcorpus_matches_breakdown = subcorpus_matches.breakdown(p_atts=[p]).rename({'freq': 'f'}, axis=1)
    # TODO just split the items of the full_breakdown and combine
    subcorpus_matches_unigram_breakdown = subcorpus_matches.breakdown(p_atts=[p], split=True).rename({'freq': 'f'}, axis=1)

    # create and save unigram counts
    current_app.logger.debug('query_discourseme_cotext :: .. combining subcorpus and corpus unigram counts')
    df = corpus_matches_unigram_breakdown.join(subcorpus_matches_unigram_breakdown)
    df['f'] = 0 if 'f' not in df.columns else df['f']  # empty queries
    df['discourseme_id'] = discourseme.id
    df['collocation_id'] = collocation.id
    df['f1'] = len(df_cotext)
    df['N'] = corpus.size()

    current_app.logger.debug('query_discourseme_cotext :: .. saving unigram counts and scoring')
    counts = df.reset_index().fillna(0, downcast='infer')[['collocation_id', 'discourseme_id', 'item', 'f', 'f1', 'f2', 'N']]
    counts.to_sql('collocation_discourseme_unigram_item', con=db.engine, if_exists='append', index=False)
    counts_from_sql = CollocationDiscoursemeUnigramItem.query.filter_by(collocation_id=collocation.id, discourseme_id=discourseme.id)
    counts = DataFrame([vars(s) for s in counts_from_sql], columns=['id', 'f', 'f1', 'f2', 'N']).set_index('id')
    vocab_size = len(counts)
    discourseme_unigram_item_scores = measures.score(counts, freq=True, per_million=True, digits=6, boundary='poisson', vocab=vocab_size).reset_index()
    discourseme_unigram_item_scores = discourseme_unigram_item_scores.melt(
        id_vars=['id'], var_name='measure', value_name='score'
    ).rename({'id': 'collocation_item_id'}, axis=1)
    discourseme_unigram_item_scores['collocation_id'] = collocation.id
    discourseme_unigram_item_scores.to_sql('collocation_discourseme_unigram_item_score', con=db.engine, if_exists='append', index=False)

    # create and save item counts
    current_app.logger.debug('query_discourseme_cotext :: .. combining subcorpus and corpus item counts')
    df = corpus_matches_breakdown.join(subcorpus_matches_breakdown)
    df['f'] = 0 if 'f' not in df.columns else df['f']  # empty queries
    df['discourseme_id'] = discourseme.id
    df['collocation_id'] = collocation.id
    df['f1'] = len(df_cotext)
    df['N'] = corpus.size()

    current_app.logger.debug('query_discourseme_cotext :: .. saving item counts and scoring')
    counts = df.reset_index().fillna(0, downcast='infer')[['collocation_id', 'discourseme_id', 'item', 'f', 'f1', 'f2', 'N']]
    counts.to_sql('collocation_discourseme_item', con=db.engine, if_exists='append', index=False)
    counts_from_sql = CollocationDiscoursemeItem.query.filter_by(collocation_id=collocation.id, discourseme_id=discourseme.id)
    counts = DataFrame([vars(s) for s in counts_from_sql], columns=['id', 'f', 'f1', 'f2', 'N']).set_index('id')
    discourseme_item_scores = measures.score(counts, freq=True, per_million=True, digits=6, boundary='poisson', vocab=vocab_size).reset_index()
    discourseme_item_scores = discourseme_item_scores.melt(
        id_vars=['id'], var_name='measure', value_name='score'
    ).rename({'id': 'collocation_item_id'}, axis=1)
    discourseme_item_scores['collocation_id'] = collocation.id
    discourseme_item_scores.to_sql('collocation_discourseme_item_score', con=db.engine, if_exists='append', index=False)

    # TODO return corpus_matches_cpos
    return


def ccc_discourseme_counts(collocation, discoursemes):
    """get CollocationDiscoursemeUnigramCounts

    for each discourseme (including filter):
    - get cpos consumed within and outside context
    - get frequency breakdown within and outside context
    """

    from .query import get_or_create_cotext

    filter_query = collocation._query
    window = collocation.window
    s_break = collocation.s_break

    current_app.logger.debug(f'get_discourseme_counts :: getting context of query {filter_query.id}')
    cotext = get_or_create_cotext(filter_query, window, s_break, return_df=True)
    cotext_lines = CotextLines.query.filter(CotextLines.cotext_id == cotext.id,
                                            CotextLines.offset <= window,
                                            CotextLines.offset >= -window)
    df_cotext = read_sql(cotext_lines.statement, con=db.engine, index_col='id').reset_index(drop=True).drop_duplicates(subset='cpos')

    current_app.logger.debug('get_discourseme_counts :: getting discourseme counts')
    discourseme_cpos = set()
    for discourseme in discoursemes:
        discourseme_matches = query_discourseme_cotext(collocation, df_cotext, discourseme)
        if isinstance(discourseme_matches, set):
            discourseme_cpos.update(discourseme_matches.matches())

    # discoursemes_unigram_counts
    if len(discourseme_cpos) > 0:

        corpus = filter_query.corpus.ccc()

        discoursemes_unigram_counts = corpus.counts.cpos(discourseme_cpos, [collocation.p])[['freq']].rename(columns={'freq': 'f'})
        m = corpus.marginals(discoursemes_unigram_counts.index, [collocation.p])[['freq']].rename(columns={'freq': 'f2'})
        discoursemes_unigram_counts = discoursemes_unigram_counts.join(m)
        current_app.logger.debug('get_discourseme_counts :: ... done')

        return discoursemes_unigram_counts


def ccc_collocates(collocation):
    """create collocation object as dict

    - item_scores
    - discourseme_scores if collocation belongs to constellation
    """

    # make sure context counts and scores exist
    if collocation.constellation:

        current_app.logger.debug('ccc_collocates :: constellation mode')
        get_or_create_counts(collocation, remove_filter_cpos=False)

        current_app.logger.debug('ccc_collocates :: .. making sure discourseme scores exist')
        discoursemes = collocation.constellation.highlight_discoursemes + collocation.constellation.filter_discoursemes
        ccc_discourseme_counts(collocation, discoursemes)

    else:
        current_app.logger.debug('ccc_collocates :: query mode')
        get_or_create_counts(collocation, remove_filter_cpos=True)

    current_app.logger.debug('ccc_collocates :: .. done')


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
    semantic_map_id = Integer(required=False)

    # subcorpus_id = Integer(required=False, load_default=None)  taken from query

    p = String(required=True)
    window = Integer(required=False, load_default=10)
    s_break = String(required=False)
    marginals = String(required=False, load_default='local', validate=OneOf(['local', 'global']))

    # filtering for second-order collocation
    filter_item = String(metadata={'nullable': True}, required=False)
    filter_item_p_att = String(load_default='lemma', required=False)
    filter_discourseme_ids = List(Integer, load_default=[], required=False)


class CollocationOut(Schema):

    id = Integer()

    semantic_map_id = Integer(metadata={'nullable': True})
    constellation_id = Integer(metadata={'nullable': True})

    marginals = String(validate=OneOf(['local', 'global']))
    p = String()
    s_break = String()

    nr_items = Integer()


# IDENTICAL TO KEYWORDS ↓
class CollocationPatchIn(Schema):

    constellation_id = Integer(required=False, load_default=None)
    semantic_map_id = Integer(required=False, load_default=None)


class CollocationItemsIn(Schema):

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


class DiscoursemeScoresOut(Schema):

    discourseme_id = Integer()
    item_scores = Nested(CollocationItemOut(many=True))
    unigram_item_scores = Nested(CollocationItemOut(many=True))
    global_scores = Nested(CollocationScoreOut(many=True))


class CollocationItemsOut(Schema):

    id = Integer()

    sort_by = String()
    nr_items = Integer()
    page_size = Integer()
    page_number = Integer()
    page_count = Integer()

    items = Nested(CollocationItemOut(many=True), required=False)
    coordinates = Nested(CoordinatesOut(many=True), required=False, metadata={'nullable': True})
    discourseme_scores = Nested(DiscoursemeScoresOut(many=True), required=False, metadata={'nullable': True})


#################
# API endpoints #
#################
@bp.get('/')
@bp.output(CollocationOut(many=True))
@bp.auth_required(auth)
def get_all_collocation():
    """Get all collocations.

    """

    collocations = Collocation.query.all()

    return [CollocationOut().dump(collocation) for collocation in collocations], 200


@bp.get('/<id>/')
@bp.output(CollocationOut)
@bp.auth_required(auth)
def get_collocation(id):
    """Get one collocation analysis.

    """

    collocation = db.get_or_404(Collocation, id)

    return CollocationOut().dump(collocation), 200


@bp.delete('/<id>/')
@bp.auth_required(auth)
def delete_collocation(id):
    """Delete collocation.

    """

    collocation = db.get_or_404(Collocation, id)
    db.session.delete(collocation)
    db.session.commit()

    return 'Deletion successful.', 200


@bp.patch('/<id>/')
@bp.input(CollocationPatchIn)
@bp.output(CollocationOut)
@bp.auth_required(auth)
def patch_collocation(id, json_data):
    """Patch a collocation analysis. Use for updating semantic map and/or constellation.

    """

    collocation = db.get_or_404(Collocation, id)

    for attr, value in json_data.items():
        setattr(collocation, attr, value)
    db.session.commit()

    return CollocationOut().dump(collocation), 200


@bp.get("/<id>/items")
@bp.input(CollocationItemsIn, location='query')
@bp.output(CollocationItemsOut)
@bp.auth_required(auth)
def get_collocation_items(id, query_data):
    """Get scored items of collocation analysis.

    """

    collocation = db.get_or_404(Collocation, id)

    page_size = query_data.pop('page_size')
    page_number = query_data.pop('page_number')
    sort_order = query_data.pop('sort_order')
    sort_by = query_data.pop('sort_by')

    # get scores
    if collocation.constellation:
        current_app.logger.debug('ccc_collocates :: .. constellation mode (filtering out DiscoursemeUnigramItems)')
        filter_unigram_items = CollocationDiscoursemeUnigramItem.query.filter_by(
            collocation_id=collocation.id,
            discourseme_id=collocation._query.discourseme.id
        )
        blacklist = CollocationItem.query.filter(
            CollocationItem.collocation_id == collocation.id,
            CollocationItem.item.in_([f.item for f in filter_unigram_items])
        )
        scores = CollocationItemScore.query.filter(
            CollocationItemScore.collocation_id == collocation.id,
            CollocationItemScore.measure == sort_by,
            ~ CollocationItemScore.collocation_item_id.in_([b.id for b in blacklist])
        )
    else:
        current_app.logger.debug('ccc_collocates :: .. query mode')
        scores = CollocationItemScore.query.filter(
            CollocationItemScore.collocation_id == collocation.id,
            CollocationItemScore.measure == sort_by
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
    items = [CollocationItemOut().dump(CollocationItem.query.filter_by(id=id).first()) for id in df_scores['collocation_item_id']]

    # coordinates
    coordinates = list()
    if collocation.semantic_map:
        requested_items = [item['item'] for item in items]
        ccc_semmap_update(collocation.semantic_map, requested_items)
        coordinates = [CoordinatesOut().dump(coordinates) for coordinates in collocation.semantic_map.coordinates if coordinates.item in requested_items]

    # discourseme scores
    discourseme_scores = list()
    if collocation.constellation:
        discoursemes = collocation.constellation.highlight_discoursemes + collocation.constellation.filter_discoursemes
        ccc_discourseme_counts(collocation, discoursemes)
        discourseme_scores = [s for s in collocation.discourseme_scores if s['discourseme_id'] != collocation._query.discourseme.id]
        for s in discourseme_scores:
            s['item_scores'] = [CollocationItemOut().dump(sc) for sc in s['item_scores']]
            s['unigram_item_scores'] = [CollocationItemOut().dump(sc) for sc in s['unigram_item_scores']]
        discourseme_scores = [DiscoursemeScoresOut().dump(s) for s in discourseme_scores]

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
        'discourseme_scores': discourseme_scores
    }

    return CollocationItemsOut().dump(collocation_items), 200


# collocation = ccc_collocates(collocation, sort_by, sort_order, page_size, page_number)

# semantic_map = collocation.semantic_map
# return_coordinates = True
# if return_coordinates:
#     if semantic_map:

#         # make sure there's coordinates for all requested items
#         requested_items = [item['item'] for item in collocation['items']]
#         ccc_semmap_update(semantic_map, requested_items)
#         collocation['coordinates'] = [
#             CoordinatesOut().dump(coordinates) for coordinates in semantic_map.coordinates if coordinates.item in requested_items
#         ]
#         requested_discourseme_items = list()

#         # make sure there's coordinates for all requested discourseme items
#         for discourseme_score in collocation['discourseme_scores']:
#             requested_discourseme_items.extend([d['item'] for d in discourseme_score['item_scores']])
#         if len(requested_discourseme_items) > 0:
#             ccc_semmap_update(semantic_map, requested_discourseme_items)
#             collocation['coordinates'].extend([
#                 CoordinatesOut().dump(coordinates) for coordinates in semantic_map.coordinates if
#                 (coordinates.item in requested_discourseme_items) and (coordinates.item not in requested_items)
#             ])
#     else:
#         current_app.logger.error(f"no semantic map for collocation analysis {id}")

# return CollocationOut().dump(collocation), 200

@bp.post('/<id>/semantic-map/')
@bp.input({'semantic_map_id': Integer(load_default=None)}, location='query')
@bp.output(SemanticMapOut)
@bp.auth_required(auth)
def create_semantic_map(id, query_data):
    """Create new semantic map for collocation items or make sure there are coordinates for all items on an existing map.

    """

    collocation = db.get_or_404(Collocation, id)

    if query_data['semantic_map_id']:

        collocation.semantic_map = db.get_or_404(SemanticMap, query_data['semantic_map_id'])
        db.session.commit()
        scores = CollocationItemScore.query.filter(
            CollocationItemScore.collocation_id == collocation.id,
            CollocationItemScore.measure == 'conservative_log_ratio'
        ).order_by(CollocationItemScore.score.desc()).paginate(page=1, per_page=500)
        df_scores = DataFrame([vars(s) for s in scores], columns=['collocation_item_id'])
        new_items = [CollocationItem.query.filter_by(id=id).first() for id in df_scores['collocation_item_id']]
        ccc_semmap_update(collocation.semantic_map, [item.item for item in new_items])

    else:

        if collocation.constellation:
            get_or_create_counts(collocation, remove_filter_cpos=False)
            filter_unigram = CollocationDiscoursemeUnigramItem.query.filter_by(collocation_id=collocation.id,
                                                                               discourseme_id=collocation._query.discourseme.id)
            filter_items = [f.item for f in filter_unigram]
        else:
            filter_items = []

        ccc_semmap([collocation.id], sort_by="conservative_log_ratio", number=500, blacklist_items=filter_items)

    return SemanticMapOut().dump(collocation.semantic_map), 200


@bp.put('/<id>/auto-associate')
@bp.auth_required(auth)
def associate_discoursemes(id):

    collocation = db.get_or_404(Collocation, id)
    collocation_items = [item.item for item in collocation.items]
    discoursemes = Discourseme.query.all()
    for discourseme in discoursemes:
        # TODO use unigram breakdown instead!
        discourseme_items = [item.surface for item in discourseme.template]
        if len(set(discourseme_items).intersection(collocation_items)) > 0:
            if discourseme not in collocation.constellation.highlight_discoursemes and discourseme not in collocation.constellation.filter_discoursemes:
                collocation.constellation.highlight_discoursemes.append(discourseme)
    db.session.commit()

    # counts = DataFrame([vars(s) for s in collocation.items], columns=['item', 'window', 'f', 'f1', 'f2', 'N']).set_index('item')
    # for window in set(counts['window']):
    #     current_app.logger.info(f'Updating collocation :: window {window}')
    #     ccc_collocates(collocation, window)

    # ccc_semmap_update(collocation)
    # ccc_semmap_discoursemes(collocation)
    return {"id": int(id)}, 200
