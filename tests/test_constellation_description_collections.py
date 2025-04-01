from flask import url_for
import pytest
from pprint import pprint


def test_constellation_description_collection(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get corpora
        corpora = client.get(url_for('corpus.get_corpora'),
                             content_type='application/json',
                             headers=auth_header)
        assert corpora.status_code == 200

        # make sure meta data exists
        meta = client.get(url_for('corpus.set_meta', id=corpora.json[1]['id']),
                          json={
                              'level': 'article', 'key': 'date', 'value_type': 'datetime'
                          },
                          content_type='application/json',
                          headers=auth_header)
        assert meta.status_code == 200

        # create subcorpora
        subcorpus_collection = client.put(url_for('corpus.create_subcorpus_collection', id=corpora.json[1]['id']),
                                          json={
                                              'level': 'article', 'key': 'date', 'time_interval': 'month', 'name': 'months'
                                          },
                                          content_type='application/json',
                                          headers=auth_header)
        assert subcorpus_collection.status_code == 200
        assert len(subcorpus_collection.json['subcorpora']) == 2

        # get discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  headers=auth_header).json

        # create constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'factions',
                                        'comment': 'union and FDP',
                                        'discourseme_ids': [discourseme['id'] for discourseme in discoursemes[0:2]]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        # create constellation description collection
        collection = client.post(url_for('mmda.constellation.description.collection.create_constellation_description_collection',
                                         constellation_id=constellation.json['id']),
                                 json={
                                     'subcorpus_collection_id': subcorpus_collection.json['id']
                                 },
                                 headers=auth_header)
        assert collection.status_code == 200
        subcorpus_ids = [d['subcorpus_id'] for d in collection.json['constellation_descriptions']]
        assert len(set(subcorpus_ids)) == 2

        # get constellation description collection
        collection = client.get(url_for('mmda.constellation.description.collection.get_constellation_description_collection',
                                        constellation_id=constellation.json['id'],
                                        collection_id=collection.json['id']),
                                headers=auth_header)
        assert collection.status_code == 200
        assert collection.json['subcorpus_collection_id'] == collection.json['id']
        subcorpus_ids = [d['subcorpus_id'] for d in collection.json['constellation_descriptions']]
        assert len(set(subcorpus_ids)) == 2


def test_constellation_description_collection_put(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get corpora
        corpora = client.get(url_for('corpus.get_corpora'),
                             content_type='application/json',
                             headers=auth_header)
        assert corpora.status_code == 200

        # make sure meta data exists
        meta = client.get(url_for('corpus.set_meta', id=corpora.json[1]['id']),
                          json={
                              'level': 'article', 'key': 'date', 'value_type': 'datetime'
                          },
                          content_type='application/json',
                          headers=auth_header)
        assert meta.status_code == 200

        # create subcorpora
        subcorpus_collection = client.put(url_for('corpus.create_subcorpus_collection', id=corpora.json[1]['id']),
                                          json={
                                              'level': 'article', 'key': 'date', 'time_interval': 'month', 'name': 'months'
                                          },
                                          content_type='application/json',
                                          headers=auth_header)
        assert subcorpus_collection.status_code == 200
        assert len(subcorpus_collection.json['subcorpora']) == 2

        # get discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  headers=auth_header).json

        # create constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'factions',
                                        'comment': 'union and FDP',
                                        'discourseme_ids': [discourseme['id'] for discourseme in discoursemes[0:2]]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        # create constellation description collection
        collection = client.put(url_for('mmda.constellation.description.collection.get_or_create_constellation_description_collection',
                                        constellation_id=constellation.json['id']),
                                json={
                                    'subcorpus_collection_id': subcorpus_collection.json['id']
                                },
                                headers=auth_header)
        assert collection.status_code == 200
        subcorpus_ids = [d['subcorpus_id'] for d in collection.json['constellation_descriptions']]
        assert len(set(subcorpus_ids)) == 2

        collection2 = client.put(url_for('mmda.constellation.description.collection.get_or_create_constellation_description_collection',
                                         constellation_id=constellation.json['id']),
                                 json={
                                     'subcorpus_collection_id': subcorpus_collection.json['id']
                                 },
                                 headers=auth_header)
        assert collection2.status_code == 200
        assert collection.json['id'] == collection2.json['id']

        collection3 = client.post(url_for('mmda.constellation.description.collection.create_constellation_description_collection',
                                          constellation_id=constellation.json['id']),
                                  json={
                                      'subcorpus_collection_id': subcorpus_collection.json['id']
                                  },
                                  headers=auth_header)
        assert collection2.status_code == 200
        assert collection3.json['id'] != collection2.json['id']

        # get constellation description collection
        collection = client.get(url_for('mmda.constellation.description.collection.get_constellation_description_collection',
                                        constellation_id=constellation.json['id'],
                                        collection_id=collection.json['id']),
                                headers=auth_header)
        assert collection.status_code == 200
        assert collection.json['subcorpus_collection_id'] == collection.json['id']
        subcorpus_ids = [d['subcorpus_id'] for d in collection.json['constellation_descriptions']]
        assert len(set(subcorpus_ids)) == 2


@pytest.mark.now
def test_constellation_description_collection_collocation(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get corpora
        corpora = client.get(url_for('corpus.get_corpora'),
                             content_type='application/json',
                             headers=auth_header)
        assert corpora.status_code == 200

        # make sure meta data exists
        meta = client.get(url_for('corpus.set_meta', id=corpora.json[1]['id']),
                          json={
                              'level': 'article', 'key': 'date', 'value_type': 'datetime'
                          },
                          content_type='application/json',
                          headers=auth_header)
        assert meta.status_code == 200

        # create subcorpora
        subcorpus_collection = client.put(url_for('corpus.create_subcorpus_collection', id=corpora.json[1]['id']),
                                          json={
                                              'level': 'article', 'key': 'date', 'time_interval': 'week', 'name': 'weeks'
                                          },
                                          content_type='application/json',
                                          headers=auth_header)
        assert subcorpus_collection.status_code == 200
        # assert len(subcorpus_collection.json['subcorpora']) == 9

        # create discoursemes
        discourseme1 = client.post(url_for('mmda.discourseme.create_discourseme'),
                                   json={
                                       'name': 'Modalverben',
                                       'comment': 'Testdiskursem mit vielen Treffern',
                                       'template': [
                                           {'surface': 'von', 'p': 'lemma'}
                                       ],
                                   },
                                   content_type='application/json',
                                   headers=auth_header)
        assert discourseme1.status_code == 200

        # create constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'Testkonstellation',
                                        'comment': 'Testkonstellation mit vielen Treffern',
                                        'discourseme_ids': [discourseme1.json['id']]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        collection = client.post(url_for('mmda.constellation.description.collection.create_constellation_description_collection',
                                         constellation_id=constellation.json['id']),
                                 json={
                                     'subcorpus_collection_id': subcorpus_collection.json['id']
                                 },
                                 headers=auth_header)
        assert collection.status_code == 200

        collocation_collection = client.put(url_for('mmda.constellation.description.collection.get_or_create_collocation',
                                                    constellation_id=constellation.json['id'],
                                                    collection_id=collection.json['id'],
                                                    sort_by='O11'),
                                            json={
                                                'focus_discourseme_id': discourseme1.json['id'],
                                                'p': 'lemma'
                                            },
                                            headers=auth_header)
        assert collocation_collection.status_code == 200

        pprint(collocation_collection.json)


def test_constellation_description_collection_collocation_empty(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get corpora
        corpora = client.get(url_for('corpus.get_corpora'),
                             content_type='application/json',
                             headers=auth_header)
        assert corpora.status_code == 200

        # make sure meta data exists
        meta = client.get(url_for('corpus.set_meta', id=corpora.json[1]['id']),
                          json={
                              'level': 'article', 'key': 'date', 'value_type': 'datetime'
                          },
                          content_type='application/json',
                          headers=auth_header)
        assert meta.status_code == 200

        # create subcorpora
        subcorpus_collection = client.put(url_for('corpus.create_subcorpus_collection', id=corpora.json[1]['id']),
                                          json={
                                              'level': 'article', 'key': 'date', 'time_interval': 'week', 'name': 'weeks'
                                          },
                                          content_type='application/json',
                                          headers=auth_header)
        assert subcorpus_collection.status_code == 200
        assert len(subcorpus_collection.json['subcorpora']) == 9

        # create discoursemes
        discourseme = client.post(url_for('mmda.discourseme.create_discourseme'),
                                  json={
                                      'name': 'Wenig',
                                      'comment': 'Testdiskursem mit wenigen Treffern',
                                      'template': [
                                          {'surface': 'Kraft'}
                                      ],
                                   },
                                  content_type='application/json',
                                  headers=auth_header)
        assert discourseme.status_code == 200

        # create constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'Testkonstellation',
                                        'comment': 'Testkonstellation mit wenigen Treffern',
                                        'discourseme_ids': [discourseme.json['id']]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        collection = client.post(url_for('mmda.constellation.description.collection.create_constellation_description_collection',
                                         constellation_id=constellation.json['id']),
                                 json={
                                     'subcorpus_collection_id': subcorpus_collection.json['id']
                                 },
                                 headers=auth_header)
        assert collection.status_code == 200

        collocation_collection = client.put(url_for('mmda.constellation.description.collection.get_or_create_collocation',
                                                    constellation_id=constellation.json['id'],
                                                    collection_id=collection.json['id']),
                                            json={
                                                'focus_discourseme_id': discourseme.json['id'],
                                                'p': 'lemma'
                                            },
                                            headers=auth_header)
        assert collocation_collection.status_code == 200

        pprint(collocation_collection.json)
