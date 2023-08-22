from flask import url_for


def test_create_semmap(client, auth):

    auth.login()
    with client:
        client.get("/")

        # discourseme
        discourseme = client.post(url_for('discourseme.create'),
                                  json={
                                      'name': 'CDU',
                                      'description': 'Test Query'
                                  },
                                  auth=('admin', '0000'))

        # query
        query = client.post(url_for('query.create'),
                            json={
                                'discourseme_id': discourseme.json['id'],
                                'corpus_id': 1,
                                'cqp_query': '[lemma="Bundeskanzler"]'
                            },
                            auth=('admin', '0000'))

        # execute
        query = client.post(url_for('query.execute', id=query.json['id']),
                            auth=('admin', '0000'))

        # collocation
        collocation = client.post(url_for('query.collocation.create', query_id=query.json['id']),
                                  json={
                                      'p': 'lemma',
                                      's_break': 's',
                                      'context': 5,
                                  },
                                  auth=('admin', '0000'))

        collocation = client.get(url_for('query.collocation.get_collocation', query_id=query.json['id'], id=collocation.json['id']),
                                 auth=('admin', '0000'))

        collocation = client.post(url_for('query.collocation.execute', query_id=query.json['id'], id=collocation.json['id']),
                                  auth=('admin', '0000'))

        assert collocation.status_code == 200

        # semmap
        semantic_map = client.post(url_for('query.collocation.semantic_map.create', query_id=query.json['id'], collocation_id=collocation.json['id']),
                                   auth=('admin', '0000'))

        assert semantic_map.status_code == 200


def test_execute_collocation(client, auth):

    auth.login()
    with client:
        client.get("/")
        client.post(url_for('query.collocation.semantic_map.execute', query_id=1, collocation_id=1, id=1),
                    auth=('admin', '0000'))

        items = client.get(url_for('query.collocation.semantic_map.get_coordinates', query_id=1, collocation_id=1, id=1),
                           auth=('admin', '0000'))

        assert items.status_code == 200
