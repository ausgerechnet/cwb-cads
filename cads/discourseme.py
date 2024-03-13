#!/usr/bin/python3
# -*- coding: utf-8 -*-

import gzip
import json
from collections import defaultdict
from glob import glob

import click
from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, List, Nested, String
from flask import redirect, url_for
from pandas import DataFrame, read_csv

from . import db
from .concordance import ConcordanceIn, ConcordanceOut
from .database import (Corpus, Discourseme, DiscoursemeTemplateItems, User,
                       get_or_create)
from .query import QueryOut, query_discourseme
from .users import auth

bp = APIBlueprint('discourseme', __name__, url_prefix='/discourseme', cli_group='discourseme')


def read_ldjson(path_ldjson):

    discoursemes = defaultdict(list)
    with gzip.open(path_ldjson, "rt") as f:
        for line in f:
            sachgruppe = json.loads(line)
            discoursemes[sachgruppe['meta']['name']] = [val for sublist in sachgruppe['items'] for val in sublist]

    return discoursemes


def read_tsv(path_in, col_name='name', col_query='query'):

    df = read_csv(path_in, sep="\t")
    discoursemes = defaultdict(list)
    for row in df.iterrows():
        discoursemes[row[1][col_name]].append(row[1][col_query])

    return discoursemes


def import_discoursemes(glob_in, username='admin'):
    """import discoursemes from TSV file

    """
    user = User.query.filter_by(username=username).first()
    for path in glob(glob_in):
        click.echo(f'path: {path}')
        discoursemes = read_tsv(path)
        for name, item_list in discoursemes.items():
            # TODO append items if discourseme already exists
            click.echo(f'importing discourseme "{name}" with {len(item_list)} items')
            discourseme = get_or_create(Discourseme, user_id=user.id, name=name)
            db.session.add(discourseme)
            db.session.commit()
            # TODO: bulk insert
            for item in item_list:
                db.session.add(DiscoursemeTemplateItems(discourseme_id=discourseme.id, surface=item, p='lemma'))
                db.session.commit()
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
    # TODO @FloMei
    # template = Nested(DiscoursemeTemplateItem(many=True))
    items = List(String())


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
def create(data):
    """Create new discourseme.

    """

    items = data.pop('items')
    discourseme = Discourseme(
        user_id=auth.current_user.id,
        name=data.get('name'),
        description=data.get('description')
    )
    db.session.add(discourseme)
    db.session.commit()
    for item in items:
        db.session.add(DiscoursemeTemplateItems(discourseme_id=discourseme.id, surface=item))
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
@bp.output(QueryOut)
@bp.auth_required(auth)
def get_query(id, corpus_id):
    """Get query of discourseme in corpus. Will automatically create one if it doesn't exist.

    """

    discourseme = db.get_or_404(Discourseme, id)
    corpus = db.get_or_404(Corpus, id)
    query = query_discourseme(discourseme, corpus)

    return QueryOut().dump(query), 200


@bp.get("/<id>/corpus/<corpus_id>/concordance")
@bp.input(ConcordanceIn, location='query')
@bp.output(ConcordanceOut)
@bp.auth_required(auth)
def concordance_lines(id, corpus_id, data):
    """Get concordance lines of discourseme in corpus. Redirects to query endpoint.

    """

    discourseme = db.get_or_404(Discourseme, id)
    corpus = db.get_or_404(Corpus, corpus_id)
    query_id = query_discourseme(discourseme, corpus).id

    return redirect(url_for('query.concordance_lines', query_id=query_id, **data))


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
