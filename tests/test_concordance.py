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
        query = client.post(url_for('query.execute', id=query.json['id']),
                            auth=('admin', '0000'))

        lines = client.get(url_for('concordance.get_concordance_lines'),
                           json={
                               'query_id': discourseme.json['id'],
                               'p': ['word', 'lemma'],
                               's_break': 's',
                               'context': 20,
                               'order': 'random'
                           },
                           auth=('admin', '0000'))

        assert lines.status_code == 200
