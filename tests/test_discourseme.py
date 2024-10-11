import pytest
from flask import url_for


def test_get_discoursemes(client, auth):

    auth_header = auth.login()

    with client:
        client.get("/")
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  content_type='application/json',
                                  headers=auth_header)
        assert discoursemes.status_code == 200


def test_create_get_discourseme(client, auth):

    auth_header = auth.login()

    with client:
        client.get("/")
        discourseme = client.post(url_for('mmda.discourseme.create'),
                                  json={
                                      'name': 'Modalverben',
                                      'comment': 'Testdiskursem mit vielen Treffern',
                                      'template': [
                                          {'surface': 'können', 'p': 'lemma'},
                                          {'surface': 'müssen', 'p': 'lemma'}
                                      ],
                                  },
                                  content_type='application/json',
                                  headers=auth_header)
        assert discourseme.status_code == 200

        discourseme = client.get(url_for('mmda.discourseme.get_discourseme', id=discourseme.json['id']),
                                 headers=auth_header)
        assert discourseme.status_code == 200

        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  headers=auth_header)
        assert discoursemes.status_code == 200


def test_discourseme_create_description(client, auth):

    auth_header = auth.login()

    with client:
        client.get("/")

        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'), headers=auth_header).json
        union = discoursemes[0]
        description = client.post(url_for('mmda.discourseme.create_description', id=union['id']),
                                  json={'corpus_id': 1},
                                  content_type='application/json',
                                  headers=auth_header)

        assert description.status_code == 200
        assert len(description.json['items']) == 5


def test_discourseme_get_breakdown(client, auth):

    auth_header = auth.login()

    with client:
        client.get("/")

        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'), headers=auth_header).json
        union = discoursemes[0]
        description = client.post(url_for('mmda.discourseme.create_description', id=union['id']),
                                  json={'corpus_id': 1},
                                  content_type='application/json',
                                  headers=auth_header)

        assert description.status_code == 200
        assert len(description.json['items']) == 5

        breakdown = client.get(url_for('mmda.discourseme.description_get_breakdown',
                                       id=union['id'], description_id=description.json['id'], p='lemma'),
                               content_type='application/json',
                               headers=auth_header)

        assert len(breakdown.json['items']) == 6


# def test_discourseme_concordance(client, auth):

#     auth_header = auth.login()
#     with client:
#         client.get("/")

#         discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'), headers=auth_header).json
#         union = discoursemes[0]

#         lines = client.get(url_for('mmda.discourseme.concordance_lines', id=union['id'], corpus_id=1),
#                            follow_redirects=True,
#                            headers=auth_header)

#         assert lines.status_code == 200


def test_discourseme_patch(client, auth):

    auth_header = auth.login()

    with client:
        client.get("/")

        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'), headers=auth_header).json
        union = discoursemes[0]
        assert union['name'] == 'CDU/CSU'
        assert union['comment'] is None
        union = client.patch(url_for('mmda.discourseme.patch', id=union['id']),
                             json={
                                 'name': 'Union for the winz',
                                 'comment': 'My first description'
                             },
                             content_type='application/json',
                             headers=auth_header).json

        assert union['name'] == 'Union for the winz'
        assert union['comment'] == 'My first description'

        # patch template
        union = client.patch(url_for('mmda.discourseme.patch', id=union['id']),
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

        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'), headers=auth_header).json
        union = discoursemes[0]
        description = client.post(url_for('mmda.discourseme.create_description', id=union['id']),
                                  content_type='application/json',
                                  json={'corpus_id': 1},
                                  headers=auth_header)
        assert description.status_code == 200
        assert 'können' not in [item['surface'] for item in description.json['items']]

        description = client.patch(url_for('mmda.discourseme.description_patch_add', id=union['id'], description_id=description.json['id']),
                                   json={'surface': 'können', 'p': 'lemma'},
                                   content_type='application/json',
                                   headers=auth_header)
        assert 'können' in [item['surface'] for item in description.json['items']]

        description = client.patch(url_for('mmda.discourseme.description_patch_remove', id=union['id'], description_id=description.json['id']),
                                   json={'surface': 'können', 'p': 'lemma'},
                                   content_type='application/json',
                                   headers=auth_header)

        assert 'können' not in [item['surface'] for item in description.json['items']]


# @pytest.mark.now
def test_get_similar(client, auth):

    auth_header = auth.login()

    with client:
        client.get("/")
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'), headers=auth_header)
        kanzler = discoursemes.json[2]
        description = client.post(url_for('mmda.discourseme.create_description', id=kanzler['id']),
                                  content_type='application/json',
                                  json={'corpus_id': 1},
                                  headers=auth_header)
        assert description.status_code == 200

        breakdown = client.get(url_for('mmda.discourseme.description_get_breakdown',
                                       id=kanzler['id'], description_id=description.json['id'], p='lemma'),
                               content_type='application/json',
                               headers=auth_header)
        assert breakdown.status_code == 200

        similar = client.get(url_for('mmda.discourseme.description_get_similar',
                                     id=kanzler['id'], description_id=description.json['id'], breakdown_id=breakdown.json['id']),
                             content_type='application/json',
                             headers=auth_header)

        assert similar.status_code == 200
        assert len(similar.json) == 200
        assert similar.json[0]['surface'] == 'Bundesregierung'


# @pytest.mark.now
def test_deletion(client, auth):

    auth_header = auth.login()

    with client:
        client.get("/")
        discourseme = client.post(url_for('mmda.discourseme.create'),
                                  json={
                                      'name': 'Modalverben',
                                      'comment': 'Testdiskursem das gelöscht wird',
                                      'template': [
                                          {'surface': 'können', 'p': 'lemma'}
                                      ],
                                  },
                                  content_type='application/json',
                                  headers=auth_header)
        assert discourseme.status_code == 200

        discourseme = client.get(url_for('mmda.discourseme.get_discourseme', id=discourseme.json['id']),
                                 headers=auth_header)
        assert discourseme.status_code == 200

        description = client.post(url_for('mmda.discourseme.create_description', id=discourseme.json['id']),
                                  content_type='application/json',
                                  json={'corpus_id': 1},
                                  headers=auth_header)
        assert description.status_code == 200

        client.delete(url_for('mmda.discourseme.delete_discourseme', id=discourseme.json['id']),
                      headers=auth_header)
