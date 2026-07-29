#!/usr/bin/python3
# -*- coding: utf-8 -*-

import gzip
import json
from collections import defaultdict
from glob import glob

import click
from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, List, Nested, String
from flask import current_app
from pandas import DataFrame, read_csv

from .. import db
from ..database import User, get_or_create
from ..users import auth
from .database import Constellation, Discourseme, DiscoursemeTemplate, DiscoursemeTemplateItem


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


def import_discoursemes(glob_in, language, register, p='lemma',
                        col_surface='item', col_name='discourseme', username='admin',
                        create_constellation=True):
    """import discoursemes from TSV file(s)

    - name
    - either item + p (default = lemma)
    - or cqp_query
    - or both (for different rows)

    item may contain wildcards, MWUs, disjunction

    """

    user = User.query.filter_by(username=username).first()

    for path in glob(glob_in):
        current_app.logger.debug(f'path: {path}')
        df = read_csv(path, sep="\t")
        df = df.rename({col_surface: "surface"}, axis=1)

        discoursemes = []

        for name, items in df.groupby(col_name):

            discourseme = get_or_create(
                Discourseme,
                user_id=user.id,
                name=name,
            )
            db.session.add(discourseme)
            db.session.commit()

            template = get_or_create(
                DiscoursemeTemplate,
                discourseme_id=discourseme.id,
                language=language,
                register=register,
            )
            db.session.add(template)
            db.session.commit()

            discoursemes.append(discourseme)

            items = items[["surface"]].copy()
            items["template_id"] = template.id
            items["p"] = p

            items.to_sql(
                "discourseme_template_item",
                con=db.engine,
                if_exists="append",
                index=False,
            )

        if create_constellation:

            constellation_name = path.split("/")[-1].split(".")[0]
            constellation = get_or_create(
                Constellation,
                user_id=user.id,
                name=constellation_name,
            )

            for discourseme in discoursemes:
                constellation.discoursemes.append(discourseme)

            db.session.add(constellation)
            db.session.commit()


def export_discoursemes(path_out):
    """Export discoursemes to a TSV file."""

    records = []

    for template in DiscoursemeTemplate.query.all():
        discourseme = template.discourseme

        for item in template.items:
            records.append({
                "name": discourseme.name,
                "language": template.language,
                "register": template.register,
                "surface": item.surface,
                "p": item.p,
                "cqp_query": item.cqp_query,
                "username": discourseme.user.username,
            })

    DataFrame(records).to_csv(path_out, sep="\t", index=False)


################
# API schemata #
################

# INPUT / OUTPUT
class DiscoursemeIDsSchema(Schema):

    discourseme_ids = List(Integer, required=True)


class DiscoursemeItemSchema(Schema):
    """Used both for templates and descriptions, in- and output.

    """

    id = Integer(required=False)
    p = String(required=False, allow_none=True)
    surface = String(required=False, allow_none=True)
    cqp_query = String(required=False, allow_none=True)


class DiscoursemeTemplateSchema(Schema):

    language = String(required=True)
    register = String(required=False, allow_none=True)
    name = String(required=False, allow_none=True)
    comment = String(required=False, allow_none=True)

    items = Nested(
        DiscoursemeItemSchema,
        many=True,
        required=False,
        load_default=[],
    )


# INPUT
class DiscoursemeInSchema(Schema):

    name = String(required=False, allow_none=True)
    comment = String(required=False, allow_none=True)

    templates = Nested(
        DiscoursemeTemplateSchema,
        many=True,
        required=False,
        allow_none=True,
        load_default=[],
    )


# OUTPUT
class DiscoursemeOutSchema(Schema):

    id = Integer(required=True)
    name = String(required=True, dump_default=None, allow_none=True)
    comment = String(required=True, dump_default=None, allow_none=True)

    templates = Nested(
        DiscoursemeTemplateSchema,
        many=True,
        required=True,
        dump_default=[],
    )


#################
# API endpoints #
#################
@bp.get('/')
@bp.output(DiscoursemeOutSchema(many=True))
@bp.auth_required(auth)
def get_discoursemes():
    """Get all discoursemes.

    """

    discoursemes = Discourseme.query.all()
    return [DiscoursemeOutSchema().dump(discourseme) for discourseme in discoursemes], 200


@bp.post("/")
@bp.input(DiscoursemeInSchema)
@bp.output(DiscoursemeOutSchema)
@bp.auth_required(auth)
def create_discourseme(json_data):
    """Create new discourseme."""

    discourseme = Discourseme(
        user_id=auth.current_user.id,
        name=json_data.get("name"),
        comment=json_data.get("comment"),
    )
    db.session.add(discourseme)
    db.session.flush()  # get discourseme.id without committing

    for template_data in json_data.get("templates", []):

        template = DiscoursemeTemplate(
            discourseme_id=discourseme.id,
            language=template_data["language"],
            register=template_data.get("register"),
            name=template_data.get("name"),
            comment=template_data.get("comment"),
        )
        db.session.add(template)
        db.session.flush()  # get template.id

        for item in template_data.get("items", []):
            db.session.add(
                DiscoursemeTemplateItem(
                    template_id=template.id,
                    p=item.get("p"),
                    surface=item.get("surface"),
                    cqp_query=item.get("cqp_query"),
                )
            )

    db.session.commit()

    return discourseme, 200


@bp.get('/<discourseme_id>')
@bp.output(DiscoursemeOutSchema)
@bp.auth_required(auth)
def get_discourseme(discourseme_id):
    """Get details of discourseme.

    """

    discourseme = db.get_or_404(Discourseme, discourseme_id)
    return DiscoursemeOutSchema().dump(discourseme), 200


@bp.delete('/<discourseme_id>')
@bp.auth_required(auth)
def delete_discourseme(discourseme_id):
    """Delete discourseme.

    """

    discourseme = db.get_or_404(Discourseme, discourseme_id)
    db.session.delete(discourseme)
    db.session.commit()
    return 'Deletion successful.', 200


@bp.patch("/<discourseme_id>")
@bp.input(DiscoursemeInSchema(partial=True))
@bp.output(DiscoursemeOutSchema)
@bp.auth_required(auth)
def patch_discourseme(discourseme_id, json_data):
    """Patch discourseme."""

    discourseme = db.get_or_404(Discourseme, discourseme_id)

    templates = json_data.pop("templates", None)

    if templates is not None:
        # replace existing templates
        for template in discourseme.templates:
            db.session.delete(template)

        db.session.flush()

        # create new templates
        for template_data in templates:
            template = DiscoursemeTemplate(
                discourseme_id=discourseme.id,
                language=template_data["language"],
                register=template_data.get("register"),
                name=template_data.get("name"),
                comment=template_data.get("comment"),
            )
            db.session.add(template)
            db.session.flush()

            for item in template_data.get("items", []):
                db.session.add(
                    DiscoursemeTemplateItem(
                        template_id=template.id,
                        p=item.get("p"),
                        surface=item.get("surface"),
                        cqp_query=item.get("cqp_query"),
                    )
                )

    # patch scalar attributes
    for attr, value in json_data.items():
        setattr(discourseme, attr, value)

    db.session.commit()

    return discourseme, 200


# @bp.post('/<discourseme_id>/template')
# @bp.output(DiscoursemeOut)
# @bp.auth_required(auth)
# def generate_template(discourseme_id, json_data):
#     """Generate template from discourseme descriptions (NotImplemented)

#     """

#     discourseme = db.get_or_404(Discourseme, discourseme_id)
#     discourseme.generate_template()

#     return DiscoursemeOut().dump(discourseme), 200


################
# CLI commands #
################
@bp.cli.command('import')
@click.option('--path_in', default='discoursemes.tsv')
@click.option('--language', default='de')
@click.option('--register', default='standard')
@click.option('--no_constellation', is_flag=True, default=False)
def import_discoursemes_cmd(path_in, language, register, no_constellation):

    import_discoursemes(path_in, language, register, username='admin', create_constellation=not no_constellation)


@bp.cli.command('export')
@click.option('--path_out', default='discoursemes.tsv')
def export_discoursemes_cmd(path_out):

    export_discoursemes(path_out)
