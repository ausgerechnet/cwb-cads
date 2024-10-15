#!/usr/bin/python3
# -*- coding: utf-8 -*-

import gzip
import json
import os
from collections import defaultdict
from glob import glob

import click
from apiflask import APIBlueprint, Schema
from apiflask.fields import Float, Integer, Nested, String
from apiflask.validators import OneOf
from ccc.cache import generate_idx
from ccc.utils import cqp_escape
from flask import abort, current_app
from pandas import DataFrame, read_csv
from pymagnitude import Magnitude

from .. import db
from ..breakdown import BreakdownIn, BreakdownOut, ccc_breakdown
from ..collocation import CollocationItemOut, CollocationScoreOut
from ..database import Breakdown, Corpus, Query, User, get_or_create
from ..users import auth
from .database import (CollocationDiscoursemeItem, Discourseme, Constellation,
                       DiscoursemeDescription, DiscoursemeDescriptionItems,
                       DiscoursemeTemplateItems, KeywordDiscoursemeItem)

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


def delete_description_children(discourseme_description):
    """description update / modification (adding or removing items) implies:

    - create new query
    - delete CollocationDiscoursemeItems
    - delete KeywordDiscoursemeItems

    """

    current_app.logger.debug("creating new Query belonging to this description")
    discourseme_description.create_query

    current_app.logger.debug("deleting CollocationDiscoursemeItems belonging to this description")
    CollocationDiscoursemeItem.query.filter_by(discourseme_description_id=discourseme_description.discourseme_id).delete()

    current_app.logger.debug("deleting KeywordDiscoursemeItems belonging to this description")
    KeywordDiscoursemeItem.query.filter_by(discourseme_description_id=discourseme_description.discourseme_id).delete()

    db.session.commit()


def description_items_to_query(description_items, s_query, corpus, subcorpus=None, match_strategy='longest'):
    """query corpus or subcorpus for discourseme provided items (p + item or cqp_query)

    """

    # create queries & wordlists
    queries = list()
    wordlists = defaultdict(list)
    for item in description_items:
        if item.is_query:
            queries.append(item.query)
        elif item.is_unigram and cqp_escape(item.surface) == item.surface:
            wordlists[item.p].append(item.surface)
        else:                   # MWU
            tokens = item.surface.split(" ")
            query = ""
            for token in tokens:
                query += f'[{item.p}="{token}"]'
            queries.append(query)

    # define wordlists and append to queries
    for p in wordlists.keys():
        wl_name = generate_idx(wordlists[p], prefix=f"W_{p}_")
        wl_path = os.path.abspath(os.path.join(current_app.config['CCC_LIB_DIR'], 'wordlists', wl_name + '.txt'))
        os.makedirs(os.path.join(current_app.config['CCC_LIB_DIR'], 'wordlists'), exist_ok=True)
        with open(wl_path, mode='wt') as f:
            f.write("\n".join(wordlists[p]))
        queries.append(f"[{p} = ${wl_name}]")

    # create joint query
    cqp_query = "|".join(queries)
    cqp_query = f'({cqp_query}) within {s_query};' if s_query is not None else query + ";"

    # save query to database
    query = Query(
        corpus_id=corpus.id,
        subcorpus_id=subcorpus.id if subcorpus else None,
        cqp_query=cqp_query,
        s=s_query,
        match_strategy=match_strategy
    )
    db.session.add(query)
    db.session.commit()

    # query name
    name = generate_idx([
        corpus.cwb_id, subcorpus.nqr_cqp if subcorpus else None, cqp_query, s_query, match_strategy
    ], prefix="Q_")

    # init corpus / CQP
    if query.subcorpus:
        crps = query.subcorpus.ccc()
    else:
        crps = query.corpus.ccc()

    cqp = crps.start_cqp()
    for p in wordlists.keys():
        wl_name = generate_idx(wordlists[p], prefix=f"W_{p}_")
        wl_path = os.path.abspath(os.path.join(current_app.config['CCC_LIB_DIR'], 'wordlists', wl_name + '.txt'))
        cqp.Exec(f'define ${wl_name} < "{wl_path}";')

    # query CQP and exit
    cqp.Exec(f'set MatchingStrategy "{match_strategy}";')
    matches_df = cqp.nqr_from_query(query.cqp_query,
                                    name=name,
                                    match_strategy=match_strategy,
                                    return_dump=True,
                                    propagate_error=True)
    cqp.nqr_save(corpus.cwb_id, name=name)
    cqp.__del__()

    if isinstance(matches_df, str):  # error
        current_app.logger.error(f"description_items_to_query :: error: '{matches_df}'")
        query.error = True
        db.session.commit()
        return query

    if len(matches_df) == 0:    # 0 matches
        current_app.logger.debug("description_items_to_query :: 0 matches")
        query.zero_matches = True
        db.session.commit()
        return query

    # save NQR name
    query.nqr_cqp = name
    db.session.commit()

    # save matches
    matches_df = matches_df.reset_index()[['match', 'matchend']]
    matches_df['contextid'] = matches_df['match'].apply(lambda cpos: crps.cpos2sid(cpos, s_query)).astype(int)
    matches_df['query_id'] = query.id
    current_app.logger.debug(f"description_items_to_query :: saving {len(matches_df)} lines to database")
    matches_df.to_sql('matches', con=db.engine, if_exists='append', index=False)
    db.session.commit()
    current_app.logger.debug("description_items_to_query :: saved to database")

    return query


def discourseme_template_to_description(discourseme, items, corpus_id, subcorpus_id, s_query, match_strategy):
    """create discourseme description from template or items, then create query

    """

    # items from template?
    if len(items) == 0:
        if len(discourseme.template) == 0:
            discourseme.generate_template()
        items = [{'surface': item.surface, 'p': item.p, 'cqp_query': item.cqp_query} for item in discourseme.template]

    # description
    description = DiscoursemeDescription(
        discourseme_id=discourseme.id,
        corpus_id=corpus_id,
        subcorpus_id=subcorpus_id,
        s=s_query,
        match_strategy=match_strategy
    )
    db.session.add(description)
    db.session.commit()

    for item in items:
        description.items.append(DiscoursemeDescriptionItems(discourseme_description_id=description.id,
                                                             p=item['p'],
                                                             surface=item['surface']))
    db.session.commit()

    description.create_query

    return description


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


class DiscoursemeDescriptionIn(Schema):

    corpus_id = Integer(required=True)
    subcorpus_id = Integer(required=False, metadata={'nullable': True})

    s = String(required=False)
    match_strategy = String(required=False, load_default='longest', validate=OneOf(['longest', 'shortest', 'standard']))

    items = Nested(DiscoursemeItem(many=True), required=False, metadata={'nullable': True}, load_default=[])


class DiscoursemeDescriptionSimilarIn(Schema):

    number = Integer(required=False, load_default=200)
    min_freq = Integer(required=False, load_default=2)


class DiscoursemeCoordinatesIn(Schema):

    discourseme_id = Integer(required=True)
    x_user = Float(required=True, metadata={'nullable': True})
    y_user = Float(required=True, metadata={'nullable': True})


# OUTPUT
class DiscoursemeOut(Schema):

    id = Integer(required=True)
    name = String(required=True, dump_default=None, metadata={'nullable': True})
    comment = String(required=True, dump_default=None, metadata={'nullable': True})
    template = Nested(DiscoursemeItem(many=True), required=True, dump_default=[])


class DiscoursemeDescriptionOut(Schema):

    id = Integer(required=True)
    discourseme_id = Integer(required=True)
    corpus_id = Integer(required=True)
    subcorpus_id = Integer(required=True, dump_default=None, metadata={'nullable': True})
    query_id = Integer(required=True)
    s = String(required=True)
    match_strategy = String(required=True)
    items = Nested(DiscoursemeItem(many=True), required=True, dump_default=[])


class DiscoursemeScoresOut(Schema):

    discourseme_id = Integer(required=True)
    item_scores = Nested(CollocationItemOut(many=True), required=True)
    unigram_item_scores = Nested(CollocationItemOut(many=True), required=True)
    global_scores = Nested(CollocationScoreOut(many=True), required=True)


class DiscoursemeDescriptionSimilarOut(Schema):

    p = String(required=True)
    surface = String(required=True)
    freq = Integer(required=True)
    similarity = Float(required=True)


class DiscoursemeCoordinatesOut(Schema):

    semantic_map_id = Integer(required=True)
    discourseme_id = Integer(required=True)
    x = Float(required=True)
    y = Float(required=True)
    x_user = Float(required=True, dump_default=None, metadata={'nullable': True})
    y_user = Float(required=True, dump_default=None, metadata={'nullable': True})


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
def create(json_data):
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


@bp.patch('/<id>')
@bp.input(DiscoursemeIn(partial=True))
@bp.output(DiscoursemeOut)
@bp.auth_required(auth)
def patch(id, json_data):
    """Patch discourseme.

    """

    discourseme = db.get_or_404(Discourseme, id)

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


###########################
# DISCOURSEME/DESCRIPTION #
###########################
@bp.post('/<id>/description/')
@bp.input(DiscoursemeDescriptionIn)
@bp.output(DiscoursemeDescriptionOut)
@bp.auth_required(auth)
def create_description(id, json_data):
    """Create description of discourseme in corpus.

    Will automatically create query (from provided items or template).

    """

    discourseme = db.get_or_404(Discourseme, id)

    corpus_id = json_data.get('corpus_id')
    corpus = db.get_or_404(Corpus, corpus_id)
    subcorpus_id = json_data.get('subcorpus_id')
    # subcorpus = db.get_or_404(SubCorpus, subcorpus_id) if subcorpus_id else None

    s_query = json_data.get('s', corpus.s_default)
    match_strategy = json_data.get('match_strategy')

    items = json_data.get('items', [])  # will use discourseme template if not given

    description = discourseme_template_to_description(discourseme, items, corpus_id, subcorpus_id, s_query, match_strategy)

    return DiscoursemeDescriptionOut().dump(description), 200


@bp.get('/<id>/description/')
@bp.output(DiscoursemeDescriptionOut(many=True))
@bp.auth_required(auth)
def get_all_descriptions(id):
    """Get all descriptions of discourseme.

    """

    discourseme = db.get_or_404(Discourseme, id)
    descriptions = DiscoursemeDescription.query.filter_by(discourseme_id=discourseme.id).all()

    return [DiscoursemeDescriptionOut().dump(description) for description in descriptions]


@bp.get('/<id>/description/<description_id>/')
@bp.output(DiscoursemeDescriptionOut)
@bp.auth_required(auth)
def get_description(id, description_id):
    """Get details of description.

    """

    # discourseme = db.get_or_404(Discourseme, id)  # TODO: needed?
    description = db.get_or_404(DiscoursemeDescription, description_id)

    return DiscoursemeDescriptionOut().dump(description)


@bp.delete('/<id>/description/<description_id>/')
@bp.auth_required(auth)
def delete_description(id, description_id):
    """Delete discourseme description.

    """

    # discourseme = db.get_or_404(Discourseme, id)  # TODO: needed?
    description = db.get_or_404(DiscoursemeDescription, description_id)
    db.session.delete(description)
    db.session.commit()

    return 'Deletion successful.', 200


@bp.get('/<id>/description/<description_id>/breakdown')
@bp.input(BreakdownIn, location='query')
@bp.output(BreakdownOut)
@bp.auth_required(auth)
def description_get_breakdown(id, description_id, query_data):
    """Get breakdown of discourseme description.

    """

    description = db.get_or_404(DiscoursemeDescription, description_id)

    p = query_data.get('p')
    query = description._query

    if p not in query.corpus.p_atts:
        msg = f'p-attribute "{p}" does not exist in corpus "{query.corpus.cwb_id}"'
        current_app.logger.error(msg)
        abort(404, msg)

    breakdown = get_or_create(Breakdown, query_id=query.id, p=p)
    ccc_breakdown(breakdown)

    return BreakdownOut().dump(breakdown), 200


@bp.get('/<id>/description/<description_id>/breakdown/<breakdown_id>/similar')
@bp.input(DiscoursemeDescriptionSimilarIn, location='query')
@bp.output(DiscoursemeDescriptionSimilarOut(many=True))
@bp.auth_required(auth)
def description_get_similar(id, description_id, breakdown_id, query_data):
    """Get items most similar to the ones in discourseme breakdown.

    """

    description = db.get_or_404(DiscoursemeDescription, description_id)
    breakdown = db.get_or_404(Breakdown, breakdown_id)
    p = breakdown.p

    number = query_data.get('number')
    min_freq = query_data.get('min_freq')

    df_breakdown = ccc_breakdown(breakdown)
    items = list(df_breakdown.index)

    # similar
    embeddings = Magnitude(description.corpus.embeddings)
    similar = embeddings.most_similar(positive=items, topn=number)
    similar = DataFrame(index=[s[0] for s in similar], data={'similarity': [s[1] for s in similar]})

    # marginals
    freq_similar = description.corpus.ccc().marginals(similar.index, p_atts=[p])[['freq']]
    freq_similar = freq_similar.loc[freq_similar['freq'] >= min_freq]  # drop hapaxes

    # merge
    freq_similar = freq_similar.join(similar)
    freq_similar = freq_similar.sort_values(by="similarity", ascending=False)
    freq_similar = freq_similar.reset_index()
    freq_similar['p'] = p
    freq_similar = freq_similar.rename({'item': 'surface'}, axis=1)
    freq_similar = freq_similar.to_records()

    return [DiscoursemeDescriptionSimilarOut().dump(f) for f in freq_similar], 200


@bp.patch('/<id>/description/<description_id>/add-item')
@bp.input(DiscoursemeItem)
@bp.output(DiscoursemeDescriptionOut)
@bp.auth_required(auth)
def description_patch_add(id, description_id, json_data):
    """Patch discourseme description: add item to description.

    """

    # discourseme = db.get_or_404(Discourseme, id)  # TODO: needed?
    description = db.get_or_404(DiscoursemeDescription, description_id)
    p = json_data.get('p')
    surface = json_data.get('surface')
    db_item = DiscoursemeDescriptionItems.query.filter_by(
        discourseme_description_id=description.id,
        p=p,
        surface=surface
    ).first()
    if db_item:
        current_app.logger.debug(f'item {p}="{surface}" already in description')

    else:
        db_item = DiscoursemeDescriptionItems(
            discourseme_description_id=description.id,
            p=p,
            surface=surface
        )
        db.session.add(db_item)
        db.session.commit()
        delete_description_children(description)

    return DiscoursemeDescriptionOut().dump(description), 200


@bp.patch('/<id>/description/<description_id>/remove-item')
@bp.input(DiscoursemeItem)
@bp.output(DiscoursemeDescriptionOut)
@bp.auth_required(auth)
def description_patch_remove(id, description_id, json_data):
    """Patch discourseme description: remove item from description.

    """

    # discourseme = db.get_or_404(Discourseme, id)  # TODO: needed?
    description = db.get_or_404(DiscoursemeDescription, description_id)
    p = json_data.get('p')
    surface = json_data.get('surface')
    db_item = DiscoursemeDescriptionItems.query.filter_by(
        discourseme_description_id=description.id,
        p=p,
        surface=surface
    ).first()

    if not db_item:
        return abort(404, 'no such item')

    db.session.delete(db_item)
    db.session.commit()

    delete_description_children(description)

    return DiscoursemeDescriptionOut().dump(description), 200


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
