from flask import url_for
# from pprint import pprint


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
                                'cqp_query': '[lemma="Bundeskanzler"]',
                                's': 's'
                            },
                            headers=auth_header)

        lines = client.get(url_for('query.concordance.lines', query_id=query.json['id'], s_show=['text_parliamentary_group'], page_size=10, page_number=6),
                           headers=auth_header)
        assert lines.status_code == 200

        # pprint(lines.json[0])
        # print(len(lines.json))

        line = client.get(url_for('query.concordance.context', id=65059, query_id=query.json['id'], s_show=['text_parliamentary_group'], window=50),
                          headers=auth_header)
        assert line.status_code == 200
