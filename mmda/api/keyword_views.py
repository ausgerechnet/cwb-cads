#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""
Keywords view
"""

from multiprocessing import Pool

from apiflask import APIBlueprint
# requirements
from ccc import Corpus
from flask import current_app, jsonify, request
from numpy import nan
from pandas import DataFrame, concat, notnull

from .. import db
from ..database import Discourseme, SemanticMap, User
from .login_views import user_required

keyword_blueprint = APIBlueprint('keyword', __name__, template_folder='templates')


####################
# KEYWORD ANALYSES #
####################

# CREATE
@keyword_blueprint.route('/api/user/<username>/keyword/', methods=['POST'])
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

    # PARAMETERS #
    # required
    corpus = request.json.get('corpus')
    corpus_reference = request.json.get('corpus_reference')

    # more or less reasonable defaults
    p = request.json.get('p', ['lemma'])
    p_reference = request.json.get('p_reference', ['lemma'])
    flags = request.json.get('flags', '')
    flags_reference = request.json.get('flags_reference', '')
    s_break = request.json.get('s_break', 's')

    keyword_analysis_name = request.json.get('name', None)

    # PROCESS
    keywords = ccc_keywords(
        corpus=corpus,
        corpus_reference=corpus_reference,
        cqp_bin=current_app.config['CCC_CQP_BIN'],
        registry_dir=current_app.config['CCC_REGISTRY_DIR'],
        data_dir=current_app.config['CCC_DATA_DIR'],
        lib_dir=current_app.config['CCC_LIB_DIR'],
        p=p,
        p_reference=p_reference,
        flags=flags,
        flags_reference=flags_reference
    )

    # get tokens for coordinate generation
    tokens = list(set(keywords.index))

    # error handling: no result?
    if len(tokens) == 0:
        return jsonify({'msg': 'empty result'}), 404

    # generate coordinates
    # dataframe == [token] x y x_user y_user ==
    semantic_space = generate_semantic_space(
        tokens,
        current_app.config['CORPORA'][corpus]['embeddings']
    )

    # SAVE TO DATABASE
    # analysis
    keyword_analysis = Keyword(
        name=keyword_analysis_name,
        corpus=corpus,
        corpus_reference=corpus_reference,
        p=p,
        p_reference=p_reference,
        s_break=s_break,
        flags=flags,
        flags_reference=flags_reference,
        user_id=user.id
    )

    db.session.add(keyword_analysis)
    db.session.commit()

    # semantic space
    coordinates = SemanticMap(
        keyword_id=keyword_analysis.id,
        data=semantic_space
    )
    db.session.add(coordinates)
    db.session.commit()

    return jsonify({'msg': keyword_analysis.id}), 201


# READ ALL
@keyword_blueprint.route('/api/user/<username>/keyword/', methods=['GET'])
# @user_required
def get_all_keywords(username):
    """ List all keyword analyses for given user.

    parameters:
      - username: username
        type: str
        description: username, links to user
    responses:
      200:
         description: list of serialized analyses
    """

    # get user
    user = User.query.filter_by(username=username).first()

    keywords = Keyword.query.filter_by(user_id=user.id).all()
    keyword_list = [kw.serialize for kw in keywords]

    return jsonify(keyword_list), 200


# READ
@keyword_blueprint.route('/api/user/<username>/keyword/<keyword>/', methods=['GET'])
# @user_required
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

    # get analysis
    keyword = Keyword.query.filter_by(id=keyword, user_id=user.id).first()
    if not keyword:
        log.debug('no such keyword analysis %s', keyword)
        return jsonify({'msg': 'no such keyword analysis'}), 404

    return jsonify(keyword.serialize), 200


# DELETE
@keyword_blueprint.route('/api/user/<username>/keyword/<keyword>/', methods=['DELETE'])
# @user_required
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


###########################
# ASSOCIATED DISCOURSEMES #
###########################

# READ
@keyword_blueprint.route('/api/user/<username>/keyword/<keyword>/discourseme/', methods=['GET'])
# @user_required
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

    # get user
    user = User.query.filter_by(username=username).first()

    # get analysis
    keyword = Keyword.query.filter_by(id=keyword, user_id=user.id).first()
    if not keyword:
        return jsonify({'msg': 'no such keyword analysis'}), 404

    # get discoursemes as list
    keyword_discoursemes = [
        discourseme.serialize for discourseme in keyword.discoursemes
    ]
    if not keyword_discoursemes:
        return jsonify([]), 200

    return jsonify(keyword_discoursemes), 200


# UPDATE
@keyword_blueprint.route('/api/user/<username>/keyword/<keyword>/discourseme/<discourseme>/', methods=['PUT'])
# @user_required
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

    # check if discourseme already associated or already topic of analysis
    keyword_discourseme = discourseme in keyword.discoursemes
    if keyword_discourseme:
        msg = 'discourseme %s is already associated', discourseme
        return jsonify({'msg': msg}), 200

    # associate discourseme with analysis
    keyword.discoursemes.append(discourseme)
    db.session.add(keyword)
    db.session.commit()

    # update semantic space: add discourseme items
    tokens = set(discourseme.items)
    coordinates = SemanticMap.query.filter_by(keyword_id=keyword.id).first()
    semantic_space = coordinates.data
    diff = tokens - set(semantic_space.index)
    if len(diff) > 0:
        new_coordinates = generate_items_coordinates(
            diff,
            semantic_space,
            current_app.config['CORPORA'][keyword.corpus]['embeddings']
        )
        if not new_coordinates.empty:
            semantic_space.append(new_coordinates, sort=True)
            coordinates.data = semantic_space
            db.session.commit()

    return jsonify({'msg': msg}), 200


# DELETE
@keyword_blueprint.route('/api/user/<username>/keyword/<keyword>/discourseme/<discourseme>/', methods=['DELETE'])
# @user_required
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

    # get analysis
    keyword = Keyword.query.filter_by(id=keyword, user_id=user.id).first()
    if not keyword:
        return jsonify({'msg': 'no such keyword analysis'}), 404

    # get discourseme
    discourseme = Discourseme.query.filter_by(id=discourseme, user_id=user.id).first()
    if not discourseme:
        return jsonify({'msg': 'no such discourseme'}), 404

    # check link
    keyword_discourseme = discourseme in keyword.discoursemes
    if not keyword_discourseme:
        return jsonify({'msg': 'discourseme not linked to keyword analysis'}), 404

    # delete
    keyword.discoursemes.remove(discourseme)
    db.session.commit()

    return jsonify({'msg': 'deleted discourseme from keyword analysis'}), 200


############
# KEYWORDS #
############

@keyword_blueprint.route('/api/user/<username>/keyword/<keyword>/keywords/', methods=['GET'])
# @user_required
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

    corpus = keyword.corpus
    corpus_reference = keyword.corpus_reference
    p = keyword.p
    p_reference = keyword.p_reference

    # not set yet
    min_freq = 5
    cut_off = 500
    order = 'log_likelihood'
    flags_show = keyword.flags
    # min_freq = request.json.get('min_freq', 2)
    # cut_off = request.args.get('cut_off', 500)
    # order = request.args.get('order', 'log_likelihood')
    # flags = request.args.get('flags', '')
    # flags_reference = request.args.get('flags', '')

    keywords = ccc_keywords(
        corpus=corpus,
        corpus_reference=corpus_reference,
        cqp_bin=current_app.config['CCC_CQP_BIN'],
        registry_dir=current_app.config['CCC_REGISTRY_DIR'],
        data_dir=current_app.config['CCC_DATA_DIR'],
        lib_dir=current_app.config['CCC_LIB_DIR'],
        p=p,
        p_reference=p_reference,
        flags=keyword.flags,
        flags_reference=keyword.flags_reference,
        order=order,
        cut_off=cut_off,
        min_freq=min_freq,
        flags_show=flags_show
    )

    if keywords.empty:
        return jsonify({'msg': 'empty result'}), 404

    # MAKE SURE THERE ARE COORDINATES FOR ALL TOKENS
    tokens = set(keywords.index)
    coordinates = SemanticMap.query.filter_by(keyword_id=keyword.id).first()
    semantic_space = coordinates.data
    diff = tokens - set(semantic_space.index)
    if len(diff) > 0:
        new_coordinates = generate_items_coordinates(
            diff,
            semantic_space,
            current_app.config['CORPORA'][keyword.corpus]['embeddings']
        )
        if not new_coordinates.empty:
            semantic_space = concat([semantic_space, new_coordinates])
            coordinates.data = semantic_space
            db.session.commit()

    # post-process result
    df_json = keywords.to_json()

    return df_json, 200


#####################
# CONCORDANCE LINES #
#####################
@keyword_blueprint.route('/api/user/<username>/keyword/<keyword>/concordance/', methods=['GET'])
# @user_required
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

    # get user
    user = User.query.filter_by(username=username).first()

    # check request
    # ... analysis
    keyword = Keyword.query.filter_by(id=keyword, user_id=user.id).first()

    # ... item to get concordance lines for
    item = request.args.get('item')
    if not item:
        return {}, 200

    # ... highlight associated discoursemes
    additional_discoursemes = dict()
    for d in keyword.discoursemes:
        additional_discoursemes[str(d.id)] = d.items

    # ... how many?
    cut_off = request.args.get('cut_off', 500)
    # ... how to sort them?
    order = request.args.get('order', 'random')
    # ... where's the meta data?
    corpus = ccc_corpus(keyword.corpus,
                        cqp_bin=current_app.config['CCC_CQP_BIN'],
                        registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                        data_dir=current_app.config['CCC_DATA_DIR'])
    # s_show = [i for i in request.args.getlist('s_meta', None)]
    s_show = corpus['s-annotations']

    # pack p-attributes
    p_show = list(set(['word', keyword.p]))

    window_size = request.args.get('window_size', 50)
    s_break = keyword.s_break
    topic_discourseme = {'topic': [item]}
    filter_discoursemes = {}
    flags_query = "%c"
    random_seed = 42

    # use cwb-ccc to extract concordance lines
    concordance = ccc_concordance(
        corpus_name=keyword.corpus,
        cqp_bin=current_app.config['CCC_CQP_BIN'],
        registry_dir=current_app.config['CCC_REGISTRY_DIR'],
        data_dir=current_app.config['CCC_DATA_DIR'],
        lib_dir=current_app.config['CCC_LIB_DIR'],
        topic_discourseme=topic_discourseme,
        filter_discoursemes=filter_discoursemes,
        additional_discoursemes=additional_discoursemes,
        s_context=s_break,
        window_size=window_size,
        context=None,
        p_query=keyword.p,
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

    conc_json = jsonify(concordance)

    return conc_json, 200


###############
# COORDINATES #
###############
# READ
@keyword_blueprint.route('/api/user/<username>/keyword/<keyword>/coordinates/', methods=['GET'])
# @user_required
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
    coordinates = SemanticMap.query.filter_by(keyword_id=keyword.id).first()
    df = coordinates.data

    # converting NaNs to None got even more complicated in pandas 1.3.x
    df = df.astype(object)
    df = df.where(notnull(df), None)
    ret = df.to_dict(orient='index')

    return jsonify(ret), 200


@keyword_blueprint.route('/api/user/<username>/keyword/<keyword>/coordinates/reload/', methods=['PUT'])
# @user_required
def reload_coordinates_keywords(username, keyword):
    """ Re-calculate coordinates for keyword analysis.

    """

    # get user
    user = User.query.filter_by(username=username).first()

    # get analysis
    keyword = Keyword.query.filter_by(id=keyword, user_id=user.id).first()
    if not keyword:
        return jsonify({'msg': 'no such keyword analysis'}), 404

    # get tokens
    coordinates = Coordinates.query.filter_by(keyword_id=keyword.id).first()
    tokens = coordinates.data.index.values

    # generate new coordinates
    semantic_space = generate_semantic_space(
        tokens,
        current_app.config['CORPORA'][keyword.corpus]['embeddings']
    )

    coordinates.data = semantic_space
    db.session.commit()

    return jsonify({'msg': 'updated'}), 200


@keyword_blueprint.route('/api/user/<username>/keyword/<keyword>/coordinates/', methods=['PUT'])
# @user_required
def update_coordinates_keyword(username, keyword):
    """ Update coordinates for an analysis.

    Hint: Non numeric values are treated as NaN
    """

    if not request.is_json:
        return jsonify({'msg': 'no request data provided'}), 400

    # TODO Validate request. Should be:
    # {foo: {user_x: 1, user_y: 2}, bar: {user_x: 1, user_y: 2}}
    items = request.get_json()

    # get user
    user = User.query.filter_by(username=username).first()

    # get analysis
    keyword = Keyword.query.filter_by(id=keyword, user_id=user.id).first()
    if not keyword:
        return jsonify({'msg': 'no such keyword analysis'}), 404

    # get coordinates
    coordinates = SemanticMap.query.filter_by(keyword_id=keyword.id).first()
    df = coordinates.data

    # update coordinates dataframe, and save
    df.update(DataFrame.from_dict(items, orient='index'))

    # sanity checks, non-numeric get treated as NaN
    df.replace(to_replace=r'[^0-9]+', value=nan, inplace=True, regex=True)

    coordinates.data = df
    db.session.commit()

    return jsonify({'msg': 'updated'}), 200


def prepare_marginals(corpus_name, p_atts=['lemma']):

    c = Corpus(corpus_name,
               cqp_bin=current_app.config['CCC_CQP_BIN'],
               registry_dir=current_app.config['CCC_REGISTRY_DIR'],
               data_dir=current_app.config['CCC_DATA_DIR'])
    c.marginals(p_atts=p_atts)


@keyword_blueprint.route('/api/keyword/cache-marginals', methods=['GET'])
# @admin_required
def prepare_all_marginals():
    """create cache of marginals for each corpus"""

    nr_cpus = current_app.config['APP_PROCESSES']
    corpus_names = [c['name_api'] for c in current_app.config['CORPORA'].values()]
    with Pool(processes=nr_cpus) as pool:
        pool.map(prepare_marginals, corpus_names)
    nr = len(current_app.config['CORPORA'].values())
    return jsonify({'msg': f'cached marginals for {nr} corpora'}), 200
