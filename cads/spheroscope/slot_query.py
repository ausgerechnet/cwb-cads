#! /usr/bin/env python
# -*- coding: utf-8 -*-

import json

from apiflask import APIBlueprint, Schema, abort
from apiflask.fields import Boolean, Dict, Integer, List, Nested, String
from apiflask.validators import OneOf, Range
from ccc import SubCorpus
from ccc.cqpy import cqpy_load
from flask import current_app as app
from pandas import DataFrame

from .. import db
from ..database import Corpus, resolve_macro_body
from ..library import DependenciesOut
from ..users import auth, write_access_required
from .database import SlotQuery

bp = APIBlueprint('slot_query', __name__, url_prefix='/slot-query')


def ccc_slot_query(slot_query):

    crps = slot_query.corpus.ccc()

    corrections = dict()
    for d in slot_query.corrections:
        try:
            k = int(d['anchor'])
        except ValueError:
            k = d['anchor']
        corrections[k] = d['correction']

    dump = crps.query(
        cqp_query=slot_query.mangled_query,
        corrections=corrections,
        context_break=slot_query.s,
        match_strategy=slot_query.match_strategy
    )

    # invalid query
    if isinstance(dump, str):
        app.logger.error('invalid query')
        return dump

    # valid query, but no matches
    if len(dump.df) == 0:
        app.logger.warning(f'no results for query {slot_query.id}')

    return dump.df


def format_line(line, p_show, s_show):
    """format one line, provide dictionary of
    - context
    - contextend
    - tokens (list of dicts): cpos + one key per p-attribute in p_show
    - structural (dict): s_show

    """

    context = line['context']
    contextend = line['contextend']
    structural = dict()
    for s_att in s_show:
        structural[s_att] = line[s_att]

    line = line['dict']

    tokens = list()
    for i, cpos in enumerate(line['cpos']):
        tokens.append({'cpos': cpos, **{p_att: line[p_att][i] for p_att in p_show}})

    row = {
        'context': context,
        'contextend': contextend,
        'tokens': tokens,
        'structural': structural,
    }

    return row


def lexicalise(df_dump, cwb_id, p_show=["word"], s_show=[]):

    # ccc's concordance() selects rows via df.loc[list(matches), :], which
    # over-selects whenever (match, matchend) is not unique in df_dump (both
    # duplicate tuples and shared 'match' values with differing 'matchend'
    # trigger this). Deduplicate before querying and re-expand afterwards.
    df_unique = df_dump[~df_dump.index.duplicated(keep='first')].copy()

    lines = SubCorpus(
        subcorpus_name=None,
        df_dump=df_unique,
        corpus_name=cwb_id,
        cqp_bin=app.config['CCC_CQP_BIN'],
        registry_dir=app.config['CCC_REGISTRY_DIR'],
        data_dir=app.config['CCC_DATA_DIR'],
        overwrite=False,
        lib_dir=None
    ).concordance(
        form='dict',
        p_show=p_show,
        s_show=s_show,
        order='asis',
        matches=list(df_unique.index)
    )

    lines = lines.reindex(df_dump.index)
    lines = lines.apply(lambda line: format_line(line, p_show, s_show), axis=1)

    return lines.to_list()


def paginate_matches(df, sort_order='first', random_seed=None, page_size=None, page_number=1):
    """Sorts a DataFrame with columns 'match' and 'matchend' and returns the
    requested page together with pagination metadata. Returns all rows on
    one page if page_size is None.

    """

    if sort_order == 'random':
        df = df.sample(frac=1, random_state=random_seed)
    else:
        df = df.sort_values(by=['match', 'matchend'], ascending=sort_order == 'first', kind='stable')

    nr_lines = len(df)
    if page_size is None:
        page_size = nr_lines
        page_number = 1
    page_count = (nr_lines + page_size - 1) // page_size if page_size > 0 else 0

    start = (page_number - 1) * page_size
    df_page = df.iloc[start:start + page_size]

    return df_page, {
        'nr_lines': nr_lines,
        'page_size': page_size,
        'page_number': page_number,
        'page_count': page_count
    }


def anchor_columns(df):
    """Returns the anchor columns (0–9) present in a dump"""

    return sorted(set(range(0, 10)).intersection(set(df.columns)))


DIFF_CATEGORIES = ['identical', 'anchors', 'near', 'extended', 'reduced', 'shifted', 'only_A', 'only_B']


def pair_matches(df_a, df_b, same='start'):
    """Pairs matches of two queries one-to-one.

    df_a and df_b must have columns 'match' and 'matchend' (and a RangeIndex).
    same='start': matches with the same start position are paired
    same='span': matches with the same start and end position are paired
    same='overlap': overlapping matches are paired greedily in order of position

    Returns a list of (index in df_a or None, index in df_b or None).
    """

    if same in ['start', 'span']:
        keys = ['match'] if same == 'start' else ['match', 'matchend']
        a = df_a[keys].copy()
        b = df_b[keys].copy()
        # number duplicates of keys so that pairing is one-to-one
        a['nr'] = a.groupby(keys).cumcount()
        b['nr'] = b.groupby(keys).cumcount()
        merged = a.reset_index(names='a').merge(b.reset_index(names='b'), on=keys + ['nr'], how='outer')
        return [(None if a != a else int(a), None if b != b else int(b)) for a, b in zip(merged['a'], merged['b'])]

    if same == 'overlap':
        a_sorted = df_a.sort_values(['match', 'matchend']).index.to_list()
        b_sorted = df_b.sort_values(['match', 'matchend']).index.to_list()
        pairs = list()
        paired_b = set()
        active = list()         # unpaired matches of B starting before the current match of A ends
        j = 0
        for i in a_sorted:
            match, matchend = df_a.at[i, 'match'], df_a.at[i, 'matchend']
            while j < len(b_sorted) and df_b.at[b_sorted[j], 'match'] <= matchend:
                active.append(b_sorted[j])
                j += 1
            # matches of B ending before the current match of A cannot overlap any later one
            active = [k for k in active if df_b.at[k, 'matchend'] >= match]
            if active:
                k = active.pop(0)
                pairs.append((i, k))
                paired_b.add(k)
            else:
                pairs.append((i, None))
        pairs.extend((None, k) for k in b_sorted if k not in paired_b)
        return pairs

    raise ValueError(f"unknown matching rule '{same}'")


def categorise_pair(a, b, tolerance=1):
    """Categorises a pair of matches (dictionaries with keys match, matchend, anchors)"""

    if a is None:
        return 'only_B'
    if b is None:
        return 'only_A'

    delta_match = b['match'] - a['match']
    delta_matchend = b['matchend'] - a['matchend']

    if delta_match == 0 and delta_matchend == 0:
        return 'identical' if a['anchors'] == b['anchors'] else 'anchors'
    if abs(delta_match) <= tolerance and abs(delta_matchend) <= tolerance:
        return 'near'
    if delta_match <= 0 and delta_matchend >= 0:
        return 'extended'
    if delta_match >= 0 and delta_matchend <= 0:
        return 'reduced'
    return 'shifted'


def match_records(df):
    """Converts a DataFrame of matches to a list of dictionaries with keys
    match, matchend, context, contextend, anchors"""

    anchors = anchor_columns(df)

    return [{
        'match': int(row['match']),
        'matchend': int(row['matchend']),
        'context': int(row['context']),
        'contextend': int(row['contextend']),
        'anchors': {str(k): int(row[k]) for k in anchors}
    } for row in df.to_dict('records')]


def diff_matches(df_a, df_b, same='start', tolerance=1):
    """Compares the matches of two queries.

    Returns a DataFrame with one row per pair of matches (or unpaired match)
    and columns match, matchend, context, contextend (spanning both matches),
    category, A, B (match records or None), delta (or None).
    """

    records_a = match_records(df_a.reset_index(drop=True))
    records_b = match_records(df_b.reset_index(drop=True))

    rows = list()
    for i, j in pair_matches(df_a.reset_index(drop=True), df_b.reset_index(drop=True), same):
        a = records_a[i] if i is not None else None
        b = records_b[j] if j is not None else None
        present = [m for m in [a, b] if m is not None]
        delta = None
        if a is not None and b is not None:
            delta = {
                'match': b['match'] - a['match'],
                'matchend': b['matchend'] - a['matchend'],
                'anchors': sorted(k for k in set(a['anchors']) | set(b['anchors'])
                                  if a['anchors'].get(k) != b['anchors'].get(k))
            }
        rows.append({
            'match': min(m['match'] for m in present),
            'matchend': max(m['matchend'] for m in present),
            'context': min(m['context'] for m in present),
            'contextend': max(m['contextend'] for m in present),
            'category': categorise_pair(a, b, tolerance),
            'A': a,
            'B': b,
            'delta': delta
        })

    return DataFrame(rows, columns=['match', 'matchend', 'context', 'contextend', 'category', 'A', 'B', 'delta'])


def find_current_slot_query(corpus_id, cqp_query, slots, corrections, match_strategy, s):
    """Returns an existing slot query with the given definition whose library
    calls resolve to the latest versions (or None). Name and comment are not
    part of the definition. Raises ValueError if library calls cannot be
    resolved.

    """

    mangled_query, _, _ = resolve_macro_body(cqp_query, corpus_id)
    candidates = SlotQuery.query.filter_by(
        corpus_id=corpus_id, cqp_query=cqp_query, match_strategy=match_strategy, s=s
    ).order_by(SlotQuery.id).all()
    for candidate in candidates:
        if candidate.slots == (slots or []) and candidate.corrections == (corrections or []) and \
           candidate.mangled_query == mangled_query:
            return candidate

    return None


def import_slot_query(path, corpus_id):

    query = cqpy_load(path)

    anchors = query.get('anchors')
    slots = []
    corrections = []
    if anchors:
        if anchors.get('slots'):
            slots = [{'slot': key, 'start': str(value[0]), 'end': str(value[1])} for key, value in query['anchors']['slots'].items()]
        if anchors.get('corrections'):
            corrections = [{'anchor': str(key), 'correction': int(value)} for key, value in query['anchors']['corrections'].items()]

    app.logger.debug(f"importing SlottedQuery {query['meta']['name']}")

    corpus = db.get_or_404(Corpus, corpus_id)

    definition = dict(
        corpus_id=corpus.id,
        cqp_query=query['cqp'],
        match_strategy='longest',
        s=corpus.s_default
    )

    # reuse existing query if its library calls still resolve to the latest versions
    try:
        existing = find_current_slot_query(slots=slots, corrections=corrections, **definition)
    except ValueError as e:
        app.logger.error(f"could not init query: {e}")
        return
    if existing:
        app.logger.debug(f"SlottedQuery {query['meta']['name']} already exists")
        return existing

    try:
        slot_query = SlotQuery(
            name=query['meta']['name'],
            comment=query['meta'].get('comment'),
            _slots=json.dumps(slots),
            _corrections=json.dumps(corrections),
            **definition
        )
        db.session.add(slot_query)
    except Exception as e:
        app.logger.error(f"could not init query: {e}")
        return
    finally:
        db.session.commit()

    # dump to library directory
    # TODO: is this really necessary? it just basically duplicates the input and is never read by the backend
    slot_query.write()

    # execute query to cache results (?)
    # ccc_query(slot_query, return_df=False)

    return slot_query


class AnchorCorrection(Schema):

    anchor = String()
    correction = Integer()


class AnchorSlot(Schema):

    slot = String()
    start = String()
    end = String()


class SlotQueryIn(Schema):

    corpus_id = Integer(required=True)
    cqp_query = String(required=True)
    name = String(metadata={'description': 'not part of the query definition (see PUT /create)'})
    comment = String(metadata={'description': 'not part of the query definition (see PUT /create)'})
    context_break = String(required=False)
    slots = Nested(AnchorSlot(many=True))
    corrections = Nested(AnchorCorrection(many=True))
    match_strategy = String(load_default='longest', required=False, validate=OneOf(['longest', 'shortest', 'standard']))


class SlotQueryOut(Schema):

    id = Integer()
    corpus_id = Integer()
    cqp_query = String()
    name = String(allow_none=True)
    comment = String(allow_none=True)
    modified = String()
    context_break = String(attribute='s', allow_none=True)
    slots = Nested(AnchorSlot(many=True))
    corrections = Nested(AnchorCorrection(many=True))
    match_strategy = String(dump_default='longest', required=False, validate=OneOf(['longest', 'shortest', 'standard']))
    dependencies = Nested(DependenciesOut, metadata={'description': 'library versions used by the query'})
    up_to_date = Boolean(metadata={'description': 'whether all library versions used by the query are the latest ones'})


class SlotQueryPatchIn(Schema):

    name = String(required=False, allow_none=True)
    comment = String(required=False, allow_none=True)


class SlotQueryFilterIn(Schema):

    corpus_id = Integer(
        required=False, load_default=None,
        metadata={'description': 'only slot queries on this corpus'}
    )
    outdated = Boolean(
        required=False, load_default=None,
        metadata={'description': 'only slot queries using outdated (true) or only latest (false) library versions'}
    )


class PaginationIn(Schema):

    page_size = Integer(
        required=False, load_default=None, validate=Range(min=1),
        metadata={'description': 'page size (all lines if not given)'}
    )
    page_number = Integer(
        required=False, load_default=1, validate=Range(min=1),
        metadata={'description': 'page number'}
    )
    sort_order = String(
        required=False, load_default='first', validate=OneOf(['first', 'last', 'random']),
        metadata={'description': 'order by corpus position (first / last) or randomly'}
    )
    random_seed = Integer(
        required=False, load_default=None,
        metadata={'description': 'random seed for sort_order random (default: random seed of the (first) query)'}
    )
    p_show = List(
        String(), required=False, load_default=['word'],
        metadata={'description': 'positional attributes of each token (repeatable; word is always included)'}
    )


class SlotConcordanceIn(PaginationIn):
    pass


class SlotDiffIn(PaginationIn):

    id1 = Integer(required=True)
    id2 = Integer(required=True)
    same = String(
        required=False, load_default='start', validate=OneOf(['start', 'span', 'overlap']),
        metadata={'description': 'when two matches are considered the same: same start position, same span, or overlapping'}
    )
    tolerance = Integer(
        required=False, load_default=1, validate=Range(min=0),
        metadata={'description': 'maximum difference of start and end positions for category "near"'}
    )
    categories = List(
        String(validate=OneOf(DIFF_CATEGORIES)), required=False, load_default=None,
        metadata={'description': 'only return lines of these categories (counts are not affected)'}
    )


class SlotMatch(Schema):

    match = Integer(required=True)
    matchend = Integer(required=True)
    context = Integer(required=True)
    contextend = Integer(required=True)
    anchors = Dict(keys=String(), values=Integer(), required=True)


class DiffDelta(Schema):

    match = Integer(metadata={'description': 'start position of B minus start position of A'})
    matchend = Integer(metadata={'description': 'end position of B minus end position of A'})
    anchors = List(String(), metadata={'description': 'anchors with different positions'})


class DiffLine(Schema):

    category = String(validate=OneOf(DIFF_CATEGORIES))
    A = Nested(SlotMatch, allow_none=True)
    B = Nested(SlotMatch, allow_none=True)
    delta = Nested(DiffDelta, allow_none=True)
    context = Integer()
    contextend = Integer()
    tokens = List(Dict(keys=String()), required=True, dump_default=[],
                  metadata={'description': 'cpos and one key per requested p-attribute'})
    structural = Dict(required=True, dump_default={})
    source = String(metadata={'description': 'deprecated: use category', 'deprecated': True})


class DiffCounts(Schema):

    identical = Integer()
    anchors = Integer()
    near = Integer()
    extended = Integer()
    reduced = Integer()
    shifted = Integer()
    only_A = Integer()
    only_B = Integer()


class ConcLine(Schema):

    tokens = List(Dict(keys=String()), required=True, dump_default=[],
                  metadata={'description': 'cpos and one key per requested p-attribute'})
    structural = Dict(required=True, dump_default={})
    meta = Dict(keys=String(), values=Integer(), required=True, dump_default=[])


class SlotQueryConcOut(Schema):

    id = Integer()
    lines = Nested(ConcLine(many=True))
    nr_lines = Integer()
    page_size = Integer()
    page_count = Integer()
    page_number = Integer()


class SlotQueryMatchesOut(Schema):

    id = Integer()
    nr_matches = Integer()
    matches = Nested(SlotMatch(many=True))


class SlotDiffOut(Schema):

    id1 = Integer()
    id2 = Integer()
    counts = Nested(DiffCounts)
    lines = Nested(DiffLine(many=True))
    nr_lines = Integer()
    page_size = Integer()
    page_count = Integer()
    page_number = Integer()


@bp.get('/')
@bp.input(SlotQueryFilterIn, location='query')
@bp.output(SlotQueryOut(many=True))
@bp.auth_required(auth)
def get_all(query_data):
    """Get all slot queries.

    """

    slot_queries = SlotQuery.query
    if query_data['corpus_id'] is not None:
        corpus = db.get_or_404(Corpus, query_data['corpus_id'])
        slot_queries = slot_queries.filter_by(corpus_id=corpus.id)
    slot_queries = slot_queries.order_by(SlotQuery.id).all()
    if query_data['outdated'] is not None:
        slot_queries = [q for q in slot_queries if q.up_to_date != query_data['outdated']]

    return slot_queries, 200


def slot_query_definition(json_data):
    """Returns the definition of a slot query from SlotQueryIn (what identifies a query)"""

    corpus = db.get_or_404(Corpus, json_data['corpus_id'])

    return dict(
        corpus_id=corpus.id,
        cqp_query=json_data['cqp_query'],
        slots=json_data.get('slots') or [],
        corrections=json_data.get('corrections') or [],
        match_strategy=json_data['match_strategy'],
        s=json_data.get('context_break', corpus.s_default)
    )


def create_slot_query(definition, name=None, comment=None):
    """Creates a new slot query from a definition; aborts if library calls cannot be resolved"""

    try:
        resolve_macro_body(definition['cqp_query'], definition['corpus_id'])
    except ValueError as e:
        abort(400, message=str(e))

    slot_query = SlotQuery(
        corpus_id=definition['corpus_id'],
        cqp_query=definition['cqp_query'],
        match_strategy=definition['match_strategy'],
        s=definition['s'],
        _slots=json.dumps(definition['slots']),
        _corrections=json.dumps(definition['corrections']),
        name=name,
        comment=comment
    )
    db.session.add(slot_query)
    db.session.commit()

    return slot_query


@bp.post('/create')
@bp.input(SlotQueryIn)
@bp.output(SlotQueryOut)
@bp.auth_required(auth)
def create(json_data):
    """Create a new slot query.

    """

    definition = slot_query_definition(json_data)
    slot_query = create_slot_query(definition, json_data.get('name'), json_data.get('comment'))

    return slot_query, 200


@bp.put('/create')
@bp.input(SlotQueryIn)
@bp.output(SlotQueryOut)
@bp.auth_required(auth)
def get_or_create(json_data):
    """Return an existing slot query or create it if it does not exist.

    A slot query is identified by corpus, CQP query, slots, corrections, match strategy and context break
    (name and comment are ignored; use PATCH to change them). An existing slot query is only returned
    if its library calls resolve to the latest versions.

    """

    definition = slot_query_definition(json_data)

    try:
        slot_query = find_current_slot_query(**definition)
    except ValueError as e:
        abort(400, message=str(e))

    if slot_query:
        app.logger.debug('slot query already exists')
        return slot_query, 200

    app.logger.debug('slot query does not exist, creating')
    slot_query = create_slot_query(definition, json_data.get('name'), json_data.get('comment'))

    return slot_query, 200


@bp.patch('/<id>/')
@bp.input(SlotQueryPatchIn)
@bp.output(SlotQueryOut)
@bp.auth_required(auth)
@write_access_required
def patch(id, json_data):
    """Update name and/or comment of a slot query.

    """

    slot_query = db.get_or_404(SlotQuery, id)
    for key in ['name', 'comment']:
        if key in json_data:
            setattr(slot_query, key, json_data[key])
    db.session.commit()

    return slot_query, 200


@bp.get('/<id>/')
@bp.output(SlotQueryOut)
@bp.auth_required(auth)
def get_one(id):
    """Get details of a slot query.

    """

    slot_query = db.get_or_404(SlotQuery, id)

    return slot_query, 200


def get_p_show(corpus, p_show):
    """Returns the requested p-attributes (word first, no duplicates); aborts
    if the corpus does not have one of them.

    """

    p_show = list(dict.fromkeys(['word'] + p_show))
    unknown = [p_att for p_att in p_show if p_att not in corpus.p_atts]
    if unknown:
        abort(400, message=f"corpus {corpus.cwb_id} does not have p-attributes {unknown}")

    return p_show


def get_slot_query_matches(slot_query):
    """Returns the matches of a slot query as a DataFrame with columns
    match, matchend, context, contextend and anchors; aborts if the query
    is invalid.

    """

    df = ccc_slot_query(slot_query)
    if isinstance(df, str):
        abort(400, message=f"invalid query: {df}")

    if len(df) == 0:
        return DataFrame(columns=['match', 'matchend', 'context', 'contextend'])

    return df.reset_index()


@bp.get('/<id>/matches')
@bp.output(SlotQueryMatchesOut)
@bp.auth_required(auth)
def matches(id):
    """Get match positions and anchors of a slot query (without lexicalisation).

    """

    slot_query = db.get_or_404(SlotQuery, id)

    df = get_slot_query_matches(slot_query)
    matches = match_records(df.sort_values(by=['match', 'matchend']))

    return {
        'id': slot_query.id,
        'nr_matches': len(matches),
        'matches': matches
    }, 200


@bp.get('/<id>/concordance')
@bp.input(SlotConcordanceIn, location='query')
@bp.output(SlotQueryConcOut)
@bp.auth_required(auth)
def concordance(id, query_data):
    """Get concordance lines of a slot query.

    Only the requested page is lexicalised; all lines are returned if no page_size is given.

    """

    slot_query = db.get_or_404(SlotQuery, id)
    random_seed = query_data['random_seed'] if query_data['random_seed'] is not None else slot_query.random_seed
    p_show = get_p_show(slot_query.corpus, query_data['p_show'])

    df = get_slot_query_matches(slot_query)
    anchors = anchor_columns(df)
    df, pagination = paginate_matches(df, query_data['sort_order'], random_seed,
                                      query_data['page_size'], query_data['page_number'])

    lines = list()
    if len(df) > 0:
        df = df.set_index(['match', 'matchend'], drop=False)
        df['concordance'] = lexicalise(df[['context', 'contextend']], slot_query.corpus.cwb_id, p_show)
        for row in df.to_dict('records'):
            line = row['concordance']
            line['meta'] = {str(k): int(row[k]) for k in anchors}
            for key in ['match', 'matchend', 'context', 'contextend']:
                line['meta'][key] = int(row[key])
            lines.append(line)

    return SlotQueryConcOut().dump({
        'id': slot_query.id,
        'lines': lines,
        **pagination
    }), 200


@bp.get('/diff')
@bp.input(SlotDiffIn, location='query')
@bp.output(SlotDiffOut)
@bp.auth_required(auth)
def diff(query_data):
    """Get difference between two slot queries.

    Matches of both queries are paired according to `same`; each line is a pair
    (or an unpaired match) with one of the categories
    - identical: same span and anchors
    - anchors: same span, different anchors
    - near: start and end differ by at most `tolerance` tokens
    - extended: B contains A
    - reduced: A contains B
    - shifted: overlapping, neither contains the other
    - only_A, only_B: unpaired

    Only the requested page is lexicalised; all lines are returned if no page_size is given.

    """

    slot_query_1 = db.get_or_404(SlotQuery, query_data['id1'])
    slot_query_2 = db.get_or_404(SlotQuery, query_data['id2'])
    random_seed = query_data['random_seed'] if query_data['random_seed'] is not None else slot_query_1.random_seed

    if slot_query_1.corpus.cwb_id != slot_query_2.corpus.cwb_id:
        abort(400, message="slot queries must be on the same corpus")
    cwb_id = slot_query_1.corpus.cwb_id
    p_show = get_p_show(slot_query_1.corpus, query_data['p_show'])

    # gather query results and compare
    df = diff_matches(get_slot_query_matches(slot_query_1),
                      get_slot_query_matches(slot_query_2),
                      query_data['same'], query_data['tolerance'])
    counts = {c: int((df['category'] == c).sum()) for c in DIFF_CATEGORIES}

    if query_data['categories']:
        df = df.loc[df['category'].isin(query_data['categories'])]
    df, pagination = paginate_matches(df, query_data['sort_order'], random_seed,
                                      query_data['page_size'], query_data['page_number'])

    lines = list()
    if len(df) > 0:
        df = df.set_index(['match', 'matchend'], drop=False)
        df['concordance'] = lexicalise(df[['context', 'contextend']], cwb_id, p_show)
        for row in df.to_dict('records'):
            line = row['concordance']
            for key in ['category', 'A', 'B', 'delta']:
                line[key] = row[key]
            line['source'] = {'only_A': 'A', 'only_B': 'B'}.get(row['category'], 'AB')
            lines.append(line)

    return SlotDiffOut().dump({
        'id1': slot_query_1.id,
        'id2': slot_query_2.id,
        'counts': counts,
        'lines': lines,
        **pagination
    }), 200
