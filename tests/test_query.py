from flask import url_for


def test_create_query(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")
        # discourseme
        discourseme = client.post(url_for('discourseme.create'),
                                  json={
                                      'name': 'CDU',
                                      'description': 'Test Query'
                                  },
                                  headers=auth_header)

        assert discourseme.status_code == 200

        # query
        query = client.post(url_for('query.create'),
                            json={
                                'discourseme_id': discourseme.json['id'],
                                'corpus_id': 1,
                                'cqp_query': '[word="der"] [lemma="Bundeskanzler"]'
                            },
                            headers=auth_header)
        print(query.json)
        assert query.status_code == 200

        queries = client.get(url_for('query.get_queries'),
                             headers=auth_header)

        query = client.get(url_for('query.get_query', id=queries.json[0]['id']),
                           headers=auth_header)

        assert query.status_code == 200


def test_execute_query(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")
        response = client.post(url_for('query.execute', id=1),
                               headers=auth_header)
        assert response.status_code == 200
