#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, List, String
from ccc import Corpus as CCCorpus
from flask import current_app
from pandas import read_csv
from ccc import SubCorpus
import click
from glob import glob
import json

from . import db
from .database import Corpus
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


def meta_from_tsv(cwb_id, path):
    """
    corpus meta data is stored as DataFrame index by match, matchend
    """
    pass


def subcorpora_from_tsv(cwb_id, path, cqp_bin, registry_dir, data_dir, column='subcorpus'):

    df = read_csv(path, sep='\t')  # .set_index(['match', 'matchend'])
    for name, df in df.groupby(column):

        # create Discourseme + Query + Matches
        click.echo(f"importing {name}")
        corpus_id = Corpus.query.filter_by(cwb_id=cwb_id).first().id
        from .database import Query, Discourseme

        discourseme = Discourseme(name=f'S-{cwb_id}-{name}', description='imported subcorpus')
        db.session.add(discourseme)
        db.session.commit()

        # make sure it exists in CQP
        df = df.drop(column, axis=1)
        nqr = SubCorpus(corpus_name=cwb_id,
                        subcorpus_name=None,
                        df_dump=df.set_index(['match', 'matchend']),
                        cqp_bin=cqp_bin,
                        registry_dir=registry_dir,
                        data_dir=data_dir,
                        overwrite=False)
        nqr_name = nqr.subcorpus_name

        # save query
        query = Query(discourseme_id=discourseme.id, corpus_id=corpus_id, cqp_nqr_matches=nqr_name)
        db.session.add(query)
        db.session.commit()

        df['query_id'] = query.id
        df.to_sql('matches', con=db.engine, if_exists='append', index=False)


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
    attributes = ccc_corpus(corpus.cwb_id, current_app.config['CCC_CQP_BIN'], current_app.config['CCC_REGISTRY_DIR'], current_app.config['CCC_DATA_DIR'])
    corpus = CorpusOut().dump(corpus)
    corpus = {**corpus, **attributes}

    return corpus, 200


@bp.get('/<id>/meta')
@bp.output(CorpusOut)
@bp.auth_required(auth)
def get_meta(id):
    """Get meta data of corpus.

    """
    pass
    # corpus = db.get_or_404(Corpus, id)
    # attributes = ccc_corpus(corpus.cwb_id, current_app.config['CCC_CQP_BIN'], current_app.config['CCC_REGISTRY_DIR'], current_app.config['CCC_DATA_DIR'])
    # corpus = CorpusOut().dump(corpus)
    # corpus = {**corpus, **attributes}

    # return corpus, 200


@bp.put('/<id>/meta')
@bp.output(CorpusOut)
@bp.auth_required(auth)
def set_meta(id):
    """Set meta data of corpus.

    - from within XML
    - from TSV

    """
    pass


@bp.cli.command('read-meta')
@click.argument('cwb_id')
@click.argument('path')
def read_meta(cwb_id, path):
    """Set meta data of corpus.

    - from within XML
    - from TSV

    """
    meta_from_tsv(cwb_id, path)


@bp.put('/<id>/subcorpus')
@bp.auth_required(auth)
def create_subcorpus(id, data):

    pass
    # Discourseme(
    #     name,
    #     description
    # )

    # Query(
    #     discourseme_id,
    #     corpus_id,
    #     # nqr_name,
    #     cqp_query,
    #     match_strategy
    # )


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
        subcorpora_from_tsv(cwb_id, path,
                            cqp_bin=current_app.config['CCC_CQP_BIN'],
                            registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                            data_dir=current_app.config['CCC_DATA_DIR'])


@bp.cli.command('update')
@click.argument('path')
def update(path, delete_old=True):
    """update corpora according to JSON file

    - existing corpora (same CWB_ID) keep the same ID
    - corpora that are not included in JSON file are deleted
    - new corpora are added
    """

    # get dictionaries for both sets of corpora
    corpora_old = {corpus.cwb_id: corpus for corpus in Corpus.query.all()}
    corpora_new = {corpus['cwb_id']: corpus for corpus in json.load(open(path, 'rt'))}

    corpora_update_ids = [cwb_id for cwb_id in corpora_old.keys() if cwb_id in corpora_new.keys()]
    corpora_add_ids = [cwb_id for cwb_id in corpora_new.keys() if cwb_id not in corpora_old.keys()]

    if delete_old:
        corpora_delete_ids = [cwb_id for cwb_id in corpora_old.keys() if cwb_id not in corpora_new.keys()]
        for cwb_id in corpora_delete_ids:
            click.echo(f'deleting corpus {cwb_id}')
            db.session.delete(corpora_old[cwb_id])

    for cwb_id in corpora_update_ids:
        corpus = corpora_old[cwb_id]
        click.echo(f'updating corpus {cwb_id}')
        for key, value in corpora_new[cwb_id].items():
            setattr(corpus, key, value)

    for cwb_id in corpora_add_ids:
        click.echo(f'adding corpus {cwb_id}')
        db.session.add(Corpus(**corpora_new[cwb_id]))

    # add new corpora
    db.session.commit()
