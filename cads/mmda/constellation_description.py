#!/usr/bin/python3
# -*- coding: utf-8 -*-

from itertools import combinations

from apiflask import APIBlueprint, Schema
from apiflask.fields import Float, Integer, List, Nested, String
from apiflask.validators import OneOf
from association_measures import measures
from flask import current_app
from pandas import DataFrame

from .. import db
from ..concordance import ConcordanceIn, ConcordanceOut, ccc_concordance
from ..database import Corpus
from ..query import ccc_query, get_or_create_query_item
from ..users import auth
from .database import (Constellation, ConstellationDescription, Discourseme,
                       DiscoursemeDescription, DiscoursemeTemplateItems)
from .discourseme import DiscoursemeIn, DiscoursemeOut
from .discourseme_description import (DiscoursemeDescriptionOut,
                                      discourseme_template_to_description)

bp = APIBlueprint('description', __name__, url_prefix='/<constellation_id>/description')


def expand_scores_dataframe(df):
    """Expands a DataFrame with columns ['item', 'scores', 'raw_scores', 'scaled_scores'],
    where the score columns are lists of dictionaries [{'measure': 'conservative_log_ratio', 'score': 0}, ...]
    into a flat DataFrame with one column per measure.
    - scores overwrite raw versions of scores
    - scaled versions of scores are included as '{measure}_scaled'
    """

    expanded_rows = []
    for _, row in df.iterrows():
        # Create a dictionary for the expanded row
        expanded_row = {'item': row['item']}

        # Extract and add measures from 'scores'
        for score_dict in row['scores']:
            expanded_row[score_dict['measure']] = score_dict['score']

        # Extract and add measures from 'raw_scores'
        for raw_score_dict in row['raw_scores']:
            expanded_row[raw_score_dict['measure']] = raw_score_dict['score']

        # Extract and add measures from 'raw_scores'
        if 'scaled_scores' in df.columns:
            for scaled_score_dict in row['scaled_scores']:
                expanded_row[scaled_score_dict['measure'] + "_scaled"] = scaled_score_dict['score']

        # Append the expanded row to the list
        expanded_rows.append(expanded_row)

    # Create a DataFrame from the expanded rows
    expanded_df = DataFrame(expanded_rows)

    return expanded_df


def pairwise_intersections(dict_of_sets):
    """calculates the length of pairwise intersections between the sets in the provided dict

    """
    nt = lambda a, b: len(dict_of_sets[a].intersection(dict_of_sets[b]))
    res = dict([(t, nt(*t)) for t in combinations(dict_of_sets.keys(), 2)])
    return res


################
# API schemata #
################

# INPUT
class ConstellationDescriptionIn(Schema):

    corpus_id = Integer(required=True)
    subcorpus_id = Integer(required=False)

    # semantic_map_id = Integer(required=False, load_default=None)
    s = String(required=False)
    match_strategy = String(load_default='longest', required=False, validate=OneOf(['longest', 'shortest', 'standard']))
    overlap = String(load_default='partial', required=False, validate=OneOf(['partial', 'full', 'match', 'matchend']))


class ConstellationDiscoursemeDescriptionIn(Schema):

    discourseme_description_ids = List(Integer(), required=False, load_default=[])


class ConstellationMetaIn(Schema):

    discourseme_description_ids = List(Integer(), required=False, load_default=[])

    # level = String(required=True)
    # key = String(required=True)
    # p = String(required=False, load_default='word')


# OUTPUT
class ConstellationDescriptionOut(Schema):

    id = Integer(required=True)
    corpus_id = Integer(required=True)
    subcorpus_id = Integer(required=True, dump_default=None, metadata={'nullable': True})
    s = String(required=True)
    match_strategy = String(required=True)
    # semantic_map_id = Integer(required=True, dump_default=None, metadata={'nullable': True})
    discourseme_descriptions = Nested(DiscoursemeDescriptionOut(many=True), required=True, dump_default=[])


class ConstellationAssociationItemOut(Schema):

    node = Integer(required=True)
    candidate = Integer(required=True)
    measure = String(required=True)
    score = Float(required=True)


class ConstellationAssociationOut(Schema):

    N = Integer(required=True)
    s = String(required=True)
    nr_pairs = Integer(required=True)
    associations = Nested(ConstellationAssociationItemOut(many=True), required=True)


class ConstellationMetaOut(Schema):

    pass

    # item = String(required=True)
    # value = String(required=True)
    # frequency = Integer(required=True)
    # nr_tokens = Integer(required=True)
    # nr_texts = Integer(required=True)
    # ipm = Float(required=True)


#################
# API endpoints #
#################
@bp.post('/')
@bp.input(ConstellationDescriptionIn)
@bp.output(ConstellationDescriptionOut)
@bp.auth_required(auth)
def create_description(constellation_id, json_data):
    """Create description of constellation in corpus. Makes sure individual discourseme descriptions exist.

    """

    constellation = db.get_or_404(Constellation, constellation_id)

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


@bp.get('/')
@bp.output(ConstellationDescriptionOut(many=True))
@bp.auth_required(auth)
def get_all_descriptions(constellation_id):
    """Get all descriptions of this constellation.

    """

    # constellation = db.get_or_404(Constellation, constellation_id)
    descriptions = ConstellationDescription.query.filter_by(constellation_id=constellation_id).all()

    return [ConstellationDescriptionOut().dump(description) for description in descriptions]


@bp.get('/<description_id>/')
@bp.output(ConstellationDescriptionOut)
@bp.auth_required(auth)
def get_description(constellation_id, description_id):
    """Get constellation description.

    """

    # constellation = db.get_or_404(Constellation, id)  # TODO: needed?
    description = db.get_or_404(ConstellationDescription, description_id)

    return ConstellationDescriptionOut().dump(description)


@bp.delete('/<description_id>/')
@bp.auth_required(auth)
def delete_description(constellation_id, description_id):
    """Delete constellation description.

    """

    # constellation = db.get_or_404(Constellation, id)  # TODO: needed?
    description = db.get_or_404(ConstellationDescription, description_id)
    db.session.delete(description)
    db.session.commit()

    return 'Deletion successful.', 200


@bp.patch('/<description_id>/add-discourseme')
@bp.input(ConstellationDiscoursemeDescriptionIn)
@bp.output(ConstellationDescriptionOut(partial=True))
@bp.auth_required(auth)
def patch_description_add(constellation_id, description_id, json_data):
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


@bp.patch('/<description_id>/remove-discourseme')
@bp.input(ConstellationDiscoursemeDescriptionIn)
@bp.output(ConstellationDescriptionOut(partial=True))
@bp.auth_required(auth)
def patch_description_remove(constellation_id, description_id, json_data):
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


@bp.post('/<description_id>/discourseme-description')
@bp.input(DiscoursemeIn)
@bp.output(DiscoursemeOut)
@bp.auth_required(auth)
def post_items_into_constellation(constellation_id, description_id, json_data):
    """convenience function for creating a new discourseme incl. description during an analysis (e.g. drag & drop on semantic map)

    (1) create a discourseme with provided template items
    (2) create a suitable description in the constellation description corpus
    (3) link discourseme to constellation
    (4) link discourseme description and constellation description

    """

    constellation = db.get_or_404(Constellation, constellation_id)
    description = db.get_or_404(ConstellationDescription, description_id)

    # create discourseme
    discourseme = Discourseme(
        user_id=auth.current_user.id,
        name=json_data.get('name'),
    )
    db.session.add(discourseme)
    db.session.commit()

    # we also create template here to easily use in 'discourseme_template_to_description()'
    for item in json_data.get('template'):
        db.session.add(DiscoursemeTemplateItems(
            discourseme_id=discourseme.id,
            p=item['p'],
            surface=item['surface']
        ))
    db.session.commit()

    # link discourseme to constellation
    constellation.discoursemes.append(discourseme)
    db.session.commit()

    # create discourseme description
    discourseme_description = discourseme_template_to_description(
        discourseme, [], description.corpus_id, description.subcorpus_id, description.s, description.match_strategy
    )

    # link discourseme_description to constellation description
    description.discourseme_descriptions.append(discourseme_description)
    db.session.commit()

    return DiscoursemeOut().dump(discourseme), 200


@bp.put('/<description_id>/discourseme-description')
@bp.input(DiscoursemeIn)
@bp.output(DiscoursemeOut)
@bp.auth_required(auth)
def put_items_into_constellation(constellation_id, description_id, json_data):
    """same as corresponding POST but will only create if discourseme with the same name does not exist

    # does discourseme already exist
    # is discourseme already linked to constellation
    # does discourseme description already exist
    # is item already in discourseme description
    # is discourseme description already linked to constellation description
    """

    constellation = db.get_or_404(Constellation, constellation_id)
    description = db.get_or_404(ConstellationDescription, description_id)
    discourseme_name = json_data.get('name')

    discourseme = Discourseme.query.filter_by(name=discourseme_name).first()
    if not discourseme:
        current_app.logger.debug(f'discourseme named "{discourseme_name}" does not exist, creating and linking')

        # create discourseme
        discourseme = Discourseme(
            user_id=auth.current_user.id,
            name=discourseme_name,
        )
        db.session.add(discourseme)
        db.session.commit()

        # we also create template here to easily use in 'discourseme_template_to_description()'
        for item in json_data.get('template'):
            db.session.add(DiscoursemeTemplateItems(
                discourseme_id=discourseme.id,
                p=item['p'],
                surface=item['surface']
            ))
        db.session.commit()

    else:
        current_app.logger.debug(f'discourseme named "{discourseme_name}" already exists')

    if discourseme not in constellation.discoursemes:
        # link discourseme to constellation
        constellation.discoursemes.append(discourseme)
        db.session.commit()

    desc = DiscoursemeDescription.query.filter_by(discourseme_id=discourseme.id,
                                                  corpus_id=description.corpus_id,
                                                  subcorpus_id=description.subcorpus_id,
                                                  filter_sequence=None,
                                                  s=description.s,
                                                  match_strategy=description.match_strategy).first()

    if not desc:
        # create discourseme description
        desc = discourseme_template_to_description(
            discourseme, [], description.corpus_id, description.subcorpus_id, description.s, description.match_strategy
        )

    if desc not in description.discourseme_descriptions:
        # link discourseme_description to constellation description
        description.discourseme_descriptions.append(desc)
        db.session.commit()

    return DiscoursemeOut().dump(discourseme), 200


# CONCORDANCE
##############
@bp.get("/<description_id>/concordance/")
@bp.input(ConcordanceIn, location='query')
@bp.input({'focus_discourseme_id': Integer(required=True)}, location='query', arg_name='query_focus')
@bp.input({'filter_discourseme_ids': List(Integer(), load_default=[], required=False)}, location='query', arg_name='query_filter')
@bp.output(ConcordanceOut)
@bp.auth_required(auth)
def concordance_lines(constellation_id, description_id, query_data, query_focus, query_filter):
    """Get concordance lines of constellation in corpus.

    """

    # constellation = db.get_or_404(Constellation, id)  # TODO: needed?
    description = db.get_or_404(ConstellationDescription, description_id)

    # display options
    primary = query_data.get('primary')
    secondary = query_data.get('secondary')

    window = query_data.get('window')
    context_break = query_data.get('context_break')

    extended_window = query_data.get('extended_window')
    extended_context_break = query_data.get('extended_context_break')

    # pagination
    page_size = query_data.get('page_size')
    page_number = query_data.get('page_number')

    # sorting
    sort_order = query_data.get('sort_order')
    sort_by_offset = query_data.get('sort_by_offset')
    sort_by_p_att = query_data.get('sort_by_p_att')
    sort_by_s_att = query_data.get('sort_by_s_att')

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

    # attributes to show
    p_show = [primary, secondary]
    s_show = focus_query.corpus.s_annotations

    # break context at focus_query.s by default
    if context_break is None:
        context_break = focus_query.s

    concordance = ccc_concordance(focus_query,
                                  p_show, s_show,
                                  window, context_break,
                                  extended_window, extended_context_break,
                                  highlight_queries=highlight_queries,
                                  match_id=None,
                                  filter_queries=filter_queries, overlap='partial',
                                  page_number=page_number, page_size=page_size,
                                  sort_order=sort_order,
                                  sort_by_offset=sort_by_offset, sort_by_p_att=sort_by_p_att, sort_by_s_att=sort_by_s_att)

    return ConcordanceOut().dump(concordance), 200


# ASSOCIATIONS
###############
@bp.get("/<description_id>/associations/")
@bp.output(ConstellationAssociationOut)
@bp.auth_required(auth)
def get_constellation_associations(constellation_id, description_id):
    """Get pairwise association scores for discoursemes in constellation, based on s-attribute.

    """

    description = db.get_or_404(ConstellationDescription, description_id)

    context_ids = dict()
    for discourseme_description in description.discourseme_descriptions:
        matches_df = ccc_query(discourseme_description._query)
        if len(matches_df) == 0:
            context_ids[discourseme_description.discourseme.id] = set()
        else:
            context_ids[discourseme_description.discourseme.id] = set(matches_df['contextid'])

    current_app.logger.debug('get constellation associations :: counting co-occurrences')
    N = len(description.corpus.ccc().attributes.attribute(description.s, 's'))  # TODO: subcorpus size?
    records = list()
    pairs = pairwise_intersections(context_ids)
    for pair, f in pairs.items():
        pair = sorted(pair)
        f1 = len(context_ids[pair[0]])
        f2 = len(context_ids[pair[1]])
        records.append({'node': pair[0], 'candidate': pair[1], 'f': f, 'f1': f1, 'f2': f2, 'N': N})

    current_app.logger.debug('get constellation associations :: calculating scores')
    counts = DataFrame(records)
    counts['node'] = counts['node'].astype(int)
    counts['candidate'] = counts['candidate'].astype(int)
    counts = counts.set_index(['node', 'candidate'])
    scores = measures.score(counts, freq=True, digits=6, boundary='poisson', vocab=len(counts)).reset_index()

    # TODO
    scores = scores.dropna()
    scores = scores.melt(id_vars=['node', 'candidate'], var_name='measure', value_name='score')

    association = dict(
        N=N,
        s=description.s,
        nr_pairs=len(pairs.items()),
        associations=scores.to_dict(orient='records')
    )

    return ConstellationAssociationOut().dump(association), 200


# META
#######
@bp.get("/<query_id>/meta")
@bp.input(ConstellationMetaIn, location='query')
@bp.output(ConstellationMetaOut)
@bp.auth_required(auth)
def get_meta(constellation_id, description_id, query_data):
    """Get meta distribution of discourseme constellation.

    for each key and each subset of provided discourseme-ids: number of occurrences
    """

    query = db.get_or_404(Query, query_id)
    level = query_data.get('level')
    key = query_data.get('key')
    p = query_data.get('p', 'word')

    matches_df = ccc_query(query, return_df=True)
    crps = query.corpus.ccc().subcorpus(df_dump=matches_df, overwrite=False)
    df_meta = crps.concordance(p_show=[p], s_show=[f'{level}_{key}'], cut_off=None)[[p, f'{level}_{key}']].value_counts().reset_index()
    df_meta.columns = ['item', 'value', 'frequency']

    df_texts = DataFrame.from_records(get_meta_frequencies(query.corpus, level, key))
    df_texts.columns = ['value', 'nr_texts']

    df_tokens = DataFrame.from_records(get_meta_number_tokens(query.corpus, level, key))
    df_tokens.columns = ['value', 'nr_tokens']

    df_meta = df_meta.set_index('value').\
        join(df_texts.set_index('value'), how='outer').\
        join(df_tokens.set_index('value'), how='outer')

    df_meta['nr_texts'] = to_numeric(df_meta['nr_texts'].fillna(0), downcast='integer')
    df_meta['nr_tokens'] = to_numeric(df_meta['nr_tokens'].fillna(0), downcast='integer')

    df_meta = df_meta.sort_values(by='frequency', ascending=False)

    df_meta['ipm'] = round(df_meta['frequency'] / df_meta['nr_tokens'] * 10 ** 6, 6)

    meta = df_meta.reset_index().to_dict(orient='records')

    return [QueryMetaOut().dump(m) for m in meta], 200
