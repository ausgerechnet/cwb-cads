from flask import url_for
from pprint import pprint


def test_get_keyword(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        keyword = client.post(url_for('keyword.get_keyword'),
                              json={
                                  'corpus_id': 1,
                                  'corpus_id_reference': 1,
                                  'p': 'lemma',
                                  'p_reference': 'word'
                              },
                              headers=auth_header)

        pprint(keyword.json)

        keyword = client.post(url_for('keyword.get_keyword'),
                              json={
                                  'corpus_id': 1,
                                  'corpus_id_reference': 1,
                                  'subcorpus_id_reference': 1,
                                  'p': 'lemma',
                                  'p_reference': 'lemma'
                              },
                              headers=auth_header)

        pprint(keyword.json)


def test_get_all_keyword(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        keywords = client.get(url_for('keyword.get_all_keyword'),
                              headers=auth_header)

        pprint(keywords.json)
