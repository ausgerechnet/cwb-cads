from flask import url_for
from cads.database import Collocation


def test_create_collocation(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # discourseme
        # - create
        discourseme = client.post(url_for('discourseme.create'),
                                  json={
                                      'name': 'CDU',
                                      'description': 'Test Discourseme 1'
                                  },
                                  headers=auth_header)
        # constellation
        constellation = client.post(url_for('constellation.create'),
                                    json={
                                        'name': 'CDU',
                                        'description': 'Test Constellation 1',
                                        'filter_discourseme_ids': [discourseme.json['id']]
                                    },
                                    headers=auth_header)

        constellation = client.get(url_for('constellation.get_constellation', id=constellation.json['id']),
                                   headers=auth_header)

        # query
        # - create
        query = client.post(url_for('query.create'),
                            json={
                                'discourseme_id': discourseme.json['id'],
                                'corpus_id': 1,
                                'cqp_query': '[lemma="und"]'
                            },
                            headers=auth_header)

        # - execute
        query = client.post(url_for('query.execute', id=query.json['id']),
                            headers=auth_header)

        # collocation
        # - create
        collocation = client.post(url_for('collocation.create', query_id=query.json['id']),
                                  json={
                                      'constellation_id': 1,
                                      'p': 'lemma',
                                      's_break': 's',
                                      'context': 10,
                                  },
                                  headers=auth_header)

        assert collocation.status_code == 200


def test_create_or_get_cooc(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # discourseme
        # - create
        discourseme = client.post(url_for('discourseme.create'),
                                  json={
                                      'name': 'CDU',
                                      'description': 'Test Discourseme 2'
                                  },
                                  headers=auth_header)
        # constellation
        constellation = client.post(url_for('constellation.create'),
                                    json={
                                        'name': 'CDU',
                                        'description': 'Test Constellation 2',
                                        'filter_discourseme_ids': [discourseme.json['id']]
                                    },
                                    headers=auth_header)

        constellation = client.get(url_for('constellation.get_constellation', id=constellation.json['id']),
                                   headers=auth_header)

        # query
        # - create
        query = client.post(url_for('query.create'),
                            json={
                                'discourseme_id': discourseme.json['id'],
                                'corpus_id': 1,
                                'cqp_query': '[lemma="und"]'
                            },
                            headers=auth_header)

        # - execute
        query = client.post(url_for('query.execute', id=query.json['id']),
                            headers=auth_header)

        # collocation
        # - create
        collocation = client.post(url_for('collocation.create', query_id=query.json['id']),
                                  json={
                                      'constellation_id': 1,
                                      'p': 'lemma',
                                      's_break': 's',
                                      'context': 10,
                                  },
                                  headers=auth_header)

        collocation = Collocation.query.filter_by(id=collocation.json['id']).first()

        from cads.collocation import get_or_create_cooc

        df_cooc = get_or_create_cooc(collocation)
        df_cooc_2 = get_or_create_cooc(collocation)
        assert df_cooc.equals(df_cooc_2)


def test_execute_collocation(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        collocation = client.post(url_for('collocation.execute', query_id=1, id=1),
                                  headers=auth_header)

        collocation = client.post(url_for('collocation.execute', query_id=1, id=1),
                                  headers=auth_header)

        items = client.get(url_for('collocation.get_collocation_items', query_id=1, id=collocation.json['id']),
                           headers=auth_header)

        assert items.status_code == 200
