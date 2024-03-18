#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""
Keywords view
"""

from apiflask import APIBlueprint
from ccc.utils import cqp_escape, format_cqp_query
from flask import current_app, jsonify, request
from pandas import DataFrame

from .. import db
from ..corpus import ccc_corpus_attributes
from ..database import (Constellation, Coordinates, Corpus, Discourseme,
                        Keyword, User)
from ..keyword import ccc_keywords
from ..semantic_map import CoordinatesOut, ccc_semmap
from .collocation_views import score_counts
from .concordance import ccc_concordance
from .database import serialize_discourseme, serialize_keyword
from .login_views import user_required

keyword_blueprint = APIBlueprint('keyword', __name__, url_prefix='/user/<username>/keyword')


###########
# KEYWORD #
###########

@keyword_blueprint.route('/', methods=['POST'])
@user_required
def create_keyword(username):
    """ Create new keyword analysis for given user.

    parameters:
      - name: username
        type: str

      - name: corpus
        type: str
        description: name of corpus in API
      - name: corpus_reference
        type: str
        description: name of corpus in API

      - name: p
        type: list
        description: p-attributes to query on [lemma]
      - name: p_reference
        type: list
        description: p-attributes to query on [lemma]

      - name: s_break
        type: str
        description: where to limit concordance lines

      - name: cut_off
        type: int
        description: how many keywords? [None]
        default: 500
      - name: order
        type: str
        description: how to sort them? (column in result table) [log_likelihood]

    responses:
       201:
         description: keywords.id
       400:
         description: "wrong request parameters"
       404:
         description: "empty result"
    """

    user = User.query.filter_by(username=username).first()

    corpus = request.json.get('corpus')
    corpus_reference = request.json.get('corpus_reference')
    p = request.json.get('p', ['lemma'])
    p_reference = request.json.get('p_reference', ['lemma'])
    # flags = request.json.get('flags', '')
    # flags_reference = request.json.get('flags_reference', '')
    # s_break = request.json.get('s_break', 's')
    min_freq = request.json.get('min_freq', 3)

    # Corpora
    corpus_left = Corpus.query.filter_by(cwb_id=corpus).first()
    corpus_right = Corpus.query.filter_by(cwb_id=corpus_reference).first()

    # Constellation
    current_app.logger.debug('Creating keyword :: constellation management')
    constellation = Constellation(user_id=user.id)
    db.session.add(constellation)
    db.session.commit()

    # Keyword
    current_app.logger.debug('Creating keyword :: collocation')
    keyword = Keyword(user_id=user.id, corpus_id=corpus_left.id, corpus_id_reference=corpus_right.id,
                      p=p, p_reference=p_reference, constellation_id=constellation.id)
    db.session.add(keyword)
    db.session.commit()
    ccc_keywords(keyword, min_freq)

    # Semantic Map
    current_app.logger.debug(f'Creating keyword :: creating semantic map for {len(keyword.items)} items')
    ccc_semmap(keyword, corpus_left.embeddings)

    return jsonify({'msg': keyword.id}), 201


@keyword_blueprint.route('/', methods=['GET'])
@user_required
def get_all_keyword(username):
    """ List all keyword analyses for given user.

    parameters:
      - username: username
        type: str
        description: username, links to user
    responses:
      200:
         description: list of serialized analyses
    """

    user = User.query.filter_by(username=username).first()
    keyword_analyses = Keyword.query.filter_by(user_id=user.id).all()
    keyword_list = [serialize_keyword(kw) for kw in keyword_analyses]

    return jsonify(keyword_list), 200


@keyword_blueprint.route('/<keyword>/', methods=['GET'])
@user_required
def get_keyword(username, keyword):
    """ Get details of keyword analysis.

    parameters:
      - username: username
        type: str
        description: username, links to user
      - name: keyword_id
        type: str
        description: keyword id
    responses:
       200:
         description: dict of keyword details
       404:
         description: "no such analysis"
    """

    # get user
    user = User.query.filter_by(username=username).first()
    keyword = Keyword.query.filter_by(id=keyword, user_id=user.id).first()
    if not keyword:
        return jsonify({'msg': 'no such keyword analysis'}), 404

    return jsonify(serialize_keyword(keyword)), 200


@keyword_blueprint.route('/<keyword>/', methods=['DELETE'])
@user_required
def delete_keyword(username, keyword):
    """ Delete keyword analysis.

    parameters:
      - username: username
        type: str
        description: username, links to user
      - name: keyword
        type: str
        description: keyword analysis id
    responses:
       200:
         description: "deleted"
       404:
         description: "no such keyword analysis"
    """

    # get user
    user = User.query.filter_by(username=username).first()

    # delete analysis
    keyword = Keyword.query.filter_by(id=keyword, user_id=user.id).first()
    if not keyword:
        return jsonify({'msg': 'no such keyword analysis'}), 404

    db.session.delete(keyword)
    db.session.commit()

    return jsonify({'msg': 'deleted'}), 200


##########################
# DISCOURSEME MANAGEMENT #
##########################

@keyword_blueprint.route('/<keyword>/discourseme/', methods=['GET'])
@user_required
def get_discoursemes_for_keyword(username, keyword):
    """ Return list of discoursemes for keyword analysis.

    parameters:
      - username: username
        type: str
        description: username, links to user
      - name: keyword
        type: str
        description: keyword analysis id
    responses:
       200:
         description: list of associated discoursemes
       404:
         description: "no such keyword analysis"
    """

    user = User.query.filter_by(username=username).first()
    keyword = Keyword.query.filter_by(id=keyword, user_id=user.id).first()
    if not keyword:
        return jsonify({'msg': 'no such keyword analysis'}), 404

    keyword_discoursemes = [
        serialize_discourseme(discourseme) for discourseme in keyword.constellation.highlight_discoursemes
    ]

    return jsonify(keyword_discoursemes), 200


@keyword_blueprint.route('/<keyword>/discourseme/<discourseme>/', methods=['PUT'])
@user_required
def put_discourseme_into_keyword(username, keyword, discourseme):
    """ Associate a discourseme with keyword analysis.

    parameters:
      - name: username
        type: str
        description: username, links to user
      - name: keyword
        type: int
        description: keyword analysis id
      - name: discourseme
        type: int
        description: discourseme id to associate
    responses:
      200:
         description: "already linked"
         description: "updated"
      404:
         description: "no such keyword analysis"
         description: "no such discourseme"
    """

    # get user
    user = User.query.filter_by(username=username).first()

    # get analysis
    keyword = Keyword.query.filter_by(id=keyword, user_id=user.id).first()
    if not keyword:
        msg = 'no such keyword analysis %s' % keyword
        return jsonify({'msg': msg}), 404

    # get discourseme
    discourseme = Discourseme.query.filter_by(id=discourseme, user_id=user.id).first()
    if not discourseme:
        msg = 'no such discourseme %s' % discourseme
        return jsonify({'msg': msg}), 404

    constellation = keyword.constellation
    constellation.highlight_discoursemes.append(discourseme)
    db.session.commit()

    msg = 'associated discourseme %s with keyword analysis %s' % (discourseme, keyword)

    return jsonify({'msg': msg}), 200


@keyword_blueprint.route('/<keyword>/discourseme/<discourseme>/', methods=['DELETE'])
@user_required
def delete_discourseme_from_keyword(username, keyword, discourseme):
    """ Remove discourseme from keyword analysis.

    parameters:
      - name: username
        type: str
        description: username, links to user
      - name: keyword
        type: int
        description: keyword analysis id
      - name: discourseme
        type: int
        description: discourseme id to remove
    responses:
      200:
         description: "deleted discourseme from keyword analysis"
      404:
         description: "no such keyword analysis"
         description: "no such discourseme"
         description: "discourseme not linked to keyword analysis"

    """

    # get user
    user = User.query.filter_by(username=username).first()

    # get keyword
    keyword = Keyword.query.filter_by(id=keyword, user_id=user.id).first()
    if not keyword:
        return jsonify({'msg': 'no such keyword analysis'}), 404

    # get discourseme
    discourseme = Discourseme.query.filter_by(id=discourseme, user_id=user.id).first()
    if not discourseme:
        return jsonify({'msg': 'no such discourseme'}), 404

    # delete
    keyword.constellation.highlight_discoursemes.remove(discourseme)
    db.session.commit()

    return jsonify({'msg': 'deleted discourseme from keyword analysis'}), 200


#################
# KEYWORD ITEMS #
#################

@keyword_blueprint.route('/<keyword>/keywords/', methods=['GET'])
@user_required
def get_keywords_for_keyword(username, keyword):
    """ Get keywords table for keyword analysis.

    parameters:
      - name: username
        description: username, links to user
      - name: analysis
        description: analysis id

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
        default: 500
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
    keyword = Keyword.query.filter_by(id=keyword, user_id=user.id).first()

    # corpus = keyword.corpus
    # corpus_reference = keyword.corpus_reference
    # p = keyword.p
    # p_reference = keyword.p_reference

    # not set yet
    # min_freq = 5
    cut_off = 500
    # order = 'log_likelihood'
    # flags_show = keyword.flags
    # min_freq = request.json.get('min_freq', 2)
    # cut_off = request.args.get('cut_off', 500)
    # order = request.args.get('order', 'log_likelihood')
    # flags = request.args.get('flags', '')
    # flags_reference = request.args.get('flags', '')

    # counts
    counts = DataFrame([vars(s) for s in keyword.items], columns=['f1', 'N1', 'f2', 'N2', 'keyword_id', 'item']).set_index('item')
    counts.index = [cqp_escape(item) for item in counts.index]
    counts.index.name = 'item'
    df_keywords = score_counts(counts, cut_off=cut_off)

    return df_keywords.to_json(), 200


#####################
# CONCORDANCE LINES #
#####################
@keyword_blueprint.route('/<keyword>/concordance/', methods=['GET'])
@user_required
def get_concordance_for_keyword(username, keyword):
    """ Get concordance lines for analysis.

    parameters:
      - name: username
        description: username, links to user
      - name: keyword
        description: keyword_analysis_id
      - name: item
        type: str
        description: item to get lines for
      - name: cut_off
        type: int
        description: how many lines?
        default: 500
      - name: order
        type: str
        description: how to sort them? (column in result table)
        default: random
    responses:
      200:
        description: concordance
      400:
        description: "wrong request parameters"
      404:
        description: "empty result"
    """

    user = User.query.filter_by(username=username).first()
    keyword = Keyword.query.filter_by(id=keyword, user_id=user.id).first()

    # ... item to get concordance lines for
    item = request.args.get('item')
    if not item:
        return {}, 200
    context_break = 's'
    cut_off = 500
    order = 42
    p_show = ['word', keyword.p]

    corpus = Corpus.query.filter_by(id=keyword.corpus_id).first()
    s_show = ccc_corpus_attributes(corpus.cwb_id,
                                   cqp_bin=current_app.config['CCC_CQP_BIN'],
                                   registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                                   data_dir=current_app.config['CCC_DATA_DIR'])['s_annotations']

    lines = ccc_concordance(
        query=None,
        context_break=context_break,
        p_show=p_show,
        s_show=s_show,
        highlight_discoursemes=keyword.constellation.highlight_discoursemes,
        order=order,
        cut_off=cut_off,
        window=50,
        cwb_id=corpus.cwb_id,
        topic_query=format_cqp_query([item], p_query=keyword.p, escape=False)
    )

    if lines is None:
        return jsonify({'msg': 'empty result'}), 404

    conc_json = jsonify(lines)

    return conc_json, 200


###############
# COORDINATES #
###############

@keyword_blueprint.route('/<keyword>/coordinates/', methods=['GET'])
@user_required
def get_coordinates_keywords(username, keyword):
    """ Get coordinates for keyword analysis.

    """

    # get user
    user = User.query.filter_by(username=username).first()

    # get analysis
    keyword = Keyword.query.filter_by(id=keyword, user_id=user.id).first()
    if not keyword:
        return jsonify({'msg': 'no such keyword'}), 404

    # load coordinates
    sem_map = keyword.semantic_map

    out = dict()
    for coordinates in sem_map.coordinates:
        coordinates = CoordinatesOut().dump(coordinates)
        out[coordinates['item']] = coordinates

    return jsonify(out), 200


@keyword_blueprint.route('/<keyword>/coordinates/reload/', methods=['PUT'])
@user_required
def update_keyword(username, keyword):
    """ Re-calculate coordinates for keyword analysis.

    """

    user = User.query.filter_by(username=username).first()
    keyword = Keyword.query.filter_by(id=keyword, user_id=user.id).first()

    current_app.logger.debug('Updating keyword')
    ccc_keywords(keyword)

    return jsonify({'msg': 'updated'}), 200


@keyword_blueprint.route('/<keyword>/coordinates/', methods=['PUT'])
@user_required
def update_coordinates_keyword(username, keyword):
    """ Update user coordinates.

    """

    # {'foo': {'x_user': 1.3124, 'y_user': 2.3246}}
    items = request.get_json()

    user = User.query.filter_by(username=username).first()
    keyword = Keyword.query.filter_by(id=keyword, user_id=user.id).first()
    if not keyword:
        return jsonify({'msg': 'no such keyword analysis'}), 404

    # set coordinates
    semantic_map = keyword.semantic_map
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


# def prepare_marginals(corpus_name, p_atts=['lemma']):

#     c = Corpus(corpus_name,
#                cqp_bin=current_app.config['CCC_CQP_BIN'],
#                registry_dir=current_app.config['CCC_REGISTRY_DIR'],
#                data_dir=current_app.config['CCC_DATA_DIR'])
#     c.marginals(p_atts=p_atts)
#     log.debug(f'prepared marginals for corpus "{corpus_name}" (attribute(s): {p_atts})')


# @keyword_blueprint.route('/keyword/cache-marginals', methods=['GET'])
# @admin_required
# def prepare_all_marginals():
#     """create cache of marginals for each corpus"""

#     nr_cpus = current_app.config['APP_PROCESSES']
#     log.debug(f'caching marginals using {nr_cpus} threads')
#     corpus_names = [c['name_api'] for c in current_app.config['CORPORA'].values()]
#     with Pool(processes=nr_cpus) as pool:
#         pool.map(prepare_marginals, corpus_names)
#     nr = len(current_app.config['CORPORA'].values())
#     return jsonify({'msg': f'cached marginals for {nr} corpora'}), 200
