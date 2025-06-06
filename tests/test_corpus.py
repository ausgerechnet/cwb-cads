from flask import url_for
import pytest
from pprint import pprint


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

        subcorpus = client.get(url_for('corpus.get_subcorpus', id=corpora.json[0]['id'], subcorpus_id=subcorpus.json['id']),
                               content_type='application/json',
                               headers=auth_header)
        assert subcorpus.status_code == 200


# @pytest.mark.now
def test_create_subcorpus_subcorpus(client, auth):

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
                              'level': 'text', 'key': 'role', 'value_type': 'unicode'
                          },
                          content_type='application/json',
                          headers=auth_header)
        assert meta.status_code == 200

        meta = client.put(url_for('corpus.set_meta', id=corpora.json[0]['id']),
                          json={
                              'level': 'div', 'key': 'n', 'value_type': 'numeric'
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

        subcorpus = client.get(url_for('corpus.get_subcorpus', id=corpora.json[0]['id'], subcorpus_id=subcorpus.json['id']),
                               content_type='application/json',
                               headers=auth_header)
        assert subcorpus.status_code == 200
        assert subcorpus.json['nr_tokens'] == 96842

        subcorpus = client.put(url_for('corpus.create_subcorpus', id=corpora.json[0]['id']),
                               json={
                                   'level': 'text', 'key': 'party', 'bins_unicode': ['CDU'], 'name': 'MP-CDU', 'subcorpus_id': subcorpus.json['id']
                               },
                               content_type='application/json',
                               headers=auth_header)
        assert subcorpus.status_code == 200
        assert subcorpus.json['nr_tokens'] == 19771

        subcorpus = client.put(url_for('corpus.create_subcorpus', id=corpora.json[0]['id']),
                               json={
                                   'level': 'div', 'key': 'n', 'bins_numeric': [[0, 2]], 'name': 'MP-div', 'subcorpus_id': subcorpus.json['id']
                               },
                               content_type='application/json',
                               headers=auth_header)
        assert subcorpus.status_code == 400
        assert subcorpus.json['message'] == 'Bad Request: subcorpus was created on "text", cannot use "div" for further subcorpus creation'


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
def test_meta_frequencies_datetime_2(client, auth):

    auth_header = auth.login()

    with client:

        client.get("/")

        # discourseme
        corpora = client.get(url_for('corpus.get_corpora'),
                             content_type='application/json',
                             headers=auth_header)
        assert corpora.status_code == 200

        corpus = client.get(url_for('corpus.get_corpus', id=corpora.json[1]['id']),
                            content_type='application/json',
                            headers=auth_header)
        assert corpus.status_code == 200

        meta = client.put(url_for('corpus.set_meta', id=corpora.json[1]['id']),
                          json={
                              'level': 'article', 'key': 'date', 'value_type': 'datetime'
                          },
                          content_type='application/json',
                          headers=auth_header)
        assert meta.status_code == 200

        freq = client.get(url_for('corpus.get_frequencies', id=corpora.json[1]['id'], level='article', key='date', time_interval='month'),
                          content_type='application/json',
                          headers=auth_header)
        assert freq.status_code == 200

        freq = client.get(url_for('corpus.get_frequencies', id=corpora.json[1]['id'], level='article', key='date', time_interval='week'),
                          content_type='application/json',
                          headers=auth_header)
        assert freq.status_code == 200
        weeks = [_['bin_datetime'] for _ in freq.json['frequencies']]
        assert all([not w.endswith("W00") for w in weeks])
        assert "W53" in [w.split("-")[-1] for w in weeks]


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


# @pytest.mark.now
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

        meta = client.get(url_for('corpus.set_meta', id=corpora.json[0]['id']),
                          json={
                              'level': 'text', 'key': 'party', 'value_type': 'unicode'
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

        freq = client.get(url_for('corpus.get_frequencies', id=corpora.json[0]['id'],
                                  level='text', key='party'),
                          content_type='application/json',
                          headers=auth_header)
        assert freq.status_code == 200
        assert freq.json['frequencies'][0]['bin_unicode'] == 'SPD'
        assert freq.json['frequencies'][0]['nr_tokens'] == 35980

        freq = client.get(url_for('corpus.get_frequencies', id=corpora.json[0]['id'],
                                  level='text', key='party', subcorpus_id=subcorpus.json['id']),
                          content_type='application/json',
                          headers=auth_header)
        assert freq.status_code == 200
        assert freq.json['frequencies'][0]['bin_unicode'] == 'SPD'
        assert freq.json['frequencies'][0]['nr_tokens'] == 22453


# @pytest.mark.now
def test_create_subcorpus_collection(client, auth):

    auth_header = auth.login()

    with client:

        client.get("/")

        corpora = client.get(url_for('corpus.get_corpora'),
                             content_type='application/json',
                             headers=auth_header)
        assert corpora.status_code == 200

        corpus = client.get(url_for('corpus.get_corpus', id=corpora.json[1]['id']),
                            content_type='application/json',
                            headers=auth_header)
        assert corpus.status_code == 200

        meta = client.get(url_for('corpus.set_meta', id=corpora.json[1]['id']),
                          json={
                              'level': 'article', 'key': 'date', 'value_type': 'datetime'
                          },
                          content_type='application/json',
                          headers=auth_header)
        assert meta.status_code == 200

        collection = client.put(url_for('corpus.create_subcorpus_collection', id=corpora.json[1]['id']),
                                json={
                                    'level': 'article', 'key': 'date', 'time_interval': 'day', 'name': 'days'
                                },
                                content_type='application/json',
                                headers=auth_header)
        assert collection.status_code == 200
        assert len(collection.json['subcorpora']) == 44

        collection = client.put(url_for('corpus.create_subcorpus_collection', id=corpora.json[1]['id']),
                                json={
                                    'level': 'article', 'key': 'date', 'time_interval': 'week', 'name': 'weeks'
                                },
                                content_type='application/json',
                                headers=auth_header)
        assert collection.status_code == 200
        assert len(collection.json['subcorpora']) == 9

        collection = client.put(url_for('corpus.create_subcorpus_collection', id=corpora.json[1]['id']),
                                json={
                                    'level': 'article', 'key': 'date', 'time_interval': 'month', 'name': 'months'
                                },
                                content_type='application/json',
                                headers=auth_header)
        assert collection.status_code == 200
        assert len(collection.json['subcorpora']) == 2


# @pytest.mark.now
def test_create_subcorpus_subcorpus_collection(client, auth):

    auth_header = auth.login()

    with client:

        client.get("/")

        corpora = client.get(url_for('corpus.get_corpora'),
                             content_type='application/json',
                             headers=auth_header)
        assert corpora.status_code == 200

        corpus = client.get(url_for('corpus.get_corpus', id=corpora.json[1]['id']),
                            content_type='application/json',
                            headers=auth_header)
        assert corpus.status_code == 200

        meta = client.get(url_for('corpus.set_meta', id=corpora.json[1]['id']),
                          json={
                              'level': 'article', 'key': 'date', 'value_type': 'datetime'
                          },
                          content_type='application/json',
                          headers=auth_header)
        assert meta.status_code == 200

        meta = client.get(url_for('corpus.set_meta', id=corpora.json[1]['id']),
                          json={
                              'level': 'article', 'key': 'rubrik', 'value_type': 'unicode'
                          },
                          content_type='application/json',
                          headers=auth_header)
        assert meta.status_code == 200

        subcorpus = client.put(url_for('corpus.create_subcorpus', id=corpora.json[1]['id']),
                               json={
                                   'level': 'article', 'key': 'rubrik', 'bins_unicode': ['wirtschaft'], 'name': 'wirtschaft'
                               },
                               content_type='application/json',
                               headers=auth_header)
        assert subcorpus.status_code == 200

        freq = client.get(url_for('corpus.get_frequencies', id=corpora.json[1]['id'], level='article', key='rubrik'),
                          content_type='application/json',
                          headers=auth_header)
        assert freq.status_code == 200
        # pprint(freq.json)

        freq = client.get(url_for('corpus.get_frequencies', id=corpora.json[1]['id'], level='article', key='rubrik', subcorpus_id=subcorpus.json['id']),
                          content_type='application/json',
                          headers=auth_header)
        assert freq.status_code == 200
        # pprint(freq.json)

        collection = client.put(url_for('corpus.create_subcorpus_collection', id=corpora.json[1]['id']),
                                json={
                                    'level': 'article', 'key': 'date', 'time_interval': 'day', 'name': 'days', 'subcorpus_id': subcorpus.json['id']
                                },
                                content_type='application/json',
                                headers=auth_header)
        assert collection.status_code == 200
        assert len(collection.json['subcorpora']) == 39
        assert sum([subcorpus['nr_tokens'] for subcorpus in collection.json['subcorpora']]) == freq.json['frequencies'][0]['nr_tokens']

        collection = client.put(url_for('corpus.create_subcorpus_collection', id=corpora.json[1]['id']),
                                json={
                                    'level': 'article', 'key': 'date', 'time_interval': 'day', 'name': 'days'
                                },
                                content_type='application/json',
                                headers=auth_header)
        assert collection.status_code == 200
        assert len(collection.json['subcorpora']) == 44

        collections = client.get(url_for('corpus.get_subcorpus_collections', id=corpora.json[1]['id']),
                                 content_type='application/json',
                                 headers=auth_header)
        assert collections.status_code == 200

        collections = client.get(url_for('corpus.get_subcorpus_collections', id=corpora.json[1]['id'], subcorpus_id=subcorpus.json['id']),
                                 content_type='application/json',
                                 headers=auth_header)
        assert collections.status_code == 200


@pytest.mark.now
def test_create_subcorpus_collection_nans(client, auth):

    auth_header = auth.login()

    with client:

        client.get("/")

        corpora = client.get(url_for('corpus.get_corpora'),
                             content_type='application/json',
                             headers=auth_header)
        assert corpora.status_code == 200

        corpus = client.get(url_for('corpus.get_corpus', id=corpora.json[0]['id']),
                            content_type='application/json',
                            headers=auth_header)
        assert corpus.status_code == 200

        pprint(corpus.json)

        meta = client.put(url_for('corpus.set_meta', id=corpora.json[0]['id']),
                          json={
                              'level': 'sitzung', 'key': 'date', 'value_type': 'datetime'
                          },
                          content_type='application/json',
                          headers=auth_header)
        assert meta.status_code == 200

        pprint(meta.json)

        collection = client.put(url_for('corpus.create_subcorpus_collection', id=corpora.json[0]['id']),
                                json={
                                    'level': 'sitzung', 'key': 'date', 'time_interval': 'hour', 'name': 'hours'
                                },
                                content_type='application/json',
                                headers=auth_header)
        pprint(collection.json)

        assert collection.status_code == 200
