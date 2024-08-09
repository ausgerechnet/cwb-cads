#!/usr/bin/python3
# -*- coding: utf-8 -*-

import gzip
import json
import os
from collections import defaultdict
from glob import glob

import click
from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, List, Nested, String, Float
from apiflask.validators import OneOf
from ccc.cache import generate_idx
from ccc.utils import cqp_escape
from flask import abort, current_app
from pandas import DataFrame, read_csv
from pymagnitude import Magnitude

from .. import db
from ..database import Corpus, Query, User, get_or_create
from ..users import auth
from ..collocation import CollocationItemOut, CollocationScoreOut
from .database import (CollocationDiscoursemeItem,
                       Discourseme,
                       DiscoursemeDescription, DiscoursemeDescriptionItems,
                       DiscoursemeTemplateItems, KeywordDiscoursemeItem)

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
        current_app.logger.debug(f'path: {path}')
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


def delete_description_children(discourseme_description):
    """description update / modification (adding or removing items) implies:

    - create new query
    - delete CollocationDiscoursemeItems
    - delete KeywordDiscoursemeItems

    """

    current_app.logger.debug("detaching Query belonging to this description")
    discourseme_description.update_from_items()

    current_app.logger.debug("deleting CollocationDiscoursemeItems belonging to this description")
    CollocationDiscoursemeItem.query.filter_by(discourseme_description_id=discourseme_description.discourseme_id).delete()

    current_app.logger.debug("deleting KeywordDiscoursemeItems belonging to this description")
    KeywordDiscoursemeItem.query.filter_by(discourseme_description_id=discourseme_description.discourseme_id).delete()

    db.session.commit()


def description_items_to_query(items, p_description, s_query, corpus, subcorpus=None, match_strategy='longest'):

    # create query & wordlist
    queries = list()
    wordlist = list()
    for item in items:
        tokens = item.split(" ")
        if len(tokens) > 1 or cqp_escape(item) != item:
            query = ""
            for token in tokens:
                query += f'[{p_description}="{token}"]'
            queries.append(query)
        else:
            wordlist.append(item)

    # define wordlists
    wl_name = generate_idx(wordlist, prefix="W_")
    os.makedirs(os.path.join(current_app.config['CCC_LIB_DIR'], 'wordlists'), exist_ok=True)
    wl_path = os.path.abspath(os.path.join(current_app.config['CCC_LIB_DIR'], 'wordlists', wl_name + '.txt'))
    queries.append(f"[{p_description} = ${wl_name}]")
    with open(wl_path, mode='wt') as f:
        f.write("\n".join(wordlist))

    # create query
    cqp_query = "|".join(queries)
    cqp_query = f'({cqp_query}) within {s_query};' if s_query is not None else query + ";"

    # define query
    query = Query(
        corpus_id=corpus.id,
        subcorpus_id=subcorpus.id if subcorpus else None,
        cqp_query=cqp_query,
        s=s_query,
        match_strategy=match_strategy
    )
    db.session.add(query)
    db.session.commit()

    name = generate_idx([
        corpus.cwb_id, subcorpus.nqr_cqp if subcorpus else None, cqp_query, s_query, match_strategy
    ], prefix="Q_")

    # init corpus / CQP
    if query.subcorpus:
        crps = query.subcorpus.ccc()
    else:
        crps = query.corpus.ccc()

    cqp = crps.start_cqp()
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

    # update name
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


def create_discourseme_description(discourseme, items, corpus_id, subcorpus_id, p_description, s_query, match_strategy):

    if len(items) == 0:
        if len(discourseme.template) == 0:
            discourseme.generate_template()
        items = [item.surface for item in discourseme.template]

    # description
    description = DiscoursemeDescription(
        discourseme_id=discourseme.id,
        corpus_id=corpus_id,
        subcorpus_id=subcorpus_id,
        p=p_description,
        s=s_query,
        match_strategy=match_strategy
    )
    db.session.add(description)
    db.session.commit()

    description.update_from_items(items)

    return description


################
# API schemata #
################
class DiscoursemeTemplateItem(Schema):

    p = String(metadata={'nullable': True})
    surface = String(metadata={'nullable': True})
    cqp_query = String(metadata={'nullable': True})


class DiscoursemeIn(Schema):

    name = String(required=False)
    comment = String(required=False)
    template = Nested(DiscoursemeTemplateItem(many=True))


class DiscoursemeOut(Schema):

    id = Integer()
    name = String(metadata={'nullable': True})
    comment = String(metadata={'nullable': True})
    template = Nested(DiscoursemeTemplateItem(many=True))


class DiscoursemeDescriptionItem(Schema):

    item = String()


class DiscoursemeDescriptionIn(Schema):

    corpus_id = Integer(required=True)
    subcorpus_id = Integer(required=False)

    p = String(required=False)
    s = String(required=False)
    match_strategy = String(load_default='longest', required=False, validate=OneOf(['longest', 'shortest', 'standard']))

    items = List(String, required=False)


class DiscoursemeDescriptionOut(Schema):

    id = Integer()
    discourseme_id = Integer()
    corpus_id = Integer()
    subcorpus_id = Integer()
    p = String()
    s = String()
    match_strategy = String()
    query_id = Integer()
    semantic_map_id = Integer()
    items = Nested(DiscoursemeDescriptionItem(many=True))


class DiscoursemeScoresOut(Schema):

    discourseme_id = Integer()
    item_scores = Nested(CollocationItemOut(many=True))
    unigram_item_scores = Nested(CollocationItemOut(many=True))
    global_scores = Nested(CollocationScoreOut(many=True))


class DiscoursemeDescriptionSimilarIn(Schema):

    number = Integer(load_default=200)
    min_freq = Integer(load_default=2)


class DiscoursemeDescriptionSimilarOut(Schema):

    item = String()
    freq = Integer()
    similarity = Float()


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
    if template:
        for item in template:
            db.session.add(DiscoursemeTemplateItems(
                discourseme_id=discourseme.id, surface=item['surface'], p=item['p']
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
    if template:
        for item in discourseme.template:
            db.session.delete(item)
            db.session.commit()
        for item in template:
            db.session.add(DiscoursemeTemplateItems(
                discourseme_id=discourseme.id, surface=item['surface'], p=item['p']
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

    Will automatically create query (from template / description) if it doesn't exist.

    """

    discourseme = db.get_or_404(Discourseme, id)

    corpus_id = json_data.get('corpus_id')
    corpus = db.get_or_404(Corpus, corpus_id)
    subcorpus_id = json_data.get('subcorpus_id')
    # subcorpus = db.get_or_404(SubCorpus, subcorpus_id) if subcorpus_id else None

    p_description = json_data.get('p', corpus.p_default)
    s_query = json_data.get('s', corpus.s_default)
    match_strategy = json_data.get('match_strategy')

    items = json_data.get('items', [])  # will use discourseme template if not given

    description = create_discourseme_description(discourseme, items, corpus_id, subcorpus_id, p_description, s_query, match_strategy)

    return DiscoursemeDescriptionOut().dump(description), 200


@bp.get('/<id>/description/')
@bp.output(DiscoursemeDescriptionOut(many=True))
@bp.auth_required(auth)
def get_all_descriptions(id):

    discourseme = db.get_or_404(Discourseme, id)
    descriptions = DiscoursemeDescription.query.filter_by(discourseme_id=discourseme.id).all()

    return [DiscoursemeDescriptionOut().dump(description) for description in descriptions]


@bp.get('/<id>/description/<description_id>/')
@bp.output(DiscoursemeDescriptionOut)
@bp.auth_required(auth)
def get_description(id, description_id):

    # discourseme = db.get_or_404(Discourseme, id)  # TODO: needed?
    description = db.get_or_404(DiscoursemeDescription, description_id)

    return DiscoursemeDescriptionOut().dump(description)


@bp.delete('/<id>/description/<description_id>/')
@bp.auth_required(auth)
def delete_description(id, description_id):

    # discourseme = db.get_or_404(Discourseme, id)  # TODO: needed?
    description = db.get_or_404(DiscoursemeDescription, description_id)
    db.session.delete(description)
    db.session.commit()

    return 'Deletion successful.', 200


@bp.get('/<id>/description/<description_id>/similar')
@bp.input(DiscoursemeDescriptionSimilarIn, location='query')
@bp.output(DiscoursemeDescriptionSimilarOut(many=True))
@bp.auth_required(auth)
def description_get_similar(id, description_id, query_data):

    number = query_data.get('number')
    min_freq = query_data.get('min_freq')
    description = db.get_or_404(DiscoursemeDescription, description_id)
    items = [item.item for item in description.items]

    # similar
    embeddings = Magnitude(description.corpus.embeddings)
    similar = embeddings.most_similar(positive=items, topn=number)
    similar = DataFrame(index=[s[0] for s in similar], data={'similarity': [s[1] for s in similar]})

    # marginals
    freq_similar = description.corpus.ccc().marginals(similar.index, p_atts=[description.p])[['freq']]
    freq_similar = freq_similar.loc[freq_similar['freq'] >= min_freq]  # drop hapaxes

    # merge
    freq_similar = freq_similar.join(similar)
    freq_similar = freq_similar.sort_values(by="similarity", ascending=False)
    freq_similar = freq_similar.reset_index().to_records()

    return [DiscoursemeDescriptionSimilarOut().dump(f) for f in freq_similar], 200


@bp.patch('/<id>/description/<description_id>/add-item')
@bp.input(DiscoursemeDescriptionItem)
@bp.output(DiscoursemeDescriptionOut)
@bp.auth_required(auth)
def description_patch_add(id, description_id, json_data):
    """Patch discourseme: add item to description.

    """

    # discourseme = db.get_or_404(Discourseme, id)  # TODO: needed?
    description = db.get_or_404(DiscoursemeDescription, description_id)
    item = json_data.get('item')
    db_item = DiscoursemeDescriptionItems.query.filter_by(
        discourseme_description_id=description.id,
        item=item
    ).first()
    if db_item:
        current_app.logger.debug(f"item {item} already in description")
    else:
        db_item = DiscoursemeDescriptionItems(
            discourseme_description_id=description.id,
            item=item
        )
        db.session.add(db_item)
        db.session.commit()
        delete_description_children(description)

    return DiscoursemeDescriptionOut().dump(description), 200


@bp.patch('/<id>/description/<description_id>/remove-item')
@bp.input(DiscoursemeDescriptionItem)
@bp.output(DiscoursemeDescriptionOut)
@bp.auth_required(auth)
def description_patch_remove(id, description_id, json_data):
    """Patch discourseme: remove item from description.

    """

    # discourseme = db.get_or_404(Discourseme, id)  # TODO: needed?
    description = db.get_or_404(DiscoursemeDescription, description_id)
    item = json_data.get('item')
    db_item = DiscoursemeDescriptionItems.query.filter_by(
        discourseme_description_id=description.id,
        item=item
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
def import_discoursemes_cmd(path_in):

    import_discoursemes(path_in, username='admin')


@bp.cli.command('export')
@click.option('--path_out', default='discoursemes.tsv')
def export_discoursemes_cmd(path_out):

    export_discoursemes(path_out)
