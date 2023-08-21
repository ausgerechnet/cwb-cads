from flask import url_for


def test_create_discourseme(client, auth):

    auth.login()
    with client:
        client.get("/")
        discourseme = client.post(url_for('discourseme.create'),
                                  json={
                                      'name': 'test discourseme',
                                      'description': 'this is a test discourseme'
                                  },
                                  auth=('admin', '0000'))

        assert discourseme.status_code == 200

        discourseme = client.get(url_for('discourseme.get_discourseme', id=discourseme.json['id']),
                                 auth=('admin', '0000'))

        discoursemes = client.get(url_for('discourseme.get_discoursemes'),
                                  auth=('admin', '0000'))

        assert discoursemes.status_code == 200
