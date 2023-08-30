#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""
Collocation view
"""

from apiflask import APIBlueprint
from association_measures import measures
from ccc import Corpus as Crps
from ccc.utils import cqp_escape, format_cqp_query
from flask import current_app, jsonify, request
from pandas import DataFrame

from .. import db
from ..breakdown import BreakdownItemsOut, ccc_breakdown
from ..collocation import ccc_collocates
from ..concordance import ConcordanceLinesOut, ccc_concordance
from ..corpus import ccc_corpus
from ..database import (Breakdown, Collocation, Constellation, Coordinates,
                        Corpus, Discourseme, Matches, Query, User)
from ..query import ccc_query
from ..semantic_map import CoordinatesOut, ccc_semmap, ccc_semmap_update
from .login_views import user_required

collocation_blueprint = APIBlueprint('collocation', __name__)


def score_counts(counts, cut_off=200):

    ams_dict = {
        # conservative estimates
        'conservative_log_ratio': 'Conservative LR',
        # frequencies
        'O11': 'obs.',
        'E11': 'exp.',
        'ipm': 'IPM (obs.)',
        'ipm_expected': 'IPM (exp.)',
        # asymptotic hypothesis tests
        'log_likelihood': 'LLR',
        'z_score': 'z-score',
        't_score': 't-score',
        'simple_ll': 'simple LL',
        # point estimates of association strength
        'dice': 'Dice',
        'log_ratio': 'log-ratio',
        'min_sensitivity': 'min. sensitivity',
        'liddell': 'Liddell',
        # information theory
        'mutual_information': 'MI',
        'local_mutual_information': 'local MI',
    }

    df = measures.score(counts, freq=True, per_million=True, digits=6, boundary='poisson', vocab=len(counts))
    df = df.loc[df['O11'] > df['E11']]

    # select columns
    df = df[list(ams_dict.keys())]

    # select items (top cut_off of each AM)
    items = set()
    for am in ams_dict.keys():
        if am not in ['O11', 'ipm', 'ipm_expected']:
            df = df.sort_values(by=[am, 'item'], ascending=[False, True])
            items = items.union(set(df.head(cut_off).index))
    df = df.loc[list(items)]

    # rename columns
    df = df.rename(ams_dict, axis=1)

    return df


###############
# COLLOCATION #
###############
@collocation_blueprint.route('/api/user/<username>/collocation/', methods=['POST'])
@user_required
def create_collocation(username):
    """ Create new collocation analysis for given user.

    parameters:
      - name: username
        type: str

      - name: corpus
        type: str
        description: name of corpus in API
      - name: discourseme
        type: str or dict
        description: new discourseme (<str>) or existing discourseme (<dict>)
      - name: items
        type: list
        description: items to search for

      - name: p_query
        type: str
        description: p-attribute to query on [lemma]
      - name: p_collocation
        type: str
        description: p-attribute to use for collocates [lemma]
      - name: s_break
        type: str
        description: s-attribute to break context at [text]
      - name: context
        type: int
        description: context size in tokens
        default: 10

      - name: cut_off
        type: int
        description: how many collocates?
        default: 200
      - name: order
        type: str
        description: how to sort them? (column in result table) [log_likelihood]

    responses:
       201:
         description: collocation.id
       400:
         description: "wrong request parameters"
       404:
         description: "empty result"
    """

    user = User.query.filter_by(username=username).first()

    # Parameters
    # .. required
    corpus_name = request.json.get('corpus')
    discourseme = request.json.get('discourseme')
    items = request.json.get('items')
    # .. more or less reasonable defaults
    p = request.json.get('p_collocation', 'lemma')
    s_break = request.json.get('s_break', 'text')
    context = request.json.get('context', 10)
    # .. for query creation
    p_query = request.json.get('p_query', 'lemma')
    flags_query = request.json.get('flags_query', '')
    escape = request.json.get('escape', False)
    # .. not set yet
    # cut_off = request.json.get('cut_off', 200)
    # order = request.json.get('order', 'log_likelihood')
    # flags_show = request.args.get('flags_show', '')
    # min_freq = request.json.get('min_freq', 2)
    # ams = request.json.get('ams', None)
    # collocation_name = request.json.get('name', None)

    # Corpus
    corpus = Corpus.query.filter_by(cwb_id=corpus_name).first()

    # Discourseme
    current_app.logger.debug('Creating collocation :: disourseme management')
    if isinstance(discourseme, str):
        # new discourseme
        filter_discourseme = Discourseme(name=discourseme, user_id=user.id)
        db.session.add(filter_discourseme)
        db.session.commit()
    elif isinstance(discourseme, dict):
        # get discourseme
        filter_discourseme = Discourseme.query.filter_by(id=discourseme['id']).first()
    else:
        raise ValueError()

    # Constellation
    current_app.logger.debug('Creating collocation :: constellation management')
    constellation = Constellation(user_id=user.id)
    constellation.filter_discoursemes.append(filter_discourseme)
    db.session.add(constellation)

    # Query
    current_app.logger.debug('Creating collocation :: query')
    cqp_query = format_cqp_query(items, p_query=p_query, s_query=s_break, flags=flags_query, escape=escape)
    query = Query(discourseme_id=filter_discourseme.id, corpus_id=corpus.id, cqp_query=cqp_query)
    db.session.add(query)
    db.session.commit()
    ccc_query(query)

    # Breakdown
    current_app.logger.debug('Creating collocation :: breakdown')
    breakdown = Breakdown(query_id=query.id, p=p)
    db.session.add(breakdown)
    db.session.commit()
    ccc_breakdown(breakdown)

    # Collocation
    current_app.logger.debug('Creating collocation :: collocation')
    collocation = Collocation(query_id=query.id, p=p, s_break=s_break, context=context, user_id=user.id, constellation_id=constellation.id)
    db.session.add(collocation)
    db.session.commit()
    ccc_collocates(collocation)

    # Semantic Map
    current_app.logger.debug('Creating collocation :: creating semantic map')
    ccc_semmap(collocation)

    # Update
    current_app.logger.debug('Creating collocation :: adding surface realisations to items')
    filter_discourseme.items = "\t".join(set(filter_discourseme.items.split("\t")).union([cqp_escape(item.item) for item in breakdown.items]))
    db.session.commit()

    return jsonify({'msg': collocation.id}), 201


@collocation_blueprint.route('/api/user/<username>/collocation/', methods=['GET'])
@user_required
def get_all_collocation(username):
    """ List all analyses for given user.

    parameters:
      - username: username
        type: str
        description: username, links to user
    responses:
      200:
         description: list of serialized analyses
    """

    user = User.query.filter_by(username=username).first()
    collocation_analyses = Collocation.query.filter_by(user_id=user.id).all()
    collocation_list = [collocation.serialize for collocation in collocation_analyses if collocation._query.nqr_name is None]

    return jsonify(collocation_list), 200


@collocation_blueprint.route('/api/user/<username>/collocation/<collocation>/', methods=['GET'])
@user_required
def get_collocation(username, collocation):
    """ Get details of collocation analysis.

    parameters:
      - username: username
        type: str
        description: username, links to user
      - name: collocation
        type: str
        description: collocation id
    responses:
       200:
         description: dict of collocation analysis details
       404:
         description: "no such analysis"
    """

    user = User.query.filter_by(username=username).first()
    collocation = Collocation.query.filter_by(id=collocation, user_id=user.id).first()
    if not collocation:
        return jsonify({'msg': 'no such analysis'}), 404

    return jsonify(collocation.serialize), 200


@collocation_blueprint.route('/api/user/<username>/collocation/<collocation>/', methods=['DELETE'])
@user_required
def delete_collocation(username, collocation):
    """ Delete collocation.

    parameters:
      - username: username
        type: str
        description: username, links to user
      - name: collocation
        type: str
        description: collocation id
    responses:
       200:
         description: "deleted"
       404:
         description: "no such collocation"
    """

    user = User.query.filter_by(username=username).first()
    collocation = Collocation.query.filter_by(id=collocation, user_id=user.id).first()
    if not collocation:
        return jsonify({'msg': 'no such collocation'}), 404
    db.session.delete(collocation)
    db.session.commit()

    return jsonify({'msg': 'deleted'}), 200


##########################
# DISCOURSEME MANAGEMENT #
##########################
@collocation_blueprint.route('/api/user/<username>/collocation/<collocation>/discourseme/', methods=['GET'])
@user_required
def get_discoursemes_for_collocation(username, collocation):
    """ Return list of discoursemes for collocation.

    parameters:
      - username: username
        type: str
        description: username, links to user
      - name: collocation
        type: str
        description: collocation id
    responses:
       200:
         description: list of associated discoursemes
       404:
         description: "no such collocation"
    """

    # get user
    user = User.query.filter_by(username=username).first()
    collocation = Collocation.query.filter_by(id=collocation, user_id=user.id).first()
    if not collocation:
        return jsonify({'msg': 'no such analysis'}), 404

    collocation_discoursemes = [
        discourseme.serialize for discourseme in collocation.constellation.highlight_discoursemes
    ]

    return jsonify(collocation_discoursemes), 200


@collocation_blueprint.route('/api/user/<username>/collocation/<collocation>/discourseme/<discourseme>/', methods=['PUT'])
@user_required
def put_discourseme_into_collocation(username, collocation, discourseme):
    """ Associate a discourseme with collocation.

    parameters:
      - name: username
        type: str
        description: username, links to user
      - name: collocation
        type: int
        description: collocation id
      - name: discourseme
        type: int
        description: discourseme id to associate
    responses:
      200:
         description: "already linked"
         description: "updated"
      404:
         description: "no such collocation"
         description: "no such discourseme"
      409:
         description: "discourseme is already topic of collocation"
    """

    # get user
    user = User.query.filter_by(username=username).first()

    # get collocation analysis
    collocation = Collocation.query.filter_by(id=collocation, user_id=user.id).first()
    if not collocation:
        msg = 'no such collocation %s' % collocation
        return jsonify({'msg': msg}), 404

    # get discourseme
    discourseme = Discourseme.query.filter_by(id=discourseme, user_id=user.id).first()
    if not discourseme:
        msg = 'no such discourseme %s' % discourseme
        return jsonify({'msg': msg}), 404

    constellation = collocation.constellation
    constellation.highlight_discoursemes.append(discourseme)
    db.session.commit()

    msg = 'associated discourseme %s with collocation analysis %s' % (discourseme, collocation)

    return jsonify({'msg': msg}), 200


@collocation_blueprint.route('/api/user/<username>/collocation/<collocation>/discourseme/<discourseme>/', methods=['DELETE'])
@user_required
def delete_discourseme_from_collocation(username, collocation, discourseme):
    """ Remove discourseme from collocation.

    parameters:
      - name: username
        type: str
        description: username, links to user
      - name: collocation
        type: int
        description: collocation id
      - name: discourseme
        type: int
        description: discourseme id to remove
    responses:
      200:
         description: "deleted discourseme from collocation"
      404:
         description: "no such analysis"
         description: "no such discourseme"
         description: "discourseme not linked to collocation"

    """

    # get user
    user = User.query.filter_by(username=username).first()

    # get collocation
    collocation = Collocation.query.filter_by(id=collocation, user_id=user.id).first()
    if not collocation:
        return jsonify({'msg': 'no such analysis'}), 404

    # get discourseme
    discourseme = Discourseme.query.filter_by(id=discourseme, user_id=user.id).first()
    if not discourseme:
        return jsonify({'msg': 'no such discourseme'}), 404

    # delete
    collocation.constellation.highlight_discoursemes.remove(discourseme)
    db.session.commit()

    return jsonify({'msg': 'deleted discourseme from collocation analysis'}), 200


#####################
# COLLOCATION ITEMS #
#####################
@collocation_blueprint.route('/api/user/<username>/collocation/<collocation>/collocate/', methods=['GET'])
@user_required
def get_collocate_for_collocation(username, collocation):
    """Get collocate items for collocation analysis.

    parameters:
      - name: username
        description: username, links to user
      - name: collocation
        description: collocation id

      - name: window_size
        type: int
        description: window size

      - name: discourseme
        type: list
        required: False
        description: discourseme id(s) to include in constellation
      - name: collocate
        type: list
        required: False
        description: lose item(s) for ad-hoc discourseme to include

      - name: cut_off
        type: int
        description: how many collocates?
        default: 200
      - name: order
        type: str
        description: how to sort them? (column in result table) [log_likelihood]

    responses:
      200:
        description: collocates
      400:
        description: "wrong request parameters"
      404:
        description: "empty result"
    """

    user = User.query.filter_by(username=username).first()
    window = int(request.args.get('window_size'))
    collocation = Collocation.query.filter_by(id=collocation, user_id=user.id).first()

    # .. additional discoursemes
    # items = request.args.getlist('collocate', None)

    # .. not set yet
    # flags_show = request.args.get('flags_show', "")
    # .. pagination
    # ams = request.args.get('ams', None)
    # min_freq = request.args.get('min_freq', 2)
    # order = request.args.get('order', 'log_likelihood')
    cut_off = request.args.get('cut_off', 200)

    # get filter discoursemes
    filter_ids = request.args.getlist('discourseme', None)
    filter_discoursemes = [db.get_or_404(Discourseme, id) for id in filter_ids]
    filter_queries = dict()
    for discourseme in filter_discoursemes:
        filter_queries[discourseme.id] = format_cqp_query(discourseme.items.split("\t"), collocation.p, escape=False)

    # .. create separate Collocation for SOC
    if len(filter_queries) > 0:

        # iterative query (topic on subcorpus) → matches
        # subcorpus = topic → discourseme_i → topic
        subcorpus_name = str(collocation._query.discourseme.id) + "".join([str(discourseme.id) for discourseme in filter_discoursemes])

        query = Query(discourseme_id=collocation._query.discourseme.id, corpus_id=collocation._query.corpus.id,
                      cqp_query=collocation._query.cqp_query, nqr_name=subcorpus_name)
        db.session.add(query)
        db.session.commit()

        # get matches of original filter
        corpus = Crps(corpus_name=collocation._query.corpus.cwb_id,
                      lib_dir=None,
                      cqp_bin=current_app.config['CCC_CQP_BIN'],
                      registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                      data_dir=current_app.config['CCC_DATA_DIR'])
        matches = collocation._query.matches
        matches_df = DataFrame([vars(s) for s in matches], columns=['match', 'matchend']).set_index(['match', 'matchend'])

        # for filtering, we set whole context regions as cotext so we can easily filter iteratively
        matches = corpus.subcorpus(subcorpus_name='Temp', df_dump=matches_df, overwrite=False).set_context(context_break=collocation.s_break,
                                                                                                           overwrite=True)

        current_app.logger.debug('Getting SOC collocation items :: filtering')
        cotext_of_matches = matches.set_context_as_matches(subcorpus_name='Temp', overwrite=True)
        for name, cqp_query in filter_queries.items():
            disc = cotext_of_matches.query(cqp_query, context_break=collocation.s_break)
            cotext_of_matches = disc.set_context_as_matches(subcorpus_name='Temp', overwrite=True)
        # focus back on topic:
        matches = cotext_of_matches.query(collocation._query.cqp_query, context_break=collocation.s_break).set_context(
            context_break=collocation.s_break, context=collocation.context
        ).df
        matches['query_id'] = query.id
        matches = matches[['query_id']]
        for m in matches.reset_index().to_dict(orient='records'):
            db.session.add(Matches(**m))
        db.session.commit()

        semantic_map = collocation.semantic_map
        collocation = Collocation(query_id=query.id, p=collocation.p, s_break=collocation.s_break, context=collocation.context,
                                  user_id=user.id, constellation_id=collocation.constellation.id)
        db.session.add(collocation)
        db.session.commit()
        ccc_collocates(collocation)
        collocation.semantic_map_id = semantic_map.id
        db.session.add(collocation)
        db.session.commit()

    # counts
    counts = DataFrame([vars(s) for s in collocation.items], columns=['f', 'f1', 'f2', 'N', 'collocation_id', 'window', 'item']).set_index('item')
    counts = counts.loc[counts['window'] == window]

    if len(counts) == 0:
        current_app.logger.debug(f'Getting collocation items :: calculating for window {window}')
        counts = ccc_collocates(collocation, window=window)
        current_app.logger.debug('Getting collocation items :: making sure there are coordinates for all items')
        ccc_semmap_update(collocation)

    df_collocates = score_counts(counts, cut_off=cut_off)
    df_collocates.index = [cqp_escape(item) for item in df_collocates.index]

    return df_collocates.to_json(), 200


#####################
# CONCORDANCE LINES #
#####################
@collocation_blueprint.route('/api/user/<username>/collocation/<collocation>/concordance/', methods=['GET'])
@user_required
def get_concordance_for_collocation(username, collocation):
    """ Get concordance lines for collocation.

    parameters:
      - name: username
        description: username, links to user
      - name: collocation
        description: collocation_id
      - name: window_size
        type: int
        description: window size for context
        default: 3
      - name: item
        type: list
        required: False
        description: lose item(s) for additional discourseme to include
      - name: cut_off
        type: int
        description: how many lines?
        default: 1000
      - name: order
        type: str
        description: how to sort them? (column in result table)
        default: random
      - name: s_meta
        type: str
        description: what s-att-annotation to retrieve
        default: collocation.s_break
    responses:
      200:
        description: concordance
      400:
        description: "wrong request parameters"
      404:
        description: "empty result"
    """
    # TODO: rename item ./. items

    user = User.query.filter_by(username=username).first()
    collocation = Collocation.query.filter_by(id=collocation, user_id=user.id).first()

    if not collocation:
        return jsonify({'msg': 'empty result'}), 404

    # .. parameters
    window = int(request.args.get('window_size', 3))
    corpus = ccc_corpus(collocation._query.corpus.cwb_id,
                        cqp_bin=current_app.config['CCC_CQP_BIN'],
                        registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                        data_dir=current_app.config['CCC_DATA_DIR'])
    s_show = corpus['s_annotations']
    p_show = ['word', collocation.p]
    cut_off = request.args.get('cut_off', 500)
    order = request.args.get('order', 42)

    # .. create filter discoursemes  TODO simplify
    filter_ids = request.args.getlist('discourseme', None)
    filter_discoursemes = [db.get_or_404(Discourseme, id) for id in filter_ids]
    filter_items = request.args.getlist('item', None)
    filter_queries = dict()
    for filter_discourseme in filter_discoursemes:
        filter_queries[filter_discourseme.id] = format_cqp_query(filter_discourseme.items.split("\t"), collocation.p, escape=False)
    if filter_items:
        filter_queries['collocate'] = format_cqp_query(filter_items, collocation.p, escape=False)

    # .. get highlight_discoursemes
    highlight_discoursemes = collocation.constellation.highlight_discoursemes

    # .. actual concordancing
    concordance_lines = ccc_concordance(collocation._query, collocation.s_break, p_show, s_show,
                                        highlight_discoursemes, filter_queries,
                                        order=order, cut_off=cut_off, window=window)
    if concordance_lines is None:
        return jsonify({'msg': 'empty concordance'}), 404

    conc_json = [ConcordanceLinesOut().dump(line) for line in concordance_lines]

    return conc_json, 200


#######################
# FREQUENCY BREAKDOWN #
#######################
@collocation_blueprint.route('/api/user/<username>/collocation/<collocation>/breakdown/', methods=['GET'])
@user_required
def get_breakdown_for_collocation(username, collocation):
    """ Get breakdown for collocation.

    parameters:
      - name: username
        description: username, links to user
      - name: collocation
        description: collocation_id
    responses:
      200:
        description: breakdown
      400:
        description: "wrong request parameters"
      404:
        description: "empty result"
    """

    user = User.query.filter_by(username=username).first()
    collocation = Collocation.query.filter_by(id=collocation, user_id=user.id).first()
    breakdown = [BreakdownItemsOut().dump(item) for item in collocation._query.breakdowns[0].items]

    return breakdown, 200


#####################
# META DISTRIBUTION #
#####################
@collocation_blueprint.route('/api/user/<username>/collocation/<collocation>/meta/', methods=['GET'])
@user_required
def get_meta_for_collocation(username, collocation):
    """ Get concordance lines for collocation.

    parameters:
      - name: username
        description: username, links to user
      - name: collocation
        description: collocation_id
    responses:
      200:
        description: breakdown
      400:
        description: "wrong request parameters"
      404:
        description: "empty result"
    """

    # get user
    user = User.query.filter_by(username=username).first()

    # check request
    # ... collocation
    collocation = Collocation.query.filter_by(id=collocation, user_id=user.id).first()
    if not collocation:
        return jsonify({'msg': 'empty result'}), 404

    # pack p-attributes
    # ... where's the meta data?
    # corpus = ccc_corpus(collocation.corpus,
    #                     cqp_bin=current_app.config['CCC_CQP_BIN'],
    #                     registry_dir=current_app.config['CCC_REGISTRY_DIR'],
    #                     data_dir=current_app.config['CCC_DATA_DIR'])
    # s_show = [i for i in request.args.getlist('s_meta', None)]
    # s_show = corpus['s-annotations']

    # use cwb-ccc to extract concordance lines
    # meta = ccc_meta(
    #     corpus_name=collocation.corpus,
    #     cqp_bin=current_app.config['CCC_CQP_BIN'],
    #     registry_dir=current_app.config['CCC_REGISTRY_DIR'],
    #     data_dir=current_app.config['CCC_DATA_DIR'],
    #     lib_dir=current_app.config['CCC_LIB_DIR'],
    #     topic_items=collocation.items,
    #     p_query=collocation.p_query,
    #     s_query=collocation.s_break,
    #     flags_query=collocation.flags_query,
    #     s_show=s_show,
    #     escape=collocation.escape_query
    # )
    meta = []

    # if meta is None:
    #     return jsonify({'msg': 'empty result'}), 404

    meta_json = jsonify(meta)

    return meta_json, 200


###############
# COORDINATES #
###############

@collocation_blueprint.route('/api/user/<username>/collocation/<collocation>/coordinates/', methods=['GET'])
@user_required
def get_coordinates(username, collocation):
    """ Get coordinates for collocation analysis.

    """

    # get user
    user = User.query.filter_by(username=username).first()

    # get analysis
    collocation = Collocation.query.filter_by(id=collocation, user_id=user.id).first()
    if not collocation:
        return jsonify({'msg': 'no such collocation analysis'}), 404

    # load coordinates
    sem_map = collocation.semantic_map

    out = dict()
    for coordinates in sem_map.coordinates:
        coordinates = CoordinatesOut().dump(coordinates)
        out[coordinates['item']] = coordinates

    return jsonify(out), 200


@collocation_blueprint.route('/api/user/<username>/collocation/<collocation>/coordinates/reload/', methods=['PUT'])
@user_required
def update_collocation(username, collocation):
    """ Re-calculate coordinates for collocation analysis.

    """

    user = User.query.filter_by(username=username).first()
    collocation = Collocation.query.filter_by(id=collocation, user_id=user.id).first()

    counts = DataFrame([vars(s) for s in collocation.items], columns=['item', 'window', 'f', 'f1', 'f2', 'N']).set_index('item')
    for window in set(counts['window']):
        current_app.logger.debug(f'Updating collocation :: window {window}')
        ccc_collocates(collocation, window)

    return jsonify({'msg': 'updated'}), 200


@collocation_blueprint.route('/api/user/<username>/collocation/<collocation>/coordinates/', methods=['PUT'])
@user_required
def update_coordinates(username, collocation):
    """Update user coordinates. If "none": delete user coordinates.

    """

    # {'foo': {'x_user': 1.3124, 'y_user': 2.3246}}
    items = request.get_json()

    user = User.query.filter_by(username=username).first()
    collocation = Collocation.query.filter_by(id=collocation, user_id=user.id).first()
    if not collocation:
        return jsonify({'msg': 'no such collocation analysis'}), 404

    # set coordinates
    semantic_map = collocation.semantic_map
    for item, xy in items.items():
        coordinates = Coordinates.query.filter_by(item=item, semantic_map_id=semantic_map.id).first()
        if not (isinstance(xy['x_user'], float) and isinstance(xy['y_user'], float)):
            coordinates.x_user = None
            coordinates.y_user = None
        else:
            coordinates.x_user = xy['x_user']
            coordinates.y_user = xy['y_user']
    db.session.commit()

    return jsonify({'msg': 'updated'}), 200
