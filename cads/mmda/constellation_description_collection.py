#!/usr/bin/python3
# -*- coding: utf-8 -*-

from datetime import datetime

from apiflask import APIBlueprint, Schema
from apiflask.fields import Float, Integer, Nested, String
from apiflask.validators import OneOf
from association_measures.comparisons import rbo
from flask import current_app
from pandas import DataFrame

from .. import db
from ..database import SubCorpusCollection
from ..tsa import gam_smoothing
from ..users import auth
from .constellation_description import ConstellationDescriptionOut
from .constellation_description_collocation import (
    ConstellationCollocationIn, ConstellationCollocationOut, get_collo_items,
    get_or_create_coll)
from .database import (Constellation, ConstellationDescription,
                       ConstellationDescriptionCollection, Discourseme,
                       DiscoursemeDescription, DiscoursemeTemplateItems)
from .discourseme import DiscoursemeIDs, DiscoursemeIn, DiscoursemeOut
from .discourseme_description import discourseme_template_to_description

bp = APIBlueprint('collection', __name__, url_prefix='/collection/')


def calculate_rbo(description_left, collocation_left, description_right, collocation_right, sort_by="conservative_log_ratio", number=50, p=.95):
    """RBO calculation of two constellation description collocation analyses

    TODO: also return discourseme scores

    """
    scores_left = get_collo_items(description_left, collocation_left, number, 1, 'descending', sort_by, True, True, False)
    lrc_left = [score['score'] for item in scores_left['items'] for score in item['scores'] if score['measure'] == sort_by]
    items_left = [item['item'] for lrc, item in zip(lrc_left, scores_left['items']) if lrc > 0]

    scores_right = get_collo_items(description_right, collocation_right, number, 1, 'descending', sort_by, True, True, False)
    lrc_right = [score['score'] for item in scores_right['items'] for score in item['scores'] if score['measure'] == sort_by]
    items_right = [item['item'] for lrc, item in zip(lrc_right, scores_right['items']) if lrc > 0]

    if len(set(items_left).intersection(set(items_right))) == 0:
        r = 0.0
    else:
        r = rbo(items_left, items_right, p=p)[2]
    return r


def calculate_ufa(collection, window, p, marginals, include_negative, semantic_map_id, focus_discourseme_id,
                  filter_discourseme_ids, filter_item, filter_item_p_att, sort_by, max_depth):

    # get collocation objects
    current_app.logger.debug('calculate_ufa :: getting collocation items')
    collocations = list()
    for description in collection.constellation_descriptions:

        collocation = get_or_create_coll(
            description,
            window, p, marginals, include_negative,
            semantic_map_id,
            focus_discourseme_id,
            filter_discourseme_ids, filter_item, filter_item_p_att
        )
        if collocation:
            collocation.focus_discourseme_id = focus_discourseme_id
        collocations.append(collocation)
        if semantic_map_id is None and collocation:
            # use same map for following analyses
            semantic_map_id = collocation.semantic_map_id

    # calculate RBO scores
    current_app.logger.debug('calculate_ufa :: calculating RBO and fitting GAM')
    xs = list()
    scores = list()
    for i in range(1, len(collocations)):
        left = collocations[i-1]
        right = collocations[i]
        description_left = collection.constellation_descriptions[i-1]
        description_right = collection.constellation_descriptions[i]
        xs.append(description_right.subcorpus.name)
        if not left or not right:
            scores.append(0)    # no overlap between empty sets (None will not work with smoothing)
        else:
            scores.append(calculate_rbo(description_left, left, description_right, right, sort_by=sort_by, number=max_depth))

    if collection.subcorpus_collection.time_interval in ['month', 'year']:
        seconds = [datetime.fromisoformat(time_str + "-01").timestamp() for time_str in xs]
    else:
        seconds = [datetime.fromisoformat(time_str).timestamp() for time_str in xs]
    predictions = gam_smoothing(DataFrame({'x': seconds, 'score': scores}))

    current_app.logger.debug('calculate_ufa :: formatting output')
    # create output format
    ufa = list()
    for i, score, x, row in zip(range(1, len(collocations)), scores, xs, predictions.iterrows()):
        collocation_left = collocations[i-1]
        collocation_right = collocations[i]
        description_left = collection.constellation_descriptions[i-1]
        description_right = collection.constellation_descriptions[i]

        ufa_score = {
            'collocation_id_left': collocation_left.id if collocation_left else None,
            'description_id_left': description_left.id,
            'collocation_id_right': collocation_right.id if collocation_right else None,
            'description_id_right': description_right.id,
            'x_label': x,
            'score': score,
            'score_confidence': {
                'lower_95': min(1, row[1]['ci_025']) if score else None,
                'lower_90': min(1, row[1]['ci_050']) if score else None,
                'smooth': row[1]['smooth'] if score else None,
                'upper_90': max(0, row[1]['ci_950']) if score else None,
                'upper_95': max(0, row[1]['ci_975']) if score else None
            }
        }

        ufa.append(ufa_score)

    return {
        'collocations': [ConstellationCollocationOut().dump(collocation) if collocation else None for collocation in collocations],
        'ufa': ufa
    }


################
# API schemata #
################
class ConstellationDescriptionCollectionIn(Schema):

    subcorpus_collection_id = Integer(required=True)
    s = String(required=False)
    match_strategy = String(load_default='longest', required=False, validate=OneOf(['longest', 'shortest', 'standard']))
    overlap = String(load_default='partial', required=False, validate=OneOf(['partial', 'full', 'match', 'matchend']))


class ConstellationDescriptionCollectionOut(Schema):

    id = Integer(required=True)
    s = String(required=True, allow_none=True, dump_default=None)
    subcorpus_collection_id = Integer(required=True)
    match_strategy = String(load_default='longest', required=False, validate=OneOf(['longest', 'shortest', 'standard']))
    overlap = String(load_default='partial', required=False, validate=OneOf(['partial', 'full', 'match', 'matchend']))
    constellation_descriptions = Nested(ConstellationDescriptionOut(many=True), required=True, dump_default=[])


class UFAConfidenceIntervalOut(Schema):

    lower_95 = Float(required=True, allow_none=True)
    lower_90 = Float(required=True, allow_none=True)
    smooth = Float(required=True, allow_none=True)
    upper_90 = Float(required=True, allow_none=True)
    upper_95 = Float(required=True, allow_none=True)


class UFAScoreOut(Schema):

    collocation_id_left = Integer(required=True, allow_none=True, dump_default=None)
    description_id_left = Integer(required=True)
    collocation_id_right = Integer(required=True, allow_none=True, dump_default=None)
    description_id_right = Integer(required=True)
    x_label = String(required=True)
    score = Float(required=True, allow_none=True, dump_default=None)
    score_confidence = Nested(UFAConfidenceIntervalOut, required=True)


class UFAOut(Schema):

    collocations = Nested(ConstellationCollocationOut(many=True), required=True, dump_default=[])
    ufa = Nested(UFAScoreOut(many=True), required=True, dump_default=[])


#########################################
# CONSTELLATION DESCRIPTION COLLECTIONS #
#########################################
@bp.post('/')
@bp.input(ConstellationDescriptionCollectionIn)
@bp.output(ConstellationDescriptionCollectionOut)
@bp.auth_required(auth)
def create_constellation_description_collection(constellation_id, json_data):
    """DEPRECATED. USE PUT INSTEAD.

    Create constellation description collection.
    """

    constellation = db.get_or_404(Constellation, constellation_id)
    collection_id = json_data.get('subcorpus_collection_id')
    collection = db.get_or_404(SubCorpusCollection, collection_id)
    corpus = collection.corpus

    s_query = json_data.get('s', corpus.s_default)
    match_strategy = json_data.get('match_strategy')
    overlap = json_data.get('overlap')
    semantic_map_id = json_data.get('semantic_map_id')

    constellation_description_collection = ConstellationDescriptionCollection(
        constellation_id=constellation_id,
        subcorpus_collection_id=collection.id,
        corpus_id=corpus.id,
        s=s_query,
        match_strategy=match_strategy,
        overlap=overlap,
        semantic_map_id=semantic_map_id
    )
    db.session.add(constellation_description_collection)
    db.session.commit()

    for subcorpus in collection.subcorpora:

        current_app.logger.debug(f"creating constellation description collection: subcorpus {subcorpus.id}")
        description = ConstellationDescription(
            constellation_id=constellation.id,
            collection_id=constellation_description_collection.id,
            semantic_map_id=semantic_map_id,
            corpus_id=corpus.id,
            subcorpus_id=subcorpus.id,
            s=s_query,
            match_strategy=match_strategy,
            overlap=overlap
        )
        db.session.add(description)

        for discourseme in constellation.discoursemes:
            desc = DiscoursemeDescription.query.filter_by(discourseme_id=discourseme.id,
                                                          corpus_id=corpus.id,
                                                          subcorpus_id=subcorpus.id,
                                                          filter_sequence=None,
                                                          s=s_query,
                                                          match_strategy=match_strategy).first()
            if not desc:
                desc = discourseme_template_to_description(
                    discourseme,
                    [],
                    corpus.id,
                    subcorpus.id,
                    s_query,
                    match_strategy
                )
            description.discourseme_descriptions.append(desc)
            db.session.commit()

        constellation_description_collection.constellation_descriptions.append(description)
        db.session.commit()

    return ConstellationDescriptionCollectionOut().dump(constellation_description_collection), 200


@bp.put('/')
@bp.input(ConstellationDescriptionCollectionIn)
@bp.output(ConstellationDescriptionCollectionOut)
@bp.auth_required(auth)
def get_or_create_constellation_description_collection(constellation_id, json_data):
    """Get constellation description collection; create if not exists.

    """

    constellation = db.get_or_404(Constellation, constellation_id)
    collection_id = json_data.get('subcorpus_collection_id')
    collection = db.get_or_404(SubCorpusCollection, collection_id)
    corpus = collection.corpus

    s_query = json_data.get('s', corpus.s_default)
    match_strategy = json_data.get('match_strategy')
    overlap = json_data.get('overlap')
    semantic_map_id = json_data.get('semantic_map_id')

    cdc_query = ConstellationDescriptionCollection.query.filter_by(
        constellation_id=constellation_id,
        subcorpus_collection_id=collection.id,
        corpus_id=corpus.id,
        s=s_query,
        match_strategy=match_strategy,
        overlap=overlap,
    )

    if cdc_query.first():
        current_app.logger.debug("constellation description collection already exists")
        constellation_description_collection = cdc_query.first()

    else:
        current_app.logger.debug("creating constellation description collection")
        constellation_description_collection = ConstellationDescriptionCollection(
            constellation_id=constellation_id,
            subcorpus_collection_id=collection.id,
            corpus_id=corpus.id,
            s=s_query,
            match_strategy=match_strategy,
            overlap=overlap,
            semantic_map_id=semantic_map_id
        )
        db.session.add(constellation_description_collection)
        db.session.commit()

        for subcorpus in collection.subcorpora:

            current_app.logger.debug(f"creating constellation description collection: subcorpus {subcorpus.id}")
            description = ConstellationDescription(
                constellation_id=constellation.id,
                collection_id=constellation_description_collection.id,
                semantic_map_id=semantic_map_id,
                corpus_id=corpus.id,
                subcorpus_id=subcorpus.id,
                s=s_query,
                match_strategy=match_strategy,
                overlap=overlap
            )
            db.session.add(description)

            for discourseme in constellation.discoursemes:
                desc = DiscoursemeDescription.query.filter_by(discourseme_id=discourseme.id,
                                                              corpus_id=corpus.id,
                                                              subcorpus_id=subcorpus.id,
                                                              filter_sequence=None,
                                                              s=s_query,
                                                              match_strategy=match_strategy).first()
                if not desc:
                    desc = discourseme_template_to_description(
                        discourseme,
                        [],
                        corpus.id,
                        subcorpus.id,
                        s_query,
                        match_strategy
                    )
                description.discourseme_descriptions.append(desc)
                db.session.commit()

            constellation_description_collection.constellation_descriptions.append(description)
            db.session.commit()

    return ConstellationDescriptionCollectionOut().dump(constellation_description_collection), 200


@bp.get('/')
@bp.output(ConstellationDescriptionCollectionOut(many=True))
@bp.auth_required(auth)
def get_constellation_description_collections(constellation_id):
    """Get all description collections of constellation.

    """

    collections = db.session.query(ConstellationDescriptionCollection).filter_by(constellation_id=constellation_id).all()
    return [ConstellationDescriptionCollectionOut().dump(collection) for collection in collections], 200


@bp.get('/<collection_id>')
@bp.output(ConstellationDescriptionCollectionOut)
@bp.auth_required(auth)
def get_constellation_description_collection(constellation_id, collection_id):
    """Get details of constellation description collection.

    """

    collection = db.get_or_404(ConstellationDescriptionCollection, collection_id)
    return ConstellationDescriptionCollectionOut().dump(collection), 200


@bp.delete('/<collection_id>')
@bp.auth_required(auth)
def delete_constellation_description_collection(constellation_id, collection_id):
    """Delete constellation description collection.

    """

    collection = db.get_or_404(ConstellationDescriptionCollection, collection_id)
    db.session.delete(collection)
    db.session.commit()

    return 'Deletion successful.', 200


###################
# COLLOCATION/UFA #
###################
@bp.put('/<collection_id>/ufa')
@bp.input(ConstellationCollocationIn)
@bp.input({'sort_by': String(), 'max_depth': Integer()}, location='query')
@bp.output(UFAOut)
@bp.auth_required(auth)
def get_or_create_ufa(constellation_id, collection_id, json_data, query_data):
    """Get or create usage fluctuation analysis (list of collocation analyses).

    """

    collection = db.get_or_404(ConstellationDescriptionCollection, collection_id)

    # RBO options
    sort_by = query_data.get('sort_by', 'conservative_log_ratio')
    max_depth = query_data.get('max_depth', 50)

    # context options
    window = json_data.get('window')
    p = json_data.get('p')

    # marginals
    marginals = json_data.get('marginals', 'local')

    # include items with E11 > O11?
    include_negative = json_data.get('include_negative', False)

    # semantic map
    semantic_map_id = json_data.get('semantic_map_id', None)

    # focus
    focus_discourseme_id = json_data['focus_discourseme_id']

    # filter
    filter_discourseme_ids = json_data.get('filter_discourseme_ids')
    filter_item = json_data.get('filter_item')
    filter_item_p_att = json_data.get('filter_item_p_att')

    collocation_collection = calculate_ufa(collection, window, p, marginals, include_negative, semantic_map_id, focus_discourseme_id,
                                           filter_discourseme_ids, filter_item, filter_item_p_att, sort_by, max_depth)

    return UFAOut().dump(collocation_collection), 200


#########################
# Discourseme Management
#########################


@bp.patch('/<collection_id>/add-discoursemes')
@bp.input(DiscoursemeIDs, location='json')
@bp.output(ConstellationDescriptionCollectionOut)
@bp.auth_required(auth)
def patch_collection_add_discourseme(constellation_id, collection_id, json_data):
    """Patch collection: add discourseme description(s).

    """

    collection = db.get_or_404(ConstellationDescriptionCollection, collection_id)
    constellation = db.get_or_404(Constellation, constellation_id)
    discourseme_ids = json_data.get("discourseme_ids")

    for description in collection.constellation_descriptions:

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

    return ConstellationDescriptionCollectionOut().dump(collection), 200


@bp.patch('/<collection_id>/remove-discoursemes')
@bp.input(DiscoursemeIDs, location='json')
@bp.output(ConstellationDescriptionCollectionOut)
@bp.auth_required(auth)
def patch_collection_remove_discourseme(constellation_id, collection_id, json_data):
    """Patch collection: add discourseme description(s).

    """

    collection = db.get_or_404(ConstellationDescriptionCollection, collection_id)
    constellation = db.get_or_404(Constellation, constellation_id)
    discourseme_ids = json_data.get("discourseme_ids")

    for description in collection.constellation_descriptions:

        for discourseme_id in discourseme_ids:

            discourseme = db.get_or_404(Discourseme, discourseme_id)
            if discourseme in constellation.discoursemes:
                constellation.discoursemes.remove(discourseme)
                db.session.commit()

            desc = DiscoursemeDescription.query.filter_by(discourseme_id=discourseme.id,
                                                          corpus_id=description.corpus_id,
                                                          subcorpus_id=description.subcorpus_id,
                                                          filter_sequence=None,
                                                          s=description.s,
                                                          match_strategy=description.match_strategy).first()

            if desc and desc in description.discourseme_descriptions:
                description.discourseme_descriptions.remove(desc)
                db.session.commit()

    return ConstellationDescriptionCollectionOut().dump(collection), 200


@bp.post('/<collection_id>/discourseme-description')
@bp.input(DiscoursemeIn)
@bp.output(DiscoursemeOut)
@bp.auth_required(auth)
def post_items_into_collection(constellation_id, collection_id, json_data):
    """convenience function for creating a new discourseme incl. description during an analysis (e.g. drag & drop on semantic map)

    (1) create a discourseme with provided items
    (2) create a suitable description in the constellation description corpus
    (3) link discourseme to constellation
    (4) link discourseme description and constellation description

    """

    constellation = db.get_or_404(Constellation, constellation_id)
    collection = db.get_or_404(ConstellationDescriptionCollection, collection_id)

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

    for description in collection.constellation_descriptions:
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
def put_items_into_collection(constellation_id, collection_id, json_data):
    """same as corresponding POST but will only create if discourseme with the same name does not exist.

    """

    constellation = db.get_or_404(Constellation, constellation_id)
    collection = db.get_or_404(ConstellationDescriptionCollection, collection_id)
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

    for description in collection.constellation_descriptions:

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
