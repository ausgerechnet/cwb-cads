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
