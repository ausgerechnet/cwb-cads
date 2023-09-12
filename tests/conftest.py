#!/usr/bin/python3
# -*- coding: utf-8 -*-

import pytest

from cads import create_app
from cads.database import init_db
from cads.discourseme import import_discoursemes

app = create_app('cfg.TestConfig')

# create new database
with app.app_context():
    init_db()
    import_discoursemes("tests/discoursemes/germaparl.tsv")


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
