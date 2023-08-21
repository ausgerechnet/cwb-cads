# import os

import pytest

from mmda import create_app
from mmda.database import init_db


# here = os.path.dirname(os.path.realpath(__file__))
app = create_app('cfg.TestConfig')


# create new database
with app.app_context():
    init_db()


class AuthActions(object):

    def __init__(self, client):
        self._client = client

    def login(self, username="admin", password="0000"):
        return self._client.post(
            "/user/login",
            data={"username": username, "password": password},
            content_type='application/x-www-form-urlencoded'
        )

    def logout(self):
        return self._client.get("/auth/logout")


@pytest.fixture
def client():
    """A test client for the app."""

    return app.test_client()


@pytest.fixture
def auth(client):

    return AuthActions(client)
