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
                                       'cqp_query': test_query['cqp'],
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
                                      'cqp_query': test_query['cqp'],
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
