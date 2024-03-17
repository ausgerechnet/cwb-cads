from flask import url_for


def test_get_discoursemes(client, auth):

    auth_header = auth.login()

    with client:
        client.get("/")
        discoursemes = client.get(url_for('discourseme.get_discoursemes'),
                                  content_type='application/json',
                                  headers=auth_header)
        assert discoursemes.status_code == 200


def test_create_get_discourseme(client, auth):

    auth_header = auth.login()

    with client:
        client.get("/")
        discourseme = client.post(url_for('discourseme.create'),
                                  json={
                                      'name': 'many',
                                      'description': 'this is a test discourseme with many hits',
                                      'items': ['können', 'müssen'],
                                  },
                                  content_type='application/json',
                                  headers=auth_header)
        assert discourseme.status_code == 200

        discourseme = client.get(url_for('discourseme.get_discourseme', id=discourseme.json['id']),
                                 headers=auth_header)
        assert discourseme.status_code == 200

        discoursemes = client.get(url_for('discourseme.get_discoursemes'),
                                  headers=auth_header)
        assert discoursemes.status_code == 200


def test_discourseme_query(client, auth):

    auth_header = auth.login()

    with client:
        client.get("/")

        discoursemes = client.get(url_for('discourseme.get_discoursemes'), headers=auth_header).json
        union = discoursemes[0]

        query = client.get(url_for('discourseme.get_query', id=union['id'], corpus_id=1),
                           content_type='application/json',
                           headers=auth_header)

        assert query.status_code == 200


# def test_discourseme_concordance(client, auth):

#     auth_header = auth.login()
#     with client:
#         client.get("/")

#         discoursemes = client.get(url_for('discourseme.get_discoursemes'), headers=auth_header).json
#         union = discoursemes[0]

#         lines = client.get(url_for('discourseme.concordance_lines', id=union['id'], corpus_id=1),
#                            follow_redirects=True,
#                            headers=auth_header)

#         assert lines.status_code == 200
