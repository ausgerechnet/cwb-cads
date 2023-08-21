from flask import url_for


def test_create_breakdown(client, auth):

    auth.login()
    with client:
        client.get("/")

        # discourseme
        discourseme = {
            'name': 'CDU',
            'description': 'Test Query'
        }
        r = client.post(url_for('discourseme.create'),
                        json=discourseme,
                        auth=('admin', '0000'))

        # query
        query = {
            'discourseme_id': r.json['id'],
            'corpus_id': 1,
            'cqp_query': '[word="die"]? [lemma="CDU"]'
        }
        r = client.post(url_for('query.create'),
                        json=query,
                        auth=('admin', '0000'))

        # create matches
        r = client.post(url_for('query.execute', id=r.json['id']),
                        auth=('admin', '0000'))

        # breakdown
        breakdown = {
            'query_id': r.json['id'],
            'p': 'lemma'
        }

        r = client.post(url_for('breakdown.create'),
                        json=breakdown,
                        auth=('admin', '0000'))

        assert r.status_code == 200


def test_execute_breakdown(client, auth):

    auth.login()
    with client:
        client.get("/")

        response = client.get(url_for('breakdown.get_breakdown', id=1),
                              auth=('admin', '0000'))

        response = client.post(url_for('breakdown.execute', id=1),
                               json={'p': 'lemma'},
                               auth=('admin', '0000'))
        assert response.status_code == 200
