from flask import url_for
from pprint import pprint
from pandas import DataFrame
import pytest


def test_map(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # discoursemes
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

        # description
        description = client.post(url_for('mmda.constellation.description.create_description', constellation_id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        # collocation
        collocation = client.post(url_for('mmda.constellation.description.collocation.create_collocation',
                                          constellation_id=constellation.json['id'],
                                          description_id=description.json['id']),
                                  json={
                                      'focus_discourseme_id': discoursemes[0]['id'],
                                      'p': 'lemma',
                                      'window': 10,
                                      'include_negative': True
                                  },
                                  headers=auth_header)
        assert collocation.status_code == 200

        # map
        m = client.get(url_for('mmda.constellation.description.collocation.get_collocation_map',
                               constellation_id=constellation.json['id'],
                               description_id=description.json['id'],
                               collocation_id=collocation.json['id'],
                               page_size=50, sort_by='conservative_log_ratio'),
                       headers=auth_header)
        assert m.status_code == 200

        df = DataFrame(m.json['map'])
        print(df.loc[df.duplicated(subset=['item', 'source'], keep=False)])


@pytest.mark.now
def test_discourseme_creation(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # # discoursemes
        # discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
        #                           content_type='application/json',
        #                           headers=auth_header).json

        spd = client.post(url_for('mmda.discourseme.create_discourseme'),
                          json={
                              'name': 'SPD',
                              'template': [
                                  {'surface': 'SPD'},
                                  {'surface': 'Sozialdemokraten'}
                              ]
                          },
                          content_type='application/json',
                          headers=auth_header)
        assert spd.status_code == 200

        union = client.post(url_for('mmda.discourseme.create_discourseme'),
                            json={
                                'name': 'Union',
                                'template': [
                                    {'surface': 'CDU', 'p': ''},
                                    {'surface': 'CSU'},
                                    {'surface': 'CDU/CSU'},
                                    {'surface': 'Union'}
                                ],
                            },
                            content_type='application/json',
                            headers=auth_header)
        assert union.status_code == 200

        # constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'Spunion',
                                        'comment': 'SPD and Union',
                                        'discourseme_ids': [spd.json['id'], union.json['id']]
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

        concordance = client.get(url_for('mmda.constellation.description.concordance_lines',
                                         constellation_id=constellation.json['id'],
                                         description_id=description.json['id'],
                                         focus_discourseme_id=union.json['id']),
                                 follow_redirects=True,
                                 headers=auth_header)

        assert concordance.status_code == 200

        collocation = client.put(url_for('mmda.constellation.description.collocation.get_or_create_collocation',
                                         constellation_id=constellation.json['id'],
                                         description_id=description.json['id']),
                                 json={
                                     'focus_discourseme_id': union.json['id'],
                                     'p': 'lemma'
                                 },
                                 follow_redirects=True,
                                 headers=auth_header)

        assert collocation.status_code == 200

        print(collocation.json)
