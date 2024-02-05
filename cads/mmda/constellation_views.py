#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""
Constellation views
"""

from itertools import combinations

# requirements
from apiflask import APIBlueprint
from association_measures import measures
from ccc import Corpus as Crps
from ccc.utils import format_cqp_query
from flask import current_app, jsonify, request
from pandas import DataFrame

from .. import db
from ..corpus import ccc_corpus_attributes
from ..concordance import ccc_concordance
from ..database import Constellation, Corpus, Discourseme, User
from ..query import ccc_query, get_or_create_query
from .login_views import user_required

constellation_blueprint = APIBlueprint('constellation', __name__, url_prefix='/user/<username>/constellation')


def pairwise_intersections(dict_of_sets):

    nt = lambda a, b: len(dict_of_sets[a].intersection(dict_of_sets[b]))
    res = dict([(t, nt(*t)) for t in combinations(dict_of_sets.keys(), 2)])
    return res


@constellation_blueprint.route('/', methods=['POST'])
@user_required
def create_constellation(username):
    """ Create new constellation.

    """

    # Check Request. Discoursemes should be List of IDs
    name = request.json.get('name', None)
    discoursemes = request.json.get('discoursemes', [])

    # Get User
    user = User.query.filter_by(username=username).first()

    # Create Constellation
    constellation = Constellation(name=name, user_id=user.id)
    db.session.add(constellation)
    db.session.commit()

    for discourseme_id in discoursemes:
        # Check if disourseme exists
        discourseme = Discourseme.query.filter_by(id=discourseme_id, user_id=user.id).first()
        if not discourseme:
            continue

        # Check if exists alread
        constellation_discourseme = discourseme in constellation.highlight_discoursemes
        if constellation_discourseme:
            continue

        # Add discourseme link
        constellation.highlight_discoursemes.append(discourseme)
        db.session.add(constellation)

    db.session.commit()

    return jsonify({'msg': constellation.id}), 201


@constellation_blueprint.route('/<constellation>/', methods=['GET'])
@user_required
def get_constellation(username, constellation):
    """ Get details for constellation.

    """

    # Get User
    user = User.query.filter_by(username=username).first()

    # Get from DB
    constellation = Constellation.query.filter_by(id=constellation, user_id=user.id).first()

    if not constellation:
        return jsonify({'msg': 'No such constellation'}), 404

    return jsonify(constellation.serialize), 200


@constellation_blueprint.route('/', methods=['GET'])
@user_required
def get_constellations(username):
    """ List all constellations for a user.

    """

    # Get User
    user = User.query.filter_by(username=username).first()
    constellations = Constellation.query.filter_by(user_id=user.id).all()
    constellations_list = [constellation.serialize for constellation in constellations]

    return jsonify(constellations_list), 200


@constellation_blueprint.route('/<constellation>/', methods=['PUT'])
@user_required
def update_constellation(username, constellation):
    """ Update constellation details.

    """

    # Check request
    name = request.json.get('name', None)

    # Get User
    user = User.query.filter_by(username=username).first()

    # Get Constellation from DB
    constellation = Constellation.query.filter_by(id=constellation, user_id=user.id).first()
    if not constellation:
        return jsonify({'msg': 'No such constellation'}), 404

    constellation.name = name
    db.session.commit()

    return jsonify({'msg': constellation.id}), 200


@constellation_blueprint.route('/<constellation>/', methods=['DELETE'])
@user_required
def delete_constellation(username, constellation):
    """ Delete constellation.

    """

    # Get User
    user = User.query.filter_by(username=username).first()

    # Remove Constellation from DB
    constellation = Constellation.query.filter_by(id=constellation, user_id=user.id).first()
    if not constellation:
        return jsonify({'msg': 'No such constellation'}), 404

    db.session.delete(constellation)
    db.session.commit()

    return jsonify({'msg': 'Deleted'}), 200


@constellation_blueprint.route('/<constellation>/discourseme/', methods=['GET'])
@user_required
def get_discoursemes_for_constellation(username, constellation):
    """ List discoursemes for constellation.

    """

    # Get User
    user = User.query.filter_by(username=username).first()

    # Get Constellation from DB
    constellation = Constellation.query.filter_by(id=constellation, user_id=user.id).first()
    if not constellation:
        return jsonify({'msg': 'No such constellation'}), 404

    # Get Discoursemes list from DB
    constellation_discoursemes = [discourseme.serialize for discourseme in constellation.filter_discoursemes + constellation.highlight_discoursemes]

    return jsonify(constellation_discoursemes), 200


@constellation_blueprint.route('/<constellation>/discourseme/<discourseme>/', methods=['PUT'])
@user_required
def put_discourseme_into_constellation(username, constellation, discourseme):
    """ Put a discourseme into a constellation.

    """

    # Get User
    user = User.query.filter_by(username=username).first()

    # Get Constellation from DB
    constellation = Constellation.query.filter_by(id=constellation, user_id=user.id).first()
    if not constellation:
        return jsonify({'msg': 'No such constellation'}), 404

    # Get Discourseme from DB
    discourseme = Discourseme.query.filter_by(id=discourseme, user_id=user.id).first()
    if not discourseme:
        return jsonify({'msg': 'No such discourseme'}), 404

    # Check if exists
    if discourseme in constellation.highlight_discoursemes:
        return jsonify({'msg': 'Already linked'}), 200

    # Add Link to DB
    constellation.highlight_discoursemes.append(discourseme)
    db.session.add(constellation)
    db.session.commit()

    return jsonify({'msg': 'Updated'}), 200


@constellation_blueprint.route('/<constellation>/discourseme/<discourseme>/', methods=['DELETE'])
@user_required
def delete_discourseme_from_constellation(username, constellation, discourseme):
    """
    Remove a discourseme from a constellation
    """

    # Get User
    user = User.query.filter_by(username=username).first()

    # Get Constellation from DB
    constellation = Constellation.query.filter_by(id=constellation, user_id=user.id).first()
    if not constellation:
        return jsonify({'msg': 'No such constellation'}), 404

    # Get Discourseme from DB
    discourseme = Discourseme.query.filter_by(id=discourseme, user_id=user.id).first()
    if not discourseme:
        return jsonify({'msg': 'No such discourseme'}), 404

    if discourseme not in constellation.highlight_discoursemes:
        return jsonify({'msg': 'Not found'}), 404

    constellation.highlight_discoursemes.remove(discourseme)
    db.session.add(constellation)
    db.session.commit()

    return jsonify({'msg': 'Deleted'}), 200


@constellation_blueprint.route('/<constellation>/concordance/', methods=['GET'])
@user_required
def get_constellation_concordance(username, constellation):
    """ Get concordance lines for a constellation.

    """

    user = User.query.filter_by(username=username).first()
    constellation = Constellation.query.filter_by(id=constellation, user_id=user.id).first()

    # parameters
    corpus_name = request.args.get('corpus')
    p_query = request.args.get('p_query', 'lemma')
    context_break = request.args.get('s_break', 'text')
    cut_off = request.args.get('cut_off', 10000)
    order = request.args.get('order', 42)
    p_show = ['word', 'lemma']

    corpus = Corpus.query.filter_by(cwb_id=corpus_name).first()
    crps = ccc_corpus_attributes(corpus_name,
                      cqp_bin=current_app.config['CCC_CQP_BIN'],
                      registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                      data_dir=current_app.config['CCC_DATA_DIR'])
    s_show = crps['s_annotations']

    # preprocess queries
    filter_queries = dict()
    for discourseme in constellation.filter_discoursemes + constellation.highlight_discoursemes:
        discourseme_items = discourseme.get_items(corpus.id)
        filter_queries[str(discourseme.id)] = format_cqp_query(discourseme_items, p_query=p_query, escape=False)

    lines = ccc_concordance(query=None, context_break=context_break, p_show=p_show, s_show=s_show,
                            highlight_discoursemes=constellation.highlight_discoursemes+constellation.filter_discoursemes,
                            filter_queries=filter_queries, order=order, cut_off=cut_off, cwb_id=corpus.cwb_id, bools=True)

    current_app.logger.debug('Get constellation concordance :: formatting')
    out = list()
    for key, value in enumerate(lines):
        out.append({'id': key, **value})
    conc_json = jsonify(out)

    return conc_json, 200


@constellation_blueprint.route('/<constellation>/association/', methods=['GET'])
@user_required
def get_constellation_associations(username, constellation):
    """ Get association scores for all discoursemes in constellation.

    """

    user = User.query.filter_by(username=username).first()
    constellation = Constellation.query.filter_by(id=constellation, user_id=user.id).first()

    # parameters
    corpus_name = request.args.get('corpus', None)
    p_query = request.args.get('p_query', 'lemma')
    context_break = request.args.get('s_break', 'text')
    match_strategy = 'longest'

    corpus = Corpus.query.filter_by(cwb_id=corpus_name).first()
    crps = Crps(corpus_name=corpus.cwb_id,
                lib_dir=None,
                cqp_bin=current_app.config['CCC_CQP_BIN'],
                registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                data_dir=current_app.config['CCC_DATA_DIR'])

    current_app.logger.debug('Get constellation association :: collecting matches')
    context_ids = dict()
    for discourseme in constellation.highlight_discoursemes + constellation.filter_discoursemes:
        query = get_or_create_query(corpus, discourseme, context_break, p_query, match_strategy)
        matches_df = ccc_query(query)
        s_att = crps.dump2satt(matches_df, context_break)
        context_ids[f'{discourseme.name} (ID: {discourseme.id})'] = set(s_att[f'{context_break}_cwbid'])

    current_app.logger.debug('Get constellation association :: calculating co-occurrences')
    N = len(crps.attributes.attribute(context_break, 's'))
    records = list()
    for pair, f in pairwise_intersections(context_ids).items():
        pair = sorted(pair)
        f1 = len(context_ids[pair[0]])
        f2 = len(context_ids[pair[1]])
        if f1 == 0 or f2 == 0:
            continue
        records.append({'node': pair[0],
                        'item': pair[1],
                        'f': f, 'f1': f1, 'f2': f2, 'N': N})

    counts = DataFrame(records).set_index(['node', 'item'])
    try:
        scores = measures.score(counts, freq=True, per_million=True, digits=6, boundary='poisson', vocab=len(counts)).round(4)
        assoc = counts.drop(['N'], axis=1).join(scores)
    except ZeroDivisionError:
        assoc = counts

    assoc = assoc.reset_index().rename({'item': 'candidate'}, axis=1).to_dict(orient='index').values()

    return jsonify(list(assoc)), 200
