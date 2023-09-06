#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint
from ccc import Corpus as Crps
from flask import current_app

from . import db
from .collocation import score_counts
from .database import Corpus, KeywordItems

bp = APIBlueprint('keyword', __name__, url_prefix='/keyword')


def ccc_keywords(keyword, min_freq=2):

    KeywordItems.query.filter_by(keyword_id=keyword.id).delete()

    corpus = Corpus.query.filter_by(id=keyword.corpus_id).first()
    corpus_reference = Corpus.query.filter_by(id=keyword.corpus_id_reference).first()

    corpus = Crps(corpus.cwb_id, lib_dir=None,
                  cqp_bin=current_app.config['CCC_CQP_BIN'],
                  registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                  data_dir=current_app.config['CCC_DATA_DIR'])
    corpus_reference = Crps(corpus_reference.cwb_id, lib_dir=None,
                            cqp_bin=current_app.config['CCC_CQP_BIN'],
                            registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                            data_dir=current_app.config['CCC_DATA_DIR'])

    # get and merge both dataframes of counts
    current_app.logger.debug('ccc_keywords :: getting marginals')
    target = corpus.marginals(p_atts=keyword.p)[['freq']].rename(columns={'freq': 'f1'})
    reference = corpus_reference.marginals(p_atts=keyword.p_reference)[['freq']].rename(columns={'freq': 'f2'})

    current_app.logger.debug('ccc_keywords :: combining frequency lists')
    counts = target.join(reference, how='outer')
    counts['N1'] = target['f1'].sum()
    counts['N2'] = reference['f2'].sum()
    counts = counts.fillna(0, downcast='infer')

    # we score once here in order to only save relevant items
    scores = score_counts(counts, cut_off=500)
    counts = counts.loc[list(scores.index)]

    ############################################
    # GET MATCHES OF HIGHLIGHTING DISCOURSEMES #
    ############################################
    # TODO

    ####################
    # SAVE TO DATABASE #
    ####################
    current_app.logger.debug('ccc_keywords :: saving to database')

    counts['keyword_id'] = keyword.id
    keyword_items = counts.reset_index().apply(lambda row: KeywordItems(**row), axis=1)
    db.session.add_all(keyword_items)
    db.session.commit()

    return counts
