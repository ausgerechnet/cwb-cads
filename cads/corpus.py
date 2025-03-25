#!/usr/bin/python3
# -*- coding: utf-8 -*-

import json
from datetime import date
from glob import glob

import click
from apiflask import APIBlueprint, Schema
from apiflask.fields import (Boolean, DateTime, Float, Integer, List, Nested,
                             String, Tuple)
from apiflask.validators import OneOf
from ccc import Corpus as CCCorpus
from ccc import SubCorpus as CCCSubCorpus
from flask import abort, current_app
from numpy import array_split
from pandas import DataFrame, read_csv, to_datetime
from sqlalchemy import Integer as sql_Integer
from sqlalchemy import func, or_, select

from . import db
from .concordance import ConcordanceIn, ConcordanceOut
from .database import (Corpus, CorpusAttributes, Segmentation,
                       SegmentationAnnotation, SegmentationSpan,
                       SegmentationSpanAnnotation, SubCorpus,
                       SubCorpusCollection)
from .query import (QueryAssistedIn, get_concordance_lines,
                    get_or_create_assisted)
from .users import auth

bp = APIBlueprint('corpus', __name__, url_prefix='/corpus', cli_group='corpus')


DEFAULT_VALUE_TYPES = {
    'date': 'datetime',
    'lp': 'numeric',
    'n': 'numeric',
    'session': 'numeric',
    'no': 'numeric',
    'counts': 'numeric',
    'duplicated': 'boolean'
}


def correct_week_00(d):
    """correct a datetime week returned by SQLite to comply with ISO8601:
    replace week 00 with last week of preceding year

    """
    if d.endswith("00"):
        year = int(d.split("-")[0])
        last_week = date(year, 12, 31).isocalendar().week
        d = str(year - 1) + "-W" + str(last_week)
    return d


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

    # if level not in corpus.s_atts:
    #     abort(404, 'attribute level not found')

    if f'{level}_{key}' not in corpus.s_annotations:
        abort(404, 'annotation level not found')

    df_meta = corpus.ccc().query(s_query=f'{level}_{key}').df.reset_index().rename(columns={f'{level}_{key}': key})

    meta_from_df(corpus, df_meta, level, {key: value_type})


def meta_from_df(corpus, df_meta, level, column_value_types=dict()):

    default_values = {k: v for k, v in DEFAULT_VALUE_TYPES.items() if k in df_meta.columns}
    column_mapping = {**default_values, **column_value_types}

    # defined = set(df_meta.columns).intersection(set(column_mapping.keys()))
    undefined = set(df_meta.columns) - set(column_mapping.keys())
    superfluous = set(column_mapping.keys()) - set(df_meta.columns)

    for col in undefined:
        if col not in ['match', 'matchend'] and not col.endswith("_cwbid"):
            current_app.logger.warning(f'column "{col}" not defined, saving as "unicode"')
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


def meta_from_within_xml(cwb_id, level="text", column_value_types=dict()):

    column_mapping = {**DEFAULT_VALUE_TYPES, **column_value_types}

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
    )

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


def get_meta_freq(att, nr_bins=30, time_interval='hour'):

    time_formats = {
        'hour': '%Y-%m-%d %H:00:00',
        'day': '%Y-%m-%d',
        'week': '%Y-W%W',
        'month': '%Y-%m',
        'year': '%Y'
    }

    if att.value_type in ['boolean', 'unicode']:

        records = db.session.query(
            SegmentationSpanAnnotation.__table__.c['value_' + att.value_type].label('bin_index'),
            func.count(SegmentationSpanAnnotation.__table__.c['value_' + att.value_type]).label('nr_spans'),
            func.sum(SegmentationSpan.matchend - SegmentationSpan.match + 1).label('nr_tokens')
        )

    elif att.value_type == 'numeric':

        min_value, max_value = db.session.query(
            func.min(SegmentationSpanAnnotation.__table__.c['value_' + att.value_type]),
            func.max(SegmentationSpanAnnotation.__table__.c['value_' + att.value_type])
        ).first()
        bin_width = (max_value - min_value) / nr_bins

        bin_index_expr = ((SegmentationSpanAnnotation.__table__.c['value_' + att.value_type] - min_value) / bin_width).cast(sql_Integer)
        bin_start_expr = min_value + bin_index_expr * bin_width
        bin_end_expr = bin_start_expr + bin_width

        records = db.session.query(
            bin_index_expr.label('bin_index'),
            bin_start_expr.label('bin_start'),
            bin_end_expr.label('bin_end'),
            func.count().label('nr_spans'),
            func.sum(SegmentationSpan.matchend - SegmentationSpan.match + 1).label('nr_tokens')
        )

    elif att.value_type == 'datetime':

        records = db.session.query(
            func.strftime(time_formats[time_interval], SegmentationSpanAnnotation.__table__.c['value_' + att.value_type]).label('bin_index'),
            func.count().label('nr_spans'),
            func.sum(SegmentationSpan.matchend - SegmentationSpan.match + 1).label('nr_tokens')
        )

    else:
        raise ValueError()

    records = records.filter_by(
        segmentation_annotation_id=att.id
    ).join(
        SegmentationSpan, SegmentationSpanAnnotation.segmentation_span_id == SegmentationSpan.id
    ).group_by(
        'bin_index'
    )

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
    # TODO use sqlite subquery instead
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

    name = String(required=True)
    description = String(required=False, allow_none=True)

    level = String(required=True)
    key = String(required=True)

    bins_unicode = List(String, required=False, allow_none=True)
    bins_boolean = List(Boolean, required=False, allow_none=True)
    bins_numeric = List(
        Tuple((Float, Float)), required=False, allow_none=True,
        metadata={'description': "intervals are understood as left-closed, right-open (start <= value < end)"}
    )
    bins_datetime = List(
        Tuple((DateTime, DateTime)), required=False, allow_none=True,
        metadata={'description': "intervals are understood as left-closed, right-open (start <= value < end)"}
    )

    create_nqr = Boolean(required=False, load_default=True)


class SubCorpusCollectionIn(Schema):

    name = String(required=True)
    description = String(required=False, allow_none=True)

    level = String(required=True)
    key = String(required=True)

    time_interval = String(
        required=False, load_default='day', validate=OneOf(['hour', 'day', 'week', 'month', 'year']),
        metadata={'description': "which bins to use."}
    )

    create_nqr = Boolean(required=False, load_default=True)


class MetaIn(Schema):

    level = String(required=True)
    key = String(required=True)
    value_type = String(required=True, validate=OneOf(['datetime', 'numeric', 'boolean', 'unicode']))


class MetaFrequenciesIn(Schema):

    level = String(required=True)
    key = String(required=True)

    sort_by = String(required=False, load_default='nr_tokens', validate=OneOf(['bin', 'nr_spans', 'nr_tokens']))
    sort_order = String(required=False, load_default='descending', validate=OneOf(['ascending', 'descending']))
    page_size = Integer(required=False, load_default=10)
    page_number = Integer(required=False, load_default=1)

    nr_bins = Integer(
        required=False, load_default=30,
        metadata={'description': "how may (equidistant) bins to create. only used for numeric values."}
    )
    time_interval = String(
        required=False, load_default='day', validate=OneOf(['hour', 'day', 'week', 'month', 'year']),
        metadata={'description': "which bins to create for datetime values. only used for datetime values."}
    )


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


class SubCorpusCollectionOut(Schema):

    id = Integer(required=True)
    corpus = Nested(CorpusOut, required=True)
    name = String(required=True, dump_default=None, allow_none=True)
    description = String(required=True, dump_default=None, allow_none=True)
    subcorpora = Nested(SubCorpusOut(many=True), required=True)


class AnnotationsOut(Schema):

    key = String(required=True)
    value_type = String(required=True, validate=OneOf(['datetime', 'numeric', 'boolean', 'unicode']))


class LevelOut(Schema):

    level = String(required=True)
    annotations = Nested(AnnotationsOut(many=True), required=True, dump_default=[])


class MetaOut(Schema):

    corpus_id = Integer(required=True)
    levels = Nested(LevelOut(many=True), required=True, dump_default=[])


class MetaFrequencyOut(Schema):

    # bin = String(required=True)
    bin_unicode = String(required=False, allow_none=True)
    bin_boolean = Boolean(required=False, allow_none=True)
    bin_numeric = Tuple((Float, Float), required=False, allow_none=True)
    bin_datetime = String(required=False, allow_none=True)
    nr_spans = Integer(required=True)
    nr_tokens = Integer(required=True)


class MetaFrequenciesOut(Schema):

    sort_by = String(required=True)
    sort_order = String(required=True)
    nr_items = Integer(required=True)
    page_size = Integer(required=True)
    page_number = Integer(required=True)
    page_count = Integer(required=True)
    value_type = String(required=True, validate=OneOf(['datetime', 'numeric', 'boolean', 'unicode']))

    frequencies = Nested(MetaFrequencyOut(many=True), required=True, dump_default=[])


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
    """Get details of a subcorpus.

    """
    subcorpus = db.get_or_404(SubCorpus, subcorpus_id)

    return SubCorpusOut().dump(subcorpus), 200


@bp.delete('/<id>/subcorpus/<subcorpus_id>')
@bp.output(SubCorpusCollectionOut)
@bp.auth_required(auth)
def delete_subcorpus(id, subcorpus_id):
    """Get subcorpus collection.

    """

    subcorpus = db.get_or_404(SubCorpus, subcorpus_id)
    db.session.delete(subcorpus)
    db.session.commit()

    return 'Deletion successful.', 200


@bp.put('/<id>/subcorpus/')
@bp.input(SubCorpusIn)
@bp.output(SubCorpusOut)
@bp.auth_required(auth)
def create_subcorpus(id, json_data):
    """Create subcorpus from stored meta data. We only support creation of subcorpora from one key-value pair.
    - boolean / unicode keys: categorical select
    - numeric / datetime keys: interval select

    """

    corpus = db.get_or_404(Corpus, id)

    name = json_data['name']
    description = json_data.get('description')

    level = json_data['level']
    key = json_data['key']

    create_nqr = json_data['create_nqr']

    segmentation = Segmentation.query.filter_by(corpus_id=corpus.id, level=level).first()
    segmentation_annotation = SegmentationAnnotation.query.filter_by(segmentation_id=segmentation.id, key=key).first()
    value_type = segmentation_annotation.value_type
    values = json_data.get(f'bins_{value_type}')

    if values is None:
        abort(400, f'Bad Request: {level}_{key} is of type {value_type}, but no such value(s) provided')

    if value_type in ['unicode', 'boolean']:
        span_ids = select(SegmentationSpanAnnotation.segmentation_span_id).filter(
            SegmentationSpanAnnotation.segmentation_annotation_id == segmentation_annotation.id,
            SegmentationSpanAnnotation.__table__.c['value_' + segmentation_annotation.value_type].in_(values)
        )

    elif value_type in ['numeric', 'datetime']:
        span_ids = select(SegmentationSpanAnnotation.segmentation_span_id).filter(
            SegmentationSpanAnnotation.segmentation_annotation_id == segmentation_annotation.id,
            or_(*[
                (SegmentationSpanAnnotation.__table__.c['value_' + segmentation_annotation.value_type] >= start) &
                (SegmentationSpanAnnotation.__table__.c['value_' + segmentation_annotation.value_type] < end) for start, end in values
            ])
        )
    else:
        raise ValueError()

    spans = SegmentationSpan.query.filter(SegmentationSpan.id.in_(span_ids.scalar_subquery()))
    df = DataFrame([vars(s) for s in spans])
    if len(df) == 0:
        abort(406, 'empty subcorpus')

    df = df[['match', 'matchend']]
    subcorpus = subcorpus_from_df(corpus.cwb_id, name, description, df, level, create_nqr,
                                  cqp_bin=current_app.config['CCC_CQP_BIN'],
                                  registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                                  data_dir=current_app.config['CCC_DATA_DIR'])

    return SubCorpusOut().dump(subcorpus), 200


@bp.put('/<id>/subcorpus-collection/')
@bp.input(SubCorpusCollectionIn)
@bp.output(SubCorpusCollectionOut)
@bp.auth_required(auth)
def create_subcorpus_collection(id, json_data):
    """Create subcorpus collection.

    """

    corpus = db.get_or_404(Corpus, id)

    name = json_data['name']
    description = json_data.get('description')

    level = json_data['level']
    key = json_data['key']

    time_interval = json_data.get('time_interval', 'day')
    create_nqr = json_data['create_nqr']

    # get attribute
    att = corpus.get_s_att(level=level, key=key)
    if att is None:
        abort(404, 'annotation layer not found')

    segmentation = Segmentation.query.filter_by(corpus_id=corpus.id, level=level).first()
    segmentation_annotation = SegmentationAnnotation.query.filter_by(segmentation_id=segmentation.id, key=key).first()

    collection = SubCorpusCollection(
        name=name,
        description=description,
        corpus_id=corpus.id,
        level=level,
        key=key,
        time_interval=time_interval
    )
    db.session.add(collection)
    db.session.commit()

    # meta frequencies
    records = get_meta_freq(att, None, time_interval)
    df_freq = DataFrame(records.all())
    periods = list(zip(df_freq['bin_index'].tolist(), df_freq['bin_index'].tolist()[1:] + ["999999-12-31"]))

    for start, end in periods:
        current_app.logger.debug(f"creating subcorpus {start} to {end}")
        span_ids = select(SegmentationSpanAnnotation.segmentation_span_id).filter(
            SegmentationSpanAnnotation.segmentation_annotation_id == segmentation_annotation.id,
            (SegmentationSpanAnnotation.__table__.c['value_' + segmentation_annotation.value_type] >= start) &
            (SegmentationSpanAnnotation.__table__.c['value_' + segmentation_annotation.value_type] < end)
        )

        spans = SegmentationSpan.query.filter(SegmentationSpan.id.in_(span_ids.scalar_subquery()))
        df = DataFrame([vars(s) for s in spans])
        if len(df) > 0:
            df = df[['match', 'matchend']]
            subcorpus = subcorpus_from_df(corpus.cwb_id, start, "subcorpus-collection", df, level, create_nqr,
                                          cqp_bin=current_app.config['CCC_CQP_BIN'],
                                          registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                                          data_dir=current_app.config['CCC_DATA_DIR'])
            subcorpus.collection_id = collection.id

    db.session.commit()

    return SubCorpusCollectionOut().dump(collection), 200


@bp.get('/<id>/subcorpus-collection/')
@bp.output(SubCorpusCollectionOut(many=True))
@bp.auth_required(auth)
def get_subcorpus_collections(id):
    """Get all subcorpus collections in corpus.

    """

    collections = SubCorpusCollection.query.filter_by(corpus_id=id).all()

    return [SubCorpusCollectionOut().dump(collection) for collection in collections], 200


@bp.get('/<id>/subcorpus-collection/<subcorpus_collection_id>')
@bp.output(SubCorpusCollectionOut)
@bp.auth_required(auth)
def get_subcorpus_collection(id, subcorpus_collection_id):
    """Get subcorpus collection.

    """

    collection = db.get_or_404(SubCorpusCollection, subcorpus_collection_id)

    return SubCorpusCollectionOut().dump(collection), 200


@bp.delete('/<id>/subcorpus-collection/<subcorpus_collection_id>')
@bp.output(SubCorpusCollectionOut)
@bp.auth_required(auth)
def delete_subcorpus_collection(id, subcorpus_collection_id):
    """Get subcorpus collection.

    """

    collection = db.get_or_404(SubCorpusCollection, subcorpus_collection_id)
    db.session.delete(collection)
    db.session.commit()

    return 'Deletion successful.', 200


@bp.get('/<id>/meta/')
@bp.output(MetaOut)
@bp.auth_required(auth)
def get_meta(id):
    """Get meta data of corpus. Used for subcorpus creation.

    TODO also return some descriptive summary of level annotations?
    """

    corpus = db.get_or_404(Corpus, id)
    levels = list()
    for s in corpus.segmentations:
        level = {'level': s.level}
        level['annotations'] = list()
        for ann in s.annotations:
            level['annotations'].append({'key': ann.key, 'value_type': ann.value_type})
        levels.append(level)

    return MetaOut().dump({
        'corpus_id': id,
        'levels': [LevelOut().dump(level) for level in levels]
    }), 200


@bp.put('/<id>/meta/')
@bp.input(MetaIn)
@bp.auth_required(auth)
@bp.output(AnnotationsOut)
def set_meta(id, json_data):
    """Set meta data of corpus from CWB-encoded s-attribute.

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
@bp.output(MetaFrequenciesOut)
@bp.auth_required(auth)
def get_frequencies(id, query_data):
    """Get meta data frequencies in corpus.

    """

    corpus = db.get_or_404(Corpus, id)
    level = query_data.get('level')
    key = query_data.get('key')

    page_number = query_data.get('page_number', 1)
    page_size = query_data.get('page_size', 20)
    sort_order = query_data.get('sort_order', 'descending')
    sort_by = query_data.get('sort_by', 'nr_tokens')
    sort_by = 'bin_index' if sort_by == 'bin' else sort_by

    nr_bins = query_data.get('nr_bins', 5)
    time_interval = query_data.get('time_interval', 'day')

    # get attribute
    att = corpus.get_s_att(level=level, key=key)
    if att is None:
        abort(404, 'annotation layer not found')

    # meta frequencies
    records = get_meta_freq(att, nr_bins, time_interval)

    # sorting
    column_map = {desc["name"]: desc["expr"] for desc in records.column_descriptions}

    if sort_by in column_map:
        order_by_clause = column_map[sort_by] if sort_order == 'ascending' else column_map[sort_by].desc()
        records = records.order_by(order_by_clause)
    else:
        current_app.logger.error(f"sort_by '{sort_by}' not supported")

    records = records.paginate(page=page_number, per_page=page_size)
    df_freq = DataFrame(records.items)
    if att.value_type == 'unicode':
        df_freq['bin_unicode'] = df_freq['bin_index']
    elif att.value_type == 'boolean':
        df_freq['bin_boolean'] = df_freq['bin_index']
    elif att.value_type == 'numeric':
        df_freq['bin_numeric'] = list(zip(df_freq['bin_start'], df_freq['bin_end']))
    elif att.value_type == 'datetime':
        df_freq['bin_datetime'] = df_freq['bin_index']
        if time_interval == 'week':
            df_freq['bin_datetime'] = df_freq['bin_datetime'].apply(correct_week_00)
    freq = df_freq.to_dict(orient='records')

    return MetaFrequenciesOut().dump({
        'sort_by': sort_by,
        'sort_order': sort_order,
        'nr_items': records.total,
        'page_size': page_size,
        'page_number': page_number,
        'page_count': records.pages,
        'value_type': att.value_type,
        'frequencies': [MetaFrequencyOut().dump(f) for f in freq]
    }), 200


@bp.get('/<id>/subcorpus/<subcorpus_id>/meta/frequencies')
@bp.input(MetaFrequenciesIn, location='query')
@bp.output(MetaFrequenciesOut)
@bp.auth_required(auth)
def get_frequencies_subcorpus(id, subcorpus_id, query_data):
    """Get meta data frequencies in subcorpus.

    TODO: implement correctly, this retrieves corpus meta frequencies right now

    """

    corpus = db.get_or_404(Corpus, id)
    subcorpus = db.get_or_404(SubCorpus, subcorpus_id)
    level = query_data.get('level')
    key = query_data.get('key')

    page_number = query_data.get('page_number', 1)
    page_size = query_data.get('page_size', 20)
    sort_order = query_data.get('sort_order', 'descending')
    sort_by = query_data.get('sort_by', 'nr_tokens')
    sort_by = 'bin_index' if sort_by == 'bin' else sort_by

    nr_bins = query_data.get('nr_bins', 5)
    time_interval = query_data.get('time_interval', 'day')

    # get attribute
    att = corpus.get_s_att(level=level, key=key)
    if att is None:
        abort(404, 'annotation layer not found')

    # meta frequencies
    records = get_meta_freq(att, nr_bins, time_interval)

    # sorting
    column_map = {desc["name"]: desc["expr"] for desc in records.column_descriptions}

    if sort_by in column_map:
        order_by_clause = column_map[sort_by] if sort_order == 'ascending' else column_map[sort_by].desc()
        records = records.order_by(order_by_clause)
    else:
        current_app.logger.error(f"sort_by '{sort_by}' not supported")

    records = records.paginate(page=page_number, per_page=page_size)
    df_freq = DataFrame(records.items)
    if att.value_type == 'unicode':
        df_freq['bin_unicode'] = df_freq['bin_index']
    elif att.value_type == 'boolean':
        df_freq['bin_boolean'] = df_freq['bin_index']
    elif att.value_type == 'numeric':
        df_freq['bin_numeric'] = list(zip(df_freq['bin_start'], df_freq['bin_end']))
    elif att.value_type == 'datetime':
        df_freq['bin_datetime'] = df_freq['bin_index']
    freq = df_freq.to_dict(orient='records')

    return MetaFrequenciesOut().dump({
        'sort_by': sort_by,
        'sort_order': sort_order,
        'nr_items': records.total,
        'page_size': page_size,
        'page_number': page_number,
        'page_count': records.pages,
        'value_type': att.value_type,
        'frequencies': [MetaFrequencyOut().dump(f) for f in freq]
    }), 200


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

    column_value_types = {}

    if not path:
        meta_from_within_xml(cwb_id, level, column_value_types)
    else:
        meta_from_tsv(cwb_id, path, level, column_value_types)


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
