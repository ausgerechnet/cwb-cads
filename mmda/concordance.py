#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, List, String
from ccc import Corpus, SubCorpus
from ccc.concordances import Concordance as CCConcordance
from ccc.utils import format_roles
from flask import current_app, request
from pandas import DataFrame

from . import db
from .database import Query, Concordance
from .users import auth

bp = APIBlueprint('concordance', __name__, url_prefix='/<query_id>/concordance')


class ConcordanceIn(Schema):

    p = String()
    context = Integer()
    s_break = String()


class ConcordanceOut(Schema):

    id = Integer()
    p = String()
    context = Integer()
    s_break = String()


class ConcordanceLinesOut(Schema):

    match = Integer()
    meta = String()

    cpos = List(Integer)
    offset = List(Integer)
    word = List(String)
    lemma = List(String)
    role = List(List(String))


@bp.post("/")
@bp.input(ConcordanceIn)
@bp.output(ConcordanceOut)
@bp.auth_required(auth)
def create(query_id, data):
    """Create concordance.

    """

    # query = db.get_or_404(Query, query_id)
    concordance = Concordance(query_id=query_id, **data)
    db.session.add(concordance)
    db.session.commit()

    return ConcordanceOut().dump(concordance), 200


@bp.get('/')
@bp.output(ConcordanceOut(many=True))
@bp.auth_required(auth)
def get_concordances(query_id):
    """Get concordance.

    """

    query = db.get_or_404(Query, query_id)

    return [ConcordanceOut().dump(concordance) for concordance in query.concordances], 200


@bp.get('/<id>')
@bp.output(ConcordanceOut)
@bp.auth_required(auth)
def get_concordance(query_id, id):
    """Get concordance.

    """

    concordance = db.get_or_404(Concordance, id)

    return ConcordanceOut().dump(concordance), 200


@bp.delete('/<id>')
@bp.auth_required(auth)
def delete_concordance(query_id, id):
    """Delete concordance.

    """

    concordance = db.get_or_404(Concordance, id)
    db.session.delete(concordance)
    db.session.commit()

    return 'Deletion successful.', 200


@bp.get("/<id>/lines")
@bp.output(ConcordanceLinesOut(many=True))
@bp.auth_required(auth)
def lines(query_id, id):
    """Get concordance lines.

    """

    order = request.args.get('order')
    cut_off = request.args.get('cut_off')
    query = db.get_or_404(Query, query_id)
    concordance = db.get_or_404(Concordance, id)
    s_break = concordance.s_break
    context = concordance.context
    p = concordance.p

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

    subcorpus = subcorpus.set_context(context=concordance.context, context_break=s_break)
    df_dump = subcorpus.df
    concordance = CCConcordance(Corpus(corpus_name=query.corpus.cwb_id,
                                       lib_dir=None,
                                       cqp_bin=current_app.config['CCC_CQP_BIN'],
                                       registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                                       data_dir=current_app.config['CCC_DATA_DIR']),
                                df_dump)
    lines = concordance.lines(form='dict', p_show=['word', p],
                              s_show=[], order=order, cut_off=cut_off)
    lines = list(lines.apply(lambda row: format_roles(row, [], [], context, htmlify_meta=True), axis=1))

    return [ConcordanceLinesOut().dump(line) for line in lines], 200
