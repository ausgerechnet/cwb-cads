from flask import url_for
import pytest


def test_get_keyword(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        keyword = client.post(url_for('keyword.create_keyword'),
                              json={
                                  'corpus_id': 1,
                                  'corpus_id_reference': 1,
                                  'p': 'lemma',
                                  'p_reference': 'word'
                              },
                              headers=auth_header)

        assert keyword.status_code == 200

        keyword = client.post(url_for('keyword.create_keyword'),
                              json={
                                  'corpus_id': 1,
                                  'corpus_id_reference': 1,
                                  'subcorpus_id_reference': 1,
                                  'p': 'lemma',
                                  'p_reference': 'lemma'
                              },
                              headers=auth_header)

        assert keyword.status_code == 200

        keyword_items = client.get(url_for('keyword.get_keyword_items', id=keyword.json['id']),
                                   headers=auth_header)

        assert keyword_items.status_code == 200
        assert len(keyword_items.json['items']) == 10


def test_get_all_keyword(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        keywords = client.get(url_for('keyword.get_all_keyword'),
                              headers=auth_header)

        assert keywords.status_code == 200


def test_delete_keyword(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        keyword = client.post(url_for('keyword.create_keyword'),
                              json={
                                  'corpus_id': 1,
                                  'corpus_id_reference': 1,
                                  'p': 'lemma',
                                  'p_reference': 'word'
                              },
                              headers=auth_header)

        assert keyword.status_code == 200

        keywords = client.delete(url_for('keyword.delete_keyword', id=keyword.json['id']),
                                 headers=auth_header)

        assert keywords.status_code == 200


def test_keyword_semantic_map(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        keyword = client.post(url_for('keyword.create_keyword'),
                              json={
                                  'corpus_id': 1,
                                  'corpus_id_reference': 1,
                                  'p': 'lemma',
                                  'p_reference': 'word'
                              },
                              headers=auth_header)

        assert keyword.status_code == 200
        assert keyword.json['semantic_map_id'] is not None

        keyword2 = client.post(url_for('keyword.create_semantic_map', id=keyword.json['id']),
                               headers=auth_header)

        assert keyword2.status_code == 200
        assert keyword.json['id'] == keyword2.json['id']
        assert keyword2.json['semantic_map_id'] is not None
        assert keyword.json['semantic_map_id'] != keyword2.json['semantic_map_id']

        # pagination
        keyword = client.get(url_for('keyword.get_keyword_items', id=keyword.json['id'], page_number=1, page_size=50),
                             headers=auth_header)
        assert len(keyword.json['coordinates']) == 50

        keyword = client.get(url_for('keyword.get_keyword_items', id=keyword.json['id'], page_number=2, page_size=50),
                             headers=auth_header)
        assert len(keyword.json['coordinates']) == 50

        keyword = client.get(url_for('keyword.get_keyword_items', id=keyword.json['id'], page_number=3, page_size=50),
                             headers=auth_header)
        assert len(keyword.json['coordinates']) == 50

        keyword = client.get(url_for('keyword.get_keyword_items', id=keyword.json['id'], page_number=4, page_size=50),
                             headers=auth_header)
        assert len(keyword.json['coordinates']) == 50
