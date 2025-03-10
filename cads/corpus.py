#!/usr/bin/python3
# -*- coding: utf-8 -*-

import json
from glob import glob

import click
from apiflask import APIBlueprint, Schema
from apiflask.fields import Boolean, Float, Integer, List, Nested, String
from apiflask.validators import OneOf
from ccc import Corpus as CCCorpus
from ccc import SubCorpus as CCCSubCorpus
from flask import abort, current_app
from numpy import array_split
from pandas import DataFrame, read_csv, to_datetime
from sqlalchemy import func

from . import db
from .concordance import ConcordanceIn, ConcordanceOut
from .database import (Corpus, CorpusAttributes, Segmentation,
                       SegmentationAnnotation, SegmentationSpan,
                       SegmentationSpanAnnotation, SubCorpus)
from .query import (QueryAssistedIn, get_concordance_lines,
                    get_or_create_assisted)
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


def meta_from_s_att(corpus, level, key, value_type, cqp_bin, registry_dir, data_dir):

    if level not in corpus.s_atts:
        abort(404, 'attribute level not found')

    if f'{level}_{key}' not in corpus.s_annotations:
        abort(404, 'annotation level not found')

    df_meta = corpus.ccc().query(s_query=f'{level}_{key}').df.reset_index().rename(columns={f'{level}_{key}': key})

    meta_from_df(corpus, df_meta, level, {key: value_type})


def meta_from_df(corpus, df_meta, level, column_mapping):

    # defined = set(df_meta.columns).intersection(set(column_mapping.keys()))
    undefined = set(df_meta.columns) - set(column_mapping.keys())
    superfluous = set(column_mapping.keys()) - set(df_meta.columns)

    for col in undefined:
        if col not in ['match', 'matchend'] and not col.endswith("_cwbid"):
            current_app.logger.error(f'column "{col}" not defined, saving as "unicode"')
            column_mapping[col] = 'unicode'

    for col in superfluous:
        column_mapping.pop(col)
        current_app.logger.error(f'column "{col}" defined but not found, skipping')

    # segmentation
    segmentation = Segmentation.query.filter_by(corpus_id=corpus.id, level=level).first()
    if segmentation is not None:
        current_app.logger.debug("segmentation already exists")
    else:
        current_app.logger.debug("storing segmentation")
        segmentation = Segmentation(corpus_id=corpus.id, level=level)
        db.session.add(segmentation)
        db.session.commit()
        df_meta['segmentation_id'] = segmentation.id
        df_meta[['segmentation_id', 'match', 'matchend']].to_sql(
            "segmentation_span", con=db.engine, if_exists='append', index=False
        )
        db.session.commit()
        df_meta = df_meta.drop('segmentation_id', axis=1)

    # segmentation spans
    current_app.logger.debug("retrieving stored segmentation spans")
    segmentation_spans = DataFrame([vars(s) for s in segmentation.spans]).rename(
        {'id': 'segmentation_span_id'}, axis=1
    )
    current_app.logger.debug("merging with new information")
    df_meta = segmentation_spans.merge(df_meta, on=['match', 'matchend'])

    for col, value_type in column_mapping.items():
        current_app.logger.debug(f'key: "{col}", value_type: "{value_type}"')

        # segmentation annotation
        segmentation_annotation = SegmentationAnnotation.query.filter_by(
            segmentation_id=segmentation.id, key=col
        ).first()
        if segmentation_annotation is not None:
            current_app.logger.debug(".. segmentation annotation already exists")
        else:
            current_app.logger.debug(".. storing segmentation annotation")
            df = df_meta[['segmentation_span_id', col]].copy()

            # TODO improve conversion
            if value_type != "unicode":
                try:
                    if df[col].dtype != value_type:
                        if value_type == "datetime":
                            df[col] = to_datetime(df[col])
                        elif value_type == "boolean":
                            df[col] = (df[col].str.startswith('T'))
                        elif value_type == "numeric":
                            df[col] = df[col].astype(float)
                except ValueError:
                    current_app.logger.error("data type conversion unsuccessful, using unicode instead")
                    df[col] = df[col].astype(str)
                    value_type = "unicode"
            df = df.rename({col: f'value_{value_type}'}, axis=1)

            segmentation_annotation = SegmentationAnnotation(
                segmentation_id=segmentation.id,
                key=col,
                value_type=value_type
            )
            db.session.add(segmentation_annotation)
            db.session.commit()
            df['segmentation_annotation_id'] = segmentation_annotation.id
            df.to_sql("segmentation_span_annotation", con=db.engine, if_exists='append', index=False)


def meta_from_within_xml(cwb_id, level="text", column_mapping={}):

    corpus = Corpus.query.filter_by(cwb_id=cwb_id).first()
    cqp_bin = current_app.config['CCC_CQP_BIN']
    registry_dir = current_app.config['CCC_REGISTRY_DIR']
    data_dir = current_app.config['CCC_DATA_DIR']

    attributes = [a for a in corpus.s_annotations if a.startswith(f'{level}_')]
    for a in attributes:
        level = a.split("_")[0]
        key = a.split(f"{level}_")[1]
        value_type = column_mapping.get(key, 'unicode')
        meta_from_s_att(corpus, level, key, value_type, cqp_bin, registry_dir, data_dir)


def meta_from_tsv(cwb_id, path, level='text', column_mapping={}, sep="\t"):
    """corpus meta data is read as a DataFrame indexed by match, matchend

    """

    corpus = Corpus.query.filter_by(cwb_id=cwb_id).first()

    current_app.logger.debug(f'reading meta data for level "{level}" of corpus "{cwb_id}"')
    df_meta = read_csv(path, sep=sep)
    meta_from_df(corpus, df_meta, level, column_mapping)


def get_meta_frequencies(corpus, level, key):

    # get attribute
    att = None
    for s in corpus.segmentations:
        if s.level == level:
            for ann in s.annotations:
                if ann.key == key:
                    att = ann
                    value_type = ann.value_type
                    segmentation_annotation_id = ann.id
    if att is None:
        abort(404, 'annotation layer not found')

    # create count data
    records = db.session.query(
        SegmentationSpanAnnotation.__table__.c['value_' + value_type],
        func.count(SegmentationSpanAnnotation.__table__.c['value_' + value_type])
    ).filter_by(
        segmentation_annotation_id=segmentation_annotation_id
    ).group_by(
        SegmentationSpanAnnotation.__table__.c['value_' + value_type]
    ).all()

    return records


def get_meta_number_tokens(corpus, level, key):

    # get attribute
    att = None
    for s in corpus.segmentations:
        if s.level == level:
            for ann in s.annotations:
                if ann.key == key:
                    att = ann
                    value_type = ann.value_type
                    segmentation_annotation_id = ann.id
    if att is None:
        abort(404, 'annotation layer not found')

    # number of tokens
    records = db.session.query(
        SegmentationSpanAnnotation.__table__.c['value_' + value_type],
        func.sum(SegmentationSpan.matchend - SegmentationSpan.match + 1).label('total_span')
    ).filter_by(
        segmentation_annotation_id=segmentation_annotation_id
    ).join(
        SegmentationSpan, SegmentationSpanAnnotation.segmentation_span_id == SegmentationSpan.id
    ).group_by(
        SegmentationSpanAnnotation.__table__.c['value_' + value_type]
    ).all()

    return records


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


def subcorpus_from_df(cwb_id, name, description, df, level, create_nqr, cqp_bin, registry_dir, data_dir):

    corpus = Corpus.query.filter_by(cwb_id=cwb_id).first()

    nqr_cqp = None
    if create_nqr:
        nqr = CCCSubCorpus(corpus_name=cwb_id,
                           subcorpus_name=None,
                           df_dump=df.set_index(['match', 'matchend']),
                           cqp_bin=cqp_bin,
                           registry_dir=registry_dir,
                           data_dir=data_dir,
                           lib_dir=None,
                           overwrite=False)
        nqr_cqp = nqr.subcorpus_name

    segmentation = Segmentation.query.filter_by(corpus_id=corpus.id, level=level)

    # is there one and only one segmentation?
    if len(segmentation.all()) > 1:
        raise NotImplementedError('several corresponding segmentation founds')

    segmentation = segmentation.first()
    if not segmentation:
        current_app.logger.debug("storing segmentation")
        segmentation = Segmentation(corpus_id=corpus.id, level=level)
        db.session.add(segmentation)
        db.session.commit()

        df['segmentation_id'] = segmentation.id
        df[['segmentation_id', 'match', 'matchend']].to_sql(
            "segmentation_span", con=db.engine, if_exists='append', index=False
        )
        db.session.commit()
        df = df.drop('segmentation_id', axis=1)

    # get segmentation spans
    # we need to batch here for select clause (hard limit: 500,000 for `column.in_()`)
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
                          description=description,
                          nqr_cqp=nqr_cqp,
                          spans=spans)
    db.session.add(subcorpus)
    db.session.commit()

    return subcorpus


def subcorpora_from_tsv(cwb_id, path, column='subcorpus', description='imported subcorpus', level='text', create_nqr=False):
    """create subcorpora from TSV file

    """
    subcorpora = read_csv(path, sep='\t')

    for name, subcorpus in subcorpora.groupby(column):
        current_app.logger.debug(f'creating subcorpus "{name}" with {len(subcorpus)} regions')
        df = subcorpus.drop(column, axis=1)
        subcorpus_from_df(cwb_id, name, description, df, level, create_nqr,
                          cqp_bin=current_app.config['CCC_CQP_BIN'],
                          registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                          data_dir=current_app.config['CCC_DATA_DIR'])


################
# API schemata #
################

# Input
class SubCorpusIn(Schema):

    level = String(required=True)
    key = String(required=True)
    name = String(required=True)
    description = String(required=False, allow_none=True)
    values_numeric = List(Float, required=False, allow_none=True)
    values_unicode = List(String, required=False, allow_none=True)
    value_boolean = Boolean(required=False, allow_none=True)
    create_nqr = Boolean(required=False, load_default=True)


class MetaIn(Schema):

    level = String(required=True)
    key = String(required=True)
    value_type = String(required=True, validate=OneOf(['datetime', 'numeric', 'boolean', 'unicode']))


class MetaFrequenciesIn(Schema):

    level = String(required=True)
    key = String(required=True)


# Output
class CorpusOut(Schema):

    id = Integer(required=True)
    cwb_id = String(required=True)
    name = String(required=True, allow_none=True, dump_default=None)
    language = String(required=True, allow_none=True, dump_default=None)
    register = String(required=True, allow_none=True, dump_default=None)
    description = String(required=True, allow_none=True, dump_default=None)
    s_atts = List(String, required=True, dump_default=[])
    p_atts = List(String, required=True, dump_default=[])
    s_annotations = List(String, required=True, dump_default=[])


class SubCorpusOut(Schema):

    id = Integer(required=True)
    corpus = Nested(CorpusOut, required=True)
    name = String(required=True, dump_default=None, allow_none=True)
    description = String(required=True, dump_default=None, allow_none=True)
    nqr_cqp = String(required=True, dump_default=None, allow_none=True)


class AnnotationsOut(Schema):

    key = String(required=True)
    value_type = String(required=True, validate=OneOf(['datetime', 'numeric', 'boolean', 'unicode']))


class MetaOut(Schema):

    level = String(required=True)
    annotations = Nested(AnnotationsOut(many=True), required=True, dump_default=[])


class MetaFrequenciesOut(Schema):

    value = String(required=True)
    nr_spans = Integer(required=True)
    nr_tokens = Integer(required=True)


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
    """Get all subcorpora of a corpus.

    """
    subcorpora = SubCorpus.query.filter_by(corpus_id=id).all()

    return [SubCorpusOut().dump(subcorpus) for subcorpus in subcorpora], 200


@bp.get('/<id>/subcorpus/<subcorpus_id>')
@bp.output(SubCorpusOut)
@bp.auth_required(auth)
def get_subcorpus(id, subcorpus_id):
    """Get all details of subcorpus.

    """
    subcorpus = db.get_or_404(SubCorpus, subcorpus_id)

    return SubCorpusOut().dump(subcorpus), 200


@bp.put('/<id>/subcorpus/')
@bp.input(SubCorpusIn)
@bp.output(SubCorpusOut)
@bp.auth_required(auth)
def create_subcorpus(id, json_data):
    """Create subcorpus from stored meta data.

    """

    corpus = db.get_or_404(Corpus, id)

    name = json_data['name']
    description = json_data.get('description')
    level = json_data['level']
    key = json_data['key']
    values_numeric = json_data.get('values_numeric')
    values_unicode = json_data.get('values_unicode')
    value_boolean = json_data.get('value_boolean')
    create_nqr = json_data['create_nqr']

    values = values_numeric if values_numeric is not None else values_unicode if values_unicode is not None else value_boolean
    if values is None:
        abort(400, 'Bad Request: You have to provide exactly one type of values')

    segmentation = Segmentation.query.filter_by(corpus_id=corpus.id, level=level).first()
    segmentation_annotation = SegmentationAnnotation.query.filter_by(segmentation_id=segmentation.id, key=key).first()

    span_ids = SegmentationSpanAnnotation.query.filter(
        SegmentationSpanAnnotation.segmentation_annotation_id == segmentation_annotation.id,
        SegmentationSpanAnnotation.__table__.c['value_' + segmentation_annotation.value_type].in_(values)
    )

    spans = SegmentationSpan.query.filter(SegmentationSpan.id.in_([s.segmentation_span_id for s in span_ids]))
    df = DataFrame([vars(s) for s in spans])
    df = df[['match', 'matchend']]

    subcorpus = subcorpus_from_df(corpus.cwb_id, name, description, df, level, create_nqr,
                                  cqp_bin=current_app.config['CCC_CQP_BIN'],
                                  registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                                  data_dir=current_app.config['CCC_DATA_DIR'])

    return SubCorpusOut().dump(subcorpus), 200


@bp.get('/<id>/meta/')
@bp.output(MetaOut(many=True))
@bp.auth_required(auth)
def get_meta(id):
    """Get meta data of corpus.

    """
    # TODO
    # datetime/numeric: min, maximum
    # boolean: yes/no
    # unicode: searchable endpoint: einzelne Auswahl
    # array of filter_object:

    corpus = db.get_or_404(Corpus, id)
    outs = list()
    for s in corpus.segmentations:
        out = {'level': s.level}
        out['annotations'] = list()
        for ann in s.annotations:
            out['annotations'].append({'key': ann.key, 'value_type': ann.value_type})
        outs.append(out)

    return [MetaOut().dump(out) for out in outs], 200


@bp.put('/<id>/meta/')
@bp.input(MetaIn)
@bp.auth_required(auth)
@bp.output(AnnotationsOut)
def set_meta(id, json_data):
    """Set meta data of corpus from encoded s-attribute.

    """

    corpus = db.get_or_404(Corpus, id)

    cqp_bin = current_app.config['CCC_CQP_BIN']
    registry_dir = current_app.config['CCC_REGISTRY_DIR']
    data_dir = current_app.config['CCC_DATA_DIR']

    level = json_data['level']
    key = json_data['key']
    value_type = json_data['value_type']

    meta_from_s_att(corpus, level, key, value_type, cqp_bin, registry_dir, data_dir)

    return AnnotationsOut().dump({'key': key, 'value_type': value_type}), 200


@bp.get('/<id>/meta/frequencies')
@bp.input(MetaFrequenciesIn, location='query')
@bp.output(MetaFrequenciesOut(many=True))
@bp.auth_required(auth)
def get_frequencies(id, query_data):
    """Get frequencies of segmentation span annotations.

    """

    corpus = db.get_or_404(Corpus, id)
    level = query_data.get('level')
    key = query_data.get('key')

    df_spans = DataFrame.from_records(get_meta_frequencies(corpus, level, key))
    df_spans.columns = ['value', 'nr_spans']
    df_tokens = DataFrame.from_records(get_meta_number_tokens(corpus, level, key))
    df_tokens.columns = ['value', 'nr_tokens']

    df_freq = df_spans.set_index('value').join(df_tokens.set_index('value'), how='outer').sort_values(by='nr_tokens', ascending=False)
    freq = df_freq.reset_index().to_dict(orient='records')

    return [MetaFrequenciesOut().dump(f) for f in freq], 200


@bp.get('/<id>/concordance')
@bp.input(QueryAssistedIn)
@bp.input(ConcordanceIn, location='query')
@bp.output(ConcordanceOut)
@bp.auth_required(auth)
def concordance(id, json_data, query_data):

    query = get_or_create_assisted(json_data, True)

    if isinstance(query, str):
        return abort(406, query)

    concordance = get_concordance_lines(query.id, query_data)

    return ConcordanceOut().dump(concordance), 200


################
# CLI commands #
################
@bp.cli.command('read-meta')
@click.argument('cwb_id')
@click.option('--path')
@click.option('--level', default='text')
def read_meta(cwb_id, path, level):
    """Read meta data of corpus from TSV table.

    - from TSV
    - from within XML
    """

    column_mapping = {'date': 'datetime', 'lp': 'numeric', 'role': 'unicode', 'faction': 'unicode'}

    if not path:
        meta_from_within_xml(cwb_id, level, column_mapping)
    else:
        meta_from_tsv(cwb_id, path, level, column_mapping)


@bp.cli.command('subcorpora')
@click.argument('cwb_id')
@click.argument('glob_in')
def subcorpora(cwb_id, glob_in):
    """Create meta data from corpus.

    """
    paths = glob(glob_in)
    for path in paths:
        subcorpora_from_tsv(cwb_id, path)


@bp.cli.command('import')
@click.option('--path', default=None)
@click.option('--delete_old', default=False, is_flag=True)
@click.option('--reread_attributes', default=False, is_flag=True)
def import_corpora(path, delete_old, reread_attributes):
    """update corpora according to JSON file
    - by default, this uses the CORPORA path defined in config
    - corpora are identified via CWBID
    - existing corpora included in file are updated but keep the same ID (if not deleted via delete_old=True)
    - new corpora are added
    - attributes will be (re-)read from CWB only for new corpora (if not forced via reread_attributes=True)
    """

    read_corpora(path, delete_old, reread_attributes)
