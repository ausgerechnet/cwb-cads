from flask import url_for


def test_create_get_concordance(client, auth):

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

        # query
        query = client.post(url_for('query.create'),
                            json={
                                'discourseme_id': discourseme.json['id'],
                                'corpus_id': 1,
                                'cqp_query': '[lemma="Bundeskanzler"]'
                            },
                            headers=auth_header)

        # concordance
        lines = client.get(url_for('query.concordance.lines', query_id=query.json['id']),
                           headers=auth_header)

        assert lines.status_code == 200
