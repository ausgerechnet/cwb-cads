from flask import url_for


def test_create_breakdown(client, auth):

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
                                'cqp_query': '[word="die"]? [lemma="CDU"]'
                            },
                            auth=('admin', '0000'))

        # create matches
        query = client.post(url_for('query.execute', id=query.json['id']),
                            auth=('admin', '0000'))

        # breakdown
        breakdown = client.post(url_for('query.breakdown.create', query_id=query.json['id']),
                                json={
                                    'p': 'lemma'
                                },
                                auth=('admin', '0000'))

        assert breakdown.status_code == 200


def test_execute_breakdown(client, auth):

    auth.login()
    with client:
        client.get("/")

        breakdowns = client.get(url_for('query.breakdown.get_breakdowns', query_id=1),
                                auth=('admin', '0000'))

        response = client.get(url_for('query.breakdown.get_breakdown', query_id=breakdowns.json[0]['query_id'], id=breakdowns.json[0]['id']),
                              auth=('admin', '0000'))

        response = client.post(url_for('query.breakdown.execute', query_id=1, id=1),
                               json={'p': 'lemma'},
                               auth=('admin', '0000'))
        assert response.status_code == 200
