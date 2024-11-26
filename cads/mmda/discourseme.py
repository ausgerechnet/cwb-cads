#!/usr/bin/python3
# -*- coding: utf-8 -*-

import gzip
import json
from collections import defaultdict
from glob import glob

import click
from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, Nested, String
from flask import current_app
from pandas import DataFrame, read_csv

from .. import db
from ..database import User, get_or_create
from ..users import auth
from .database import Constellation, Discourseme, DiscoursemeTemplateItems

bp = APIBlueprint('discourseme', __name__, url_prefix='/discourseme', cli_group='discourseme')


def read_ldjson(path_ldjson):
    """read discoursemes from ldjson file

    """

    discoursemes = defaultdict(list)
    with gzip.open(path_ldjson, "rt") as f:
        for line in f:
            sachgruppe = json.loads(line)
            discoursemes[sachgruppe['meta']['name']] = [val for sublist in sachgruppe['items'] for val in sublist]

    return discoursemes


def import_discoursemes(glob_in, p='lemma', col_surface='surface', col_name='name', username='admin', create_constellation=True):
    """import discoursemes from TSV file

    - name
    - either surface + p (default = lemma)
    - or cqp_query
    - or both (for different rows)

    surface may contain wildcards, MWUs, disjunction

    """

    user = User.query.filter_by(username=username).first()

    for path in glob(glob_in):
        current_app.logger.debug(f'path: {path}')
        df = read_csv(path, sep="\t")
        df = df.rename({col_surface: 'surface'}, axis=1)
        discoursemes = list()

        for name, items in df.groupby(col_name):

            discourseme = get_or_create(Discourseme, user_id=user.id, name=name)
            db.session.add(discourseme)
            db.session.commit()
            discoursemes.append(discourseme)

            items = items[['surface']]
            items['discourseme_id'] = discourseme.id
            items['p'] = p
            items.to_sql("discourseme_template_items", con=db.engine, if_exists='append', index=False)

        if create_constellation:

            constellation_name = path.split("/")[-1].split(".")[0]
            constellation = get_or_create(Constellation, user_id=user.id, name=constellation_name)
            [constellation.discoursemes.append(discourseme) for discourseme in discoursemes]
            db.session.add(discourseme)

    db.session.commit()


def export_discoursemes(path_out):
    """export discoursemes to TSV file

    """

    records = list()
    for discourseme in Discourseme.query.all():
        for item in discourseme.template:
            records.append({'name': discourseme.name,
                            'surface': item.surface, 'p': item.p, 'cqp_query': item.cqp_query,
                            'username': discourseme.user.username})
    discoursemes = DataFrame(records)

    discoursemes.to_csv(path_out, sep="\t", index=False)


################
# API schemata #
################

# INPUT / OUTPUT
class DiscoursemeItem(Schema):
    """Used both for templates and descriptions, in- and output.

    """

    p = String(required=False, metadata={'nullable': True})
    surface = String(required=False, metadata={'nullable': True})
    cqp_query = String(required=False, metadata={'nullable': True})


# INPUT
class DiscoursemeIn(Schema):

    name = String(required=False, metadata={'nullable': True})
    comment = String(required=False, metadata={'nullable': True})
    template = Nested(DiscoursemeItem(many=True), required=False, metadata={'nullable': True}, load_default=[])


# OUTPUT
class DiscoursemeOut(Schema):

    id = Integer(required=True)
    name = String(required=True, dump_default=None, metadata={'nullable': True})
    comment = String(required=True, dump_default=None, metadata={'nullable': True})
    template = Nested(DiscoursemeItem(many=True), required=True, dump_default=[])


#################
# API endpoints #
#################
@bp.get('/')
@bp.output(DiscoursemeOut(many=True))
@bp.auth_required(auth)
def get_discoursemes():
    """Get all discoursemes.

    """

    discoursemes = Discourseme.query.all()
    return [DiscoursemeOut().dump(discourseme) for discourseme in discoursemes], 200


@bp.post('/')
@bp.input(DiscoursemeIn)
@bp.output(DiscoursemeOut)
@bp.auth_required(auth)
def create_discourseme(json_data):
    """Create new discourseme.

    """

    template = json_data.get('template')
    discourseme = Discourseme(
        user_id=auth.current_user.id,
        name=json_data.get('name'),
        comment=json_data.get('comment')
    )
    db.session.add(discourseme)
    db.session.commit()

    for item in template:
        db.session.add(DiscoursemeTemplateItems(
            discourseme_id=discourseme.id,
            p=item['p'],
            surface=item['surface']
        ))
    db.session.commit()

    return DiscoursemeOut().dump(discourseme), 200


@bp.get('/<discourseme_id>')
@bp.output(DiscoursemeOut)
@bp.auth_required(auth)
def get_discourseme(discourseme_id):
    """Get details of discourseme.

    """

    discourseme = db.get_or_404(Discourseme, discourseme_id)
    return DiscoursemeOut().dump(discourseme), 200


@bp.delete('/<discourseme_id>')
@bp.auth_required(auth)
def delete_discourseme(discourseme_id):
    """Delete discourseme.

    """

    discourseme = db.get_or_404(Discourseme, discourseme_id)
    db.session.delete(discourseme)
    db.session.commit()
    return 'Deletion successful.', 200


@bp.patch('/<discourseme_id>')
@bp.input(DiscoursemeIn(partial=True))
@bp.output(DiscoursemeOut)
@bp.auth_required(auth)
def patch_discourseme(discourseme_id, json_data):
    """Patch discourseme.

    """

    discourseme = db.get_or_404(Discourseme, discourseme_id)

    template = json_data.pop('template', None)
    if template and len(template) > 0:

        # delete old template
        for item in discourseme.template:
            db.session.delete(item)
        db.session.commit()

        # create new template
        for item in template:
            db.session.add(DiscoursemeTemplateItems(
                discourseme_id=discourseme.id,
                p=item['p'],
                surface=item['surface']
            ))
        db.session.commit()

    for attr, value in json_data.items():
        setattr(discourseme, attr, value)

    return DiscoursemeOut().dump(discourseme), 200


@bp.post('/<discourseme_id>/template')
@bp.output(DiscoursemeOut)
@bp.auth_required(auth)
def generate_template(discourseme_id, json_data):
    """Generate template from discourseme descriptions (NotImplemented)

    """

    discourseme = db.get_or_404(Discourseme, discourseme_id)
    discourseme.generate_template()

    return DiscoursemeOut().dump(discourseme), 200


################
# CLI commands #
################
@bp.cli.command('import')
@click.option('--path_in', default='discoursemes.tsv')
@click.option('--no_constellation', is_flag=True, default=False)
def import_discoursemes_cmd(path_in, no_constellation):

    import_discoursemes(path_in, username='admin', create_constellation=not no_constellation)


@bp.cli.command('export')
@click.option('--path_out', default='discoursemes.tsv')
def export_discoursemes_cmd(path_out):

    export_discoursemes(path_out)
