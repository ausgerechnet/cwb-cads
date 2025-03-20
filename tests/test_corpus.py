from flask import url_for
import pytest


def test_get_corpus(client, auth):

    auth_header = auth.login()

    with client:

        client.get("/")

        corpora = client.get(url_for('corpus.get_corpora'),
                             content_type='application/json',
                             headers=auth_header)

        corpus = client.get(url_for('corpus.get_corpus', id=corpora.json[0]['id']),
                            content_type='application/json',
                            headers=auth_header)

        assert corpus.status_code == 200


def test_set_meta(client, auth):

    auth_header = auth.login()

    with client:

        client.get("/")

        # discourseme
        corpora = client.get(url_for('corpus.get_corpora'),
                             content_type='application/json',
                             headers=auth_header)
        assert corpora.status_code == 200

        corpus = client.get(url_for('corpus.get_corpus', id=corpora.json[0]['id']),
                            content_type='application/json',
                            headers=auth_header)
        assert corpus.status_code == 200

        meta = client.get(url_for('corpus.set_meta', id=corpora.json[0]['id']),
                          json={
                              'level': 'text', 'key': 'role', 'value_type': 'unicode'
                          },
                          content_type='application/json',
                          headers=auth_header)
        assert meta.status_code == 200

        freq = client.get(url_for('corpus.get_frequencies', id=corpora.json[0]['id'], level='text', key='role'),
                          content_type='application/json',
                          headers=auth_header)
        assert freq.status_code == 200


def test_create_subcorpus(client, auth):

    auth_header = auth.login()

    with client:

        client.get("/")

        # discourseme
        corpora = client.get(url_for('corpus.get_corpora'),
                             content_type='application/json',
                             headers=auth_header)
        assert corpora.status_code == 200

        corpus = client.get(url_for('corpus.get_corpus', id=corpora.json[0]['id']),
                            content_type='application/json',
                            headers=auth_header)
        assert corpus.status_code == 200

        meta = client.get(url_for('corpus.set_meta', id=corpora.json[0]['id']),
                          json={
                              'level': 'text', 'key': 'role', 'value_type': 'unicode'
                          },
                          content_type='application/json',
                          headers=auth_header)
        assert meta.status_code == 200

        subcorpus = client.put(url_for('corpus.create_subcorpus', id=corpora.json[0]['id']),
                               json={
                                   'level': 'text', 'key': 'role', 'values_unicode': ['mp'], 'name': 'Test'
                               },
                               content_type='application/json',
                               headers=auth_header)
        assert subcorpus.status_code == 200


def test_concordance(client, auth):

    auth_header = auth.login()

    with client:

        client.get("/")

        # discourseme
        corpora = client.get(url_for('corpus.get_corpora'),
                             content_type='application/json',
                             headers=auth_header)
        assert corpora.status_code == 200

        corpus = client.get(url_for('corpus.get_corpus', id=corpora.json[0]['id']),
                            content_type='application/json',
                            headers=auth_header)
        assert corpus.status_code == 200

        concordance = client.get(url_for('corpus.concordance', id=corpora.json[0]['id']),
                                 json={
                                     'corpus_id': corpora.json[0]['id'],
                                     'items': ['CDU'],
                                     'p': 'lemma'
                                 },
                                 content_type='application/json',
                                 headers=auth_header)
        assert concordance.status_code == 200

        concordance = client.get(url_for('corpus.concordance', id=corpora.json[0]['id']),
                                 json={
                                     'corpus_id': corpora.json[0]['id'],
                                     'items': ['CDU'],
                                     'p': 'lemma'
                                 },
                                 content_type='application/json',
                                 headers=auth_header)
        assert concordance.status_code == 200


@pytest.mark.now
def test_meta_frequencies(client, auth):

    auth_header = auth.login()

    with client:

        client.get("/")

        # discourseme
        corpora = client.get(url_for('corpus.get_corpora'),
                             content_type='application/json',
                             headers=auth_header)
        assert corpora.status_code == 200

        corpus = client.get(url_for('corpus.get_corpus', id=corpora.json[0]['id']),
                            content_type='application/json',
                            headers=auth_header)
        assert corpus.status_code == 200

        meta = client.get(url_for('corpus.set_meta', id=corpora.json[0]['id']),
                          json={
                              'level': 'text', 'key': 'name', 'value_type': 'unicode'
                          },
                          content_type='application/json',
                          headers=auth_header)
        assert meta.status_code == 200

        freq = client.get(url_for('corpus.get_frequencies', id=corpora.json[0]['id'], level='text', key='name'),
                          content_type='application/json',
                          headers=auth_header)
        assert freq.status_code == 200
