from flask import url_for


def test_create_collocation(client, auth):

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
        client.post(url_for('query.execute', id=query.json['id']),
                    auth=('admin', '0000'))

        # constellation
        constellation = client.post(url_for('constellation.create'),
                                    json={
                                        'name': 'CDU',
                                        'description': 'Test Constellation',
                                        'filter_discoursemes': [discourseme.json['id']]
                                    },
                                    auth=('admin', '0000'))

        # collocation
        collocation = client.post(url_for('collocation.create'),
                                  json={
                                      'corpus_id': 1,
                                      'p': 'lemma',
                                      's_break': 's',
                                      'window': 5,
                                      'constellation_id': constellation.json['id']
                                  },
                                  auth=('admin', '0000'))

        collocation = client.get(url_for('collocation.get_collocation', id=collocation.json['id']),
                                 auth=('admin', '0000'))

        assert collocation.status_code == 200


def test_execute_query(client, auth):

    auth.login()
    with client:
        client.get("/")
        collocation = client.post(url_for('collocation.execute', id=1),
                                  auth=('admin', '0000'))

        items = client.get(url_for('collocation.get_collocation_items', id=1),
                           auth=('admin', '0000'))

        assert items.status_code == 200
