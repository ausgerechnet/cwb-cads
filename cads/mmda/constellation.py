#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema  # , abort
from apiflask.fields import Integer, List, Nested, String
from apiflask.validators import OneOf

from .database import DiscoursemeDescription
from .discourseme import create_discourseme_description
from .. import db
from ..collocation import CollocationIn, CollocationOut
from ..concordance import ConcordanceIn, ConcordanceOut
from ..database import Corpus
from ..concordance import ccc_concordance
from ..query import get_or_create_query_item
from .database import Constellation, Discourseme, ConstellationDescription, CollocationDiscoursemeItem, CollocationDiscoursemeUnigramItem
from .discourseme import DiscoursemeOut
from ..users import auth

from association_measures import measures

from ..database import Collocation
from ..collocation import get_or_create_counts, CollocationItemsIn, CollocationItemsOut
from ..semantic_map import ccc_init_semmap

from ..query import get_or_create_cotext
from flask import current_app
from ..database import CotextLines
from pandas import read_sql, DataFrame
from collections import defaultdict


bp = APIBlueprint('constellation', __name__, url_prefix='/constellation')


def query_discourseme_cotext(collocation, df_cotext, discourseme_description, discourseme_matchend_in_context=True):
    """get CollocationDiscoursemeItems and CollocationDiscoursemeUnigramItems

    """
    from ..query import ccc_query
    from .discourseme import description_items_to_query

    unigram_counts_from_sql = CollocationDiscoursemeUnigramItem.query.filter_by(collocation_id=collocation.id,
                                                                                discourseme_description_id=discourseme_description.id)
    if unigram_counts_from_sql.first():
        current_app.logger.debug(
            f'query_discourseme_cotext :: cotext unigram counts for discourseme "{discourseme_description.discourseme.name}" already exist'
        )
        # TODO also check for item counts?
        return

    focus_query = collocation._query
    corpus = focus_query.corpus
    match_strategy = focus_query.match_strategy
    s_query = focus_query.s
    p_description = collocation.p

    # get matches of discourseme in whole corpus and in subcorpus of cotext
    current_app.logger.debug(
        f'query_discourseme_cotext :: .. getting matches of discourseme "{discourseme_description.discourseme.name}" in whole corpus'
    )
    from ccc.utils import cqp_escape
    items = [cqp_escape(item.item) for item in discourseme_description.items]
    if collocation._query.subcorpus and collocation.marginals == 'local':
        if not discourseme_description.query_id:
            corpus_query = description_items_to_query(items, p_description, s_query, corpus, collocation._query.subcorpus, match_strategy=match_strategy)
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
    if collocation._query.subcorpus and collocation.marginals == 'local':
        corpus = collocation._query.subcorpus.ccc()
    else:
        corpus = collocation._query.corpus.ccc()

    current_app.logger.debug('query_discourseme_cotext :: .. creating breakdowns in whole corpus')
    corpus_matches_df = corpus_matches_df[['match', 'matchend']].set_index(['match', 'matchend'])
    corpus_matches = corpus.subcorpus(df_dump=corpus_matches_df, overwrite=False)
    corpus_matches_breakdown = corpus_matches.breakdown(p_atts=[p_description]).rename({'freq': 'f2'}, axis=1)
    corpus_matches_unigram_breakdown = corpus_matches.breakdown(p_atts=[p_description], split=True).rename({'freq': 'f2'}, axis=1)

    current_app.logger.debug('query_discourseme_cotext :: .. creating breakdowns in context')
    subcorpus_matches_df = subcorpus_matches_df[['match', 'matchend']].set_index(['match', 'matchend'])
    subcorpus_matches = corpus.subcorpus(df_dump=subcorpus_matches_df, overwrite=False)
    subcorpus_matches_breakdown = subcorpus_matches.breakdown(p_atts=[p_description]).rename({'freq': 'f'}, axis=1)
    # TODO just split the items of the full_breakdown and combine
    subcorpus_matches_unigram_breakdown = subcorpus_matches.breakdown(p_atts=[p_description], split=True).rename({'freq': 'f'}, axis=1)

    # create and save unigram counts
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
    counts_from_sql = CollocationDiscoursemeItem.query.filter_by(collocation_id=collocation.id, discourseme_description_id=discourseme_description.id)
    counts = DataFrame([vars(s) for s in counts_from_sql], columns=['id', 'f', 'f1', 'f2', 'N']).set_index('id')
    discourseme_item_scores = measures.score(counts, freq=True, per_million=True, digits=6, boundary='poisson', vocab=vocab_size).reset_index()
    discourseme_item_scores = discourseme_item_scores.melt(
        id_vars=['id'], var_name='measure', value_name='score'
    ).rename({'id': 'collocation_item_id'}, axis=1)
    discourseme_item_scores['collocation_id'] = collocation.id
    discourseme_item_scores.to_sql('collocation_discourseme_item_score', con=db.engine, if_exists='append', index=False)

    # TODO return corpus_matches_cpos
    return


def ccc_discourseme_counts(collocation, discourseme_descriptions):
    """get CollocationDiscoursemeUnigramCounts (and make sure that CollocationDiscoursemeItems and CollocationDiscoursemeUnigramItems exist)

    for each discourseme (including filter):
    - get cpos consumed within and outside context
    - get frequency breakdown within and outside context
    """

    focus_query = collocation._query
    window = collocation.window
    s_break = collocation.s_break

    current_app.logger.debug(f'get_discourseme_counts :: getting context of query {focus_query.id}')
    cotext = get_or_create_cotext(focus_query, window, s_break, return_df=True)
    cotext_lines = CotextLines.query.filter(CotextLines.cotext_id == cotext.id,
                                            CotextLines.offset <= window,
                                            CotextLines.offset >= -window)
    df_cotext = read_sql(cotext_lines.statement, con=db.engine, index_col='id').reset_index(drop=True).drop_duplicates(subset='cpos')

    current_app.logger.debug('get_discourseme_counts :: getting discourseme counts')
    discourseme_cpos = set()
    for discourseme_description in discourseme_descriptions:
        # TODO
        discourseme_matches = query_discourseme_cotext(collocation, df_cotext, discourseme_description)
        if isinstance(discourseme_matches, set):
            discourseme_cpos.update(discourseme_matches.matches())

    if len(discourseme_cpos) > 0:

        current_app.logger.debug('get_discourseme_counts :: getting discoursemes_unigram_counts')
        if focus_query.subcorpus and collocation.marginals == 'local':
            corpus = collocation._query.subcorpus.ccc()
        else:
            corpus = collocation._query.corpus.ccc()
        discoursemes_unigram_counts = corpus.counts.cpos(discourseme_cpos, [collocation.p])[['freq']].rename(columns={'freq': 'f'})
        m = corpus.marginals(discoursemes_unigram_counts.index, [collocation.p])[['freq']].rename(columns={'freq': 'f2'})
        discoursemes_unigram_counts = discoursemes_unigram_counts.join(m)

        return discoursemes_unigram_counts


def get_discourseme_scores(collocation_id, discourseme_description_ids):

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


def iterative_query(focus_query, filter_queries, window):

    from ..database import Matches, Query

    filter_sequence = "Q-" + "-".join([str(focus_query.id)] + [str(fq.id) for fq in filter_queries.values()])
    # TODO retrieve if necessary

    current_app.logger.debug("get_collocation :: second-order mode")
    matches = Matches.query.filter_by(query_id=focus_query.id)
    # TODO learn proper SQLalchemy (aliased anti-join)
    matches_tmp = matches.all()
    match_pos = set([m.match for m in matches_tmp])

    # get relevant cotext lines
    cotext = get_or_create_cotext(focus_query, window, focus_query.s)
    cotext_lines = CotextLines.query.filter(CotextLines.cotext_id == cotext.id,
                                            CotextLines.offset <= window,
                                            CotextLines.offset >= -window)

    for fq in filter_queries.values():

        current_app.logger.debug("get_collocation :: filtering cotext lines by joining matches")
        cotext_lines_tmp = cotext_lines.join(
            Matches,
            (Matches.query_id == fq.id) &
            (Matches.match == CotextLines.cpos)
        )
        match_pos = match_pos.intersection(set([c.match_pos for c in cotext_lines_tmp]))

        current_app.logger.debug("get_collocation :: filtering matches")

        matches = Matches.query.filter(
            Matches.query_id == focus_query.id,
            Matches.match.in_(match_pos)
        )

        # if len(matches.all()) == 0:
        #     current_app.logger.error(f"no lines left after filtering for query {fq.cqp_query}")
        #     abort(404, 'no collocates')

    # create query
    query = Query(
        corpus_id=focus_query.corpus.id,
        subcorpus_id=focus_query.subcorpus_id,
        filter_sequence=filter_sequence,
        match_strategy=focus_query.match_strategy,
        s=focus_query.s,
        cqp_query=focus_query.cqp_query
    )
    db.session.add(query)
    db.session.commit()

    # matches to database
    df_matches = read_sql(matches.statement, con=db.engine)[['contextid', 'match', 'matchend']]
    df_matches['query_id'] = query.id
    df_matches.to_sql('matches', con=db.engine, if_exists='append', index=False)

    return query


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


class ConstellationDescriptionOut(Schema):

    id = Integer()
    discourseme_ids = List(Integer())
    corpus_id = Integer()
    subcorpus_id = Integer()
    p = String()
    s = String()
    match_strategy = String()
    semantic_map_id = Integer()


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

    discoursemes_ids = json_data.get('discourseme_ids', [])
    if len(discoursemes_ids) > 0:
        discoursemes = [db.get_or_404(Discourseme, did) for did in discoursemes_ids]
        [constellation.discoursemes.append(did) for did in discoursemes]
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


@bp.get("/<id>/description/<description_id>/collocation/")
@bp.input(CollocationIn, location='query')
@bp.input({'focus_discourseme_id': Integer(required=True)}, location='query', arg_name='query_focus')
@bp.input({'filter_discourseme_ids': List(Integer(), load_default=[], required=False)}, location='query', arg_name='query_filter')
@bp.output(CollocationOut)
@bp.auth_required(auth)
def collocation(id, description_id, query_data, query_focus, query_filter):
    """Get collocation analysis of constellation in corpus. Redirects to query endpoint.

    """

    # constellation = db.get_or_404(Constellation, id)  # TODO needed?
    description = db.get_or_404(ConstellationDescription, description_id)

    # context options
    window = query_data.get('window')
    p = description.p
    s = description.s

    # marginals
    marginals = query_data.get('marginals', 'global')

    # semantic map
    semantic_map_id = query_data.get('semantic_map_id', None)

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

    if len(filter_queries) > 0:
        focus_query = iterative_query(focus_query, filter_queries, window)

    # create collocation object
    collocation = Collocation(
        # constellation_id=constellation_id,
        # semantic_map_id=semantic_map_id,
        query_id=focus_query.id,
        p=p,
        s_break=s,
        window=window,
        marginals=marginals
    )
    db.session.add(collocation)
    db.session.commit()

    get_or_create_counts(collocation, remove_focus_cpos=False)
    ccc_discourseme_counts(collocation, description.discourseme_descriptions)
    ccc_init_semmap(collocation, semantic_map_id)

    return CollocationOut().dump(collocation), 200


@bp.get("/<id>/description/<description_id>/collocation/<collocation_id>/items")
@bp.input(CollocationItemsIn, location='query')
@bp.output(CollocationItemsOut)
@bp.auth_required(auth)
def get_collocation_items(id, description_id, collocation_id, query_data):
    """Get scored items of collocation analysis.

    """

    description = db.get_or_404(ConstellationDescription, description_id)
    collocation = db.get_or_404(Collocation, collocation_id)

    from ..database import CollocationItem, CollocationItemScore
    # from .database import CollocationDiscoursemeUnigramItem
    from pandas import DataFrame
    from ..collocation import CollocationItemOut, DiscoursemeScoresOut
    from ..semantic_map import CoordinatesOut, ccc_semmap_update

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

    # coordinates
    coordinates = list()
    if collocation.semantic_map:
        requested_items = [item['item'] for item in items]
        ccc_semmap_update(collocation.semantic_map, requested_items)
        coordinates = [CoordinatesOut().dump(coordinates) for coordinates in collocation.semantic_map.coordinates if coordinates.item in requested_items]

    # discourseme scores
    ccc_discourseme_counts(collocation, description.discourseme_descriptions)
    discourseme_scores = get_discourseme_scores(collocation_id, [d.id for d in description.discourseme_descriptions])
    # discourseme_scores = [s for s in collocation.discourseme_scores]  # if s['discourseme_id'] != focus_discourseme_id]
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
