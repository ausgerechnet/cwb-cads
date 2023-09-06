#!/usr/bin/python3
# -*- coding: utf-8 -*-

from collections import defaultdict

import click
from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, String
from flask import g, request
from pandas import DataFrame, read_csv

from . import db
from .database import Discourseme
from .users import auth

bp = APIBlueprint('discourseme', __name__, url_prefix='/discourseme', cli_group='discourseme')


class DiscoursemeIn(Schema):

    name = String()
    description = String()


class DiscoursemeOut(Schema):

    id = Integer()
    name = String()
    description = String()


@bp.post('/')
@bp.input(DiscoursemeIn)
@bp.output(DiscoursemeOut)
@bp.auth_required(auth)
def create(data):
    """ Create new discourseme.

    """

    discourseme = Discourseme(
        user_id=g.user.id,
        name=request.json['name'],
        description=request.json['description'],
    )
    db.session.add(discourseme)
    db.session.commit()
    return DiscoursemeOut().dump(discourseme), 200


@bp.get('/<id>')
@bp.output(DiscoursemeOut)
@bp.auth_required(auth)
def get_discourseme(id):
    """Get details of a discourseme.

    """

    discourseme = db.get_or_404(Discourseme, id)
    return DiscoursemeOut().dump(discourseme), 200


@bp.delete('/<id>')
@bp.auth_required(auth)
def delete_discourseme(id):
    """Delete one discourseme.

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


@bp.cli.command('import')
@click.option('--path_in', default='discoursemes.tsv')
def import_discoursemes(path_in):

    df = read_csv(path_in, sep="\t")
    discoursemes = defaultdict(list)
    for row in df.iterrows():
        discoursemes[row[1]['name']].append(row[1]['query'])

    for name, query_list in discoursemes.items():
        db.session.add(Discourseme(user_id=1, name=name, items="\t".join(sorted(query_list))))

    db.session.commit()


@bp.cli.command('export')
@click.option('--path_out', default='discoursemes.tsv')
def export_discoursemes(path_out):

    records = list()
    for discourseme in Discourseme.query.all():
        disc = discourseme.serialize
        for item in disc['items']:
            records.append({'name': disc['name'], 'query': item, 'username': discourseme.user.username})

    discoursemes = DataFrame(records)
    discoursemes.to_csv(path_out, sep="\t", index=False)
