from apiflask import APIBlueprint, Schema
from flask import current_app
from .users import auth
from .database import Corpus
from ccc import Corpus as CCCorpus
from apiflask.fields import Integer, String, List
from . import db

bp = APIBlueprint('corpus', __name__, url_prefix='/corpus')


def sort_p(p_atts, order=['lemma_pos', 'lemma', 'word']):
    """sort p-attributes in default order

    :param list p_atts: p-attributes

    """
    ordered = [p for p in order if p in p_atts] + [p for p in p_atts if p not in order]
    return ordered


def sort_s(s_atts, order=['tweet', 's', 'p', 'text']):
    """sort s-attributes in default order

    :param list s_atts: s-attributes

    """
    ordered = [s for s in order if s in s_atts] + [s for s in s_atts if s not in order]
    return ordered


def ccc_corpus(corpus_name, cqp_bin, registry_dir, data_dir):
    """get available corpus attributes

    :param str corpus_name: name of corpus in CWB registry
    :param str cqp_bin: path to CQP binary
    :param str registry_dir: path to CWB registry
    :param str data_dir: path to data directory

    :return: available corpus attributes
    :rtype: dict

    """
    corpus = CCCorpus(corpus_name,
                      cqp_bin=cqp_bin,
                      registry_dir=registry_dir,
                      data_dir=data_dir)
    attributes = corpus.available_attributes()
    p_atts = list(attributes.loc[attributes['type'] == 'p-Att']['attribute'].values)
    s_atts = attributes[attributes['type'] == 's-Att']
    s_annotations = list(s_atts[s_atts['annotation']]['attribute'].values)
    s_atts = list(s_atts[~s_atts['annotation']]['attribute'].values)

    crps = {
        'p_atts': sort_p(p_atts),  # all p-attributes
        's_atts': sort_s(s_atts),  # s-attributes without annotation
        's_annotations': s_annotations  # s-attributes with annotation
    }

    return crps


class CorpusOut(Schema):

    id = Integer()
    cwb_id = String()
    name = String()
    language = String()
    register = String()
    description = String()
    p_atts = List(String)
    s_atts = List(String)
    s_annotations = List(String)


@bp.get('/')
@bp.output(CorpusOut(many=True))
@bp.auth_required(auth)
def get_corpora():
    """Get one corpus.

    """
    corpora = Corpus.query.all()

    return [CorpusOut().dump(corpus) for corpus in corpora], 200


@bp.get('/<id>')
@bp.output(CorpusOut)
@bp.auth_required(auth)
def get_corpus(id):
    """Get one corpus.

    """
    corpus = db.get_or_404(Corpus, id)
    attributes = ccc_corpus(corpus.cwb_id, current_app.config['CCC_CQP_BIN'], current_app.config['CCC_REGISTRY_DIR'], current_app.config['CCC_DATA_DIR'])
    corpus = CorpusOut().dump(corpus)
    corpus = {**corpus, **attributes}

    return corpus, 200
