#!/usr/bin/python3
# -*- coding: utf-8 -*-

import pytest

from cads import create_app
from cads import db
from cads.database import init_db
from cads.corpus import read_corpora
from cads.database import Discourseme
from cads.discourseme import read_tsv

app = create_app('cfg.TestConfig')

# create new database
with app.app_context():

    init_db()

    read_corpora()

    # TODO exclude the ones that are already in database?
    discoursemes = read_tsv("tests/discoursemes/germaparl.tsv")
    for name, query_list in discoursemes.items():
        db.session.add(Discourseme(user_id=1, name=name, items="\t".join(sorted(query_list))))
    db.session.commit()


class AuthActions(object):

    def __init__(self, client):
        self._client = client

    def login(self, username="admin", password="0000"):
        token = self._client.post(
            "/user/login",
            data={"username": username, "password": password},
            content_type='application/x-www-form-urlencoded'
        ).json['access_token']
        return {"Authorization": f"Bearer {token}"}

    def logout(self):
        return self._client.get("/auth/logout")


@pytest.fixture
def client():
    """A test client for the app."""

    return app.test_client()


@pytest.fixture
def auth(client):

    return AuthActions(client)
