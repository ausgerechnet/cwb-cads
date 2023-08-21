from flask import url_for


def test_create_discourseme(client, auth):

    json = {
        'name': 'test discourseme',
        'description': 'this is a test discourseme'
    }

    auth.login()
    with client:
        client.get("/")
        response = client.post(url_for('discourseme.create'),
                               json=json,
                               auth=('admin', '0000'))
        assert response.status_code == 200
