from flask import url_for
from pprint import pprint
import pytest


@pytest.mark.now
def test_concordance_constellation(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        constellations = client.get(url_for('constellation.get_constellations'), headers=auth_header).json
        print(constellations)
