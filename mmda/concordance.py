from apiflask import APIBlueprint, Schema
from flask import request, current_app
from .users import auth
from .database import Query
from apiflask.fields import Integer, String, List
from . import db
from ccc import Corpus, SubCorpus
from ccc.concordances import Concordance
from ccc.utils import format_roles
from collections import Counter
from pandas import DataFrame


bp = APIBlueprint('concordance', __name__, url_prefix='/concordance')


class ConcordanceIn(Schema):

    query_id = Integer()
    p = List(String)
    context = Integer()
    s_break = String()
    order = String()


class ConcordanceLinesOut(Schema):

    match = Integer()
    meta = String()

    cpos = List(Integer)
    offset = List(Integer)
    word = List(String)
    lemma = List(String)
    role = List(List(String))


@bp.get("/lines")
@bp.input(ConcordanceIn)
@bp.output(ConcordanceLinesOut(many=True))
@bp.auth_required(auth)
def get_concordance_lines(data):

    query = db.get_or_404(Query, data['query_id'])
    matches = query.matches
    df_dump = DataFrame([vars(s) for s in matches], columns=['match', 'matchend'])
    df_dump['context'] = df_dump['match']
    df_dump['contextend'] = df_dump['matchend']
    df_dump = df_dump.set_index(['match', 'matchend'])
    subcorpus = SubCorpus('Temp',
                          df_dump,
                          corpus_name=query.corpus.cwb_id,
                          lib_dir=None,
                          cqp_bin=current_app.config['CCC_CQP_BIN'],
                          registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                          data_dir=current_app.config['CCC_DATA_DIR'],
                          overwrite=False)
    subcorpus = subcorpus.set_context(context=data['context'], context_break=data['s_break'])
    df_dump = subcorpus.df
    concordance = Concordance(Corpus(corpus_name=query.corpus.cwb_id,
                                     lib_dir=None,
                                     cqp_bin=current_app.config['CCC_CQP_BIN'],
                                     registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                                     data_dir=current_app.config['CCC_DATA_DIR']),
                              df_dump)
    lines = concordance.lines(form='dict', p_show=data['p'],
                              s_show=[], order=data['order'], cut_off=None)
    lines = list(lines.apply(lambda row: format_roles(row, [], [], data['context'], htmlify_meta=True), axis=1))

    return [ConcordanceLinesOut().dump(line) for line in lines], 200
