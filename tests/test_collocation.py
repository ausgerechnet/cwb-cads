from flask import url_for
import pytest
from cads.database import Collocation


@pytest.mark.now
def test_create_collocation(client, auth):

    auth.login()
    with client:
        client.get("/")

        # discourseme
        # - create
        discourseme = client.post(url_for('discourseme.create'),
                                  json={
                                      'name': 'CDU',
                                      'description': 'Test Discourseme 1'
                                  },
                                  auth=('admin', '0000'))
        # constellation
        constellation = client.post(url_for('constellation.create'),
                                    json={
                                        'name': 'CDU',
                                        'description': 'Test Constellation 1',
                                        'filter_discourseme_ids': [discourseme.json['id']]
                                    },
                                    auth=('admin', '0000'))

        constellation = client.get(url_for('constellation.get_constellation', id=constellation.json['id']),
                                   auth=('admin', '0000'))

        # query
        # - create
        query = client.post(url_for('query.create'),
                            json={
                                'discourseme_id': discourseme.json['id'],
                                'corpus_id': 1,
                                'cqp_query': '[lemma="und"]'
                            },
                            auth=('admin', '0000'))

        # - execute
        query = client.post(url_for('query.execute', id=query.json['id']),
                            auth=('admin', '0000'))

        # collocation
        # - create
        collocation = client.post(url_for('query.collocation.create', query_id=query.json['id']),
                                  json={
                                      'constellation_id': 1,
                                      'p': 'lemma',
                                      's_break': 's',
                                      'context': 10,
                                  },
                                  auth=('admin', '0000'))

        assert collocation.status_code == 200


def test_create_or_get_cooc(client, auth):

    auth.login()
    with client:
        client.get("/")

        # discourseme
        # - create
        discourseme = client.post(url_for('discourseme.create'),
                                  json={
                                      'name': 'CDU',
                                      'description': 'Test Discourseme 2'
                                  },
                                  auth=('admin', '0000'))
        # constellation
        constellation = client.post(url_for('constellation.create'),
                                    json={
                                        'name': 'CDU',
                                        'description': 'Test Constellation 2',
                                        'filter_discourseme_ids': [discourseme.json['id']]
                                    },
                                    auth=('admin', '0000'))

        constellation = client.get(url_for('constellation.get_constellation', id=constellation.json['id']),
                                   auth=('admin', '0000'))

        # query
        # - create
        query = client.post(url_for('query.create'),
                            json={
                                'discourseme_id': discourseme.json['id'],
                                'corpus_id': 1,
                                'cqp_query': '[lemma="und"]'
                            },
                            auth=('admin', '0000'))

        # - execute
        query = client.post(url_for('query.execute', id=query.json['id']),
                            auth=('admin', '0000'))

        # collocation
        # - create
        collocation = client.post(url_for('query.collocation.create', query_id=query.json['id']),
                                  json={
                                      'constellation_id': 1,
                                      'p': 'lemma',
                                      's_break': 's',
                                      'context': 10,
                                  },
                                  auth=('admin', '0000'))

        collocation = Collocation.query.filter_by(id=collocation.json['id']).first()

        from cads.collocation import get_or_create_cooc

        df_cooc = get_or_create_cooc(collocation)
        df_cooc_2 = get_or_create_cooc(collocation)
        assert df_cooc.equals(df_cooc_2)


@pytest.mark.now
def test_execute_collocation(client, auth):

    auth.login()
    with client:
        client.get("/")

        collocation = client.post(url_for('query.collocation.execute', query_id=1, id=1),
                                  auth=('admin', '0000'))

        collocation = client.post(url_for('query.collocation.execute', query_id=1, id=1),
                                  auth=('admin', '0000'))

        items = client.get(url_for('query.collocation.get_collocation_items', query_id=1, id=collocation.json['id']),
                           auth=('admin', '0000'))

        assert items.status_code == 200
