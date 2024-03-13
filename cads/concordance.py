#!/usr/bin/python3
# -*- coding: utf-8 -*-

from collections import defaultdict

from apiflask import Schema
from apiflask.fields import Boolean, Dict, Integer, List, Nested, String
from apiflask.validators import OneOf
from ccc import Corpus, SubCorpus
from ccc.collocates import dump2cooc
from flask import current_app
from pandas import DataFrame

from . import db
from .database import Concordance, ConcordanceLines, CotextLines, Matches


def ccc2attributes(line, primary, secondary, s_show, window):

    match = line.name[0]
    contextid = line['contextid']
    structural = dict()
    for s_att in s_show:
        structural[s_att] = line[s_att]

    line = line['dict']
    tokens = list()
    for cpos, offset, prim, sec in zip(line['cpos'], line['offset'], line[primary], line[secondary]):
        tokens.append({
            'cpos': cpos,
            'offset': offset,
            'primary': prim,
            'secondary': sec,
            'out_of_window': False if abs(offset) <= window else True
        })

    row = {
        'tokens': tokens,
        'structural': structural,
        'id': match,
        'contextid': contextid
    }

    return row


def sort_matches(query, sort_by, sort_offset=0):

    random_seed = query.random_seed
    concordance = Concordance.query.filter_by(query_id=query.id, sort_by=sort_by, sort_offset=sort_offset, random_seed=random_seed).first()
    if not concordance:
        concordance = Concordance(query_id=query.id, sort_by=sort_by, sort_offset=sort_offset, random_seed=random_seed)
        db.session.add(concordance)
        db.session.commit()

        subcorpus = SubCorpus(
            subcorpus_name=query.nqr_cqp,
            df_dump=None,
            corpus_name=query.corpus.cwb_id,
            cqp_bin=current_app.config['CCC_CQP_BIN'],
            registry_dir=current_app.config['CCC_REGISTRY_DIR'],
            data_dir=current_app.config['CCC_DATA_DIR'],
            overwrite=False,
            lib_dir=None
        )

        if not sort_by:
            sort_clause = f"sort {query.nqr_cqp} randomize {random_seed}"

        else:
            if sort_offset > 0:
                sort_clause = f"sort {query.nqr_cqp} by {sort_by} on match .. matchend[{sort_offset}]"
            elif sort_offset < 0:
                sort_clause = f"sort {query.nqr_cqp} by {sort_by} on match[{sort_offset}] .. matchend"
            else:
                sort_clause = f"sort {query.nqr_cqp} by {sort_by} on match .. matchend"

        cqp = subcorpus.start_cqp()
        cqp.Exec(sort_clause)
        concordance_lines = cqp.Dump(query.nqr_cqp)
        cqp.__del__()

        concordance_lines = concordance_lines.reset_index()[['match']]
        concordance_lines['contextid'] = concordance_lines['match'].apply(lambda x: subcorpus.cpos2sid(x + sort_offset, query.s))
        concordance_lines['concordance_id'] = concordance.id
        concordance_lines.to_sql('concordance_lines', con=db.engine, if_exists='append', index=False)

    return concordance


def get_or_create_cotext(query, window, context_break):

    from .database import Cotext
    from .query import ccc_query

    cotext = Cotext.query.filter_by(query_id=query.id, context=window, context_break=context_break).first()

    if not cotext:
        cotext = Cotext(query_id=query.id, context=window, context_break=context_break)
        db.session.add(cotext)
        db.session.commit()

        matches_df = ccc_query(query)

        corpus = Corpus(corpus_name=query.corpus.cwb_id,
                        lib_dir=None,
                        cqp_bin=current_app.config['CCC_CQP_BIN'],
                        registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                        data_dir=current_app.config['CCC_DATA_DIR'])

        subcorpus_context = corpus.subcorpus(
            subcorpus_name=None,
            df_dump=matches_df,
            overwrite=False
        ).set_context(
            window,
            context_break,
            overwrite=False
        )

        current_app.logger.debug("get_or_create_cotext :: dump2cooc")
        df_cooc = dump2cooc(subcorpus_context.df, rm_nodes=False)
        df_cooc = df_cooc.rename({'match': 'match_pos'}, axis=1).reset_index(drop=True)
        df_cooc['cotext_id'] = cotext.id

        current_app.logger.debug(f"get_or_create_cotext :: saving {len(df_cooc)} lines to database")
        df_cooc.to_sql("cotext_lines", con=db.engine, if_exists='append', index=False)
        db.session.commit()
        current_app.logger.debug("get_or_create_cotext :: saved to database")

        df_cooc = df_cooc.loc[abs(df_cooc['offset']) <= window]
        df_cooc = df_cooc[['cotext_id', 'match_pos', 'cpos', 'offset']]

    return cotext


def ccc_concordance(focus_query,
                    primary, secondary,
                    window, extended_window, context_break=None,
                    filter_queries=[], highlight_queries=[],
                    match_id=None, page_number=None, page_size=None,
                    sort_by=None, sort_offset=0, sort_order='ascending'):
    """Central concordance function.

    :param Query focus_query: focus in KWIC view

    :param str primary: primary p-attribute to display
    :param str secondary: secondary p-attribtue to display
    :param int window: tokens outside of window will be marked "out of window" (also used for filtering)
    :param int extended_window: maximum number of tokens
    :param str context_break: return context until this s-attribute (or extended_window) (also used for filtering)

    :param list[Query] filter_queries: further queries that must match in context (defined by window and context_break & query.s)
    :param list[Query] highlight_queries: queries to highlight in (extended) context

    :param int match_id: return specific match?
    :param int page_number: pagination page number
    :param int page_size: pagination page size

    :param str sort_by: p-attribute to sort on
    :param int sort_offset: offset of token resp. match (negative) or matchend (positive) to sort on
    :param str sort_order: ascending / descending / random
    :param int random_seed: random seed to use when displaying in random order

    """

    # sets to list
    filter_queries = list(filter_queries)
    highlight_queries = list(highlight_queries)

    # check parameters
    if sort_order == 'random' and sort_by:
        raise ValueError("either get random or sorted concordance lines, not both")

    if len(filter_queries) > 0 and match_id:
        raise ValueError("can't filter with specific match id")

    # get s-attribute settings
    context_break = context_break if context_break else focus_query.s
    s_show = focus_query.corpus.s_annotations

    # get specified match
    if match_id:
        matches = Matches.query.filter_by(match=match_id, query_id=focus_query.id).all()
        nr_lines = 1
        page_count = 1

    # else: get relevant matches
    else:

        matches = Matches.query.filter_by(query_id=focus_query.id)

        # filter
        if len(filter_queries) > 0:
            cotext = get_or_create_cotext(focus_query, window, context_break)
            cotext_lines = CotextLines.query.filter_by(cotext_id=cotext.id)
            for fq in filter_queries:

                # TODO learn proper SQLalchemy #
                matches_tmp = [m.match for m in matches.all()]

                current_app.logger.debug("ccc_concordance :: joining cotext lines and matches")
                # current_app.logger.debug(f"ccc_concordance :: number of cotext_lines before filtering: {len(cotext_lines.all())}")
                cotext_lines_tmp = cotext_lines.join(
                    Matches,
                    (Matches.query_id == fq.id) &
                    (Matches.match == CotextLines.cpos)
                )
                # current_app.logger.debug(f"ccc_concordance :: number of cotext_lines after filtering: {len(cotext_lines_tmp.all())}")

                current_app.logger.debug("ccc_concordance :: joining matches and cotext lines")
                # current_app.logger.debug(f"ccc_concordance :: number of matches before filtering: {len(matches.all())}")
                match_pos = [cotext_line.match_pos for cotext_line in cotext_lines_tmp.all()]
                match_pos = [cotext_line.match_pos for cotext_line in cotext_lines_tmp.all() if abs(cotext_line.offset) <= window]
                matches = Matches.query.filter(
                    Matches.query_id == focus_query.id,
                    Matches.match.in_(matches_tmp),
                    Matches.match.in_(match_pos)
                )
                # current_app.logger.debug(f"ccc_concordance :: number of matches after filtering: {len(matches.all())}")

                if len(matches.all()) == 0:
                    current_app.logger.error(f"no concordance lines left after filtering for query {fq.cqp_query}")
                    return

        # sorting
        current_app.logger.debug("ccc_concordance :: sorting")
        concordance = sort_matches(focus_query, sort_by, sort_offset)
        matches = matches.join(
            ConcordanceLines,
            (ConcordanceLines.concordance_id == concordance.id) &
            (ConcordanceLines.match == Matches.match) &
            (ConcordanceLines.contextid == Matches.contextid)
        )
        if sort_order == 'ascending':
            matches = matches.order_by(ConcordanceLines.id)
        elif sort_order == 'descending':
            matches = matches.order_by(ConcordanceLines.id.desc())

        matches = matches.paginate(page=page_number, per_page=page_size)
        nr_lines = matches.total
        page_count = matches.pages

    # actual concordancing
    df_dump = DataFrame([vars(s) for s in matches], columns=['match', 'matchend', 'contextid']).set_index(['match', 'matchend'])
    lines = SubCorpus(
        subcorpus_name=None,
        df_dump=df_dump,
        corpus_name=focus_query.corpus.cwb_id,
        cqp_bin=current_app.config['CCC_CQP_BIN'],
        registry_dir=current_app.config['CCC_REGISTRY_DIR'],
        data_dir=current_app.config['CCC_DATA_DIR'],
        overwrite=False,
        lib_dir=None
    ).set_context(
        context=extended_window,
        context_break=context_break
    ).concordance(
        form='dict',
        p_show=[primary, secondary],
        s_show=s_show,
        order='asis'
    )
    lines = lines.apply(lambda line: ccc2attributes(line, primary, secondary, s_show, window), axis=1)

    # highlighting
    for fq in filter_queries:
        if fq not in highlight_queries:
            highlight_queries.append(fq)
    discourseme_ranges = defaultdict(list)
    filter_item_cpos = set()
    for query in highlight_queries:
        hd_matches = Matches.query.filter(Matches.query_id == query.id,
                                          Matches.contextid.in_(list(df_dump['contextid']))).all()
        for match in hd_matches:
            if not query.discourseme:
                filter_item_cpos.add(match.match)
            else:
                discourseme_ranges[match.contextid].append({
                    'discourseme_id': query.discourseme.id,
                    'start': match.match,
                    'end': match.matchend
                })
    for line in lines:
        line['discourseme_ranges'] = discourseme_ranges.get(line['contextid'], [])
        for token in line['tokens']:
            if token['cpos'] in filter_item_cpos:
                token['is_filter_item'] = True

    return {
        'lines': [ConcordanceLineOut().dump(line) for line in lines],
        'nr_lines': nr_lines,
        'page_size': page_size,
        'page_number': page_number,
        'page_count': page_count
    }


class ConcordanceIn(Schema):

    window = Integer(load_default=10, required=False)
    extended_window = Integer(load_default=None, required=False)

    primary = String(load_default='word', required=False)
    secondary = String(load_default='lemma', required=False)

    page_size = Integer(load_default=10, required=False)
    page_number = Integer(load_default=1, required=False)

    sort_order = String(load_default='random', required=False, validate=OneOf(['random', 'ascending', 'descending']))

    sort_by_offset = Integer(load_default=0, required=False)
    sort_by_p_att = String(load_default=None, required=False)

    filter_item = String(metadata={'nullable': True}, required=False)
    filter_item_p_att = String(load_default='lemma', required=False)

    filter_discourseme_ids = List(Integer, load_default=[], required=False)
    highlight_discourseme_ids = List(Integer, load_default=[], required=False)


class ConcordanceLineIn(Schema):

    window = Integer(load_default=10, required=False)
    extended_window = Integer(load_default=50, required=False)
    extended_context_break = String(load_default='text', required=False)  # or determine via corpus settings

    primary = String(load_default='word', required=False)
    secondary = String(load_default='lemma', required=False)


class DiscoursemeRangeOut(Schema):

    discourseme_id = Integer()
    start = Integer()
    end = Integer()


class TokenOut(Schema):

    cpos = Integer()
    offset = Integer()
    primary = String()
    secondary = String()
    out_of_window = Boolean(dump_default=False)
    is_filter_item = Boolean(dump_default=False)


class ConcordanceLineOut(Schema):

    id = Integer()
    tokens = Nested(TokenOut(many=True))
    structural = Dict()
    discourseme_ranges = Nested(DiscoursemeRangeOut(many=True))


class ConcordanceOut(Schema):

    nr_lines = Integer()
    page_size = Integer()
    page_number = Integer()
    page_count = Integer()

    lines = Nested(ConcordanceLineOut(many=True))
