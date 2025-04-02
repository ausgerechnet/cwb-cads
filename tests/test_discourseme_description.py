from flask import url_for
import pytest


def test_discourseme_create_description(client, auth):

    auth_header = auth.login()

    with client:
        client.get("/")

        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'), headers=auth_header).json
        union = discoursemes[0]
        description = client.post(url_for('mmda.discourseme.description.create_description', discourseme_id=union['id']),
                                  json={'corpus_id': 1},
                                  content_type='application/json',
                                  headers=auth_header)

        assert description.status_code == 200
        assert len(description.json['items']) == 6


def test_discourseme_get_breakdown(client, auth):

    auth_header = auth.login()

    with client:
        client.get("/")

        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'), headers=auth_header).json
        union = discoursemes[0]
        description = client.post(url_for('mmda.discourseme.description.create_description', discourseme_id=union['id']),
                                  json={'corpus_id': 1},
                                  content_type='application/json',
                                  headers=auth_header)

        assert description.status_code == 200
        assert len(description.json['items']) == 6

        breakdown = client.get(url_for('mmda.discourseme.description.description_get_breakdown',
                                       discourseme_id=union['id'], description_id=description.json['id'], p='lemma'),
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


# @pytest.mark.now
def test_discourseme_patch_add_remove(client, auth):

    auth_header = auth.login()

    with client:
        client.get("/")

        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'), headers=auth_header).json
        union = discoursemes[0]
        description = client.post(url_for('mmda.discourseme.description.create_description', discourseme_id=union['id']),
                                  content_type='application/json',
                                  json={'corpus_id': 1},
                                  headers=auth_header)
        assert description.status_code == 200
        assert 'können' not in [item['surface'] for item in description.json['items']]

        description = client.patch(url_for('mmda.discourseme.description.description_patch_add', discourseme_id=union['id'],
                                           description_id=description.json['id']),
                                   json={'items': ['können'], 'p': 'lemma'},
                                   content_type='application/json',
                                   headers=auth_header)
        assert description.status_code == 200
        assert 'können' in [item['surface'] for item in description.json['items']]

        description = client.patch(url_for('mmda.discourseme.description.description_patch_remove', discourseme_id=union['id'],
                                           description_id=description.json['id']),
                                   json={'items': ['können'], 'p': 'lemma'},
                                   content_type='application/json',
                                   headers=auth_header)
        assert description.status_code == 200
        assert 'können' not in [item['surface'] for item in description.json['items']]


# @pytest.mark.now
def test_get_similar(client, auth):

    auth_header = auth.login()

    with client:
        client.get("/")
        discourseme = client.post(url_for('mmda.discourseme.create_discourseme'),
                                  json={
                                      'name': 'Verben',
                                      'comment': 'Testdiskursem',
                                      'template': [
                                          {'surface': 'gehen', 'p': 'lemma'},
                                          {'surface': 'laufen', 'p': 'lemma'}
                                      ],
                                  },
                                  content_type='application/json',
                                  headers=auth_header)
        assert discourseme.status_code == 200

        description = client.post(url_for('mmda.discourseme.description.create_description', discourseme_id=discourseme.json['id']),
                                  content_type='application/json',
                                  json={'corpus_id': 1},
                                  headers=auth_header)
        assert description.status_code == 200

        breakdown = client.get(url_for('mmda.discourseme.description.description_get_breakdown',
                                       discourseme_id=discourseme.json['id'], description_id=description.json['id'], p='lemma'),
                               content_type='application/json',
                               headers=auth_header)
        assert breakdown.status_code == 200

        similar = client.get(url_for('mmda.discourseme.description.description_get_similar',
                                     discourseme_id=discourseme.json['id'], description_id=description.json['id'], breakdown_id=breakdown.json['id']),
                             content_type='application/json',
                             headers=auth_header)

        assert similar.status_code == 200
        assert len(similar.json) == 200
        assert similar.json[0]['surface'] == 'gehen'

        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'), headers=auth_header)
        discourseme = discoursemes.json[2]
        description = client.post(url_for('mmda.discourseme.description.create_description', discourseme_id=discourseme['id']),
                                  content_type='application/json',
                                  json={'corpus_id': 1},
                                  headers=auth_header)
        assert description.status_code == 200

        breakdown = client.get(url_for('mmda.discourseme.description.description_get_breakdown',
                                       discourseme_id=discourseme['id'], description_id=description.json['id'], p='lemma'),
                               content_type='application/json',
                               headers=auth_header)
        assert breakdown.status_code == 200

        similar = client.get(url_for('mmda.discourseme.description.description_get_similar',
                                     discourseme_id=discourseme['id'], description_id=description.json['id'], breakdown_id=breakdown.json['id']),
                             content_type='application/json',
                             headers=auth_header)

        assert similar.status_code == 200
        assert len(similar.json) == 200
        assert similar.json[1]['surface'] == "Bundesland"


def test_deletion(client, auth):

    auth_header = auth.login()

    with client:
        client.get("/")
        discourseme = client.post(url_for('mmda.discourseme.create_discourseme'),
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

        discourseme = client.get(url_for('mmda.discourseme.get_discourseme', discourseme_id=discourseme.json['id']),
                                 headers=auth_header)
        assert discourseme.status_code == 200

        description = client.post(url_for('mmda.discourseme.description.create_description', discourseme_id=discourseme.json['id']),
                                  content_type='application/json',
                                  json={'corpus_id': 1},
                                  headers=auth_header)
        assert description.status_code == 200

        client.delete(url_for('mmda.discourseme.delete_discourseme', discourseme_id=discourseme.json['id']),
                      headers=auth_header)


@pytest.mark.now
def test_discourseme_get_meta(client, auth):

    auth_header = auth.login()

    with client:
        client.get("/")

        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'), headers=auth_header).json
        union = discoursemes[0]
        description = client.post(url_for('mmda.discourseme.description.create_description', discourseme_id=union['id']),
                                  json={'corpus_id': 1},
                                  content_type='application/json',
                                  headers=auth_header)
        assert description.status_code == 200
        assert len(description.json['items']) == 6

        meta = client.get(url_for('mmda.discourseme.description.description_get_meta',
                                  discourseme_id=union['id'], description_id=description.json['id'],
                                  p='lemma', level='text', key='parliamentary_group'),
                          content_type='application/json',
                          headers=auth_header)
        assert meta.status_code == 200
        assert meta.json['frequencies'][0]['nr_matches'] == 116
