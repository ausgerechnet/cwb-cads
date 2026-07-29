#!/usr/bin/python3
# -*- coding: utf-8 -*-

import pytest

from pandas import DataFrame

from cads import create_app
from cads.corpus import meta_from_within_xml, read_corpora, subcorpora_from_tsv
from cads.database import init_db
from cads.mmda.discourseme import import_discoursemes
from cads.library import import_library


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


@pytest.fixture(scope="session")
def request_times():
    return []


@pytest.fixture(scope="session")
def app(request_times):
    app = create_app()

    with app.app_context():

        # create new database
        init_db()
        # corpora
        read_corpora()
        # corpus meta data
        meta_from_within_xml("GERMAPARL1386")
        meta_from_within_xml("TAGESSCHAU-MINI", "article")
        # subcorpora
        subcorpora_from_tsv("GERMAPARL1386", "tests/corpora/germaparl-subcorpora.tsv")
        # discoursemes
        import_discoursemes("tests/discoursemes/germaparl-actors.tsv", language="de", register="standard")
        # library
        import_library("tests/library/", corpus_id=1, username='admin')
        # TODO: this creates faulty CQPY files in instance folder

    app.config["REQUEST_TIMES"] = request_times

    return app


@pytest.fixture
def client(app):
    """A test client for the app."""

    return app.test_client()


@pytest.fixture
def auth(client):

    return AuthActions(client)


@pytest.fixture(scope="session", autouse=True)
def print_request_summary(request_times):
    yield

    df = DataFrame(request_times)

    if not df.empty:
        print("\nRequest timing summary:")
        print(
            df.sort_values("seconds", ascending=False)
        )
        path_out = "execution-times.tsv"
        df.to_csv(path_out, sep="\t")
        print(f"\nResults saved to {path_out}")
