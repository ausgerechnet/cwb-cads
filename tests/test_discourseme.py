from flask import url_for
import pytest


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
        discourseme = client.post(url_for('mmda.discourseme.create_discourseme'),
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

        discourseme = client.get(url_for('mmda.discourseme.get_discourseme', discourseme_id=discourseme.json['id']),
                                 headers=auth_header)
        assert discourseme.status_code == 200

        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  headers=auth_header)
        assert discoursemes.status_code == 200


def test_discourseme_patch(client, auth):

    auth_header = auth.login()

    with client:
        client.get("/")

        discourseme = client.post(url_for('mmda.discourseme.create_discourseme'),
                                  json={
                                      'name': 'Testpatch',
                                      'template': [
                                          {'surface': 'ja', 'p': 'lemma'},
                                      ],
                                  },
                                  content_type='application/json',
                                  headers=auth_header)
        assert discourseme.status_code == 200

        discourseme = client.get(url_for('mmda.discourseme.get_discourseme', discourseme_id=discourseme.json['id']),
                                 headers=auth_header)
        assert discourseme.status_code == 200

        assert discourseme.json['name'] == 'Testpatch'
        assert discourseme.json['comment'] is None
        discourseme = client.patch(url_for('mmda.discourseme.patch_discourseme', discourseme_id=discourseme.json['id']),
                                   json={
                                       'name': 'Patch for the winz',
                                       'comment': 'My first comment'
                                   },
                                   content_type='application/json',
                                   headers=auth_header).json

        assert discourseme['name'] == 'Patch for the winz'
        assert discourseme['comment'] == 'My first comment'

        # patch template
        discourseme = client.patch(url_for('mmda.discourseme.patch_discourseme', discourseme_id=discourseme['id']),
                                   json={
                                       'template': [
                                           {'surface': 'nein', 'p': 'lemma'}
                                       ],
                                   },
                                   content_type='application/json',
                                   headers=auth_header).json

        assert len(discourseme['template']) == 1
        assert 'nein' in [item['surface'] for item in discourseme['template']]
