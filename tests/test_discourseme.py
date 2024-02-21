from flask import url_for


def test_create_get_discourseme(client, auth):

    auth_header = auth.login()

    with client:
        client.get("/")
        discourseme = client.post(url_for('discourseme.create'),
                                  json={
                                      'name': 'test discourseme',
                                      'description': 'this is a test discourseme'
                                  },
                                  content_type='application/json',
                                  headers=auth_header)

        assert discourseme.status_code == 200

        discourseme = client.get(url_for('discourseme.get_discourseme', id=discourseme.json['id']),
                                 headers=auth_header)

        discoursemes = client.get(url_for('discourseme.get_discoursemes'),
                                  headers=auth_header)

        assert discoursemes.status_code == 200
