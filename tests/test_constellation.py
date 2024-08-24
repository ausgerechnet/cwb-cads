from pprint import pprint

import pytest
from flask import url_for


def test_create_get_constellation(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  content_type='application/json',
                                  headers=auth_header).json
        discourseme = discoursemes[0]

        # constellation
        constellation = client.post(url_for('mmda.constellation.create'),
                                    json={
                                        'name': 'CDU',
                                        'comment': 'Test Constellation 1',
                                        'discourseme_ids': [discourseme['id']]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        constellation = client.get(url_for('mmda.constellation.get_constellation', id=constellation.json['id']),
                                   headers=auth_header)
        assert constellation.status_code == 200

        constellations = client.get(url_for('mmda.constellation.get_constellations'),
                                    headers=auth_header)

        assert constellations.status_code == 200


def test_patch_constellation(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  content_type='application/json',
                                  headers=auth_header).json
        discourseme = discoursemes[0]

        # constellation
        constellation = client.post(url_for('mmda.constellation.create'),
                                    json={
                                        'name': 'CDU',
                                        'comment': 'Test Constellation 1',
                                        'discourseme_ids': [discourseme['id']]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200
        assert constellation.json['name'] == 'CDU'
        assert constellation.json['comment'] == 'Test Constellation 1'
        assert len(constellation.json['discoursemes']) == 1

        constellation = client.patch(url_for('mmda.constellation.patch_constellation', id=constellation.json['id']),
                                     json={
                                         'comment': 'updated comment'
                                     },
                                     headers=auth_header)
        assert constellation.status_code == 200
        assert constellation.json['name'] == 'CDU'
        assert constellation.json['comment'] == 'updated comment'
        assert len(constellation.json['discoursemes']) == 1

        constellations = client.get(url_for('mmda.constellation.get_constellations'),
                                    headers=auth_header)

        assert constellations.status_code == 200


def test_patch_constellation_discoursemes(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  content_type='application/json',
                                  headers=auth_header).json
        discourseme = discoursemes[0]

        # constellation
        constellation = client.post(url_for('mmda.constellation.create'),
                                    json={
                                        'name': 'CDU',
                                        'comment': 'Test Constellation 1',
                                        'discourseme_ids': [discourseme['id']]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200
        assert constellation.json['name'] == 'CDU'
        assert constellation.json['comment'] == 'Test Constellation 1'
        assert len(constellation.json['discoursemes']) == 1

        constellation = client.patch(url_for('mmda.constellation.patch_constellation', id=constellation.json['id']),
                                     json={
                                         'comment': 'updated comment'
                                     },
                                     headers=auth_header)
        assert constellation.status_code == 200
        assert constellation.json['name'] == 'CDU'
        assert constellation.json['comment'] == 'updated comment'
        assert len(constellation.json['discoursemes']) == 1

        constellation = client.patch(url_for('mmda.constellation.patch_constellation', id=constellation.json['id']),
                                     json={
                                         'discourseme_ids': [discourseme['id'] for discourseme in discoursemes[0:2]]
                                     },
                                     headers=auth_header)
        assert constellation.status_code == 200
        assert constellation.json['name'] == 'CDU'
        assert constellation.json['comment'] == 'updated comment'
        assert len(constellation.json['discoursemes']) == 2


@pytest.mark.now
def test_constellation_description(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  content_type='application/json',
                                  headers=auth_header).json

        # constellation
        constellation = client.post(url_for('mmda.constellation.create'),
                                    json={
                                        'name': 'factions',
                                        'comment': 'union and FDP',
                                        'discourseme_ids': [discourseme['id'] for discourseme in discoursemes[0:2]]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        description = client.post(url_for('mmda.constellation.create_description', id=constellation.json['id']),
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
        constellation = client.post(url_for('mmda.constellation.create'),
                                    json={
                                        'name': 'factions',
                                        'comment': 'union and FDP',
                                        'discourseme_ids': [discourseme['id'] for discourseme in discoursemes[0:2]]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        description = client.post(url_for('mmda.constellation.create_description', id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        concordance = client.get(url_for('mmda.constellation.concordance_lines',
                                         id=constellation.json['id'],
                                         description_id=description.json['id'],
                                         focus_discourseme_id=discoursemes[0]['id']),
                                 follow_redirects=True,
                                 headers=auth_header)

        assert concordance.status_code == 200

        for line in concordance.json['lines']:
            # make sure every line contains focus query
            discourseme_ids = [d['discourseme_id'] for d in line['discourseme_ranges']]
            assert discoursemes[0]['id'] in discourseme_ids

        concordance = client.get(url_for('mmda.constellation.concordance_lines',
                                         id=constellation.json['id'],
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
        constellation = client.post(url_for('mmda.constellation.create'),
                                    json={
                                        'name': 'CDU',
                                        'comment': 'Test Constellation HD',
                                        'discourseme_ids': [disc['id'] for disc in discoursemes]
                                    },
                                    headers=auth_header)

        assert constellation.status_code == 200

        # create description
        description = client.post(url_for('mmda.constellation.create_description', id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        # filter item
        lines = client.get(url_for('mmda.constellation.concordance_lines',
                                   id=constellation.json['id'],
                                   description_id=description.json['id'],
                                   focus_discourseme_id=union_id,
                                   filter_item='Zuruf',
                                   window=10),
                           follow_redirects=True,
                           headers=auth_header)
        assert lines.status_code == 200

        for line in lines.json['lines']:
            row = [t['secondary'] for t in line['tokens'] if not t['out_of_window']]
            assert 'Zuruf' in row

        nr_zuruf = lines.json['nr_lines']

        # filter one discourseme
        lines = client.get(url_for('mmda.constellation.concordance_lines',
                                   id=constellation.json['id'],
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
        lines = client.get(url_for('mmda.constellation.concordance_lines',
                                   id=constellation.json['id'],
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
        lines = client.get(url_for('mmda.constellation.concordance_lines',
                                   id=constellation.json['id'],
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


# def test_constellation_collocation_glob(client, auth):

#     auth_header = auth.login()
#     with client:
#         client.get("/")

#         # get some discoursemes
#         discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
#                                   headers=auth_header)
#         assert discoursemes.status_code == 200
#         union_id = discoursemes.json[0]['id']

#         # create constellation
#         constellation = client.post(url_for('mmda.constellation.create'),
#                                     json={
#                                         'name': 'CDU',
#                                         'comment': 'Test Constellation HD',
#                                         'discourseme_ids': [disc['id'] for disc in discoursemes.json]
#                                     },
#                                     headers=auth_header)
#         assert constellation.status_code == 200

#         # collocation in subcorpus with global marginals
#         description = client.post(url_for('mmda.constellation.create_description', id=constellation.json['id']),
#                                   json={
#                                       'corpus_id': 1,
#                                       'subcorpus_id': 1,
#                                       's': 'text'
#                                   },
#                                   headers=auth_header)
#         assert description.status_code == 200

#         collocation = client.get(url_for('mmda.constellation.collocation',
#                                          id=constellation.json['id'],
#                                          description_id=description.json['id'],
#                                          focus_discourseme_id=union_id,
#                                          p='lemma', window=10, marginals='global'),
#                                  headers=auth_header)
#         assert collocation.status_code == 200

#         coll = client.get(url_for('mmda.constellation.get_collocation_items',
#                                   id=constellation.json['id'],
#                                   description_id=description.json['id'],
#                                   collocation_id=collocation.json['id'],
#                                   page_size=10, sort_by='O11'),
#                           headers=auth_header)

#         from pandas import DataFrame, concat
#         dfs = list()
#         for i in range(len(coll.json['discourseme_scores'][1]['item_scores'])):
#             item = coll.json['discourseme_scores'][1]['item_scores'][i]['item']
#             df = DataFrame(coll.json['discourseme_scores'][1]['item_scores'][i]['scores'])
#             df['item'] = item
#             df = df.pivot(index='item', columns='measure', values='score')
#             dfs.append(df)
#         df = concat(dfs)


@pytest.mark.now
def test_constellation_collocation(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get some discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  headers=auth_header)
        assert discoursemes.status_code == 200
        union_id = discoursemes.json[0]['id']

        # create constellation
        constellation = client.post(url_for('mmda.constellation.create'),
                                    json={
                                        'name': 'CDU',
                                        'comment': 'Test Constellation HD',
                                        'discourseme_ids': [disc['id'] for disc in discoursemes.json]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        # collocation in whole corpus
        description = client.post(url_for('mmda.constellation.create_description', id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1,
                                      's': 'text',
                                      'overlap': 'full'
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        collocation = client.post(url_for('mmda.constellation.create_collocation',
                                          id=constellation.json['id'],
                                          description_id=description.json['id']),
                                  json={
                                      'focus_discourseme_id': union_id,
                                      'p': 'lemma',
                                      'window': 10
                                  },
                                  headers=auth_header)
        assert collocation.status_code == 200

        coll = client.get(url_for('mmda.constellation.get_collocation_items',
                                  id=constellation.json['id'],
                                  description_id=description.json['id'],
                                  collocation_id=collocation.json['id'],
                                  page_size=10, sort_by='O11'),
                          headers=auth_header)
        assert coll.status_code == 200

        # collocation in subcorpus with global marginals
        description = client.post(url_for('mmda.constellation.create_description', id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1,
                                      'subcorpus_id': 1,
                                      's': 'text',
                                      'overlap': 'full'
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        collocation = client.post(url_for('mmda.constellation.create_collocation',
                                          id=constellation.json['id'],
                                          description_id=description.json['id']),
                                  json={
                                      'focus_discourseme_id': union_id,
                                      'p': 'lemma',
                                      'window': 10,
                                      'marginals': 'global'
                                  },
                                  headers=auth_header)
        assert collocation.status_code == 200

        coll_glob = client.get(url_for('mmda.constellation.get_collocation_items',
                                       id=constellation.json['id'],
                                       description_id=description.json['id'],
                                       collocation_id=collocation.json['id'],
                                       page_size=10, sort_by='O11'),
                               headers=auth_header)

        # collocation in subcorpus with local marginals
        collocation = client.post(url_for('mmda.constellation.create_collocation',
                                          id=constellation.json['id'],
                                          description_id=description.json['id']),
                                  json={
                                      'focus_discourseme_id': union_id,
                                      'p': 'lemma',
                                      'window': 10
                                  },
                                  headers=auth_header)
        assert collocation.status_code == 200

        coll_loc = client.get(url_for('mmda.constellation.get_collocation_items',
                                      id=constellation.json['id'],
                                      description_id=description.json['id'],
                                      collocation_id=collocation.json['id'],
                                      page_size=10, sort_by='O11'),
                              headers=auth_header)
        ##############
        # ITEM SCORES
        ##############

        # sizes:
        # - 149800 tokens in corpus
        # - 35980  tokens in subcorpus
        # - 14647  tokens in context of discourseme in corpus (656 match spans → 2306 match cpos + 12341 cotext cpos)
        # - 3367   tokens in context of discourseme in subcorpus (152 match spans → 578 match cpos + 2789 cotext cpos)

        # item 'die' (most frequent word in context) appears:
        # - 13765 times in corpus
        # - 3642  times in subcorpus
        # - 1434  times in context of discourseme in corpus
        # - 306   times in context of discourseme in subcorpus

        # collocation in whole corpus
        coll_conv = {c['measure']: c['score'] for c in coll.json['items'][0]['scores']}
        assert int(coll_conv['N']) == 149800
        assert int(coll_conv['R1']) == 14647
        assert int(coll_conv['C1']) == 13765
        assert int(coll_conv['O11']) == 1434

        # collocation in subcorpus with global marginals
        coll_conv = {c['measure']: c['score'] for c in coll_glob.json['items'][0]['scores']}
        assert int(coll_conv['N']) == 149800
        assert int(coll_conv['R1']) == 3367
        assert int(coll_conv['C1']) == 13765
        assert int(coll_conv['O11']) == 306

        # collocation in subcorpus with local marginals
        coll_conv = {c['measure']: c['score'] for c in coll_loc.json['items'][0]['scores']}
        assert int(coll_conv['N']) == 35980
        assert int(coll_conv['R1']) == 3367
        assert int(coll_conv['C1']) == 3642
        assert int(coll_conv['O11']) == 306

        #####################
        # DISCOURSEME SCORES
        #####################

        # sizes as above

        # discourseme "FDP" (id: 2) has three surface realisations:
        # - "F. D. P."
        # - "[ F. D. P. ]"
        # - "[ F. D. P. ]:"
        # which translates to six unigram realisations:
        # - "F."
        # - "D."
        # - "P."
        # - "["
        # - "]"
        # - "]:"

        # global counts
        # - 501 times in corpus (1711 tokens)
        # - 87  times in subcorpus (353 tokens)
        # - 290 times in context of discourseme in corpus (878 tokens)
        # - 17  times in context of discourseme in subcorpus (51 tokens)

        # item counts "F. D. P."
        # - 397 times in corpus
        # - 41  times in subcorpus
        # - 286 times in context of discourseme in corpus
        # - 17  times in context of discourseme in subcorpus

        # item counts "[ F. D. P. ]"
        # - 14 times in corpus
        # - 4  times in subcorpus
        # - 3  times in context of discourseme in corpus
        # - 0  times in context of discourseme in subcorpus

        # item counts "[ F. D. P. ]:"
        # - 90 times in corpus
        # - 42 times in subcorpus
        # - 1  times in context of discourseme in corpus
        # - 0  times in context of discourseme in subcorpus

        # unigram item counts "F."
        # - 501 times in corpus
        # - 87  times in subcorpus
        # - 290 times in context of discourseme in corpus
        # - 17  times in context of discourseme in subcorpus

        # unigram item counts "D."
        # - 501 times in corpus
        # - 87  times in subcorpus
        # - 290 times in context of discourseme in corpus
        # - 17  times in context of discourseme in subcorpus

        # unigram item counts "P."
        # - 501 times in corpus
        # - 87  times in subcorpus
        # - 290 times in context of discourseme in corpus
        # - 17  times in context of discourseme in subcorpus

        # unigram item counts "["
        # - 104 times in corpus
        # - 46  times in subcorpus
        # - 4   times in context of discourseme in corpus
        # - 0   times in context of discourseme in subcorpus

        # unigram item counts "]"
        # - 14 times in corpus
        # - 4  times in subcorpus
        # - 3  times in context of discourseme in corpus
        # - 0  times in context of discourseme in subcorpus

        # unigram item counts "]:"
        # - 90 times in corpus
        # - 42 times in subcorpus
        # - 1  times in context of discourseme in corpus
        # - 0  times in context of discourseme in subcorpus

        assert coll.json['discourseme_scores'][1]['discourseme_id'] == 2
        assert coll_glob.json['discourseme_scores'][1]['discourseme_id'] == 2
        assert coll_loc.json['discourseme_scores'][1]['discourseme_id'] == 2

        from pandas import DataFrame, concat

        ##########
        # GLOBAL
        ##########
        coll_conv = {c['measure']: c['score'] for c in coll.json['discourseme_scores'][1]['global_scores']}
        assert int(coll_conv['N']) == 149800
        assert int(coll_conv['R1']) == 14647
        assert int(coll_conv['C1']) == 501
        assert int(coll_conv['O11']) == 290

        dfs = list()
        for i in range(len(coll.json['discourseme_scores'][1]['item_scores'])):
            item = coll.json['discourseme_scores'][1]['item_scores'][i]['item']
            df = DataFrame(coll.json['discourseme_scores'][1]['item_scores'][i]['scores'])
            df['item'] = item
            df = df.pivot(index='item', columns='measure', values='score')
            dfs.append(df)
        df = concat(dfs)
        assert int(df.loc['F. D. P.', 'N']) == 149800
        assert int(df.loc['F. D. P.', 'R1']) == 14647
        assert int(df.loc['F. D. P.', 'C1']) == 397
        assert int(df.loc['F. D. P.', 'O11']) == 286
        assert int(df.loc['[ F. D. P. ]', 'N']) == 149800
        assert int(df.loc['[ F. D. P. ]', 'R1']) == 14647
        assert int(df.loc['[ F. D. P. ]', 'C1']) == 14
        assert int(df.loc['[ F. D. P. ]', 'O11']) == 3
        assert int(df.loc['[ F. D. P. ]:', 'N']) == 149800
        assert int(df.loc['[ F. D. P. ]:', 'R1']) == 14647
        assert int(df.loc['[ F. D. P. ]:', 'C1']) == 90
        assert int(df.loc['[ F. D. P. ]:', 'O11']) == 1

        dfs = list()
        for i in range(len(coll.json['discourseme_scores'][1]['unigram_item_scores'])):
            item = coll.json['discourseme_scores'][1]['unigram_item_scores'][i]['item']
            df = DataFrame(coll.json['discourseme_scores'][1]['unigram_item_scores'][i]['scores'])
            df['item'] = item
            df = df.pivot(index='item', columns='measure', values='score')
            dfs.append(df)
        df = concat(dfs)
        assert int(df.loc['F.', 'N']) == 149800
        assert int(df.loc['F.', 'R1']) == 14647
        assert int(df.loc['F.', 'C1']) == 501
        assert int(df.loc['F.', 'O11']) == 290
        assert int(df.loc['D.', 'N']) == 149800
        assert int(df.loc['D.', 'R1']) == 14647
        assert int(df.loc['D.', 'C1']) == 501
        assert int(df.loc['D.', 'O11']) == 290
        assert int(df.loc['P.', 'N']) == 149800
        assert int(df.loc['P.', 'R1']) == 14647
        assert int(df.loc['P.', 'C1']) == 501
        assert int(df.loc['P.', 'O11']) == 290
        assert int(df.loc['[', 'N']) == 149800
        assert int(df.loc['[', 'R1']) == 14647
        assert int(df.loc['[', 'C1']) == 104
        assert int(df.loc['[', 'O11']) == 4
        assert int(df.loc[']', 'N']) == 149800
        assert int(df.loc[']', 'R1']) == 14647
        assert int(df.loc[']', 'C1']) == 14
        assert int(df.loc[']', 'O11']) == 3
        assert int(df.loc[']:', 'N']) == 149800
        assert int(df.loc[']:', 'R1']) == 14647
        assert int(df.loc[']:', 'C1']) == 90
        assert int(df.loc[']:', 'O11']) == 1

        ##################################
        # SUBCORPUS WITH GLOBAL MARGINALS
        ##################################
        coll_conv = {c['measure']: c['score'] for c in coll_glob.json['discourseme_scores'][1]['global_scores']}
        assert int(coll_conv['N']) == 149800
        assert int(coll_conv['R1']) == 3367
        assert int(coll_conv['C1']) == 501
        assert int(coll_conv['O11']) == 17

        dfs = list()
        for i in range(len(coll_glob.json['discourseme_scores'][1]['item_scores'])):
            item = coll_glob.json['discourseme_scores'][1]['item_scores'][i]['item']
            df = DataFrame(coll_glob.json['discourseme_scores'][1]['item_scores'][i]['scores'])
            df['item'] = item
            df = df.pivot(index='item', columns='measure', values='score')
            dfs.append(df)
        df = concat(dfs)

        assert int(df.loc['F. D. P.', 'N']) == 149800
        assert int(df.loc['F. D. P.', 'R1']) == 3367
        assert int(df.loc['F. D. P.', 'C1']) == 397
        assert int(df.loc['F. D. P.', 'O11']) == 17
        assert int(df.loc['[ F. D. P. ]', 'N']) == 149800
        assert int(df.loc['[ F. D. P. ]', 'R1']) == 3367
        assert int(df.loc['[ F. D. P. ]', 'C1']) == 14
        assert int(df.loc['[ F. D. P. ]', 'O11']) == 0
        assert int(df.loc['[ F. D. P. ]:', 'N']) == 149800
        assert int(df.loc['[ F. D. P. ]:', 'R1']) == 3367
        assert int(df.loc['[ F. D. P. ]:', 'C1']) == 90
        assert int(df.loc['[ F. D. P. ]:', 'O11']) == 0

        dfs = list()
        for i in range(len(coll_glob.json['discourseme_scores'][1]['unigram_item_scores'])):
            item = coll_glob.json['discourseme_scores'][1]['unigram_item_scores'][i]['item']
            df = DataFrame(coll_glob.json['discourseme_scores'][1]['unigram_item_scores'][i]['scores'])
            df['item'] = item
            df = df.pivot(index='item', columns='measure', values='score')
            dfs.append(df)
        df = concat(dfs)
        assert int(df.loc['F.', 'N']) == 149800
        assert int(df.loc['F.', 'R1']) == 3367
        assert int(df.loc['F.', 'C1']) == 501
        assert int(df.loc['F.', 'O11']) == 17
        assert int(df.loc['D.', 'N']) == 149800
        assert int(df.loc['D.', 'R1']) == 3367
        assert int(df.loc['D.', 'C1']) == 501
        assert int(df.loc['D.', 'O11']) == 17
        assert int(df.loc['P.', 'N']) == 149800
        assert int(df.loc['P.', 'R1']) == 3367
        assert int(df.loc['P.', 'C1']) == 501
        assert int(df.loc['P.', 'O11']) == 17
        assert int(df.loc['[', 'N']) == 149800
        assert int(df.loc['[', 'R1']) == 3367
        assert int(df.loc['[', 'C1']) == 104
        assert int(df.loc['[', 'O11']) == 0
        assert int(df.loc[']', 'N']) == 149800
        assert int(df.loc[']', 'R1']) == 3367
        assert int(df.loc[']', 'C1']) == 14
        assert int(df.loc[']', 'O11']) == 0
        assert int(df.loc[']:', 'N']) == 149800
        assert int(df.loc[']:', 'R1']) == 3367
        assert int(df.loc[']:', 'C1']) == 90
        assert int(df.loc[']:', 'O11']) == 0

        #################################
        # SUBCORPUS WITH LOCAL MARGINALS
        #################################
        coll_conv = {c['measure']: c['score'] for c in coll_loc.json['discourseme_scores'][1]['global_scores']}
        assert int(coll_conv['N']) == 35980
        assert int(coll_conv['R1']) == 3367
        assert int(coll_conv['C1']) == 87
        assert int(coll_conv['O11']) == 17

        dfs = list()
        for i in range(len(coll_loc.json['discourseme_scores'][1]['item_scores'])):
            item = coll_loc.json['discourseme_scores'][1]['item_scores'][i]['item']
            df = DataFrame(coll_loc.json['discourseme_scores'][1]['item_scores'][i]['scores'])
            df['item'] = item
            df = df.pivot(index='item', columns='measure', values='score')
            dfs.append(df)
        df = concat(dfs)
        assert int(df.loc['F. D. P.', 'N']) == 35980
        assert int(df.loc['F. D. P.', 'R1']) == 3367
        assert int(df.loc['F. D. P.', 'C1']) == 41
        assert int(df.loc['F. D. P.', 'O11']) == 17
        assert int(df.loc['[ F. D. P. ]', 'N']) == 35980
        assert int(df.loc['[ F. D. P. ]', 'R1']) == 3367
        assert int(df.loc['[ F. D. P. ]', 'C1']) == 4
        assert int(df.loc['[ F. D. P. ]', 'O11']) == 0
        assert int(df.loc['[ F. D. P. ]:', 'N']) == 35980
        assert int(df.loc['[ F. D. P. ]:', 'R1']) == 3367
        assert int(df.loc['[ F. D. P. ]:', 'C1']) == 42
        assert int(df.loc['[ F. D. P. ]:', 'O11']) == 0

        dfs = list()
        for i in range(len(coll_loc.json['discourseme_scores'][1]['unigram_item_scores'])):
            item = coll_loc.json['discourseme_scores'][1]['unigram_item_scores'][i]['item']
            df = DataFrame(coll_loc.json['discourseme_scores'][1]['unigram_item_scores'][i]['scores'])
            df['item'] = item
            df = df.pivot(index='item', columns='measure', values='score')
            dfs.append(df)
        df = concat(dfs)
        assert int(df.loc['F.', 'N']) == 35980
        assert int(df.loc['F.', 'R1']) == 3367
        assert int(df.loc['F.', 'C1']) == 87
        assert int(df.loc['F.', 'O11']) == 17
        assert int(df.loc['D.', 'N']) == 35980
        assert int(df.loc['D.', 'R1']) == 3367
        assert int(df.loc['D.', 'C1']) == 87
        assert int(df.loc['D.', 'O11']) == 17
        assert int(df.loc['P.', 'N']) == 35980
        assert int(df.loc['P.', 'R1']) == 3367
        assert int(df.loc['P.', 'C1']) == 87
        assert int(df.loc['P.', 'O11']) == 17
        assert int(df.loc['[', 'N']) == 35980
        assert int(df.loc['[', 'R1']) == 3367
        assert int(df.loc['[', 'C1']) == 46
        assert int(df.loc['[', 'O11']) == 0
        assert int(df.loc[']', 'N']) == 35980
        assert int(df.loc[']', 'R1']) == 3367
        assert int(df.loc[']', 'C1']) == 4
        assert int(df.loc[']', 'O11']) == 0
        assert int(df.loc[']:', 'N']) == 35980
        assert int(df.loc[']:', 'R1']) == 3367
        assert int(df.loc[']:', 'C1']) == 42
        assert int(df.loc[']:', 'O11']) == 0


def test_constellation_2nd_order_collocation(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get some discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  headers=auth_header)
        assert discoursemes.status_code == 200
        union_id = discoursemes.json[0]['id']

        # create constellation
        constellation = client.post(url_for('mmda.constellation.create'),
                                    json={
                                        'name': 'CDU',
                                        'comment': 'Test Constellation HD',
                                        'discourseme_ids': [disc['id'] for disc in discoursemes.json]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        # create desription
        description = client.post(url_for('mmda.constellation.create_description', id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1,
                                      's': 'text',
                                      'overlap': 'match'
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        # collocation in whole corpus
        collocation = client.post(url_for('mmda.constellation.create_collocation',
                                          id=constellation.json['id'],
                                          description_id=description.json['id']),
                                  json={
                                      'focus_discourseme_id': union_id,
                                      'p': 'lemma',
                                      'window': 10
                                  },
                                  headers=auth_header)
        assert collocation.status_code == 200

        coll = client.get(url_for('mmda.constellation.get_collocation_items',
                                  id=constellation.json['id'],
                                  description_id=description.json['id'],
                                  collocation_id=collocation.json['id'],
                                  page_size=10, sort_by='O11'),
                          headers=auth_header)
        assert coll.status_code == 200

        assert len(coll.json['items']) == 10
        # number of tokens in window: R1 = 14647
        # most frequent collocate: "die" with O11 = 1481 co-occurrences
        assert coll.json['items'][0]['item'] == 'die'
        coll_conv = {c['measure']: c['score'] for c in coll.json['items'][0]['scores']}
        assert int(coll_conv["R1"]) == 14647
        assert int(coll_conv["O11"]) == 1434

        # 2nd order collocates with "Zuruf"
        collocation = client.post(url_for('mmda.constellation.create_collocation',
                                          id=constellation.json['id'],
                                          description_id=description.json['id']),
                                  json={
                                      'focus_discourseme_id': union_id,
                                      'p': 'lemma',
                                      'window': 10,
                                      'filter_item': 'Zuruf'
                                  },
                                  headers=auth_header)
        assert collocation.status_code == 200

        coll = client.get(url_for('mmda.constellation.get_collocation_items',
                                  id=constellation.json['id'],
                                  description_id=description.json['id'],
                                  collocation_id=collocation.json['id'],
                                  page_size=10, sort_by='O11'),
                          headers=auth_header)
        assert coll.status_code == 200

        assert len(coll.json['items']) == 10
        # number of tokens in window: R1 = 1769
        # most frequent collocate: "die" with O11 = 181 co-occurrences
        assert coll.json['items'][0]['item'] == 'die'
        coll_conv = {c['measure']: c['score'] for c in coll.json['items'][0]['scores']}
        assert int(coll_conv["R1"]) == 1769
        assert int(coll_conv["O11"]) == 180

        # 2nd order collocates with discourseme 2 ("FDP")
        collocation = client.post(url_for('mmda.constellation.create_collocation',
                                          id=constellation.json['id'],
                                          description_id=description.json['id']),
                                  json={
                                      'focus_discourseme_id': union_id,
                                      'p': 'lemma',
                                      'window': 10,
                                      'filter_discourseme_ids': [2]
                                  },
                                  headers=auth_header)
        assert collocation.status_code == 200

        coll = client.get(url_for('mmda.constellation.get_collocation_items',
                                  id=constellation.json['id'],
                                  description_id=description.json['id'],
                                  collocation_id=collocation.json['id'],
                                  page_size=10, sort_by='O11'),
                          headers=auth_header)
        assert coll.status_code == 200

        assert len(coll.json['items']) == 10
        # number of tokens in window: R1 = 6584
        # most frequent collocate: "die" with O11 = 817 co-occurrences
        assert coll.json['items'][0]['item'] == 'die'
        coll_conv = {c['measure']: c['score'] for c in coll.json['items'][0]['scores']}
        assert int(coll_conv["R1"]) == 6584
        assert int(coll_conv["O11"]) == 817

        # 2nd order collocates with "Zuruf" and discourseme "FDP"
        collocation = client.post(url_for('mmda.constellation.create_collocation',
                                          id=constellation.json['id'],
                                          description_id=description.json['id']),
                                  json={
                                      'focus_discourseme_id': union_id,
                                      'p': 'lemma',
                                      'window': 10,
                                      'filter_discourseme_ids': [2],
                                      'filter_item': 'Zuruf'
                                  },
                                  headers=auth_header)
        assert collocation.status_code == 200

        coll = client.get(url_for('mmda.constellation.get_collocation_items',
                                  id=constellation.json['id'],
                                  description_id=description.json['id'],
                                  collocation_id=collocation.json['id'],
                                  page_size=10, sort_by='O11'),
                          headers=auth_header)
        assert coll.status_code == 200

        assert len(coll.json['items']) == 10
        # number of tokens in window: R1 = 169
        # most frequent collocate: "die" with O11 = 18 co-occurrences
        assert coll.json['items'][0]['item'] == 'die'
        coll_conv = {c['measure']: c['score'] for c in coll.json['items'][0]['scores']}
        assert int(coll_conv["R1"]) == 169
        assert int(coll_conv["O11"]) == 18


def test_constellation_keyword(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  headers=auth_header)
        assert discoursemes.status_code == 200
        # union_id = discoursemes.json[0]['id']

        # create constellation
        constellation = client.post(url_for('mmda.constellation.create'),
                                    json={
                                        'name': 'CDU',
                                        'comment': 'Test Constellation HD',
                                        'discourseme_ids': [disc['id'] for disc in discoursemes.json]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        # create description
        description = client.post(url_for('mmda.constellation.create_description', id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1,
                                      'subcorpus_id': 1,
                                      's': 'text'
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        # create keyword
        keyword = client.post(url_for('mmda.constellation.create_keyword',
                                      id=constellation.json['id'],
                                      description_id=description.json['id']),
                              json={
                                  'corpus_id_reference': 1,
                                  'p_reference': 'lemma'
                              },
                              headers=auth_header)
        assert keyword.status_code == 200

        keyword_items = client.get(url_for('mmda.constellation.get_keyword_items',
                                           id=constellation.json['id'],
                                           description_id=description.json['id'],
                                           keyword_id=keyword.json['id']),
                                   headers=auth_header)
        assert keyword_items.status_code == 200
        assert len(keyword_items.json['discourseme_scores']) == len(discoursemes.json)

        # 'Kanzler(in)? | Bundeskanzler(in)?': 29 / 35980 vs. 29 / 113820
        keyword_items.json['discourseme_scores'][2]['discourseme_id'] == 3  # Kanzler
        scores = {k['measure']: k['score'] for k in keyword_items.json['discourseme_scores'][2]['global_scores']}
        assert int(scores['O11']) == 29
        assert int(scores['R1']) == 35980
        assert int(scores['O21']) == 29
        assert int(scores['R2']) == 113820

        # F. D. P.
        assert keyword_items.json['discourseme_scores'][1]['item_scores'][0]['item'] == 'F. D. P.'
        scores = {k['measure']: k['score'] for k in keyword_items.json['discourseme_scores'][1]['item_scores'][0]['scores']}
        assert int(scores['O11']) == 41
        assert int(scores['R1']) == 35980
        assert int(scores['O21']) == 356
        assert int(scores['R2']) == 113820

        assert keyword_items.json['discourseme_scores'][1]['unigram_item_scores'][0]['item'] == 'D.'
        scores = {k['measure']: k['score'] for k in keyword_items.json['discourseme_scores'][1]['unigram_item_scores'][0]['scores']}
        assert int(scores['O11']) == 87
        assert int(scores['R1']) == 35980
        assert int(scores['O21']) == 414
        assert int(scores['R2']) == 113820


def test_constellation_coordinates(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  headers=auth_header)
        assert discoursemes.status_code == 200
        # union_id = discoursemes.json[0]['id']

        # create constellation
        constellation = client.post(url_for('mmda.constellation.create'),
                                    json={
                                        'name': 'CDU',
                                        'comment': 'Test Constellation HD',
                                        'discourseme_ids': [disc['id'] for disc in discoursemes.json]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        # create description
        description = client.post(url_for('mmda.constellation.create_description', id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1,
                                      'subcorpus_id': 1,
                                      's': 'text'
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        # create keyword
        keyword = client.post(url_for('mmda.constellation.create_keyword',
                                      id=constellation.json['id'],
                                      description_id=description.json['id']),
                              json={
                                  'corpus_id_reference': 1,
                                  'p_reference': 'lemma'
                              },
                              headers=auth_header)
        assert keyword.status_code == 200

        keyword_items = client.get(url_for('mmda.constellation.get_keyword_items',
                                           id=constellation.json['id'],
                                           description_id=description.json['id'],
                                           keyword_id=keyword.json['id']),
                                   headers=auth_header)
        assert keyword_items.status_code == 200

        assert len(keyword_items.json['discourseme_coordinates']) == len(discoursemes.json)

        semantic_map_id = keyword_items.json['discourseme_coordinates'][0]['semantic_map_id']
        coordinates = client.put(url_for('mmda.constellation.set_coordinates',
                                         id=constellation.json['id'],
                                         description_id=description.json['id'],
                                         semantic_map_id=semantic_map_id),
                                 json={
                                     'discourseme_id': 1,
                                     'x_user': 12,
                                     'y_user': 15
                                 },
                                 headers=auth_header)
        assert coordinates.status_code == 200
        assert len(coordinates.json) == len(discoursemes.json)
        disc1_coordinates = [d for d in coordinates.json if d['discourseme_id'] == 1][0]
        assert int(disc1_coordinates['x_user']) == 12
        assert int(disc1_coordinates['y_user']) == 15

        coordinates = client.get(url_for('mmda.constellation.get_coordinates',
                                         id=constellation.json['id'],
                                         description_id=description.json['id'],
                                         semantic_map_id=semantic_map_id),
                                 headers=auth_header)
        assert coordinates.status_code == 200
        disc1_coordinates = [d for d in coordinates.json if d['discourseme_id'] == 1][0]
        assert int(disc1_coordinates['x_user']) == 12
        assert int(disc1_coordinates['y_user']) == 15

        # collocation in whole corpus
        collocation = client.post(url_for('mmda.constellation.create_collocation',
                                          id=constellation.json['id'],
                                          description_id=description.json['id']),
                                  json={
                                      'focus_discourseme_id': discoursemes.json[0]['id'],
                                      'p': 'lemma',
                                      'window': 10
                                  },
                                  headers=auth_header)
        assert collocation.status_code == 200

        collocation_items = client.get(url_for('mmda.constellation.get_collocation_items',
                                               id=constellation.json['id'],
                                               description_id=description.json['id'],
                                               collocation_id=collocation.json['id'],
                                               page_size=10, sort_by='O11'),
                                       headers=auth_header)
        assert collocation_items.status_code == 200

        assert len(collocation_items.json['discourseme_coordinates']) == len(discoursemes.json)


def test_constellation_keyword_empty_queries(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # discourseme that is not in reference: "Bereicherung"
        # discourseme without matches: "Bereicherung2"
        discourseme = client.post(url_for('mmda.discourseme.create'),
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
        constellation = client.post(url_for('mmda.constellation.create'),
                                    json={
                                        'name': 'CDU',
                                        'comment': 'Test Constellation HD',
                                        'discourseme_ids': [disc['id'] for disc in discoursemes.json]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        # create description
        description = client.post(url_for('mmda.constellation.create_description', id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1,
                                      'subcorpus_id': 1,
                                      's': 'text'
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        # create keyword
        keyword = client.post(url_for('mmda.constellation.create_keyword',
                                      id=constellation.json['id'],
                                      description_id=description.json['id']),
                              json={
                                  'corpus_id_reference': 1,
                                  'p_reference': 'lemma'
                              },
                              headers=auth_header)
        assert keyword.status_code == 200

        keyword_items = client.get(url_for('mmda.constellation.get_keyword_items',
                                           id=constellation.json['id'],
                                           description_id=description.json['id'],
                                           keyword_id=keyword.json['id']),
                                   headers=auth_header)
        assert keyword_items.status_code == 200


def test_constellation_collocation_empty_queries(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # discourseme that is not in reference: "Bereicherung"
        # discourseme without matches: "Bereicherung2"
        discourseme = client.post(url_for('mmda.discourseme.create'),
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
        constellation = client.post(url_for('mmda.constellation.create'),
                                    json={
                                        'name': 'CDU',
                                        'comment': 'Test Constellation HD',
                                        'discourseme_ids': [disc['id'] for disc in discoursemes.json]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        # create description
        description = client.post(url_for('mmda.constellation.create_description', id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1,
                                      'subcorpus_id': 1,
                                      's': 'text'
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        # create collocation
        collocation = client.post(url_for('mmda.constellation.create_collocation',
                                          id=constellation.json['id'],
                                          description_id=description.json['id']),
                                  json={
                                      'focus_discourseme_id': 1,
                                      'p': 'lemma',
                                      'window': 10
                                  },
                                  headers=auth_header)
        assert collocation.status_code == 200

        collocation_items = client.get(url_for('mmda.constellation.get_collocation_items',
                                               id=constellation.json['id'],
                                               description_id=description.json['id'],
                                               collocation_id=collocation.json['id']),
                                       headers=auth_header)
        assert collocation_items.status_code == 200
