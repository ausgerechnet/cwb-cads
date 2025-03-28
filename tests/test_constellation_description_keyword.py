from flask import url_for
import pytest


def test_constellation_keyword(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  headers=auth_header)
        assert discoursemes.status_code == 200
        discoursemes = discoursemes.json[0:4]

        # create constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'CDU',
                                        'comment': 'Test Constellation HD',
                                        'discourseme_ids': [disc['id'] for disc in discoursemes]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        # create description
        description = client.post(url_for('mmda.constellation.description.create_description', constellation_id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1,
                                      'subcorpus_id': 1,
                                      's': 'text'
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        # create keyword
        keyword = client.post(url_for('mmda.constellation.description.keyword.create_keyword',
                                      constellation_id=constellation.json['id'],
                                      description_id=description.json['id']),
                              json={
                                  'corpus_id_reference': 1,
                                  'p_reference': 'lemma'
                              },
                              headers=auth_header)
        assert keyword.status_code == 200

        keyword_items = client.get(url_for('mmda.constellation.description.keyword.get_keyword_items',
                                           constellation_id=constellation.json['id'],
                                           description_id=description.json['id'],
                                           keyword_id=keyword.json['id']),
                                   headers=auth_header)
        assert keyword_items.status_code == 200
        assert len(keyword_items.json['discourseme_scores']) == len(discoursemes)

        # 'Kanzler(in)? | Bundeskanzler(in)?': 29 / 35980 vs. 29 / 113820
        keyword_items.json['discourseme_scores'][2]['discourseme_id'] == 3  # Kanzler
        scores = {k['measure']: k['score'] for k in keyword_items.json['discourseme_scores'][2]['global_scores']}
        assert int(scores['O11']) == 29
        assert int(scores['O11']) + int(scores['O12']) == 35980
        assert int(scores['O21']) == 29
        assert int(scores['O21']) + int(scores['O22']) == 113820

        # F. D. P.
        assert keyword_items.json['discourseme_scores'][1]['item_scores'][0]['item'] == 'F. D. P.'
        scores = {k['measure']: k['score'] for k in keyword_items.json['discourseme_scores'][1]['item_scores'][0]['scores']}
        assert int(scores['O11']) == 41
        assert int(scores['O11']) + int(scores['O12']) == 35980
        assert int(scores['O21']) == 356
        assert int(scores['O21']) + int(scores['O22']) == 113820

        assert keyword_items.json['discourseme_scores'][1]['unigram_item_scores'][0]['item'] == 'D.'
        scores = {k['measure']: k['score'] for k in keyword_items.json['discourseme_scores'][1]['unigram_item_scores'][0]['scores']}
        assert int(scores['O11']) == 87
        # assert int(scores['O11']) + int(scores['O12']) == 35980
        # assert int(scores['O21']) == 414
        # assert int(scores['O21']) + int(scores['O22']) == 113820


def test_constellation_keyword_coordinates(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  headers=auth_header)
        assert discoursemes.status_code == 200
        discoursemes = discoursemes.json[0:4]

        # create constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'CDU',
                                        'comment': 'Test Constellation HD',
                                        'discourseme_ids': [disc['id'] for disc in discoursemes]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        # create description
        description = client.post(url_for('mmda.constellation.description.create_description', constellation_id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1,
                                      'subcorpus_id': 1,
                                      's': 'text'
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        # create keyword
        keyword = client.post(url_for('mmda.constellation.description.keyword.create_keyword',
                                      constellation_id=constellation.json['id'],
                                      description_id=description.json['id']),
                              json={
                                  'corpus_id_reference': 1,
                                  'p_reference': 'lemma'
                              },
                              headers=auth_header)
        assert keyword.status_code == 200

        keyword_items = client.get(url_for('mmda.constellation.description.keyword.get_keyword_items',
                                           constellation_id=constellation.json['id'],
                                           description_id=description.json['id'],
                                           keyword_id=keyword.json['id'],
                                           return_coordinates=True),
                                   headers=auth_header)
        assert keyword_items.status_code == 200

        assert len(keyword_items.json['discourseme_coordinates']) == len(discoursemes)

        semantic_map_id = keyword_items.json['discourseme_coordinates'][0]['semantic_map_id']
        coordinates = client.put(url_for('mmda.constellation.description.semantic-map.set_coordinates',
                                         constellation_id=constellation.json['id'],
                                         description_id=description.json['id'],
                                         semantic_map_id=semantic_map_id),
                                 json={
                                     'discourseme_id': 1,
                                     'x_user': 12,
                                     'y_user': 15
                                 },
                                 headers=auth_header)
        assert coordinates.status_code == 200
        assert len(coordinates.json) == len(discoursemes)
        disc1_coordinates = [d for d in coordinates.json if d['discourseme_id'] == 1][0]
        assert int(disc1_coordinates['x_user']) == 12
        assert int(disc1_coordinates['y_user']) == 15

        coordinates = client.get(url_for('mmda.constellation.description.semantic-map.get_coordinates',
                                         constellation_id=constellation.json['id'],
                                         description_id=description.json['id'],
                                         semantic_map_id=semantic_map_id),
                                 headers=auth_header)
        assert coordinates.status_code == 200
        disc1_coordinates = [d for d in coordinates.json if d['discourseme_id'] == 1][0]
        assert int(disc1_coordinates['x_user']) == 12
        assert int(disc1_coordinates['y_user']) == 15


def test_constellation_keyword_empty_queries(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # discourseme that is not in reference: "Bereicherung"
        # discourseme without matches: "Bereicherung2"
        discourseme = client.post(url_for('mmda.discourseme.create_discourseme'),
                                  json={
                                      'name': 'Bereicherung',
                                      'comment': 'Testdiskursem ohne Treffer in Referenz',
                                      'template': [
                                          {'surface': 'Bereicherung2', 'p': 'lemma'}
                                      ],
                                  },
                                  content_type='application/json',
                                  headers=auth_header)
        assert discourseme.status_code == 200

        # get discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  headers=auth_header)
        assert discoursemes.status_code == 200
        # union_id = discoursemes.json[0]['id']

        # create constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'CDU',
                                        'comment': 'Test Constellation HD',
                                        'discourseme_ids': [disc['id'] for disc in discoursemes.json]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        # create description
        description = client.post(url_for('mmda.constellation.description.create_description', constellation_id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1,
                                      'subcorpus_id': 1,
                                      's': 'text'
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        # create keyword
        keyword = client.post(url_for('mmda.constellation.description.keyword.create_keyword',
                                      constellation_id=constellation.json['id'],
                                      description_id=description.json['id']),
                              json={
                                  'corpus_id_reference': 1,
                                  'p_reference': 'lemma'
                              },
                              headers=auth_header)
        assert keyword.status_code == 200

        keyword_items = client.get(url_for('mmda.constellation.description.keyword.get_keyword_items',
                                           constellation_id=constellation.json['id'],
                                           description_id=description.json['id'],
                                           keyword_id=keyword.json['id']),
                                   headers=auth_header)
        assert keyword_items.status_code == 200


@pytest.mark.now
def test_constellation_keyword_map(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get some discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  headers=auth_header)
        assert discoursemes.status_code == 200

        # create constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'CDU',
                                        'comment': 'Test Constellation HD',
                                        'discourseme_ids': [disc['id'] for disc in discoursemes.json]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        # create description
        description = client.post(url_for('mmda.constellation.description.create_description', constellation_id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1,
                                      's': 'text',
                                      'overlap': 'full'
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        # create keyword
        keyword = client.post(url_for('mmda.constellation.description.keyword.create_keyword',
                                      constellation_id=constellation.json['id'],
                                      description_id=description.json['id']),
                              json={
                                  'corpus_id_reference': 1,
                                  'p_reference': 'word'
                              },
                              headers=auth_header)
        assert keyword.status_code == 200

        # get map
        kw_map = client.get(url_for('mmda.constellation.description.keyword.get_keyword_map',
                                    constellation_id=constellation.json['id'],
                                    description_id=description.json['id'],
                                    keyword_id=keyword.json['id'],
                                    page_size=50, sort_by='conservative_log_ratio'),
                            headers=auth_header)
        assert kw_map.status_code == 200
        from pprint import pprint
        pprint(kw_map.json['map'])
        assert kw_map.json['map'][0]['discourseme_id'] is None
        assert kw_map.json['map'][9]['discourseme_id'] is None


def test_constellation_keyword_scaled_scores(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  headers=auth_header)
        assert discoursemes.status_code == 200
        discoursemes = discoursemes.json[0:4]

        # create constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'CDU',
                                        'comment': 'Test Constellation HD',
                                        'discourseme_ids': [disc['id'] for disc in discoursemes]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        # create description
        description = client.post(url_for('mmda.constellation.description.create_description', constellation_id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1,
                                      'subcorpus_id': 1,
                                      's': 'text'
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        # create keyword
        keyword = client.post(url_for('mmda.constellation.description.keyword.create_keyword',
                                      constellation_id=constellation.json['id'],
                                      description_id=description.json['id']),
                              json={
                                  'corpus_id_reference': 1,
                                  'p_reference': 'lemma'
                              },
                              headers=auth_header)
        assert keyword.status_code == 200

        keyword_items = client.get(url_for('mmda.constellation.description.keyword.get_keyword_items',
                                           constellation_id=constellation.json['id'],
                                           description_id=description.json['id'],
                                           keyword_id=keyword.json['id']),
                                   headers=auth_header)
        assert keyword_items.status_code == 200
        assert len(keyword_items.json['discourseme_scores']) == len(discoursemes)

        assert 'scaled_scores' in keyword_items.json['items'][0]


def test_put_constellation_keywords(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  headers=auth_header)
        assert discoursemes.status_code == 200
        discoursemes = discoursemes.json[0:4]

        # create constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'CDU',
                                        'comment': 'Test Constellation HD',
                                        'discourseme_ids': [disc['id'] for disc in discoursemes]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        # create description
        description = client.post(url_for('mmda.constellation.description.create_description', constellation_id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1,
                                      'subcorpus_id': 1,
                                      's': 'text'
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        # put keyword
        keyword = client.put(url_for('mmda.constellation.description.keyword.get_or_create_keyword',
                                     constellation_id=constellation.json['id'],
                                     description_id=description.json['id']),
                             json={
                                 'corpus_id_reference': 1,
                                 'p_reference': 'lemma'
                              },
                             headers=auth_header)
        assert keyword.status_code == 200

        # put again
        keyword = client.put(url_for('mmda.constellation.description.keyword.get_or_create_keyword',
                                     constellation_id=constellation.json['id'],
                                     description_id=description.json['id']),
                             json={
                                 'corpus_id_reference': 1,
                                 'p_reference': 'lemma'
                              },
                             headers=auth_header)
        assert keyword.status_code == 200


def test_get_constellation_keywords(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  headers=auth_header)
        assert discoursemes.status_code == 200
        discoursemes = discoursemes.json[0:4]

        # create constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'CDU',
                                        'comment': 'Test Constellation PUT-GET',
                                        'discourseme_ids': [disc['id'] for disc in discoursemes]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        # create description
        description = client.post(url_for('mmda.constellation.description.create_description', constellation_id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1,
                                      'subcorpus_id': 1,
                                      's': 'text'
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        # create keyword
        keyword = client.put(url_for('mmda.constellation.description.keyword.get_or_create_keyword',
                                     constellation_id=constellation.json['id'],
                                     description_id=description.json['id']),
                             json={
                                 'corpus_id_reference': 1,
                                 'p_reference': 'lemma'
                              },
                             headers=auth_header)
        assert keyword.status_code == 200

        keyword = client.put(url_for('mmda.constellation.description.keyword.get_or_create_keyword',
                                     constellation_id=constellation.json['id'],
                                     description_id=description.json['id']),
                             json={
                                 'corpus_id_reference': 1,
                                 'p_reference': 'lemma'
                              },
                             headers=auth_header)
        assert keyword.status_code == 200

        # create another keyword
        keyword = client.put(url_for('mmda.constellation.description.keyword.get_or_create_keyword',
                                     constellation_id=constellation.json['id'],
                                     description_id=description.json['id']),
                             json={
                                 'corpus_id_reference': 2,
                                 'p_reference': 'lemma'
                             },
                             headers=auth_header)
        assert keyword.status_code == 200

        keyword = client.put(url_for('mmda.constellation.description.keyword.get_or_create_keyword',
                                     constellation_id=constellation.json['id'],
                                     description_id=description.json['id']),
                             json={
                                 'corpus_id_reference': 2,
                                 'p_reference': 'lemma'
                             },
                             headers=auth_header)
        assert keyword.status_code == 200

        # create another keyword
        keyword = client.put(url_for('mmda.constellation.description.keyword.get_or_create_keyword',
                                     constellation_id=constellation.json['id'],
                                     description_id=description.json['id']),
                             json={
                                 'corpus_id_reference': 2,
                                 'p_reference': 'word'
                             },
                             headers=auth_header)
        assert keyword.status_code == 200

        keyword = client.put(url_for('mmda.constellation.description.keyword.get_or_create_keyword',
                                     constellation_id=constellation.json['id'],
                                     description_id=description.json['id']),
                             json={
                                 'corpus_id_reference': 2,
                                 'p_reference': 'word'
                             },
                             headers=auth_header)
        assert keyword.status_code == 200

        keywords = client.get(url_for('mmda.constellation.description.keyword.get_all_keyword',
                                      constellation_id=constellation.json['id'],
                                      description_id=description.json['id']),
                              headers=auth_header)
        assert keywords.status_code == 200

        assert len(keywords.json) == 3
