#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, List, String
from ccc import Corpus
from ccc.concordances import Concordance as CCConcordance
from ccc.utils import cqp_escape, format_cqp_query
from flask import current_app, request
from pandas import DataFrame

from . import db
from .database import Query
from .users import auth

bp = APIBlueprint('concordance', __name__, url_prefix='/<query_id>/concordance')


def ccc_concordance(query, context_break, p_show=['word', 'lemma'], s_show=[],
                    highlight_discoursemes=[], filter_queries={},
                    order=42, cut_off=500, window=None):

    matches = query.matches

    corpus = Corpus(corpus_name=query.corpus.cwb_id,
                    lib_dir=None,
                    cqp_bin=current_app.config['CCC_CQP_BIN'],
                    registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                    data_dir=current_app.config['CCC_DATA_DIR'])

    ########################################
    # SUBCORPUS OF COTEXT OF QUERY MATCHES #
    ########################################
    matches_df = DataFrame([vars(s) for s in matches], columns=['match', 'matchend']).set_index(['match', 'matchend'])
    # NB:
    # - for filtering, we set whole context regions as cotext so we can easily filter iteratively
    # - we also output whole context regions
    # - post-hoc filtering and marking as out-of-window below
    matches = corpus.subcorpus(df_dump=matches_df, overwrite=False).set_context(context_break=context_break, overwrite=True)
    cotext_of_matches = matches.set_context_as_matches(subcorpus_name='Temp', overwrite=True)

    #############
    # FILTERING #
    #############
    matches_filter = dict()
    if filter_queries:
        current_app.logger.debug('ccc_collocates :: filtering')
        for name, cqp_query in filter_queries.items():
            disc = cotext_of_matches.query(cqp_query, context_break=context_break, match_strategy=query.match_strategy)
            if len(disc.df) == 0:
                return None
            matches_filter[name] = disc.matches()
            cotext_of_matches = disc.set_context_as_matches(overwrite=True)
        # focus back on topic:
        matches = cotext_of_matches.query(query.cqp_query, context_break=context_break, match_strategy=query.match_strategy)

    ################
    # HIGHLIGHTING #
    ################
    matches_highlight = dict()
    if highlight_discoursemes:
        current_app.logger.debug('ccc_collocates :: highlighting')
        for discourseme in highlight_discoursemes:
            disc_query = format_cqp_query(discourseme.items.split("\t"), 'lemma', escape=False)
            disc = cotext_of_matches.query(cqp_query=disc_query, context_break=context_break, match_strategy=query.match_strategy)
            matches_highlight[discourseme.id] = disc.matches()

    ###########################
    # CREATE LINES AND FORMAT #
    ###########################
    current_app.logger.debug('ccc_collocates :: formatting')
    out = format_concordance(corpus, matches.df, p_show, s_show, order, cut_off, window, matches_filter, matches_highlight)

    return out


def format_concordance(corpus, matches_df, p_show, s_show, order, cut_off, window, matches_filter, matches_highlight):

    # TODO: simplify, retrieve more tokens left and right;
    concordance = CCConcordance(corpus, matches_df)
    lines = concordance.lines(form='dict', p_show=p_show, s_show=s_show, order=order, cut_off=cut_off)
    out = list()
    for line in lines.iterrows():
        meta = {s: line[1][s] for s in s_show}
        line = line[1]['dict']
        line['lemma'] = [cqp_escape(item) for item in line['lemma']]
        roles = list()
        discoursemes_in_window = {disc_name: False for disc_name in matches_filter.keys()}
        for cpos, offset in zip(line['cpos'], line['offset']):
            cpos_roles = list()
            # node
            if offset == 0:
                cpos_roles.append('node')
            # out of window
            elif abs(offset) > window:
                cpos_roles.append('out_of_window')

            # highlighting
            for disc_name, disc_matches in matches_highlight.items():
                if cpos in disc_matches:
                    cpos_roles.append(disc_name)

            # filtering
            for disc_name, disc_matches in matches_filter.items():
                if cpos in disc_matches:
                    cpos_roles.append(disc_name)
                    if abs(offset) <= window:
                        discoursemes_in_window[disc_name] = True

            roles.append(cpos_roles)
        # we filter here according to window size
        if sum(discoursemes_in_window.values()) >= len(matches_filter):
            line['role'] = roles
            line['meta'] = DataFrame.from_dict(meta, orient='index').to_html(bold_rows=False, header=False, render_links=True)
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
