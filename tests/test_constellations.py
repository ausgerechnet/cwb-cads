from flask import url_for


def test_create_get_constellation(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # discourseme
        discourseme = client.post(url_for('discourseme.create'),
                                  json={
                                      'name': 'CDU',
                                      'description': 'Test Discourseme'
                                  },
                                  headers=auth_header)

        # constellation
        constellation = client.post(url_for('constellation.create'),
                                    json={
                                        'name': 'CDU',
                                        'description': 'Test Constellation',
                                        'filter_discourseme_ids': [discourseme.json['id']]
                                    },
                                    headers=auth_header)

        constellation = client.get(url_for('constellation.get_constellation', id=constellation.json['id']),
                                   headers=auth_header)

        constellations = client.get(url_for('constellation.get_constellations'),
                                    headers=auth_header)

        assert constellations.status_code == 200
