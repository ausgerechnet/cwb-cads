#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""
Constellation views
"""

# requirements
from apiflask import APIBlueprint
from flask import current_app, jsonify, request
from ..database import Constellation, Discourseme, User, Corpus

from .. import db
from ..corpus import ccc_corpus
from .login_views import user_required

constellation_blueprint = APIBlueprint('constellation', __name__, template_folder='templates')


@constellation_blueprint.route('/api/user/<username>/constellation/', methods=['POST'])
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


@constellation_blueprint.route('/api/user/<username>/constellation/<constellation>/', methods=['GET'])
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


@constellation_blueprint.route('/api/user/<username>/constellation/', methods=['GET'])
@user_required
def get_constellations(username):
    """ List all constellations for a user.

    """

    # Get User
    user = User.query.filter_by(username=username).first()
    constellations = Constellation.query.filter_by(user_id=user.id).all()
    constellations_list = [constellation.serialize for constellation in constellations]

    return jsonify(constellations_list), 200


@constellation_blueprint.route('/api/user/<username>/constellation/<constellation>/', methods=['PUT'])
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


@constellation_blueprint.route('/api/user/<username>/constellation/<constellation>/', methods=['DELETE'])
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


@constellation_blueprint.route('/api/user/<username>/constellation/<constellation>/discourseme/', methods=['GET'])
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


@constellation_blueprint.route('/api/user/<username>/constellation/<constellation>/discourseme/<discourseme>/', methods=['PUT'])
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


@constellation_blueprint.route('/api/user/<username>/constellation/<constellation>/discourseme/<discourseme>/', methods=['DELETE'])
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


@constellation_blueprint.route('/api/user/<username>/constellation/<constellation>/concordance/', methods=['GET'])
@user_required
def get_constellation_concordance(username, constellation):
    """ Get concordance lines for a constellation.

    """

    user = User.query.filter_by(username=username).first()
    constellation = Constellation.query.filter_by(id=constellation, user_id=user.id).first()

    # .. parameters
    corpus_name = request.args.get('corpus')
    p_query = request.args.get('p_query', 'lemma')
    context_break = request.args.get('s_break', 'text')
    cut_off = request.args.get('cut_off', 10000)
    random_seed = request.args.get('order', 42)
    p_show = ['word', 'lemma']

    corpus = Corpus.query.filter_by(cwb_id=corpus_name).first()
    crps = ccc_corpus(corpus_name,
                      cqp_bin=current_app.config['CCC_CQP_BIN'],
                      registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                      data_dir=current_app.config['CCC_DATA_DIR'])
    s_show = crps['s_annotations']

    # preprocess queries
    highlight_queries = dict()
    filter_queries = dict()
    from ccc.utils import format_cqp_query
    for discourseme in constellation.filter_discoursemes:
        filter_queries[str(discourseme.id)] = format_cqp_query(discourseme.items.split("\t"), p_query=p_query, escape=False)
        highlight_queries[str(discourseme.id)] = format_cqp_query(discourseme.items.split("\t"), p_query=p_query, escape=False)
    for discourseme in constellation.highlight_discoursemes:
        highlight_queries[str(discourseme.id)] = format_cqp_query(discourseme.items.split("\t"), p_query=p_query, escape=False)

    from ccc import Corpus as Crps
    corpus = Crps(corpus_name=corpus.cwb_id,
                  lib_dir=None,
                  cqp_bin=current_app.config['CCC_CQP_BIN'],
                  registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                  data_dir=current_app.config['CCC_DATA_DIR'])

    lines = corpus.quick_conc(
        topic_query="",
        filter_queries=filter_queries,
        highlight_queries=highlight_queries,
        s_context=context_break,
        window=10,
        cut_off=cut_off,
        order=random_seed,
        p_show=p_show,
        s_show=s_show,
        match_strategy='longest'
    )

    # repair format
    out = list()
    for key, value in enumerate(lines):
        out.append({'id': key, **value})
    conc_json = jsonify(out)

    return conc_json, 200


# ASSOCIATIONS
@constellation_blueprint.route('/api/user/<username>/constellation/<constellation>/association/', methods=['GET'])
# @user_required
def get_constellation_associations(username, constellation):
    """ Get association scores for all discoursemes in constellation.

    """

    # check request
    # ... user
    user = User.query.filter_by(username=username).first()
    # ... corpus
    corpus = request.args.get('corpus', None)
    # ... p-query
    p_query = request.args.get('p_query', 'lemma')
    # ... s-break
    s_break = request.args.get('s_break', 'text')
    # ... constellation
    constellation = Constellation.query.filter_by(id=constellation, user_id=user.id).first()

    assoc = {'msg': 'not implemented'}
    return jsonify(assoc), 200
