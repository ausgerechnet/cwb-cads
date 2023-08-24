#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, List, String
from ccc import Corpus
from ccc.concordances import Concordance as CCConcordance
from ccc.utils import format_cqp_query
from flask import current_app, request
from pandas import DataFrame

from . import db
from .database import Query, Concordance
from .users import auth

bp = APIBlueprint('concordance', __name__, url_prefix='/<query_id>/concordance')


def ccc_concordance(concordance, p_show=['word', 'lemma'], s_show=[],
                    highlight_discoursemes=[], filter_queries=[],
                    order=42, cut_off=500, window=None):

    query = concordance._query
    s_break = concordance.s_break
    # do not get from settings
    window = concordance.context if window is None else window

    # post-process matches
    matches = query.matches
    df_dump = DataFrame([vars(s) for s in matches], columns=['match', 'matchend'])
    df_dump['context'] = df_dump['match']
    df_dump['contextend'] = df_dump['matchend']
    df_dump = df_dump.set_index(['match', 'matchend'])

    # create corpus and set context
    corpus = Corpus(corpus_name=query.corpus.cwb_id,
                    lib_dir=None,
                    cqp_bin=current_app.config['CCC_CQP_BIN'],
                    registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                    data_dir=current_app.config['CCC_DATA_DIR'])
    matches = corpus.subcorpus(subcorpus_name='Temp', df_dump=df_dump, overwrite=False)
    matches = matches.set_context(context_break=s_break)
    df_dump = matches.df

    ########################################
    # SUBCORPUS OF COTEXT OF QUERY MATCHES #
    ########################################
    # TODO: implement as matches.set_matches(['context', 'contextend'])
    df = matches.df.set_index(['context', 'contextend'], drop=False)
    df = df.drop_duplicates()
    df.index.names = ['match', 'matchend']
    df = df[['context', 'contextend', 'contextid']]
    cotext_of_matches = corpus.subcorpus(subcorpus_name='Temp', df_dump=df, overwrite=True)

    #############
    # FILTERING #
    #############
    matches_filter = dict()
    for name, cqp_query in filter_queries.items():
        disc = cotext_of_matches.query(cqp_query, context_break=concordance.s_break)
        matches_filter[name] = disc.matches()
        df = matches.df.set_index(['context', 'contextend'], drop=False)
        df.index.names = ['match', 'matchend']
        df = df[['context', 'contextend', 'contextid']]
        cotext_of_matches = corpus.subcorpus(subcorpus_name='Temp', df_dump=df, overwrite=True)

    ################
    # HIGHLIGHTING #
    ################
    matches_highlight = dict()
    for discourseme in highlight_discoursemes:
        # create or retrieve query matches
        # query = Query()
        disc_query = format_cqp_query(discourseme.items.split("\t"), 'lemma')
        disc = cotext_of_matches.query(cqp_query=disc_query, context_break=concordance.s_break)
        matches_highlight[discourseme.id] = disc.matches()

    ###########################
    # CREATE LINES AND FORMAT #
    ###########################
    concordance = CCConcordance(corpus, df_dump)
    lines = concordance.lines(form='dict', p_show=p_show, s_show=s_show, order=order, cut_off=cut_off)
    out = list()
    for line in lines.iterrows():
        line = line[1]['dict']
        roles = list()
        include = False if len(matches_filter) > 0 else True
        for cpos, offset in zip(line['cpos'], line['offset']):
            cpos_roles = list()
            if offset == 0:
                cpos_roles.append('node')
            elif abs(offset) > window:
                cpos_roles.append('out_of_window')
            for disc_name, disc_matches in matches_highlight.items():
                if cpos in disc_matches:
                    cpos_roles.append(disc_name)
            for disc_name, disc_matches in matches_filter.items():
                if cpos in disc_matches:
                    cpos_roles.append(disc_name)
                    if abs(offset) <= window:
                        include = True
            roles.append(cpos_roles)
        line['role'] = roles
        if include:
            out.append(line)

    return out


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

    query = db.get_or_404(Query, query_id)
    concordance = db.get_or_404(Concordance, id)
    concordance_lines = ccc_concordance(query, concordance, request.args.get('order'), request.args.get('cut_off'))

    return [ConcordanceLinesOut().dump(line) for line in concordance_lines], 200
