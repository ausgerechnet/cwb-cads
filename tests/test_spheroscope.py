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


def test_execute_slot_query(client, auth):

    auth_header = auth.login()

    with client:
        client.get("/")

        slot_query = client.post(url_for('spheroscope.slot_query.execute', id=8),
                                 headers=auth_header)

        assert slot_query.status_code == 200
        pprint(slot_query)
