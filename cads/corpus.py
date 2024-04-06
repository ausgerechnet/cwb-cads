#!/usr/bin/python3
# -*- coding: utf-8 -*-

import json
from glob import glob

import click
from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, List, Nested, String
from ccc import Corpus as CCCorpus
from ccc import SubCorpus as CCCSubCorpus
from flask import current_app
from numpy import array_split
from pandas import DataFrame, read_csv

from . import db
from .database import (Corpus, CorpusAttributes, Segmentation,
                       SegmentationAnnotation, SegmentationSpan, SubCorpus)
from .users import auth

bp = APIBlueprint('corpus', __name__, url_prefix='/corpus', cli_group='corpus')


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


def ccc_corpus_attributes(corpus_name, cqp_bin, registry_dir, data_dir):
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

    attributes = {
        'p_atts': sort_p(p_atts),  # all p-attributes
        's_atts': sort_s(s_atts),  # s-attributes without annotation
        's_annotations': s_annotations  # s-attributes with annotation
    }

    return attributes


def meta_from_tsv(cwb_id, path, level='text', column_mapping={}, sep="\t"):
    """corpus meta data is read as a DataFrame indexed by match, matchend

    """

    corpus = Corpus.query.filter_by(cwb_id=cwb_id).first()

    current_app.logger.debug(f'reading meta data for level "{level}" of corpus "{cwb_id}"')
    meta = read_csv(path, sep=sep)

    # segmentation
    segmentation = Segmentation.query.filter_by(corpus_id=corpus.id, level=level).first()
    if segmentation is not None:
        current_app.logger.debug("segmentation already exists")
    else:
        current_app.logger.debug("storing segmentation")
        segmentation = Segmentation(corpus_id=corpus.id, level=level)
        db.session.add(segmentation)
        db.session.commit()
        meta['segmentation_id'] = segmentation.id
        meta[['segmentation_id', 'match', 'matchend']].to_sql(
            "segmentation_span", con=db.engine, if_exists='append', index=False
        )
        db.session.commit()
        meta = meta.drop('segmentation_id', axis=1)

    # segmentation spans
    current_app.logger.debug("retrieving stored segmentation spans")
    segmentation_spans = DataFrame([vars(s) for s in segmentation.spans]).rename(
        {'id': 'segmentation_span_id'}, axis=1
    )
    current_app.logger.debug("merging with new information")
    meta = segmentation_spans.merge(meta, on=['match', 'matchend'])
    for col, value_type in column_mapping.items():
        current_app.logger.debug(f'key: "{col}", value_type: "{value_type}"')
        if col not in meta.columns:
            current_app.logger.error(f'.. column "{col}" not found, skipping')
            continue

        # segmentation annotation
        segmentation_annotation = SegmentationAnnotation.query.filter_by(
            segmentation_id=segmentation.id, key=col
        ).first()
        if segmentation_annotation is not None:
            current_app.logger.debug(".. segmentation annotation already exists")
        else:
            segmentation_annotation = SegmentationAnnotation(
                segmentation_id=segmentation.id,
                key=col,
                value_type=value_type
            )
            db.session.add(segmentation_annotation)
            db.session.commit()
            df = meta[['segmentation_span_id', col]].copy()
            df = df.rename({col: f'value_{value_type}'}, axis=1)
            df['segmentation_annotation_id'] = segmentation_annotation.id
            df.to_sql("segmentation_span_annotation", con=db.engine, if_exists='append', index=False)


def subcorpora_from_tsv(cwb_id, path, column='subcorpus', level='text', create_nqr=False):

    cqp_bin = current_app.config['CCC_CQP_BIN']
    registry_dir = current_app.config['CCC_REGISTRY_DIR']
    data_dir = current_app.config['CCC_DATA_DIR']
    lib_dir = None

    subcorpora = read_csv(path, sep='\t')
    corpus = Corpus.query.filter_by(cwb_id=cwb_id).first()

    for name, subcorpus in subcorpora.groupby(column):

        current_app.logger.debug(f'creating subcorpus "{name}" with {len(subcorpus)} regions')
        # create NQR
        df = subcorpus.drop(column, axis=1)
        nqr_cqp = None
        if create_nqr:
            nqr = CCCSubCorpus(corpus_name=cwb_id,
                               subcorpus_name=None,
                               df_dump=df.set_index(['match', 'matchend']),
                               cqp_bin=cqp_bin,
                               registry_dir=registry_dir,
                               data_dir=data_dir,
                               lib_dir=lib_dir,
                               overwrite=False)
            nqr_cqp = nqr.subcorpus_name

        segmentation = Segmentation.query.filter(
            Segmentation.corpus_id == corpus.id, Segmentation.level == level
        )

        # is there one and only one segmentation?
        if len(segmentation.all()) > 1:
            raise NotImplementedError('several corresponding segmentation founds')
        segmentation = segmentation.first()
        if not segmentation:
            raise NotImplementedError('no corresponding segmentation found')

        # get segmentation spans
        # we need to batch here for select clause (hard limit: 500,000 for `df.in_()`)
        nr_arrays = int(len(df) / 100000) + 1
        dfs = array_split(df, nr_arrays)
        spans = list()
        for i, df in enumerate(dfs):
            current_app.logger.debug(f'.. batch {i+1} of {len(dfs)}')
            spans.extend(SegmentationSpan.query.filter(
                SegmentationSpan.segmentation_id == segmentation.id, SegmentationSpan.match.in_(df['match'])
            ).all())
        nr_tokens = sum([s.matchend - s.match + 1 for s in spans])
        current_app.logger.debug(f'.. {nr_tokens} tokens')

        # expose as SubCorpus
        subcorpus = SubCorpus(corpus_id=corpus.id,
                              segmentation_id=segmentation.id,
                              name=name,
                              description='imported subcorpus',
                              nqr_cqp=nqr_cqp,
                              nr_tokens=nr_tokens,
                              spans=spans)
        db.session.add(subcorpus)
        db.session.commit()


def read_corpora(path=None, delete_old=False, reread_attributes=False):

    path = current_app.config['CORPORA'] if path is None else path

    # get dictionaries for both sets of corpora
    corpora_old = {corpus.cwb_id: corpus for corpus in Corpus.query.all()}
    corpora_new = {corpus['cwb_id']: corpus for corpus in json.load(open(path, 'rt'))}

    corpora_update_ids = [cwb_id for cwb_id in corpora_old.keys() if cwb_id in corpora_new.keys()]
    corpora_add_ids = [cwb_id for cwb_id in corpora_new.keys() if cwb_id not in corpora_old.keys()]

    # DELETE
    if delete_old:
        corpora_delete_ids = [cwb_id for cwb_id in corpora_old.keys() if cwb_id not in corpora_new.keys()]
        for cwb_id in corpora_delete_ids:
            current_app.logger.debug(f'deleting corpus {cwb_id}')
            db.session.delete(corpora_old[cwb_id])

    # UPDATE
    for cwb_id in corpora_update_ids:
        current_app.logger.debug(f'updating corpus {cwb_id}')
        corpus = corpora_old[cwb_id]
        if reread_attributes:
            [db.session.delete(att) for att in corpus.attributes]
            attributes = ccc_corpus_attributes(cwb_id,
                                               cqp_bin=current_app.config['CCC_CQP_BIN'],
                                               registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                                               data_dir=current_app.config['CCC_DATA_DIR'])
            for attribute, levels in attributes.items():
                for level in levels:
                    db.session.add(CorpusAttributes(corpus_id=corpus.id, level=level, attribute=attribute))

        for key, value in corpora_new[cwb_id].items():
            setattr(corpus, key, value)

    # ADD
    for cwb_id in corpora_add_ids:
        current_app.logger.debug(f'adding corpus {cwb_id}')
        corpus = Corpus(**corpora_new[cwb_id])
        db.session.add(corpus)
        db.session.commit()
        attributes = ccc_corpus_attributes(cwb_id,
                                           cqp_bin=current_app.config['CCC_CQP_BIN'],
                                           registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                                           data_dir=current_app.config['CCC_DATA_DIR'])
        for attribute, levels in attributes.items():
            for level in levels:
                db.session.add(CorpusAttributes(corpus_id=corpus.id, level=level, attribute=attribute))

    db.session.commit()


################
# API schemata #
################
class CorpusOut(Schema):

    id = Integer()
    cwb_id = String()
    name = String()
    language = String()
    register = String()
    description = String()
    s_atts = List(String)
    p_atts = List(String)


class SubCorpusOut(Schema):

    id = Integer()
    corpus = Nested(CorpusOut)
    name = String()
    description = String()
    nqr_cqp = String()


#################
# API endpoints #
#################
@bp.get('/')
@bp.output(CorpusOut(many=True))
@bp.auth_required(auth)
def get_corpora():
    """Get all corpora.

    """
    corpora = Corpus.query.all()

    return [CorpusOut().dump(corpus) for corpus in corpora], 200


@bp.get('/<id>')
@bp.output(CorpusOut)
@bp.auth_required(auth)
def get_corpus(id):
    """Get details of a corpus.

    """
    corpus = db.get_or_404(Corpus, id)

    return CorpusOut().dump(corpus), 200


@bp.get('/<id>/subcorpus/')
@bp.output(SubCorpusOut(many=True))
@bp.auth_required(auth)
def get_subcorpora(id):
    """Get all corpora.

    """
    subcorpora = SubCorpus.query.filter_by(corpus_id=id).all()

    return [SubCorpusOut().dump(subcorpus) for subcorpus in subcorpora], 200


# @bp.put('/<id>/subcorpus/')
# @bp.auth_required(auth)
# def create_subcorpus(id, json_data):

#     pass

#     # json_data['corpus_id'],
#     # json_data['subcorpus_name']
#     # json_data['segmentation_key']
#     # json_data['segmentation_annotation']

#     # Discourseme(
#     #     name,
#     #     description
#     # )

#     # Query(
#     #     discourseme_id,
#     #     corpus_id,
#     #     # nqr_cqp,
#     #     cqp_query,
#     #     match_strategy
#     # )


# @bp.get('/<id>/meta')
# @bp.auth_required(auth)
# def get_meta(id):
#     """Get meta data of corpus.

#     """

#     pass
#     # corpus = db.get_or_404(Corpus, id)
#     # attributes = ccc_corpus_attributes(corpus.cwb_id, current_app.config['CCC_CQP_BIN'],
#     # current_app.config['CCC_REGISTRY_DIR'], current_app.config['CCC_DATA_DIR'])
#     # corpus = CorpusOut().dump(corpus)
#     # corpus = {**corpus, **attributes}

#     # return corpus, 200
#     # datetime/numeric: min, maximum
#     # boolean: yes/no
#     # unicode: searchable endpoint: einzelne Auswahl
#     # array of filter_object:


# @bp.put('/<id>/meta')
# @bp.auth_required(auth)
# def set_meta(id):
#     """Set meta data of corpus.

#     - from within XML
#     - from TSV

#     """

#     pass


################
# CLI commands #
################
@bp.cli.command('read-meta')
@click.argument('cwb_id')
@click.argument('path')
@click.option('--level', default='text')
def read_meta(cwb_id, path, level):
    """Read meta data of corpus from TSV table.

    - from TSV
    - from within XML
    """
    meta_from_tsv(cwb_id, path, level=level, column_mapping={'date': 'datetime', 'lp': 'numeric', 'role': 'unicode', 'faction': 'unicode'})


@bp.cli.command('subcorpora')
@click.argument('cwb_id')
@click.argument('glob_in')
def subcorpora(cwb_id, glob_in):
    """Set meta data of corpus.

    - from within XML
    - from TSV

    """
    paths = glob(glob_in)
    for path in paths:
        subcorpora_from_tsv(cwb_id, path)


@bp.cli.command('import')
@click.option('--path', default=None)
@click.option('--delete_old', default=False, is_flag=True)
@click.option('--reread_attributes', default=False, is_flag=True)
def update_corpora(path, delete_old, reread_attributes):
    """update corpora according to JSON file
    - by default, this uses the CORPORA path defined in config
    - corpora are identified via CWBID
    - existing corpora included in file are updated but keep the same ID (if not deleted via delete_old=True)
    - new corpora are added
    - attributes will be (re-)read from CWB only for new corpora (if not forced via reread_attributes=True)
    """

    read_corpora(path, delete_old, reread_attributes)
