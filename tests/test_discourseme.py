from flask import url_for
import pytest


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
                                      'template': [
                                          {'surface': 'können', 'p': 'lemma'},
                                          {'surface': 'müssen', 'p': 'lemma'}
                                      ],
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


def test_discourseme_query_template(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")
        discoursemes = client.get(url_for('discourseme.get_discoursemes'), headers=auth_header).json
        union = discoursemes[0]
        query = client.get(url_for('discourseme.get_query', id=union['id'], corpus_id=1),
                           content_type='application/json',
                           headers=auth_header)


def test_discourseme_patch(client, auth):

    auth_header = auth.login()

    with client:
        client.get("/")

        discoursemes = client.get(url_for('discourseme.get_discoursemes'), headers=auth_header).json
        union = discoursemes[0]
        assert union['name'] == 'CDU/CSU'
        assert union['description'] is None
        union = client.patch(url_for('discourseme.patch', id=union['id']),
                             json={
                                 'name': 'Union for the winz',
                                 'description': 'My first description'
                             },
                             content_type='application/json',
                             headers=auth_header).json

        assert union['name'] == 'Union for the winz'
        assert union['description'] == 'My first description'

        # patch items
        union = client.patch(url_for('discourseme.patch', id=union['id']),
                             json={
                                 'template': [
                                     {'surface': 'CDU', 'p': 'lemma'}
                                 ],
                             },
                             content_type='application/json',
                             headers=auth_header).json

        assert len(union['template'])
        assert 'CDU' in [item['surface'] for item in union['template']]


def test_discourseme_patch_add_remove(client, auth):

    auth_header = auth.login()

    with client:
        client.get("/")

        discoursemes = client.get(url_for('discourseme.get_discoursemes'), headers=auth_header).json
        union = discoursemes[0]

        assert 'können' not in [item['surface'] for item in union['template']]

        union = client.patch(url_for('discourseme.patch_add', id=union['id']),
                             json={
                                 'surface': 'können',
                                 'p': 'lemma'
                             },
                             content_type='application/json',
                             headers=auth_header).json

        assert 'können' in [item['surface'] for item in union['template']]

        union = client.patch(url_for('discourseme.patch_remove', id=union['id']),
                             json={
                                 'surface': 'können',
                                 'p': 'lemma'
                             },
                             content_type='application/json',
                             headers=auth_header).json

        assert 'können' not in [item['surface'] for item in union['template']]
