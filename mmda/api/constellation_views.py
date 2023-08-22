#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""
Constellation views
"""

# requirements
from apiflask import APIBlueprint
from flask import current_app, jsonify, request
from ..database import Constellation, Discourseme, User

from .. import db
from ..corpus import ccc_corpus

constellation_blueprint = APIBlueprint('constellation', __name__, template_folder='templates')


# CREATE
@constellation_blueprint.route('/api/user/<username>/constellation/', methods=['POST'])
# @user_required
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
        constellation_discourseme = discourseme in constellation.filter_discoursemes
        if constellation_discourseme:
            continue

        # Add discourseme link
        constellation.filter_discoursemes.append(discourseme)
        db.session.add(constellation)

    db.session.commit()

    return jsonify({'msg': constellation.id}), 201


# READ
@constellation_blueprint.route('/api/user/<username>/constellation/<constellation>/', methods=['GET'])
# @user_required
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


# READ
@constellation_blueprint.route('/api/user/<username>/constellation/', methods=['GET'])
# @user_required
def get_constellations(username):
    """ List all constellations for a user.

    """

    # Get User
    user = User.query.filter_by(username=username).first()
    constellations = Constellation.query.filter_by(user_id=user.id).all()
    constellations_list = [constellation.serialize for constellation in constellations]

    return jsonify(constellations_list), 200


# UPDATE
@constellation_blueprint.route('/api/user/<username>/constellation/<constellation>/', methods=['PUT'])
# @user_required
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


# DELETE
@constellation_blueprint.route('/api/user/<username>/constellation/<constellation>/', methods=['DELETE'])
# @user_required
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


# READ
@constellation_blueprint.route('/api/user/<username>/constellation/<constellation>/discourseme/', methods=['GET'])
# @user_required
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
    constellation_discoursemes = [discourseme.serialize for discourseme in constellation.filter_discoursemes]
    if not constellation_discoursemes:
        return jsonify([]), 200

    return jsonify(constellation_discoursemes), 200


# UPDATE
@constellation_blueprint.route('/api/user/<username>/constellation/<constellation>/discourseme/<discourseme>/', methods=['PUT'])
# @user_required
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
    if discourseme in constellation.filter_discoursemes:
        return jsonify({'msg': 'Already linked'}), 200

    # Add Link to DB
    constellation.filter_discoursemes.append(discourseme)
    db.session.add(constellation)
    db.session.commit()

    return jsonify({'msg': 'Updated'}), 200


# DELETE
@constellation_blueprint.route('/api/user/<username>/constellation/<constellation>/discourseme/<discourseme>/', methods=['DELETE'])
# @user_required
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

    if discourseme not in constellation.filter_discoursemes:
        return jsonify({'msg': 'Not found'}), 404

    constellation.filter_discoursemes.remove(discourseme)
    db.session.add(constellation)
    db.session.commit()

    return jsonify({'msg': 'Deleted'}), 200


# CONCORDANCE LINES
@constellation_blueprint.route('/api/user/<username>/constellation/<constellation>/concordance/', methods=['GET'])
# @user_required
def get_constellation_concordance(username, constellation):
    """ Get concordance lines for a constellation.

    """

    # check request
    # ... user
    user = User.query.filter_by(username=username).first()
    # ... corpus
    corpus_name = request.args.get('corpus', None)
    # ... p-query
    p_query = request.args.get('p_query', 'lemma')
    # ... s-break
    s_break = request.args.get('s_break', 'text')
    # ... how many?
    cut_off = request.args.get('cut_off', 10000)
    # ... how to sort them?
    order = request.args.get('order', 'random')

    # not set yet
    p_show = ['word', 'lemma']

    if corpus_name is None:
        return jsonify({'msg': 'no corpus provided'}), 404

    corpus = ccc_corpus(corpus_name,
                        cqp_bin=current_app.config['CCC_CQP_BIN'],
                        registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                        data_dir=current_app.config['CCC_DATA_DIR'])
    s_show = corpus['s_annotations']

    # get constellation discoursemes as dict
    constellation = Constellation.query.filter_by(id=constellation, user_id=user.id).first()
    discoursemes = dict()
    for disc in constellation.filter_discoursemes:
        discoursemes[str(disc.id)] = disc.items

    flags_query = "%c"
    random_seed = 43

    # use cwb-ccc to extract data
    concordance = ccc_concordance(
        corpus_name=corpus_name,
        cqp_bin=current_app.config['CCC_CQP_BIN'],
        registry_dir=current_app.config['CCC_REGISTRY_DIR'],
        data_dir=current_app.config['CCC_DATA_DIR'],
        lib_dir=current_app.config['CCC_LIB_DIR'],
        topic_discourseme={},
        filter_discoursemes={},
        additional_discoursemes=discoursemes,
        s_context=s_break,
        window_size=0,
        context=None,
        p_query=p_query,
        p_show=p_show,
        s_show=s_show,
        s_query=s_break,
        order=order,
        cut_off=cut_off,
        flags_query=flags_query,
        escape_query=True,
        random_seed=random_seed
    )

    if concordance is None:
        return jsonify({'msg': 'empty result'}), 404

    # repair format
    out = list()
    for key, value in enumerate(concordance):
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
    discoursemes = dict()
    for disc in constellation.filter_discoursemes:
        discoursemes[disc.name] = disc.items

    assoc = ccc_constellation_association(
        corpus_name=corpus,
        cqp_bin=current_app.config['CCC_CQP_BIN'],
        registry_dir=current_app.config['CCC_REGISTRY_DIR'],
        data_dir=current_app.config['CCC_DATA_DIR'],
        lib_dir=current_app.config['CCC_LIB_DIR'],
        discoursemes=discoursemes,
        p_query=p_query,
        s_query=s_break,
        flags_query="%c",
        escape_query=True,
        s_context=None,
        context=None
    )

    return jsonify(assoc), 200
