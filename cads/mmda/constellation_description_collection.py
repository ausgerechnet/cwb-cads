#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Float, Integer, Nested, String
from datetime import datetime
from apiflask.validators import OneOf
from association_measures.comparisons import rbo
from flask import current_app
from pandas import DataFrame

from .. import db
from ..database import (CollocationItem, CollocationItemScore,
                        SubCorpusCollection)
from ..users import auth
from .constellation_description import ConstellationDescriptionOut
from .constellation_description_collocation import (
    ConstellationCollocationIn, ConstellationCollocationOut,
    get_or_create_coll)
from .database import (Constellation, ConstellationDescription,
                       ConstellationDescriptionCollection,
                       DiscoursemeDescription)
from .discourseme_description import discourseme_template_to_description

bp = APIBlueprint('collection', __name__, url_prefix='/collection/')


def calculate_time_diff(time_strings, unit='minutes'):
    """
    Calculate the difference between consecutive time strings in the provided unit.

    :param time_strings: List of time strings
    :param unit: Time unit to calculate the difference ('minutes', 'hours', 'seconds', 'days', 'weeks', 'months')
    :return: List of time differences in the specified unit
    """
    # Convert time strings to datetime objects
    time_objects = [datetime.fromisoformat(time_str) for time_str in time_strings]

    # Calculate the time differences in the specified unit
    time_diffs = []
    for i in range(1, len(time_objects)):
        diff = time_objects[i] - time_objects[i-1]

        # Convert the difference to different units
        if unit == 'minutes':
            diff_value = diff.total_seconds() / 60
        elif unit == 'hours':
            diff_value = diff.total_seconds() / 3600
        elif unit == 'seconds':
            diff_value = diff.total_seconds()
        elif unit == 'days':
            diff_value = diff.days
        elif unit == 'weeks':
            diff_value = diff.days / 7
        elif unit == 'months':
            diff_value = diff.days / 30  # Approximate by assuming 30 days in a month
        else:
            raise ValueError(f"Unsupported unit '{unit}'. Choose from 'minutes', 'hours', 'seconds', 'days', 'weeks', 'months'.")

        time_diffs.append(diff_value)

    return time_diffs


class ConstellationDescriptionCollectionIn(Schema):

    subcorpus_collection_id = Integer(required=True)
    s = String(required=False)
    match_strategy = String(load_default='longest', required=False, validate=OneOf(['longest', 'shortest', 'standard']))
    overlap = String(load_default='partial', required=False, validate=OneOf(['partial', 'full', 'match', 'matchend']))


class ConstellationDescriptionCollectionOut(Schema):

    id = Integer(required=True)
    s = String(required=False, allow_none=True)
    subcorpus_collection_id = Integer(required=True)
    match_strategy = String(load_default='longest', required=False, validate=OneOf(['longest', 'shortest', 'standard']))
    overlap = String(load_default='partial', required=False, validate=OneOf(['partial', 'full', 'match', 'matchend']))
    constellation_descriptions = Nested(ConstellationDescriptionOut(many=True), required=True, dump_default=[])


class ConfidenceIntervalOut(Schema):

    lower_95 = Float(allow_none=True)
    lower_90 = Float(allow_none=True)
    median = Float(allow_none=True)
    upper_90 = Float(allow_none=True)
    upper_95 = Float(allow_none=True)


class UFAScoreOut(Schema):

    left_id = Integer(allow_none=True)
    right_id = Integer(allow_none=True)
    x_label = String()
    score = Float(allow_none=True)
    confidence = Nested(ConfidenceIntervalOut)


class ConstellationDescriptionCollectionCollocationOut(Schema):

    collocations = Nested(ConstellationCollocationOut(many=True), required=True)
    ufa = Nested(UFAScoreOut(many=True))


def calculate_rbo(left, right, sort_by="conservative_log_ratio", number=50):

    # TODO: this does not seem to be right, especially for rbo(left, left)
    current_app.logger.warning("verify correct implementation of RBO")

    # get left scores
    scores_left = CollocationItemScore.query.filter(
        CollocationItemScore.collocation_id == left.id,
        CollocationItemScore.measure == sort_by
    ).order_by(
        CollocationItemScore.score.desc()
    ).paginate(
        page=1, per_page=number
    )
    df_ids = DataFrame([vars(s) for s in scores_left], columns=['collocation_item_id'])
    items_left = [db.get_or_404(CollocationItem, id).item for id in df_ids['collocation_item_id']]

    # get right scores
    scores_right = CollocationItemScore.query.filter(
        CollocationItemScore.collocation_id == right.id,
        CollocationItemScore.measure == sort_by
    ).order_by(
        CollocationItemScore.score.desc()
    ).paginate(
        page=1, per_page=number
    )
    df_ids = DataFrame([vars(s) for s in scores_right], columns=['collocation_item_id'])
    items_right = [db.get_or_404(CollocationItem, id).item for id in df_ids['collocation_item_id']]

    rbo_values = rbo(items_left, items_right)

    return rbo_values


# CONSTELLATION COLLECTIONS
############################
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


@bp.get('/<collection_id>')
@bp.output(ConstellationDescriptionCollectionOut)
@bp.auth_required(auth)
def get_constellation_description_collection(constellation_id, collection_id):

    collection = db.get_or_404(ConstellationDescriptionCollection, collection_id)
    return ConstellationDescriptionCollectionOut().dump(collection), 200


@bp.delete('/<collection_id>')
@bp.output(ConstellationDescriptionCollectionOut)
@bp.auth_required(auth)
def delete_constellation_description_collection(constellation_id, collection_id):

    collection = db.get_or_404(ConstellationDescriptionCollection, collection_id)
    db.session.delete(collection)
    db.session.commit()

    return 'Deletion successful.', 200


@bp.put('/<collection_id>/collocation')
@bp.input(ConstellationCollocationIn)
@bp.output(ConstellationDescriptionCollectionCollocationOut)
@bp.auth_required(auth)
def get_or_create_collocation(constellation_id, collection_id, json_data):

    collection = db.get_or_404(ConstellationDescriptionCollection, collection_id)

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

    collocations = list()
    for description in collection.constellation_descriptions:

        collocation = get_or_create_coll(
            description,
            window, p, marginals, include_negative,
            semantic_map_id,
            focus_discourseme_id,
            filter_discourseme_ids, filter_item, filter_item_p_att
        )

        collocations.append(collocation)
        if semantic_map_id is None:
            # use same map for following analyses
            semantic_map_id = collocation.semantic_map_id

    xs = list()
    scores = list()
    for i in range(1, len(collocations)):
        left = collocations[i-1]
        right = collocations[i]
        description = collection.constellation_descriptions[i]
        xs.append(description.subcorpus.name)
        if not left or not right:
            scores.append(None)
        else:
            scores.append(calculate_rbo(left, right, sort_by='conservative_log_ratio', number=50))

    # diffs = calculate_time_diff([datetime.fromisoformat(time_str) for time_str in x])
    # TODO calculate smoothing

    ufa = list()
    for i, score, x in zip(range(1, len(collocations)), scores, xs):

        left = collocations[i-1]
        right = collocations[i]

        # print(right._query.subcorpus.name)
        # print(datetime.fromisoformat(right._query.subcorpus.name))

        ufa_score = {
            'left_id': left.id if left else None,
            'right_id': right.id if right else None,
            'x_label': x,
            'score': score,
            'confidence': {
                'lower_95': score + .02 if score else None,
                'lower_90': score + .01 if score else None,
                'median': score,
                'upper_90': score - .01 if score else None,
                'upper_95': score - .02 if score else None
            }
        }

        ufa.append(ufa_score)

    collocation_collection = {
        'collocations': [ConstellationCollocationOut().dump(collocation) for collocation in collocations],
        'ufa': ufa
    }

    return ConstellationDescriptionCollectionCollocationOut().dump(collocation_collection), 200
