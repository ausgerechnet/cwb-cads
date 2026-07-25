from flask import url_for
import pytest


def test_create_get_constellation(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  content_type='application/json',
                                  headers=auth_header).json
        discourseme = discoursemes[0]

        # constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'CDU',
                                        'comment': 'Test Constellation 1',
                                        'discourseme_ids': [discourseme['id']]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        constellation = client.get(url_for('mmda.constellation.get_constellation', constellation_id=constellation.json['id']),
                                   headers=auth_header)
        assert constellation.status_code == 200

        constellations = client.get(url_for('mmda.constellation.get_all_constellations'),
                                    headers=auth_header)

        assert constellations.status_code == 200


def test_patch_constellation(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  content_type='application/json',
                                  headers=auth_header).json
        discourseme = discoursemes[0]

        # constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'CDU',
                                        'comment': 'Test Constellation 1',
                                        'discourseme_ids': [discourseme['id']]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200
        assert constellation.json['name'] == 'CDU'
        assert constellation.json['comment'] == 'Test Constellation 1'
        assert len(constellation.json['discoursemes']) == 1

        constellation = client.patch(url_for('mmda.constellation.patch_constellation', constellation_id=constellation.json['id']),
                                     json={
                                         'comment': 'updated comment'
                                     },
                                     headers=auth_header)
        assert constellation.status_code == 200
        assert constellation.json['name'] == 'CDU'
        assert constellation.json['comment'] == 'updated comment'
        assert len(constellation.json['discoursemes']) == 1

        constellations = client.get(url_for('mmda.constellation.get_all_constellations'),
                                    headers=auth_header)

        assert constellations.status_code == 200


def test_patch_constellation_add_discoursemes(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  content_type='application/json',
                                  headers=auth_header).json

        # constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'CDU',
                                        'comment': 'Test Constellation 1',
                                        'discourseme_ids': [discoursemes[0]['id']]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200
        assert constellation.json['name'] == 'CDU'
        assert len(constellation.json['discoursemes']) == 1

        constellation = client.patch(url_for('mmda.constellation.patch_constellation_add', constellation_id=constellation.json['id']),
                                     json={
                                         'discourseme_ids': [discourseme['id'] for discourseme in discoursemes[1:3]]
                                     },
                                     headers=auth_header)
        assert constellation.status_code == 200
        assert constellation.json['name'] == 'CDU'
        assert len(constellation.json['discoursemes']) == 3

        constellation = client.patch(url_for('mmda.constellation.patch_constellation_add', constellation_id=constellation.json['id']),
                                     json={
                                         'discourseme_ids': [discourseme['id'] for discourseme in discoursemes[0:2]]
                                     },
                                     headers=auth_header)
        assert constellation.status_code == 200
        assert constellation.json['name'] == 'CDU'
        assert len(constellation.json['discoursemes']) == 3


@pytest.mark.now
def test_patch_constellation_remove_discoursemes(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  content_type='application/json',
                                  headers=auth_header).json

        # constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'CDU',
                                        'comment': 'Test Constellation 1',
                                        'discourseme_ids': [discourseme['id'] for discourseme in discoursemes[0:3]]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200
        assert constellation.json['name'] == 'CDU'
        assert len(constellation.json['discoursemes']) == 3

        constellation = client.patch(url_for('mmda.constellation.patch_constellation_remove', constellation_id=constellation.json['id']),
                                     json={
                                         'discourseme_ids': [discoursemes[0]['id']]
                                     },
                                     headers=auth_header)
        assert constellation.status_code == 200
        assert constellation.json['name'] == 'CDU'
        assert len(constellation.json['discoursemes']) == 2

        constellation = client.patch(url_for('mmda.constellation.patch_constellation_remove', constellation_id=constellation.json['id']),
                                     json={
                                         'discourseme_ids': [discoursemes[0]['id']]
                                     },
                                     headers=auth_header)
        assert constellation.status_code == 200
        assert constellation.json['name'] == 'CDU'
        assert len(constellation.json['discoursemes']) == 2
