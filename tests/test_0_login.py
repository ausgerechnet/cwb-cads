from flask import url_for


def test_login(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        users = client.get(url_for('user.get_users'),
                           content_type='application/json',
                           headers=auth_header)
        assert users.status_code == 200
        user = users.json[0]

        assert user['username'] == 'admin'
