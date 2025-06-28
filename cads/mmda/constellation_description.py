#!/usr/bin/python3
# -*- coding: utf-8 -*-

from itertools import combinations

from apiflask import APIBlueprint, Schema
from apiflask.fields import Float, Integer, List, Nested, String
from apiflask.validators import OneOf
from association_measures import measures
from flask import abort, current_app
from pandas import DataFrame

from .. import db
from ..breakdown import BreakdownIn, ccc_breakdown
from ..concordance import (ConcordanceIn, ConcordanceLineIn,
                           ConcordanceLineOut, ConcordanceOut, ccc_concordance)
from ..database import Breakdown, Corpus, get_or_create
from ..query import ccc_query, get_or_create_query_assisted
from ..users import auth
from .database import (Constellation, ConstellationDescription, Discourseme,
                       DiscoursemeDescription, DiscoursemeTemplateItems)
from .discourseme import DiscoursemeIDs, DiscoursemeIn, DiscoursemeOut
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
    """Calculate the length of pairwise intersections between the sets in the provided dictionary."""

    res = {}
    for a, b in combinations(dict_of_sets.keys(), 2):
        intersection_size = len(dict_of_sets[a].intersection(dict_of_sets[b]))
        res[(a, b)] = intersection_size

    return res


################
# API schemata #
################

# INPUT
class ConstellationDescriptionIn(Schema):

    corpus_id = Integer(required=True)
    subcorpus_id = Integer(required=False, allow_none=True)
    # semantic_map_id = Integer(required=False, load_default=None)
    s = String(required=False)
    match_strategy = String(load_default='longest', required=False, validate=OneOf(['longest', 'shortest', 'standard']))
    overlap = String(load_default='partial', required=False, validate=OneOf(['partial', 'full', 'match', 'matchend']))


class DiscoursemeDescriptionIDs(Schema):

    discourseme_description_ids = List(Integer, required=True)


# OUTPUT
class ConstellationDescriptionOut(Schema):

    id = Integer(required=True)
    corpus_id = Integer(required=True)
    subcorpus_id = Integer(required=True, dump_default=None, allow_none=True)
    s = String(required=True)
    match_strategy = String(required=True)
    # semantic_map_id = Integer(required=True, dump_default=None, allow_none=True)
    discourseme_descriptions = Nested(DiscoursemeDescriptionOut(many=True), required=True, dump_default=[])


class ConstellationAssociationItemOut(Schema):

    node = Integer(required=True)
    candidate = Integer(required=True)
    measure = String(required=True)
    score = Float(required=True, allow_none=True)


class ConstellationAssociationOut(Schema):

    N = Integer(required=True)
    s = String(required=True)
    nr_pairs = Integer(required=True)
    scores = Nested(ConstellationAssociationItemOut(many=True), required=True)
    scaled_scores = Nested(ConstellationAssociationItemOut(many=True), required=True)


class ConstellationBreakdownItemOut(Schema):

    id = Integer(required=True, allow_none=True)
    discourseme_id = Integer(required=True)
    source = String(required=True, validate=OneOf(['discoursemes', 'discourseme_items']))
    breakdown_id = Integer(required=True)
    item = String(required=True)
    freq = Integer(required=True)
    nr_tokens = Integer(required=True)
    ipm = Float(required=True)


class ConstellationBreakdownOut(Schema):

    constellation_description_id = Integer(required=True)
    p = String(required=True)
    items = Nested(ConstellationBreakdownItemOut(many=True), required=True)


#################
# API endpoints #
#################
@bp.post('/')
@bp.input(ConstellationDescriptionIn)
@bp.output(ConstellationDescriptionOut)
@bp.auth_required(auth)
def create_description(constellation_id, json_data):
    """Create description of constellation. Makes sure individual discourseme descriptions exist.

    """

    constellation = db.get_or_404(Constellation, constellation_id)

    corpus_id = json_data.get('corpus_id')
    corpus = db.get_or_404(Corpus, corpus_id)
    subcorpus_id = json_data.get('subcorpus_id')
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
        desc = DiscoursemeDescription.query.filter_by(
            discourseme_id=discourseme.id,
            corpus_id=corpus_id,
            subcorpus_id=subcorpus_id,
            filter_sequence=None,
            s=s_query,
            match_strategy=match_strategy
        ).first()
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
    """Get all descriptions of constellation.

    """

    descriptions = ConstellationDescription.query.filter_by(constellation_id=constellation_id).all()

    return [ConstellationDescriptionOut().dump(description) for description in descriptions]


@bp.get('/<description_id>/')
@bp.output(ConstellationDescriptionOut)
@bp.auth_required(auth)
def get_description(constellation_id, description_id):
    """Get constellation description.

    """

    description = db.get_or_404(ConstellationDescription, description_id)

    return ConstellationDescriptionOut().dump(description)


@bp.delete('/<description_id>/')
@bp.auth_required(auth)
def delete_description(constellation_id, description_id):
    """Delete constellation description.

    """

    description = db.get_or_404(ConstellationDescription, description_id)
    db.session.delete(description)
    db.session.commit()

    return 'Deletion successful.', 200


@bp.patch('/<description_id>/add-descriptions')
@bp.input(DiscoursemeDescriptionIDs, location='json')
@bp.output(ConstellationDescriptionOut(partial=True))
@bp.auth_required(auth)
def patch_description_add(constellation_id, description_id, json_data):
    """Patch constellation description: add discourseme description(s).

    """

    description = db.get_or_404(ConstellationDescription, description_id)
    discourseme_description_ids = json_data.get("discourseme_description_ids")
    discourseme_descriptions = [db.get_or_404(DiscoursemeDescription, desc_id) for desc_id in discourseme_description_ids]
    for desc in discourseme_descriptions:
        description.discourseme_descriptions.append(desc)
    db.session.commit()

    return ConstellationDescriptionOut().dump(description), 200


@bp.patch('/<description_id>/remove-descriptions')
@bp.input({'discourseme_description_ids': List(Integer, required=True)}, location='json')
@bp.output(ConstellationDescriptionOut(partial=True))
@bp.auth_required(auth)
def patch_description_remove(constellation_id, description_id, json_data):
    """Patch constellation description: remove discourseme description(s).

    """

    description = db.get_or_404(ConstellationDescription, description_id)
    discourseme_description_ids = json_data.get("discourseme_description_ids")
    discourseme_descriptions = [db.get_or_404(DiscoursemeDescription, desc_id) for desc_id in discourseme_description_ids]
    for desc in discourseme_descriptions:
        description.discourseme_descriptions.remove(desc)
    db.session.commit()

    return ConstellationDescriptionOut().dump(description), 200


@bp.patch('/<description_id>/add-discoursemes')
@bp.input(DiscoursemeIDs, location='json')
@bp.output(ConstellationDescriptionOut(partial=True))
@bp.auth_required(auth)
def patch_discourseme_add(constellation_id, description_id, json_data):
    """convenience function for adding discourseme(s) and creating and linking corresponding descriptions.

    """

    constellation = db.get_or_404(Constellation, constellation_id)
    description = db.get_or_404(ConstellationDescription, description_id)
    discourseme_ids = json_data.get("discourseme_ids")
    for discourseme_id in discourseme_ids:

        # link discourseme to constellation
        discourseme = db.get_or_404(Discourseme, discourseme_id)
        if discourseme not in constellation.discoursemes:
            constellation.discoursemes.append(discourseme)
            db.session.commit()

        # link discourseme description to constellation description
        desc = DiscoursemeDescription.query.filter_by(discourseme_id=discourseme.id,
                                                      corpus_id=description.corpus_id,
                                                      subcorpus_id=description.subcorpus_id,
                                                      filter_sequence=None,
                                                      s=description.s,
                                                      match_strategy=description.match_strategy).first()

        if not desc:
            # create discourseme description if necessary
            desc = discourseme_template_to_description(
                discourseme, [], description.corpus_id, description.subcorpus_id, description.s, description.match_strategy
            )

        if desc not in description.discourseme_descriptions:
            # link discourseme_description to constellation description if necessary
            description.discourseme_descriptions.append(desc)
            db.session.commit()

    return ConstellationDescriptionOut().dump(description), 200


@bp.patch('/<description_id>/remove-discoursemes')
@bp.input(DiscoursemeIDs, location='json')
@bp.output(ConstellationDescriptionOut(partial=True))
@bp.auth_required(auth)
def patch_discourseme_remove(constellation_id, description_id, json_data):
    """convenience function for adding discourseme(s) and creating and linking corresponding descriptions.

    """

    constellation = db.get_or_404(Constellation, constellation_id)
    description = db.get_or_404(ConstellationDescription, description_id)
    discourseme_ids = json_data.get("discourseme_ids")
    for discourseme_id in discourseme_ids:

        # link discourseme to constellation
        discourseme = db.get_or_404(Discourseme, discourseme_id)
        if discourseme in constellation.discoursemes:
            constellation.discoursemes.remove(discourseme)
            db.session.commit()

        # link discourseme description to constellation description
        desc = DiscoursemeDescription.query.filter_by(discourseme_id=discourseme.id,
                                                      corpus_id=description.corpus_id,
                                                      subcorpus_id=description.subcorpus_id,
                                                      filter_sequence=None,
                                                      s=description.s,
                                                      match_strategy=description.match_strategy).first()

        if desc and desc in description.discourseme_descriptions:
            description.discourseme_descriptions.remove(desc)
            db.session.commit()

    return ConstellationDescriptionOut().dump(description), 200


@bp.post('/<description_id>/discourseme-description')
@bp.input(DiscoursemeIn)
@bp.output(DiscoursemeOut)
@bp.auth_required(auth)
def post_items_into_constellation(constellation_id, description_id, json_data):
    """convenience function for creating a new discourseme incl. description during an analysis (e.g. drag & drop on semantic map)

    (1) create a discourseme with provided items
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
@bp.input({'focus_discourseme_id': Integer(load_default=None)}, location='query', arg_name='query_focus')
@bp.input({'filter_discourseme_ids': List(Integer(), load_default=[], required=False)}, location='query', arg_name='query_filter')
@bp.output(ConcordanceOut)
@bp.auth_required(auth)
def concordance_lines(constellation_id, description_id, query_data, query_focus, query_filter):
    """Get concordance lines of constellation description.

    TODO re-write using ..query.get_concordance_lines
    """

    focus_discourseme_id = query_focus.get('focus_discourseme_id')

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

    if focus_discourseme_id:
        focus_query = highlight_queries[focus_discourseme_id]
    else:
        if not filter_item:
            abort(400, 'Bad Request: no focus discourseme and no filter item provided')
        focus_query = get_or_create_query_assisted(
            description.corpus_id, description.subcorpus_id, [filter_item],
            filter_item_p_att, description.s,
            True, False, False
        )
    try:
        filter_queries = {disc_id: highlight_queries[disc_id] for disc_id in filter_discourseme_ids}
    except KeyError:
        # filtering for discourseme which are not part of constellation returns no concordance lines
        concordance = {
            'lines': [],
            'nr_lines': 0,
            'page_size': page_size,
            'page_number': page_number,
            'page_count': 0
        }

    else:
        if focus_discourseme_id and filter_item:
            # TODO: speed up - this can take up to 10 minutes for highly frequent items
            # only search for filter in context of focus
            filter_queries['_FILTER'] = get_or_create_query_assisted(
                description.corpus_id, description.subcorpus_id, [filter_item],
                filter_item_p_att, description.s,
                True, False, False, None, True
            )
            highlight_queries['_FILTER'] = filter_queries['_FILTER']

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


@bp.get("/<description_id>/concordance/<match_id>")
@bp.input(ConcordanceLineIn, location='query')
@bp.input({'focus_discourseme_id': Integer(required=True)}, location='query', arg_name='query_focus')
@bp.output(ConcordanceLineOut)
@bp.auth_required(auth)
def concordance_line(constellation_id, description_id, match_id, query_data, query_focus):
    """Get (additional context of) one concordance line.

    """

    description = db.get_or_404(ConstellationDescription, description_id)

    # display options
    primary = query_data.get('primary')
    secondary = query_data.get('secondary')

    window = query_data.get('window')
    context_break = query_data.get('context_break')

    extended_window = query_data.get('extended_window')
    extended_context_break = query_data.get('extended_context_break')

    # select and categorise queries
    highlight_queries = {desc.discourseme.id: desc._query for desc in description.discourseme_descriptions if desc.filter_sequence is None}
    focus_query = highlight_queries[query_focus['focus_discourseme_id']]

    # attributes to show
    p_show = [primary, secondary]
    s_show = focus_query.corpus.s_annotations

    concordance = ccc_concordance(focus_query,
                                  p_show, s_show,
                                  window, context_break,
                                  extended_window, extended_context_break,
                                  highlight_queries,
                                  match_id)

    return ConcordanceLineOut().dump(concordance['lines'][0]), 200


# ASSOCIATIONS
###############
@bp.get("/<description_id>/associations/")
@bp.output(ConstellationAssociationOut)
@bp.auth_required(auth)
def get_constellation_associations(constellation_id, description_id):
    """Get pairwise association scores for discoursemes in constellation, based on s-attribute.

    """

    description = db.get_or_404(ConstellationDescription, description_id)
    N = len(description.corpus.ccc().attributes.attribute(description.s, 's'))  # TODO: subcorpus size?

    if len(description.discourseme_descriptions) < 2:
        scores = dict()
        scaled_scores = dict()
        nr_pairs = 0

    else:
        context_ids = dict()
        for discourseme_description in description.discourseme_descriptions:
            matches_df = ccc_query(discourseme_description._query)
            if len(matches_df) == 0:
                context_ids[discourseme_description.discourseme.id] = set()
            else:
                context_ids[discourseme_description.discourseme.id] = set(matches_df['contextid'])

        current_app.logger.debug('get constellation associations :: counting co-occurrences')

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
        scores = measures.score(counts, freq=True, digits=6, boundary='poisson', vocab=len(counts))

        # TODO: why are there NAs?
        scores = scores.dropna()

        # scale scores
        scaled_scores_dict = dict()
        for sort_by in scores.columns:
            scaled_scores_dict[sort_by] = scores[sort_by] / scores[sort_by].abs().max()
        scaled_scores = DataFrame(index=scores.index, data=scaled_scores_dict)

        # convert to long format
        scores = scores.reset_index().melt(id_vars=['node', 'candidate'], var_name='measure', value_name='score')
        scaled_scores = scaled_scores.reset_index().melt(id_vars=['node', 'candidate'], var_name='measure', value_name='score')

        # replace NaNs with Nones
        scores = scores.replace({float('nan'): None})  # this should not happen
        scaled_scores = scaled_scores.replace({float('nan'): None})  # this does happen

        scores = scores.to_dict(orient='records')
        scaled_scores = scaled_scores.to_dict(orient='records')
        nr_pairs = len(pairs.items())

    # create return object
    association = dict(
        N=N,
        s=description.s,
        nr_pairs=nr_pairs,
        scores=scores,
        scaled_scores=scaled_scores
    )

    return ConstellationAssociationOut().dump(association), 200


@bp.get('/<description_id>/breakdown/')
@bp.input(BreakdownIn, location='query')
@bp.output(ConstellationBreakdownOut)
def constellation_description_get_breakdown(constellation_id, description_id, query_data):

    constellation_description = db.get_or_404(ConstellationDescription, description_id)
    p = query_data.get('p')

    if p not in constellation_description.corpus.p_atts:
        msg = f'p-attribute "{p}" does not exist in corpus "{constellation_description.corpus.cwb_id}"'
        current_app.logger.error(msg)
        abort(404, msg)

    breakdowns = list()
    for description in constellation_description.discourseme_descriptions:

        query = description._query
        breakdown = get_or_create(Breakdown, query_id=query.id, p=p)
        ccc_breakdown(breakdown)

        disc_freq = 0
        for item in breakdown.items:
            breakdowns.append({
                'id': item.id,
                'discourseme_id': description.discourseme.id,
                'source': 'discourseme_items',
                'breakdown_id': breakdown.id,
                'item': item.item,
                'freq': item.freq,
                'nr_tokens': item.nr_tokens,
                'ipm': item.ipm
            })
            disc_freq += item.freq

        breakdowns.append({
            'id': None,
            'discourseme_id': description.discourseme.id,
            'source': 'discoursemes',
            'breakdown_id': breakdown.id,
            'item': description.discourseme.name,
            'freq': disc_freq,
            'nr_tokens': breakdown.nr_tokens,
            'ipm': disc_freq / breakdown.nr_tokens * 10**6
        })

    constellation_breakdown = {
        'constellation_description_id': constellation_description.id,
        'p': p,
        'items': [ConstellationBreakdownItemOut().dump(breakdown) for breakdown in breakdowns]
    }

    return ConstellationBreakdownOut().dump(constellation_breakdown), 200


# META
#######
# @bp.get("/<query_id>/meta")
# @bp.input(ConstellationMetaIn, location='query')
# @bp.output(ConstellationMetaOut)
# @bp.auth_required(auth)
# def get_meta(constellation_id, description_id, query_data):
#     """Get meta distribution of discourseme constellation.

#     for each key and each subset of provided discourseme-ids: number of occurrences
#     """

#     query = db.get_or_404(Query, query_id)
#     level = query_data.get('level')
#     key = query_data.get('key')
#     p = query_data.get('p', 'word')

#     matches_df = ccc_query(query, return_df=True)
#     crps = query.corpus.ccc().subcorpus(df_dump=matches_df, overwrite=False)
#     df_meta = crps.concordance(p_show=[p], s_show=[f'{level}_{key}'], cut_off=None)[[p, f'{level}_{key}']].value_counts().reset_index()
#     df_meta.columns = ['item', 'value', 'frequency']

#     df_texts = DataFrame.from_records(get_meta_frequencies(query.corpus, level, key))
#     df_texts.columns = ['value', 'nr_texts']

#     df_tokens = DataFrame.from_records(get_meta_number_tokens(query.corpus, level, key))
#     df_tokens.columns = ['value', 'nr_tokens']

#     df_meta = df_meta.set_index('value').\
#         join(df_texts.set_index('value'), how='outer').\
#         join(df_tokens.set_index('value'), how='outer')

#     df_meta['nr_texts'] = to_numeric(df_meta['nr_texts'].fillna(0), downcast='integer')
#     df_meta['nr_tokens'] = to_numeric(df_meta['nr_tokens'].fillna(0), downcast='integer')

#     df_meta = df_meta.sort_values(by='frequency', ascending=False)

#     df_meta['ipm'] = round(df_meta['frequency'] / df_meta['nr_tokens'] * 10 ** 6, 6)

#     meta = df_meta.reset_index().to_dict(orient='records')

#     return [QueryMetaOut().dump(m) for m in meta], 200
