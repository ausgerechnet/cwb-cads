#!/usr/bin/python3
# -*- coding: utf-8 -*-

import pytest

from cads import create_app
from cads.corpus import meta_from_within_xml, read_corpora, subcorpora_from_tsv
from cads.database import init_db
from cads.mmda.discourseme import import_discoursemes
from cads.library import import_library

app = create_app('cfg.TestConfig')

# create new database
with app.app_context():

    init_db()

    read_corpora()

    import_discoursemes("tests/discoursemes/germaparl-actors.tsv")

    meta_from_within_xml("GERMAPARL1386")

    subcorpora_from_tsv("GERMAPARL1386", "tests/corpora/germaparl-subcorpora.tsv")

    import_library("tests/library/", corpus_id=1, username='admin')


class AuthActions:

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
