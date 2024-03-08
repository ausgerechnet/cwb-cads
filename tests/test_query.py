from flask import url_for


def test_create_query(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # query
        query = client.post(url_for('query.create'),
                            json={
                                'corpus_id': 1,
                                'cqp_query': '[word="der"] [lemma="Bundeskanzler"]',
                                's': 's'
                            },
                            headers=auth_header)

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


def test_query_concordance(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        discoursemes = client.get(url_for('discourseme.get_discoursemes'), headers=auth_header).json
        union = discoursemes[0]

        # create query matches for union
        union_query = client.get(url_for('discourseme.query', id=union['id'], corpus_id=1),
                                 content_type='application/json',
                                 headers=auth_header)

        assert union_query.status_code == 200

        lines = client.get(url_for('query.concordance_lines', query_id=union_query.json['id'], page_size=10, page_number=5),
                           headers=auth_header)
        assert lines.status_code == 200

        line = client.get(url_for('query.concordance_line', match_id=lines.json['lines'][0]['id'], query_id=union_query.json['id'],
                                  window=50),
                          headers=auth_header)
        assert line.status_code == 200


def test_query_concordance_filter(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        discoursemes = client.get(url_for('discourseme.get_discoursemes'), headers=auth_header).json
        union = discoursemes[0]

        # create query matches for union
        union_query = client.get(url_for('discourseme.query', id=union['id'], corpus_id=1),
                                 content_type='application/json',
                                 headers=auth_header)

        assert union_query.status_code == 200

        lines = client.get(url_for('query.concordance_lines', query_id=union_query.json['id'], page_size=10, page_number=5, filter_item='SPD'),
                           headers=auth_header)

        assert lines.status_code == 200

        from pprint import pprint
        pprint(lines.json)
