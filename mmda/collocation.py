#!/usr/bin/python3
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, Schema
from apiflask.fields import Integer, String
from ccc import Corpus
from flask import current_app, jsonify
from pandas import DataFrame
from association_measures import measures
from pandas import concat
from ccc.utils import format_cqp_query
from ccc.collocates import dump2cooc
from ccc.cache import generate_idx

from . import db
from .database import Collocation, CollocationItems, Query, SemanticMap, Matches
from .semantic_map import SemanticMapIn, SemanticMapOut
from .users import auth
from .database import Cotext, CotextLines


bp = APIBlueprint('collocation', __name__, url_prefix='/<query_id>/collocation')


def get_or_create_cooc(subcorpus_matches, query_id, context, context_break):
    """create Cotext, CotextLines of matches and save it to database (if it does not exist)

    """

    cotext = Cotext.query.filter_by(query_id=query_id, context=context, context_break=context_break).first()

    if cotext is None:

        cotext = Cotext(query_id=query_id, context=context, context_break=context_break)
        db.session.add(cotext)
        db.session.commit()

        df_cooc = dump2cooc(subcorpus_matches, rm_nodes=False)
        df_cooc = df_cooc.rename({'match': 'match_pos'}, axis=1).reset_index(drop=True)
        df_cooc['cotext_id'] = cotext.id

        # doesn't work, but why?
        # cotext_lines = df_cooc.apply(lambda row: CotextLines(**row), axis=1).values
        cotext_lines = list()
        for line in df_cooc.to_dict(orient='records'):
            cotext_lines.append(CotextLines(**line))

        db.session.add_all(cotext_lines)
        db.session.commit()

    else:
        df_cooc = DataFrame([vars(s) for s in cotext.lines], columns=['match_pos', 'cpos', 'offset', 'cotext_id'])

    return df_cooc


def get_or_create_matches(discourseme, corpus, corpus_id, context_break, subcorpus_name=None, p_query='lemma', return_df=True):
    """
    create matches or get the last matches of this discourseme on this corpus
    """

    cqp_query = format_cqp_query(discourseme.items.split("\t"), p_query, context_break, escape=False)

    if not subcorpus_name:
        query = Query.query.filter_by(discourseme_id=discourseme.id, corpus_id=corpus_id, cqp_query=cqp_query).order_by(Query.id.desc()).first()
    else:
        query = Query.query.filter_by(discourseme_id=discourseme.id, corpus_id=corpus_id, cqp_query=cqp_query, nqr_name=subcorpus_name).order_by(
            Query.id.desc()
        ).first()

    if not query:

        query = Query(discourseme_id=discourseme.id, corpus_id=corpus_id, cqp_query=cqp_query, nqr_name=subcorpus_name)
        db.session.add(query)
        db.session.commit()
        print(corpus)
        matches = corpus.query(cqp_query=cqp_query, context_break=context_break)
        matches_df = matches.df.reset_index()[['match', 'matchend']]
        matches_df['query_id'] = query.id

        # doesn't work, but why?
        # matches_lines = matches_df.apply(lambda row: Matches(**row), axis=1)
        matches_lines = list()
        for m in matches_df.to_dict(orient='records'):
            matches_lines.append(Matches(**m))

        db.session.add_all(matches_lines)
        db.session.commit()

        matches_df = matches_df.drop('query_id', axis=1).set_index(['match', 'matchend'])

    elif return_df:
        matches_df = DataFrame([vars(s) for s in query.matches], columns=['match', 'matchend']).set_index(['match', 'matchend'])

    else:
        matches_df = None

    return matches_df


def ccc_collocates(collocation, window=None, min_freq=1):
    """get CollocationItems for collocation analysis and given window

    - create context of collocation._query

    - count query for matches of collocation.highlight_discoursemes

    - count items and discoursemes separately

    """

    window = collocation.context if window is None else window

    CollocationItems.query.filter_by(collocation_id=collocation.id, window=window).delete()

    filter_query = collocation._query
    filter_discourseme = filter_query.discourseme
    highlight_discoursemes = collocation.constellation.highlight_discoursemes
    cwb_id = filter_query.corpus.cwb_id
    matches = filter_query.matches

    corpus = Corpus(corpus_name=cwb_id,
                    lib_dir=None,
                    cqp_bin=current_app.config['CCC_CQP_BIN'],
                    registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                    data_dir=current_app.config['CCC_DATA_DIR'])

    # expensive → only run function if necessary
    current_app.logger.debug('ccc_collocates :: load subcorpus')
    matches_df = DataFrame([vars(s) for s in matches], columns=['match', 'matchend']).set_index(['match', 'matchend'])
    subcorpus_matches = corpus.subcorpus(subcorpus_name=None, df_dump=matches_df, overwrite=False).set_context(
        collocation.context, collocation.s_break, overwrite=False
    )

    ###########
    # CONTEXT #
    ###########
    current_app.logger.debug('ccc_collocates :: creating context')
    df_cooc = get_or_create_cooc(subcorpus_matches.df, filter_query.id, collocation.context, collocation.s_break)
    discourseme_cpos_corpus = set(df_cooc.loc[df_cooc['offset'] == 0]['cpos'])  # on whole corpus
    discourseme_cpos_subcorpus = discourseme_cpos_corpus  # on subcorpus of context

    ############################################
    # GET MATCHES OF HIGHLIGHTING_DISCOURSEMES #
    ############################################
    # for each discourseme (including filter_discourseme):
    # - get frequency breakdown within and outside context
    # - collect cpos consumed within and outside context
    # this means we have to run each discourseme query twice: once on whole corpus, once on context of filter query matches

    # get or create subcorpus of context
    current_app.logger.debug('ccc_collocates :: getting matches of highlighting discoursemes')
    item_hash = generate_idx(filter_discourseme.items, length=8)
    subcorpus_context_name = f'Q{item_hash}_{window}'
    subcorpus_context = subcorpus_matches.set_context(context=window, context_break=collocation.s_break, overwrite=False)
    subcorpus_context = subcorpus_context.set_context_as_matches(subcorpus_name=subcorpus_context_name, overwrite=True)
    highlight_breakdowns = list()
    for discourseme in highlight_discoursemes:

        current_app.logger.debug(f'ccc_collocates :: querying discourseme {discourseme.id}')
        # matches on whole corpus
        corpus_matches_df = get_or_create_matches(discourseme, corpus, filter_query.corpus.id, collocation.s_break)
        corpus_matches = corpus.subcorpus(df_dump=corpus_matches_df, overwrite=False)

        # matches on subcorpus
        subcorpus_matches_df = get_or_create_matches(discourseme, subcorpus_context, filter_query.corpus.id,
                                                     collocation.s_break, subcorpus_name=subcorpus_context_name)
        subcorpus_matches = corpus.subcorpus(df_dump=subcorpus_matches_df, overwrite=False)

        # create breakdown
        df = corpus_matches.breakdown().rename({'freq': 'f2'}, axis=1).join(
            subcorpus_matches.breakdown().rename({'freq': 'f'}, axis=1)
        )
        df['discourseme'] = discourseme.id
        highlight_breakdowns.append(df)

        # update set of cpos of highlight_discoursemes
        discourseme_cpos_corpus.update(corpus_matches.matches())
        discourseme_cpos_subcorpus.update(subcorpus_matches.matches())

    ################################
    # COUNT ITEMS AND DISCOURSEMES #
    ################################

    # create context counts of items for window, including cpos consumed by discoursemes
    current_app.logger.debug('ccc_collocates :: scoring items in context for given window')
    relevant = df_cooc.loc[abs(df_cooc['offset']) <= window]
    f = corpus.counts.cpos(relevant['cpos'], [collocation.p])[['freq']].rename(columns={'freq': 'f'})
    f2 = corpus.marginals(f.index, [collocation.p])[['freq']].rename(columns={'freq': 'f2'})

    # get frequency of items at cpos consumed by discoursemes (includes filter)
    node_freq_corpus = corpus.counts.cpos(discourseme_cpos_corpus, [collocation.p])[['freq']].rename(columns={'freq': 'node_freq_corpus'})
    node_freq_subcorpus = corpus.counts.cpos(discourseme_cpos_subcorpus, [collocation.p])[['freq']].rename(columns={'freq': 'node_freq_subcorpus'})

    # create dataframe
    counts = f.join(f2).fillna(0, downcast='infer')

    # add marginals
    counts['f1'] = len(relevant) - len(discourseme_cpos_subcorpus)
    counts['N'] = corpus.corpus_size - len(discourseme_cpos_corpus)

    # correct counts
    counts = counts.join(node_freq_corpus).join(node_freq_subcorpus).fillna(0, downcast='infer')
    counts['f'] = counts['f'] - counts['node_freq_subcorpus']
    counts['f2'] = counts['f2'] - counts['node_freq_corpus']
    counts = counts.drop(['node_freq_subcorpus', 'node_freq_corpus'], axis=1)
    counts = counts.loc[counts['f'] >= min_freq]

    if len(highlight_breakdowns) > 0:

        # add discourseme breakdowns
        df = concat(highlight_breakdowns)
        df['f1'] = len(relevant)
        df['N'] = corpus.corpus_size
        df = df.fillna(0)

        # concat
        counts = concat([counts, df])
        # TODO: items can belong to several discoursemes
        # assumption: if an item belongs to a discourseme, it does always do → cannot be part of item counts
        # here: just keep it once, even if actual association might be different (if part of MWU in discourseme(s))
        counts = counts.drop('discourseme', axis=1)
        counts = counts[~counts.index.duplicated(keep='first')]

    ####################
    # SAVE TO DATABASE #
    ####################
    current_app.logger.debug('ccc_collocates :: saving to database')

    counts['collocation_id'] = collocation.id
    counts['window'] = window

    collocation_items = counts.reset_index().apply(lambda row: CollocationItems(**row), axis=1)

    db.session.add_all(collocation_items)
    db.session.commit()

    return counts


# def ccc_collocates_conflate(collocation):
#     """conflate items in context


#     """

#     records = [{'item': item.item, 'window': item.window, 'am': item.am, 'value': item.value} for item in collocation.items]
#     df_collocates = DataFrame.from_records(records).pivot(index=['item', 'window'], columns='am', values='value').reset_index()
#     for discourseme in collocation.constellation.highlight_discoursemes:

#         disc_label = f"(ID: {discourseme.id})"
#         disc_items = discourseme.items.split("\t")

#         # DELETE IF EXISTS
#         CollocationItems.query.filter_by(collocation_id=collocation.id, item=disc_label).delete()
#         db.session.commit()

#         # CONFLATE
#         df = df_collocates.loc[df_collocates['item'].isin(disc_items)]
#         df = df.groupby('window').agg({'O11': 'sum', 'O21': 'sum', 'R1': 'mean', 'R2': 'mean', 'in_nodes': 'sum', 'marginal': 'mean'})
#         df = df.rename({'O11': 'f1', 'O21': 'f2', 'R1': 'N1', 'R2': 'N2'}, axis=1)
#         df = measures.score(df, freq=True, per_million=True, digits=6, boundary='poisson', vocab=len(collocation.items))
#         df = df.reset_index().fillna(0)
#         df['item'] = disc_label

#         # ADD TO DATABASE
#         df = df.melt(id_vars=['item', 'window'], var_name='am')
#         for row in df.iterrows():
#             items = dict(row[1])
#             items['collocation_id'] = collocation.id
#             db.session.add(CollocationItems(**items))

#     db.session.commit()


class CollocationIn(Schema):

    query_id = Integer()
    constellation_id = Integer()
    p = String()
    s_break = String()
    context = Integer()


class CollocationOut(Schema):

    id = Integer()
    corpus_id = Integer()
    p = String()
    s_break = String()
    context = Integer()
    sem_map_id = Integer()
    constellation_id = Integer()


class CollocationItemsOut(Schema):

    id = Integer()
    collocation_id = Integer()
    item = String()
    ams = None


@bp.post('/')
@bp.input(CollocationIn)
@bp.output(CollocationOut)
@bp.auth_required(auth)
def create(query_id, data):
    """Create new collocation analysis.

    """
    collocation = Collocation(query_id=query_id, **data)
    db.session.add(collocation)
    db.session.commit()

    return CollocationOut().dump(collocation), 200


@bp.get('/')
@bp.output(CollocationOut(many=True))
@bp.auth_required(auth)
def get_collocations(query_id):
    """Get collocation.

    """

    query = db.get_or_404(Query, query_id)

    return [CollocationOut().dump(collocation) for collocation in query.collocations], 200


@bp.get('/<id>')
@bp.output(CollocationOut)
@bp.auth_required(auth)
def get_collocation(query_id, id):
    """Get collocation.

    """

    collocation = db.get_or_404(Collocation, id)

    return CollocationOut().dump(collocation), 200


@bp.delete('/<id>')
@bp.auth_required(auth)
def delete_collocation(query_id, id):
    """Delete collocation.

    """

    collocation = db.get_or_404(Collocation, id)
    db.session.delete(collocation)
    db.session.commit()

    return 'Deletion successful.', 200


@bp.post('/<id>/collocates')
@bp.output(CollocationOut)
@bp.auth_required(auth)
def execute(query_id, id):
    """Execute collocation: Get collocation items.

    """

    collocation = db.get_or_404(Collocation, id)
    ccc_collocates(collocation)

    return CollocationOut().dump(collocation), 200


@bp.get("/<id>/collocates")
# @bp.output(CollocationOut)
@bp.auth_required(auth)
def get_collocation_items(query_id, id):
    """Get collocation items.

    """

    collocation = db.get_or_404(Collocation, id)
    counts = DataFrame([vars(s) for s in collocation.items], columns=['item', 'window', 'f', 'f1', 'f2', 'N']).set_index('item')
    df_collocation = measures.score(counts, freq=True, per_million=True, digits=6, boundary='poisson', vocab=len(counts))

    return jsonify(df_collocation.to_json()), 200


@bp.post('/<id>/semantic_map/')
@bp.input(SemanticMapIn)
@bp.output(SemanticMapOut)
@bp.auth_required(auth)
def create_semantic_map(query_id, collocation_id, data):
    """Create new semantic map for collocation items.

    """
    collocation = db.get_or_404(Collocation, collocation_id)
    embeddings = collocation.query.corpus.embeddings
    semanticmap = SemanticMap(collocation_id=collocation_id, embeddings=embeddings, **data)
    db.session.add(semanticmap)
    db.session.commit()

    return SemanticMapOut().dump(semanticmap), 200


@bp.get('/<id>/semantic_map/')
@bp.output(SemanticMapOut(many=True))
@bp.auth_required(auth)
def get_semanticmaps(query_id, collocation_id):
    """Get all semantic maps of collocation.

    """

    collocation = db.get_or_404(Collocation, collocation_id)
    return [SemanticMapOut().dump(semanticmap) for semanticmap in collocation.semanticmaps], 200
