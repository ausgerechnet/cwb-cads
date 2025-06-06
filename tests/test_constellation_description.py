from flask import url_for
import pytest


def test_constellation_description(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  content_type='application/json',
                                  headers=auth_header).json

        # constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'factions',
                                        'comment': 'union and FDP',
                                        'discourseme_ids': [discourseme['id'] for discourseme in discoursemes[0:2]]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        description = client.post(url_for('mmda.constellation.description.create_description', constellation_id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1
                                  },
                                  headers=auth_header)
        assert description.status_code == 200


def test_constellation_concordance(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  headers=auth_header).json

        # constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'factions',
                                        'comment': 'union and FDP',
                                        'discourseme_ids': [discourseme['id'] for discourseme in discoursemes[0:2]]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        description = client.post(url_for('mmda.constellation.description.create_description', constellation_id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        concordance = client.get(url_for('mmda.constellation.description.concordance_lines',
                                         constellation_id=constellation.json['id'],
                                         description_id=description.json['id'],
                                         focus_discourseme_id=discoursemes[0]['id']),
                                 follow_redirects=True,
                                 headers=auth_header)

        assert concordance.status_code == 200

        for line in concordance.json['lines']:
            # make sure every line contains focus query
            discourseme_ids = [d['discourseme_id'] for d in line['discourseme_ranges']]
            assert discoursemes[0]['id'] in discourseme_ids

        concordance = client.get(url_for('mmda.constellation.description.concordance_lines',
                                         constellation_id=constellation.json['id'],
                                         description_id=description.json['id'],
                                         focus_discourseme_id=discoursemes[0]['id'],
                                         filter_discourseme_ids=[discoursemes[1]['id']]),
                                 follow_redirects=True,
                                 headers=auth_header)

        assert concordance.status_code == 200

        for line in concordance.json['lines']:
            # make sure every line contains focus query and filter query
            discourseme_ids = [d['discourseme_id'] for d in line['discourseme_ranges']]
            assert discoursemes[0]['id'] in discourseme_ids
            assert discoursemes[1]['id'] in discourseme_ids


def test_constellation_concordance_filter_item(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  headers=auth_header).json

        # constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'factions',
                                        'comment': 'union and FDP',
                                        'discourseme_ids': [discourseme['id'] for discourseme in discoursemes[0:2]]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        description = client.post(url_for('mmda.constellation.description.create_description', constellation_id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        concordance = client.get(url_for('mmda.constellation.description.concordance_lines',
                                         constellation_id=constellation.json['id'],
                                         description_id=description.json['id'],
                                         filter_item="Zuruf"),
                                 follow_redirects=True,
                                 headers=auth_header)

        assert concordance.status_code == 200

        print(concordance.json['nr_lines'])

        # for line in concordance.json['lines']:
        #     # make sure every line contains focus query
        #     discourseme_ids = [d['discourseme_id'] for d in line['discourseme_ranges']]
        #     assert discoursemes[0]['id'] in discourseme_ids


# @pytest.mark.now
def test_constellation_concordance_line(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  headers=auth_header).json

        # constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'factions',
                                        'comment': 'union and FDP',
                                        'discourseme_ids': [discourseme['id'] for discourseme in discoursemes[0:2]]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        description = client.post(url_for('mmda.constellation.description.create_description', constellation_id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        concordance = client.get(url_for('mmda.constellation.description.concordance_lines',
                                         constellation_id=constellation.json['id'],
                                         description_id=description.json['id'],
                                         focus_discourseme_id=discoursemes[0]['id']),
                                 follow_redirects=True,
                                 headers=auth_header)

        assert concordance.status_code == 200

        match_id = concordance.json['lines'][0]['match_id']

        concordance_line = client.get(url_for('mmda.constellation.description.concordance_line',
                                              constellation_id=constellation.json['id'],
                                              description_id=description.json['id'],
                                              focus_discourseme_id=discoursemes[0]['id'],
                                              match_id=match_id),
                                      follow_redirects=True,
                                      headers=auth_header)

        assert concordance_line.status_code == 200


# @pytest.mark.now
def test_constellation_concordance_filter(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get some discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  headers=auth_header).json

        union_id = discoursemes[0]['id']
        fdp_id = discoursemes[1]['id']
        reaktion_id = discoursemes[2]['id']

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
                                      'corpus_id': 1
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        # filter item
        lines = client.get(url_for('mmda.constellation.description.concordance_lines',
                                   constellation_id=constellation.json['id'],
                                   description_id=description.json['id'],
                                   focus_discourseme_id=union_id,
                                   filter_item='Zuruf',
                                   window=10),
                           follow_redirects=True,
                           headers=auth_header)
        assert lines.status_code == 200

        for line in lines.json['lines']:
            assert True in [t['is_filter_item'] for t in line['tokens'] if not t['out_of_window']]
            assert 'Zuruf' in [t['secondary'] for t in line['tokens'] if not t['out_of_window']]

        nr_zuruf = lines.json['nr_lines']

        # filter one discourseme
        lines = client.get(url_for('mmda.constellation.description.concordance_lines',
                                   constellation_id=constellation.json['id'],
                                   description_id=description.json['id'],
                                   focus_discourseme_id=union_id,
                                   filter_discourseme_ids=[reaktion_id],
                                   window=10),
                           follow_redirects=True,
                           headers=auth_header)
        assert lines.status_code == 200

        for line in lines.json['lines']:
            assert reaktion_id in [r['discourseme_id'] for r in line['discourseme_ranges']]

        nr_reaktion = lines.json['nr_lines']

        # filter two discoursemes
        lines = client.get(url_for('mmda.constellation.description.concordance_lines',
                                   constellation_id=constellation.json['id'],
                                   description_id=description.json['id'],
                                   focus_discourseme_id=union_id,
                                   filter_discourseme_ids=[reaktion_id, fdp_id],
                                   window=10),
                           follow_redirects=True,
                           headers=auth_header)
        assert lines.status_code == 200

        for line in lines.json['lines']:
            assert reaktion_id in [r['discourseme_id'] for r in line['discourseme_ranges']]
            assert fdp_id in [r['discourseme_id'] for r in line['discourseme_ranges']]

        nr_reaktion_fdp = lines.json['nr_lines']

        # filter two discoursemes + item
        lines = client.get(url_for('mmda.constellation.description.concordance_lines',
                                   constellation_id=constellation.json['id'],
                                   description_id=description.json['id'],
                                   focus_discourseme_id=union_id,
                                   filter_item="und",
                                   filter_discourseme_ids=[reaktion_id, fdp_id],
                                   window=10),
                           follow_redirects=True,
                           headers=auth_header)
        assert lines.status_code == 200

        for line in lines.json['lines']:
            row = [t['secondary'] for t in line['tokens'] if not t['out_of_window']]
            assert 'und' in row
            assert reaktion_id in [r['discourseme_id'] for r in line['discourseme_ranges']]
            assert fdp_id in [r['discourseme_id'] for r in line['discourseme_ranges']]

        nr_reaktion_fdp_zuruf = lines.json['nr_lines']

        assert nr_reaktion_fdp <= nr_reaktion
        assert nr_reaktion_fdp_zuruf < nr_zuruf


def test_discourseme_deletion(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  content_type='application/json',
                                  headers=auth_header).json

        tmp_disc = client.post(url_for('mmda.discourseme.create_discourseme'),
                               json={
                                   'name': 'Modalverben',
                                   'comment': 'Testdiskursem das gelöscht wird',
                                   'template': [
                                       {'surface': 'können', 'p': 'lemma'}
                                   ],
                                  },
                               content_type='application/json',
                               headers=auth_header)

        assert tmp_disc.status_code == 200

        # constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'factions',
                                        'comment': 'union and FDP',
                                        'discourseme_ids': [tmp_disc.json['id']] + [discourseme['id'] for discourseme in discoursemes[0:2]]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        description = client.post(url_for('mmda.constellation.description.create_description', constellation_id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        client.delete(url_for('mmda.discourseme.delete_discourseme', discourseme_id=tmp_disc.json['id']),
                      headers=auth_header)


def test_associations(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  content_type='application/json',
                                  headers=auth_header).json

        tmp_disc = client.post(url_for('mmda.discourseme.create_discourseme'),
                               json={
                                   'name': 'Modalverben',
                                   'comment': 'Testdiskursem das gelöscht wird',
                                   'template': [
                                       {'surface': 'können', 'p': 'lemma'}
                                   ],
                                  },
                               content_type='application/json',
                               headers=auth_header)

        assert tmp_disc.status_code == 200

        # constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'factions',
                                        'comment': 'union and FDP',
                                        'discourseme_ids': [tmp_disc.json['id']] + [discourseme['id'] for discourseme in discoursemes[0:2]]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        description = client.post(url_for('mmda.constellation.description.create_description', constellation_id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        associations = client.get(url_for('mmda.constellation.description.get_constellation_associations',
                                          constellation_id=constellation.json['id'], description_id=description.json['id']),
                                  headers=auth_header)

        assert associations.status_code == 200

        assert all(v in associations.json['scores'][0].keys() for v in ['measure', 'score', 'node', 'candidate'])
        assert all(v in associations.json['scaled_scores'][0].keys() for v in ['measure', 'score', 'node', 'candidate'])

        # print(associations.json)


def test_associations_empty(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        tmp_disc = client.post(url_for('mmda.discourseme.create_discourseme'),
                               json={
                                   'name': 'modal verbs',
                                   'template': [
                                       {'surface': 'können', 'p': 'lemma'}
                                   ],
                                  },
                               content_type='application/json',
                               headers=auth_header)

        assert tmp_disc.status_code == 200

        # constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'factions',
                                        'comment': 'only modal verbs',
                                        'discourseme_ids': [tmp_disc.json['id']]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        description = client.post(url_for('mmda.constellation.description.create_description', constellation_id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        associations = client.get(url_for('mmda.constellation.description.get_constellation_associations',
                                          constellation_id=constellation.json['id'], description_id=description.json['id']),
                                  headers=auth_header)

        assert associations.status_code == 200


# @pytest.mark.now
def test_associations_nan(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        tmp_disc = client.post(url_for('mmda.discourseme.create_discourseme'),
                               json={
                                   'name': 'können',
                                   'template': [
                                       {'surface': 'können', 'p': 'lemma'}
                                   ],
                                  },
                               content_type='application/json',
                               headers=auth_header)

        assert tmp_disc.status_code == 200

        tmp_disc_2 = client.post(url_for('mmda.discourseme.create_discourseme'),
                                 json={
                                     'name': 'empty',
                                     'template': [
                                         {'surface': 'könsdanen', 'p': 'lemma'}
                                     ],
                                 },
                                 content_type='application/json',
                                 headers=auth_header)

        assert tmp_disc_2.status_code == 200

        tmp_disc_3 = client.post(url_for('mmda.discourseme.create_discourseme'),
                                 json={
                                     'name': 'hapax',
                                     'template': [
                                         {'surface': 'Kraftfahrt', 'p': 'lemma'}
                                     ],
                                 },
                                 content_type='application/json',
                                 headers=auth_header)

        assert tmp_disc.status_code == 200

        # constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'test',
                                        'comment': 'only modal verbs',
                                        'discourseme_ids': [tmp_disc.json['id'], tmp_disc_2.json['id'], tmp_disc_3.json['id']]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        description = client.post(url_for('mmda.constellation.description.create_description', constellation_id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        associations = client.get(url_for('mmda.constellation.description.get_constellation_associations',
                                          constellation_id=constellation.json['id'], description_id=description.json['id']),
                                  headers=auth_header)

        assert associations.status_code == 200

        assert associations.json['scaled_scores'][0]['score'] is None


# @pytest.mark.now
def test_discourseme_get_breakdown(client, auth):

    auth_header = auth.login()

    with client:
        client.get("/")

        # get discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  content_type='application/json',
                                  headers=auth_header).json

        # constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'factions',
                                        'comment': 'union and FDP',
                                        'discourseme_ids': [discourseme['id'] for discourseme in discoursemes[0:2]]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        # constellation description
        description = client.post(url_for('mmda.constellation.description.create_description', constellation_id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        # breakdown
        breakdown = client.get(url_for('mmda.constellation.description.constellation_description_get_breakdown',
                                       constellation_id=constellation.json['id'], description_id=description.json['id'], p='lemma'),
                               content_type='application/json',
                               headers=auth_header)
        assert breakdown.status_code == 200
        assert breakdown.json['items'][0]['freq'] == 14


@pytest.mark.now
def test_constellation_concordance_filter2(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  headers=auth_header).json

        # constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'factions',
                                        'comment': 'union and FDP',
                                        'discourseme_ids': [discourseme['id'] for discourseme in discoursemes[0:2]]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        description = client.post(url_for('mmda.constellation.description.create_description', constellation_id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        concordance = client.get(url_for('mmda.constellation.description.concordance_lines',
                                         constellation_id=constellation.json['id'],
                                         description_id=description.json['id'],
                                         focus_discourseme_id=discoursemes[0]['id']),
                                 follow_redirects=True,
                                 headers=auth_header)

        assert concordance.status_code == 200

        for line in concordance.json['lines']:
            # make sure every line contains focus query
            discourseme_ids = [d['discourseme_id'] for d in line['discourseme_ranges']]
            assert discoursemes[0]['id'] in discourseme_ids

        concordance = client.get(url_for('mmda.constellation.description.concordance_lines',
                                         constellation_id=constellation.json['id'],
                                         description_id=description.json['id'],
                                         focus_discourseme_id=discoursemes[0]['id'],
                                         filter_discourseme_ids=[discoursemes[1]['id']]),
                                 follow_redirects=True,
                                 headers=auth_header)

        assert concordance.status_code == 200

        for line in concordance.json['lines']:
            # make sure every line contains focus query and filter query
            discourseme_ids = [d['discourseme_id'] for d in line['discourseme_ranges']]
            assert discoursemes[0]['id'] in discourseme_ids
            assert discoursemes[1]['id'] in discourseme_ids
