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


# @pytest.mark.now
def test_create_subcorpus_unicode(client, auth):

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
                                   'level': 'text', 'key': 'role', 'bins_unicode': ['mp'], 'name': 'Test'
                               },
                               content_type='application/json',
                               headers=auth_header)
        assert subcorpus.status_code == 200


def test_create_subcorpus_numeric(client, auth):

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

        meta = client.put(url_for('corpus.set_meta', id=corpora.json[0]['id']),
                          json={
                              'level': 'div', 'key': 'n', 'value_type': 'numeric'
                          },
                          content_type='application/json',
                          headers=auth_header)
        assert meta.status_code == 200

        subcorpus = client.put(url_for('corpus.create_subcorpus', id=corpora.json[0]['id']),
                               json={
                                   'level': 'div', 'key': 'n', 'bins_numeric': [(0, 3), (4, 6), (6, 7)], 'name': 'Test'
                               },
                               content_type='application/json',
                               headers=auth_header)
        assert subcorpus.status_code == 200


# @pytest.mark.now
def test_create_subcorpus_datetime(client, auth):

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

        meta = client.put(url_for('corpus.set_meta', id=corpora.json[0]['id']),
                          json={
                              'level': 'sitzung', 'key': 'date', 'value_type': 'datetime'
                          },
                          content_type='application/json',
                          headers=auth_header)
        assert meta.status_code == 200

        subcorpus = client.put(url_for('corpus.create_subcorpus', id=corpora.json[0]['id']),
                               json={
                                   'level': 'sitzung', 'key': 'date', 'bins_datetime': [
                                       ("1990-01-01T00:00:00", "1999-01-01T00:00:00")
                                   ], 'name': 'Test'
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


# @pytest.mark.now
def test_meta_frequencies_unicode(client, auth):

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

        # meta = client.put(url_for('corpus.set_meta', id=corpora.json[0]['id']),
        #                   json={
        #                       'level': 'text', 'key': 'name', 'value_type': 'unicode'
        #                   },
        #                   content_type='application/json',
        #                   headers=auth_header)
        # assert meta.status_code == 200

        freq = client.get(url_for('corpus.get_frequencies', id=corpora.json[0]['id'], level='text', key='name'),
                          content_type='application/json',
                          headers=auth_header)
        assert freq.status_code == 200

        # print(freq.json)

        # meta = client.put(url_for('corpus.set_meta', id=corpora.json[0]['id']),
        #                   json={
        #                       'level': 'text', 'key': 'name', 'value_type': 'unicode'
        #                   },
        #                   content_type='application/json',
        #                   headers=auth_header)
        # assert meta.status_code == 200

        freq = client.get(url_for('corpus.get_frequencies', id=corpora.json[0]['id'], level='text', key='name'),
                          content_type='application/json',
                          headers=auth_header)
        assert freq.status_code == 200
        assert freq.json['frequencies'][0]['nr_tokens'] == 9741


# @pytest.mark.now
def test_meta_frequencies_datetime(client, auth):

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

        meta = client.put(url_for('corpus.set_meta', id=corpora.json[0]['id']),
                          json={
                              'level': 'sitzung', 'key': 'date', 'value_type': 'datetime'
                          },
                          content_type='application/json',
                          headers=auth_header)
        assert meta.status_code == 200

        freq = client.get(url_for('corpus.get_frequencies', id=corpora.json[0]['id'], level='sitzung', key='date'),
                          content_type='application/json',
                          headers=auth_header)
        assert freq.status_code == 200
        assert freq.json['frequencies'][0]['nr_tokens'] == 149800


# @pytest.mark.now
def test_meta_frequencies_numeric(client, auth):

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

        meta = client.put(url_for('corpus.set_meta', id=corpora.json[0]['id']),
                          json={
                              'level': 'div', 'key': 'n', 'value_type': 'numeric'
                          },
                          content_type='application/json',
                          headers=auth_header)
        assert meta.status_code == 200

        freq = client.get(url_for('corpus.get_frequencies', id=corpora.json[0]['id'], level='div', key='n', sort_by='bin', sort_order='ascending'),
                          content_type='application/json',
                          headers=auth_header)
        assert freq.status_code == 200
        assert freq.json['frequencies'][0]['nr_tokens'] == 66624


@pytest.mark.now
def test_meta_frequencies_subcorpus_unicode(client, auth):

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
                                   'level': 'text', 'key': 'role', 'bins_unicode': ['mp'], 'name': 'Test'
                               },
                               content_type='application/json',
                               headers=auth_header)
        assert subcorpus.status_code == 200

        freq = client.get(url_for('corpus.get_frequencies_subcorpus', id=corpora.json[0]['id'], subcorpus_id=subcorpus.json['id'],
                                  level='text', key='role'),
                          content_type='application/json',
                          headers=auth_header)
        assert freq.status_code == 200
        from pprint import pprint
        pprint(freq.json)
