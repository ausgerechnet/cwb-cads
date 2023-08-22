from flask import url_for


def test_create_get_constellation(client, auth):

    auth.login()
    with client:
        client.get("/")

        # discourseme
        discourseme = client.post(url_for('discourseme.create'),
                                  json={
                                      'name': 'CDU',
                                      'description': 'Test Discourseme'
                                  },
                                  auth=('admin', '0000'))

        # constellation
        constellation = client.post(url_for('constellation.create'),
                                    json={
                                        'name': 'CDU',
                                        'description': 'Test Constellation',
                                        'filter_discourseme_ids': [discourseme.json['id']]
                                    },
                                    auth=('admin', '0000'))

        constellation = client.get(url_for('constellation.get_constellation', id=constellation.json['id']),
                                   auth=('admin', '0000'))

        constellations = client.get(url_for('constellation.get_constellations'),
                                    auth=('admin', '0000'))

        assert constellations.status_code == 200
