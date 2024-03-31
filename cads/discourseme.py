#!/usr/bin/python3
# -*- coding: utf-8 -*-

import gzip
import json
from collections import defaultdict
from glob import glob

import click
from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, Nested, String
from apiflask.validators import OneOf
from pandas import DataFrame, read_csv

from . import db
from .database import (Corpus, Discourseme, DiscoursemeTemplateItems, User,
                       get_or_create)
from .query import QueryOut, get_or_create_query_discourseme
from .users import auth

bp = APIBlueprint('discourseme', __name__, url_prefix='/discourseme', cli_group='discourseme')


def read_ldjson(path_ldjson):

    discoursemes = defaultdict(list)
    with gzip.open(path_ldjson, "rt") as f:
        for line in f:
            sachgruppe = json.loads(line)
            discoursemes[sachgruppe['meta']['name']] = [val for sublist in sachgruppe['items'] for val in sublist]

    return discoursemes


def import_discoursemes(glob_in, p='lemma', col_surface='query', col_name='name', username='admin'):
    """import discoursemes from TSV file

    """

    user = User.query.filter_by(username=username).first()

    for path in glob(glob_in):
        click.echo(f'path: {path}')
        df = read_csv(path, sep="\t")
        df = df.rename({col_surface: 'surface'}, axis=1)
        for name, items in df.groupby(col_name):

            discourseme = get_or_create(Discourseme, user_id=user.id, name=name)
            db.session.add(discourseme)
            db.session.commit()

            items = items[['surface']]
            items['discourseme_id'] = discourseme.id
            items['p'] = p
            items.to_sql("discourseme_template_items", con=db.engine, if_exists='append', index=False)

    db.session.commit()


def export_discoursemes(path_out):
    """export discoursemes to TSV file

    """
    records = list()
    for discourseme in Discourseme.query.all():
        for item in discourseme.template:
            records.append({'name': discourseme.name, 'query': item.surface, 'username': discourseme.user.username})
    discoursemes = DataFrame(records)

    discoursemes.to_csv(path_out, sep="\t", index=False)


################
# API schemata #
################
class DiscoursemeTemplateItem(Schema):

    surface = String(metadata={'nullable': True})
    p = String(metadata={'nullable': True})
    cqp_query = String(metadata={'nullable': True})


class DiscoursemeIn(Schema):

    name = String(required=False)
    description = String(required=False)
    template = Nested(DiscoursemeTemplateItem(many=True))


class DiscoursemeQueryIn(Schema):

    s = String()
    match_strategy = String(dump_default='longest', required=False, validate=OneOf(['longest', 'shortest', 'standard']))
    items = Nested(DiscoursemeTemplateItem(many=True))


class DiscoursemeOut(Schema):

    id = Integer()
    name = String(metadata={'nullable': True})
    description = String(metadata={'nullable': True})
    template = Nested(DiscoursemeTemplateItem(many=True))


#################
# API endpoints #
#################
@bp.post('/')
@bp.input(DiscoursemeIn)
@bp.output(DiscoursemeOut)
@bp.auth_required(auth)
def create(json_data):
    """Create new discourseme.

    """

    template = json_data.get('template')
    discourseme = Discourseme(
        user_id=auth.current_user.id,
        name=json_data.get('name'),
        description=json_data.get('description')
    )
    db.session.add(discourseme)
    db.session.commit()
    for item in template:
        db.session.add(DiscoursemeTemplateItems(
            discourseme_id=discourseme.id, surface=item['surface'], p=item['p']
        ))
    db.session.commit()
    return DiscoursemeOut().dump(discourseme), 200


@bp.patch('/<id>')
@bp.input(DiscoursemeIn(partial=True))
@bp.output(DiscoursemeOut)
@bp.auth_required(auth)
def patch(id, json_data):
    """Patch discourseme.

    """
    discourseme = db.get_or_404(Discourseme, id)
    template = json_data.pop('template', None)
    if template:
        for item in discourseme.template:
            db.session.delete(item)
            db.session.commit()
        for item in template:
            db.session.add(DiscoursemeTemplateItems(
                discourseme_id=discourseme.id, surface=item['surface'], p=item['p']
            ))
    for attr, value in json_data.items():
        setattr(discourseme, attr, value)
    return DiscoursemeOut().dump(discourseme), 200


@bp.patch('/<id>/add-item')
@bp.input(DiscoursemeTemplateItem)
@bp.output(DiscoursemeOut)
@bp.auth_required(auth)
def patch_add(id, json_data):
    """Patch discourseme: add item.

    """
    discourseme = db.get_or_404(Discourseme, id)
    db.session.add(DiscoursemeTemplateItems(
        discourseme_id=discourseme.id, surface=json_data.get('surface'), p=json_data.get('p')
    ))
    db.session.commit()
    return DiscoursemeOut().dump(discourseme), 200


@bp.patch('/<id>/remove-item')
@bp.input(DiscoursemeTemplateItem)
@bp.output(DiscoursemeOut)
@bp.auth_required(auth)
def patch_remove(id, json_data):
    """Patch discourseme: remove item.

    """
    discourseme = db.get_or_404(Discourseme, id)
    item = DiscoursemeTemplateItems.query.filter_by(discourseme_id=discourseme.id,
                                                    surface=json_data.get('surface'),
                                                    p=json_data.get('p')).first()
    if item:
        db.session.delete(item)
        db.session.commit()
    return DiscoursemeOut().dump(discourseme), 200


@bp.get('/<id>')
@bp.output(DiscoursemeOut)
@bp.auth_required(auth)
def get_discourseme(id):
    """Get details of discourseme.

    """

    discourseme = db.get_or_404(Discourseme, id)
    return DiscoursemeOut().dump(discourseme), 200


@bp.delete('/<id>')
@bp.auth_required(auth)
def delete_discourseme(id):
    """Delete discourseme.

    """

    discourseme = db.get_or_404(Discourseme, id)
    db.session.delete(discourseme)
    db.session.commit()
    return 'Deletion successful.', 200


@bp.get('/')
@bp.output(DiscoursemeOut(many=True))
@bp.auth_required(auth)
def get_discoursemes():
    """Get all discoursemes.

    """

    discoursemes = Discourseme.query.all()
    return [DiscoursemeOut().dump(discourseme) for discourseme in discoursemes], 200


@bp.get('/<id>/corpus/<corpus_id>/')
@bp.input(DiscoursemeQueryIn, location='query')
@bp.output(QueryOut)
@bp.auth_required(auth)
def get_query(id, corpus_id, query_data):
    """Get query of discourseme in corpus. Will automatically create one if it doesn't exist.

    """
    discourseme = db.get_or_404(Discourseme, id)
    corpus = db.get_or_404(Corpus, corpus_id)
    query = get_or_create_query_discourseme(corpus, discourseme, s=query_data.get('s'), match_strategy=query_data.get('match_strategy'))
    return QueryOut().dump(query), 200


################
# CLI commands #
################
@bp.cli.command('import')
@click.option('--path_in', default='discoursemes.tsv')
def import_discoursemes_cmd(path_in):

    import_discoursemes(path_in, username='admin')


@bp.cli.command('export')
@click.option('--path_out', default='discoursemes.tsv')
def export_discoursemes_cmd(path_out):

    export_discoursemes(path_out)
