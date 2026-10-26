from pprint import pprint

import pytest
from ccc.cqpy import cqpy_load
from flask import url_for


def test_get_slot_queries(client, auth):

    auth_header = auth.login()

    with client:
        client.get("/")

        slot_queries = client.get(url_for('spheroscope.slot_query.get_all'),
                                  headers=auth_header)

        assert slot_queries.status_code == 200


def test_create_slot_query(client, auth):

    auth_header = auth.login()

    with client:
        client.get("/")

        test_query = cqpy_load("tests/library/queries/pattern3_np_hat_wunsch_dass.cqpy")

        slots = [{'slot': key, 'start': str(value[0]), 'end': str(value[1])} for key, value in test_query['anchors']['slots'].items()]
        corrections = [{'anchor': str(key), 'correction': int(value)} for key, value in test_query['anchors']['corrections'].items()]

        slot_query = client.post(url_for('spheroscope.slot_query.create'),
                                 content_type='application/json',
                                 json={
                                     'cqp_query': test_query['cqp'],
                                     'name': test_query['meta']['name'],
                                     'corpus_id': 1,
                                     'slots': slots,
                                     'corrections': corrections
                                 },
                                 headers=auth_header)

        assert slot_query.status_code == 200


def test_put_slot_query(client, auth):

    auth_header = auth.login()

    with client:
        client.get("/")

        test_query = cqpy_load("tests/library/queries/pattern3_np_hat_wunsch_dass.cqpy")

        slots = [{'slot': key, 'start': str(value[0]), 'end': str(value[1])} for key, value in test_query['anchors']['slots'].items()]
        corrections = [{'anchor': str(key), 'correction': int(value)} for key, value in test_query['anchors']['corrections'].items()]

        slot_query_1 = client.post(url_for('spheroscope.slot_query.create'),
                                   content_type='application/json',
                                   json={
                                       'cqp_query': test_query['cqp'] + ' []?',
                                       'name': 'test-put',
                                       'corpus_id': 1,
                                       'slots': slots,
                                       'corrections': corrections
                                   },
                                   headers=auth_header)

        assert slot_query_1.status_code == 200

        slot_query_2 = client.put(url_for('spheroscope.slot_query.get_or_create'),
                                  content_type='application/json',
                                  json={
                                      'cqp_query': test_query['cqp'] + ' []?',
                                      'name': 'test-put',
                                      'corpus_id': 1,
                                      'slots': slots,
                                      'corrections': corrections
                                  },
                                  headers=auth_header)

        assert slot_query_2.status_code == 200

        assert slot_query_1.json['id'] == slot_query_2.json['id']


def test_query_concordance(client, auth):

    # define queries and slots
    slots = [
        {'slot': 'verb', 'start': '0', 'end': '0'},
        {'slot': 'rest', 'start': '1', 'end': 'matchend'}
    ]
    cqp = '"ich|er"%c @0[pos="V.*"]+ @1".*" ".*"'

    auth_header = auth.login()
    with client:
        client.get("/")

        slot_query = client.post(url_for('spheroscope.slot_query.create'),
                                 content_type='application/json',
                                 json={
                                     'cqp_query': cqp,
                                     'corpus_id': 1,
                                     'slots': slots,
                                     'corrections': []
                                 },
                                 headers=auth_header)

        conc = client.get(url_for('spheroscope.slot_query.concordance', id=slot_query.json['id']),
                          headers=auth_header)

        # pprint(conc.json)

        assert conc.status_code == 200


@pytest.mark.now
def test_query_diff(client, auth):

    # define queries and slots
    slots = [
        {'slot': 'verb', 'start': '0', 'end': '0'},
        {'slot': 'rest', 'start': '1', 'end': 'matchend'}
    ]
    cqp1 = '"ich|er"%c @0[pos="V.*"]+ @1".*" ".*"'
    cqp2 = '"ich|wir"%c @0[pos="V.*"] @1".*" ".*"'

    auth_header = auth.login()
    with client:
        client.get("/")

        slot_query_1 = client.post(url_for('spheroscope.slot_query.create'),
                                   content_type='application/json',
                                   json={
                                       'cqp_query': cqp1,
                                       'corpus_id': 1,
                                       'slots': slots,
                                       'corrections': []
                                   },
                                   headers=auth_header)

        slot_query_2 = client.post(url_for('spheroscope.slot_query.create'),
                                   content_type='application/json',
                                   json={
                                       'cqp_query': cqp2,
                                       'corpus_id': 1,
                                       'slots': slots,
                                       'corrections': []
                                   },
                                   headers=auth_header)

        slot_diff = client.get(url_for('spheroscope.slot_query.diff', id1=slot_query_1.json['id'], id2=slot_query_2.json['id']),
                               headers=auth_header)

        assert slot_diff.status_code == 200


def test_query_direct_concordancing(client, auth):

    # define queries and slots
    slots = [
        {'slot': 'verb', 'start': '0', 'end': '0'},
        {'slot': 'rest', 'start': '1', 'end': 'matchend'}
    ]
    cqp1 = '"ich|er"%c @0[pos="V.*"]+ @1".*" ".*"'

    auth_header = auth.login()
    with client:
        client.get("/")

        slot_query = client.post(url_for('spheroscope.slot_query.create'),
                                 content_type='application/json',
                                 json={
                                     'cqp_query': cqp1,
                                     'corpus_id': 1,
                                     'slots': slots,
                                     'corrections': []
                                 },
                                 headers=auth_header)

        result = client.get(url_for('query.concordance_lines',
                                    query_id=slot_query.json['id']),
                            headers=auth_header)

        assert result.status_code == 200


def test_slot_query_library(client, auth):

    from cads import db
    from cads.spheroscope.database import SlotQuery
    from cads.spheroscope.slot_query import ccc_slot_query

    auth_header = auth.login()

    with client:
        client.get("/")

        test_query = cqpy_load("tests/library/queries/pattern3_np_will_np.cqpy")
        slots = [{'slot': key, 'start': str(value[0]), 'end': str(value[1])} for key, value in test_query['anchors']['slots'].items()]
        corrections = [{'anchor': str(key), 'correction': int(value)} for key, value in test_query['anchors']['corrections'].items()]

        cqp_queries = [
            # word list + macro with nested word list
            ('@0[::] /np_entity[] @1[::] [lemma = $verbs_wollen] @2[::]', [], []),
            # nested macros with arguments
            ('@0[::] /annoying_nested2["die", "Bundesregierung", "haben"] @1[::]', [], []),
            # library query: word lists + macro
            (test_query['cqp'], slots, corrections)
        ]

        for cqp_query, slots, corrections in cqp_queries:
            slot_query = client.post(url_for('spheroscope.slot_query.create'),
                                     content_type='application/json',
                                     json={
                                         'cqp_query': cqp_query,
                                         'corpus_id': 1,
                                         'slots': slots,
                                         'corrections': corrections
                                     },
                                     headers=auth_header)
            assert slot_query.status_code == 200

            with client.application.app_context():
                slot_query = db.session.get(SlotQuery, slot_query.json["id"])
                assert slot_query.mangled_query != slot_query.cqp_query
                matches = ccc_slot_query(slot_query)
                assert not isinstance(matches, str), matches
                assert len(matches) > 0, slot_query.mangled_query


def test_query_concordance_pagination(client, auth):

    slots = [
        {'slot': 'verb', 'start': '0', 'end': '0'},
        {'slot': 'rest', 'start': '1', 'end': 'matchend'}
    ]
    cqp = '"ich|er"%c @0[pos="V.*"]+ @1".*" ".*"'

    auth_header = auth.login()
    with client:
        client.get("/")

        slot_query = client.post(url_for('spheroscope.slot_query.create'),
                                 json={'cqp_query': cqp, 'corpus_id': 1, 'slots': slots, 'corrections': []},
                                 headers=auth_header)
        id = slot_query.json['id']

        # matches
        matches = client.get(url_for('spheroscope.slot_query.matches', id=id), headers=auth_header)
        assert matches.status_code == 200
        nr_matches = matches.json['nr_matches']
        assert nr_matches == len(matches.json['matches']) > 25
        assert set(matches.json['matches'][0]['anchors'].keys()) == {'0', '1'}
        starts = [m['match'] for m in matches.json['matches']]
        assert starts == sorted(starts)

        # all lines by default
        conc = client.get(url_for('spheroscope.slot_query.concordance', id=id), headers=auth_header)
        assert conc.status_code == 200
        assert conc.json['nr_lines'] == len(conc.json['lines']) == nr_matches
        assert conc.json['page_count'] == 1
        assert [line['meta']['match'] for line in conc.json['lines']] == starts

        # pages
        page_size = 10
        page_count = (nr_matches + page_size - 1) // page_size
        lines = list()
        for page_number in range(1, page_count + 1):
            page = client.get(url_for('spheroscope.slot_query.concordance', id=id,
                                      page_size=page_size, page_number=page_number),
                              headers=auth_header)
            assert page.status_code == 200
            assert page.json['nr_lines'] == nr_matches
            assert page.json['page_count'] == page_count
            lines.extend(page.json['lines'])
        assert len(lines) == nr_matches
        assert [line['meta']['match'] for line in lines] == starts

        # beyond the last page
        empty = client.get(url_for('spheroscope.slot_query.concordance', id=id,
                                   page_size=page_size, page_number=page_count + 1),
                           headers=auth_header)
        assert empty.status_code == 200
        assert empty.json['lines'] == []

        # last
        last = client.get(url_for('spheroscope.slot_query.concordance', id=id, page_size=5, sort_order='last'),
                          headers=auth_header)
        assert [line['meta']['match'] for line in last.json['lines']] == starts[::-1][:5]

        # random: reproducible with seed
        random_1 = client.get(url_for('spheroscope.slot_query.concordance', id=id, page_size=5,
                                      sort_order='random', random_seed=1),
                              headers=auth_header)
        random_2 = client.get(url_for('spheroscope.slot_query.concordance', id=id, page_size=5,
                                      sort_order='random', random_seed=1),
                              headers=auth_header)
        random_3 = client.get(url_for('spheroscope.slot_query.concordance', id=id, page_size=5,
                                      sort_order='random', random_seed=2),
                              headers=auth_header)
        assert random_1.json['lines'] == random_2.json['lines']
        assert random_1.json['lines'] != random_3.json['lines']

        # invalid parameters
        invalid = client.get(url_for('spheroscope.slot_query.concordance', id=id, page_size=0),
                             headers=auth_header)
        assert invalid.status_code == 422


def test_query_diff_pagination(client, auth):

    slots = [
        {'slot': 'verb', 'start': '0', 'end': '0'},
        {'slot': 'rest', 'start': '1', 'end': 'matchend'}
    ]
    cqp1 = '"ich|er"%c @0[pos="V.*"]+ @1".*" ".*"'
    cqp2 = '"ich|wir"%c @0[pos="V.*"] @1".*" ".*"'

    auth_header = auth.login()
    with client:
        client.get("/")

        ids = [client.post(url_for('spheroscope.slot_query.create'),
                           json={'cqp_query': cqp, 'corpus_id': 1, 'slots': slots, 'corrections': []},
                           headers=auth_header).json['id'] for cqp in [cqp1, cqp2]]

        full = client.get(url_for('spheroscope.slot_query.diff', id1=ids[0], id2=ids[1]), headers=auth_header)
        assert full.status_code == 200
        assert full.json['nr_lines'] == len(full.json['lines'])

        page = client.get(url_for('spheroscope.slot_query.diff', id1=ids[0], id2=ids[1], page_size=7, page_number=2),
                          headers=auth_header)
        assert page.status_code == 200
        assert page.json['nr_lines'] == full.json['nr_lines']
        assert page.json['lines'] == full.json['lines'][7:14]


def test_query_diff_categories(client, auth):

    slots = [
        {'slot': 'verb', 'start': '0', 'end': '0'},
        {'slot': 'rest', 'start': '1', 'end': 'matchend'}
    ]
    cqp1 = '"ich|er"%c @0[pos="V.*"]+ @1".*" ".*"'
    cqp2 = '"ich|wir"%c @0[pos="V.*"] @1".*" ".*"'

    auth_header = auth.login()
    with client:
        client.get("/")

        ids = [client.post(url_for('spheroscope.slot_query.create'),
                           json={'cqp_query': cqp, 'corpus_id': 1, 'slots': slots, 'corrections': []},
                           headers=auth_header).json['id'] for cqp in [cqp1, cqp2]]
        matches = [client.get(url_for('spheroscope.slot_query.matches', id=id), headers=auth_header).json
                   for id in ids]

        for same in ['start', 'span', 'overlap']:
            diff = client.get(url_for('spheroscope.slot_query.diff', id1=ids[0], id2=ids[1], same=same),
                              headers=auth_header)
            assert diff.status_code == 200
            counts = diff.json['counts']
            lines = diff.json['lines']

            # every match of A and B occurs exactly once
            assert sum(counts.values()) == diff.json['nr_lines'] == len(lines)
            assert sum(v for k, v in counts.items() if k != 'only_B') == matches[0]['nr_matches']
            assert sum(v for k, v in counts.items() if k != 'only_A') == matches[1]['nr_matches']
            assert sorted(line['A']['match'] for line in lines if line['A']) == \
                sorted(m['match'] for m in matches[0]['matches'])
            assert sorted(line['B']['match'] for line in lines if line['B']) == \
                sorted(m['match'] for m in matches[1]['matches'])

            for line in lines:
                assert line['source'] == {'only_A': 'A', 'only_B': 'B'}.get(line['category'], 'AB')
                if line['A'] and line['B']:
                    assert line['delta']['match'] == line['B']['match'] - line['A']['match']
                    if same != 'overlap':
                        assert line['delta']['match'] == 0
                    if same == 'span':
                        assert line['category'] in ['identical', 'anchors']

        # the queries differ: "er" only in A, "wir" only in B
        default = client.get(url_for('spheroscope.slot_query.diff', id1=ids[0], id2=ids[1]), headers=auth_header)
        assert default.json['counts']['only_A'] > 0 and default.json['counts']['only_B'] > 0

        # filter categories: counts are not affected
        filtered = client.get(url_for('spheroscope.slot_query.diff', id1=ids[0], id2=ids[1],
                                      categories=['only_A', 'only_B']),
                              headers=auth_header)
        assert filtered.status_code == 200
        assert filtered.json['counts'] == default.json['counts']
        assert {line['category'] for line in filtered.json['lines']} == {'only_A', 'only_B'}
        assert filtered.json['nr_lines'] == filtered.json['counts']['only_A'] + filtered.json['counts']['only_B']

        # invalid category
        invalid = client.get(url_for('spheroscope.slot_query.diff', id1=ids[0], id2=ids[1], categories=['foo']),
                             headers=auth_header)
        assert invalid.status_code == 422


def test_slot_query_identity(client, auth):

    from cads import db
    from cads.spheroscope.database import SlotQuery

    auth_header = auth.login()
    with client:
        client.get("/")

        definition = {
            'cqp_query': '@0[::] [lemma="Haus"] @1[::]',
            'corpus_id': 1,
            'slots': [{'slot': 'noun', 'start': '0', 'end': '1'}],
            'corrections': []
        }

        def put(**kwargs):
            return client.put(url_for('spheroscope.slot_query.get_or_create'),
                              json={**definition, **kwargs}, headers=auth_header)

        # metadata is returned
        first = put(name='house', comment='a comment')
        assert first.status_code == 200
        assert first.json['name'] == 'house'
        assert first.json['comment'] == 'a comment'
        assert first.json['context_break'] == 's'
        assert first.json['modified']

        # name and comment are not part of the identity
        assert put(name='other name', comment='other comment').json['id'] == first.json['id']
        assert put().json['id'] == first.json['id']
        assert put().json['name'] == 'house'

        # context break and match strategy are
        text = put(context_break='text')
        assert text.json['id'] != first.json['id']
        assert text.json['context_break'] == 'text'
        assert put(context_break='text').json['id'] == text.json['id']
        assert put(match_strategy='shortest').json['id'] not in [first.json['id'], text.json['id']]

        # empty slots / corrections: omitted, null and [] are the same
        empty = {k: v for k, v in definition.items() if k not in ['slots', 'corrections']}
        omitted = client.put(url_for('spheroscope.slot_query.get_or_create'), json=empty, headers=auth_header)
        explicit = client.put(url_for('spheroscope.slot_query.get_or_create'),
                              json={**empty, 'slots': [], 'corrections': []}, headers=auth_header)
        assert omitted.json['id'] == explicit.json['id'] != first.json['id']
        assert omitted.json['slots'] == [] and omitted.json['corrections'] == []

        # legacy encodings in the database ("null", NULL) are matched as well
        for encoding in ['null', None]:
            with client.application.app_context():
                legacy = db.session.get(SlotQuery, omitted.json['id'])
                legacy._slots = encoding
                legacy._corrections = encoding
                db.session.commit()
            again = client.put(url_for('spheroscope.slot_query.get_or_create'), json=empty, headers=auth_header)
            assert again.json['id'] == omitted.json['id']
            assert again.json['slots'] == []

        # PATCH changes name and comment, keeps id
        patched = client.patch(url_for('spheroscope.slot_query.patch', id=first.json['id']),
                               json={'name': 'renamed'}, headers=auth_header)
        assert patched.status_code == 200
        assert patched.json['id'] == first.json['id']
        assert patched.json['name'] == 'renamed'
        assert patched.json['comment'] == 'a comment'
        patched = client.patch(url_for('spheroscope.slot_query.patch', id=first.json['id']),
                               json={'comment': None}, headers=auth_header)
        assert patched.json['name'] == 'renamed'
        assert patched.json['comment'] is None
        assert client.get(url_for('spheroscope.slot_query.get_one', id=first.json['id']),
                          headers=auth_header).json['name'] == 'renamed'


def test_slot_query_corpus_filter_and_diff_corpora(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        ids = [client.put(url_for('spheroscope.slot_query.get_or_create'),
                          json={'cqp_query': '[lemma="Haus"]', 'corpus_id': corpus_id}, headers=auth_header).json['id']
               for corpus_id in [1, 2]]

        for corpus_id, id in zip([1, 2], ids):
            slot_queries = client.get(url_for('spheroscope.slot_query.get_all', corpus_id=corpus_id), headers=auth_header)
            assert slot_queries.status_code == 200
            assert {q['corpus_id'] for q in slot_queries.json} == {corpus_id}
            assert id in {q['id'] for q in slot_queries.json}

        all_queries = client.get(url_for('spheroscope.slot_query.get_all'), headers=auth_header)
        assert set(ids) <= {q['id'] for q in all_queries.json}
        assert client.get(url_for('spheroscope.slot_query.get_all', corpus_id=999), headers=auth_header).status_code == 404

        # diff across corpora
        diff = client.get(url_for('spheroscope.slot_query.diff', id1=ids[0], id2=ids[1]), headers=auth_header)
        assert diff.status_code == 400


def test_query_history_context_break(client, auth):

    auth_header = auth.login()

    with client:
        client.get("/")

        slot_query = client.post(url_for('spheroscope.slot_query.create'),
                                 content_type='application/json',
                                 json={
                                     'cqp_query': '[lemma="Wunsch"]',
                                     'corpus_id': 1,
                                     'context_break': 's'
                                 },
                                 headers=auth_header)
        assert slot_query.status_code == 200
        assert slot_query.json['context_break'] == 's'

        history = client.post(url_for('spheroscope.query_history.create'),
                              content_type='application/json',
                              json={'name': 'test-context-break'},
                              headers=auth_header)
        assert history.status_code == 200

        history = client.put(url_for('spheroscope.query_history.add_query', id=history.json['id']),
                             content_type='application/json',
                             json={'query_id': slot_query.json['id'], 'comment': 'first'},
                             headers=auth_header)
        assert history.status_code == 200
        assert history.json['entries'][0]['query']['context_break'] == 's'

        history = client.get(url_for('spheroscope.query_history.get_history', id=history.json['id']),
                             headers=auth_header)
        assert history.status_code == 200
        entry = history.json['entries'][0]
        assert entry['comment'] == 'first'
        assert entry['query']['id'] == slot_query.json['id']
        assert entry['query']['context_break'] == 's'

        histories = client.get(url_for('spheroscope.query_history.get_all'), headers=auth_header)
        assert histories.status_code == 200
        assert any(e['query']['context_break'] == 's' for h in histories.json for e in h['entries'])


def test_query_p_show(client, auth):

    slots = [
        {'slot': 'verb', 'start': '0', 'end': '0'},
        {'slot': 'rest', 'start': '1', 'end': 'matchend'}
    ]
    cqp1 = '"ich|er"%c @0[pos="V.*"]+ @1".*" ".*"'
    cqp2 = '"ich|wir"%c @0[pos="V.*"] @1".*" ".*"'

    auth_header = auth.login()
    with client:
        client.get("/")

        ids = list()
        for cqp in [cqp1, cqp2]:
            slot_query = client.post(url_for('spheroscope.slot_query.create'),
                                     content_type='application/json',
                                     json={'cqp_query': cqp, 'corpus_id': 1, 'slots': slots, 'corrections': []},
                                     headers=auth_header)
            assert slot_query.status_code == 200
            ids.append(slot_query.json['id'])

        # default: cpos and word
        conc = client.get(url_for('spheroscope.slot_query.concordance', id=ids[0], page_size=5),
                          headers=auth_header)
        assert conc.status_code == 200
        assert set(conc.json['lines'][0]['tokens'][0].keys()) == {'cpos', 'word'}

        # repeatable; word is always included
        conc = client.get(url_for('spheroscope.slot_query.concordance', id=ids[0], page_size=5,
                                  p_show=['lemma', 'pos']),
                          headers=auth_header)
        assert conc.status_code == 200
        for line in conc.json['lines']:
            for token in line['tokens']:
                assert set(token.keys()) == {'cpos', 'word', 'lemma', 'pos'}
        # the verb slot is tagged V.*
        verb = conc.json['lines'][0]['meta']['match'] + 1
        assert [t for t in conc.json['lines'][0]['tokens'] if t['cpos'] == verb][0]['pos'].startswith('V')

        diff = client.get(url_for('spheroscope.slot_query.diff', id1=ids[0], id2=ids[1], page_size=5,
                                  p_show=['lemma']),
                          headers=auth_header)
        assert diff.status_code == 200
        for line in diff.json['lines']:
            for token in line['tokens']:
                assert set(token.keys()) == {'cpos', 'word', 'lemma'}

        # unknown attribute
        conc = client.get(url_for('spheroscope.slot_query.concordance', id=ids[0], p_show=['nonexistent']),
                          headers=auth_header)
        assert conc.status_code == 400
        diff = client.get(url_for('spheroscope.slot_query.diff', id1=ids[0], id2=ids[1], p_show=['nonexistent']),
                          headers=auth_header)
        assert diff.status_code == 400
