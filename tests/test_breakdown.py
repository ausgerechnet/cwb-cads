from flask import url_for


def test_create_get_breakdown(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # query
        query = client.post(url_for('query.create'),
                            json={
                                'corpus_id': 1,
                                'cqp_query': '[word="die"]? [lemma="CDU"]',
                                's': 's'
                            },
                            headers=auth_header)

        # breakdown
        breakdown = client.post(url_for('breakdown.create', query_id=query.json['id']),
                                json={
                                    'p': 'lemma'
                                },
                                headers=auth_header)

        assert breakdown.status_code == 200

        breakdowns = client.get(url_for('breakdown.get_breakdowns', query_id=1),
                                headers=auth_header)

        response = client.get(url_for('breakdown.get_breakdown', query_id=breakdowns.json[0]['query_id'], id=breakdowns.json[0]['id']),
                              headers=auth_header)

        response = client.post(url_for('breakdown.execute', query_id=1, id=1),
                               json={'p': 'lemma'},
                               headers=auth_header)
        assert response.status_code == 200
