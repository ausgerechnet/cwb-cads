from flask import url_for


def test_create_collocation(client, auth):

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
                                        'filter_discoursemes': [discourseme.json['id']]
                                    },
                                    auth=('admin', '0000'))

        assert constellation.status_code == 200
