"""
Corpus view
"""


from apiflask import APIBlueprint
from flask import current_app, jsonify
from flask_jwt_extended import jwt_required

from ..corpus import CorpusOut, ccc_corpus
from ..database import Corpus

corpus_blueprint = APIBlueprint('corpus', __name__)


@corpus_blueprint.route('/api/corpus/', methods=['GET'])
@jwt_required()
def get_corpora():
    """
    Returns a list of available corpora as JSON array with their details.
    """

    corpora = list()
    for corpus in [CorpusOut().dump(corpus) for corpus in Corpus.query.all()]:
        attributes = ccc_corpus(corpus['cwb_id'],
                                current_app.config['CCC_CQP_BIN'], current_app.config['CCC_REGISTRY_DIR'], current_app.config['CCC_DATA_DIR'])
        corpus['pQueries'] = attributes['p_atts']
        corpus['sBreaks'] = attributes['s_atts']
        corpus['name_api'] = corpus.pop('cwb_id')
        corpora.append(corpus)

    return jsonify(corpora), 200


@corpus_blueprint.get('/api/corpus/<corpus>/')
@jwt_required()
def get_corpus(corpus):
    """Returns a list of available corpora as JSON array with their details.

    """

    corpus = Corpus.query.filter_by(cwb_id=corpus).first()
    if not corpus:
        return jsonify({'msg': 'no such corpus'}), 404
    attributes = ccc_corpus(corpus.cwb_id, current_app.config['CCC_CQP_BIN'], current_app.config['CCC_REGISTRY_DIR'], current_app.config['CCC_DATA_DIR'])
    corpus = CorpusOut().dump(corpus)
    corpus['pQueries'] = attributes['p_atts']
    corpus['sBreaks'] = attributes['s_atts']
    corpus['name_api'] = corpus.pop('cwb_id')

    return jsonify(corpus), 200
