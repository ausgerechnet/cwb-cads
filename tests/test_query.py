from flask import url_for


def test_create_query(client, auth):

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
            'cqp_query': '[word="der"] [lemma="Bundeskanzler"]'
        }
        r = client.post(url_for('query.create'),
                        json=query,
                        auth=('admin', '0000'))

        assert r.status_code == 200


def test_execute_query(client, auth):

    auth.login()
    with client:
        client.get("/")
        response = client.post(url_for('query.execute', id=1),
                               auth=('admin', '0000'))
        assert response.status_code == 200
