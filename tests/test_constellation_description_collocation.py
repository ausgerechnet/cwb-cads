from flask import url_for
import pytest


def test_constellation_collocation_put(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get some discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  headers=auth_header)
        assert discoursemes.status_code == 200
        union_id = discoursemes.json[0]['id']

        # create constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'CDU',
                                        'comment': 'Test Constellation HD',
                                        'discourseme_ids': [disc['id'] for disc in discoursemes.json]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        # collocation in whole corpus
        description = client.post(url_for('mmda.constellation.description.create_description', constellation_id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1,
                                      's': 'text',
                                      'overlap': 'full'
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        collocation = client.put(url_for('mmda.constellation.description.collocation.get_or_create_collocation',
                                         constellation_id=constellation.json['id'],
                                         description_id=description.json['id']),
                                 json={
                                     'focus_discourseme_id': union_id,
                                     'p': 'lemma',
                                     'window': 10,
                                     'include_negative': True
                                 },
                                 headers=auth_header)
        assert collocation.status_code == 200

        collocation = client.put(url_for('mmda.constellation.description.collocation.get_or_create_collocation',
                                         constellation_id=constellation.json['id'],
                                         description_id=description.json['id']),
                                 json={
                                     'focus_discourseme_id': union_id,
                                     'p': 'lemma',
                                     'window': 10,
                                     'include_negative': True
                                 },
                                 headers=auth_header)
        assert collocation.status_code == 200

        collocation = client.put(url_for('mmda.constellation.description.collocation.get_or_create_collocation',
                                         constellation_id=constellation.json['id'],
                                         description_id=description.json['id']),
                                 json={
                                     'focus_discourseme_id': union_id,
                                     'p': 'lemma',
                                     'window': 10,
                                     'include_negative': True
                                 },
                                 headers=auth_header)
        assert collocation.status_code == 200


def test_constellation_collocation_scaled_scores(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get some discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  headers=auth_header)
        assert discoursemes.status_code == 200
        union_id = discoursemes.json[0]['id']

        # create constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'CDU',
                                        'comment': 'Test Constellation HD',
                                        'discourseme_ids': [disc['id'] for disc in discoursemes.json]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        # collocation in whole corpus
        description = client.post(url_for('mmda.constellation.description.create_description', constellation_id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1,
                                      's': 'text',
                                      'overlap': 'full'
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        collocation = client.post(url_for('mmda.constellation.description.collocation.create_collocation',
                                          constellation_id=constellation.json['id'],
                                          description_id=description.json['id']),
                                  json={
                                      'focus_discourseme_id': union_id,
                                      'p': 'lemma',
                                      'window': 10,
                                      'include_negative': True
                                  },
                                  headers=auth_header)
        assert collocation.status_code == 200

        coll = client.get(url_for('mmda.constellation.description.collocation.get_collocation_items',
                                  constellation_id=constellation.json['id'],
                                  description_id=description.json['id'],
                                  collocation_id=collocation.json['id'],
                                  page_size=10, sort_by='O11'),
                          headers=auth_header)
        assert coll.status_code == 200

        assert 'scaled_scores' in coll.json['items'][0]
        from pprint import pprint
        pprint(coll.json['items'][0])

        coll = client.get(url_for('mmda.constellation.description.collocation.get_collocation_map',
                                  constellation_id=constellation.json['id'],
                                  description_id=description.json['id'],
                                  collocation_id=collocation.json['id'],
                                  page_size=10, sort_by='z_score'),
                          headers=auth_header)
        assert coll.status_code == 200
        pprint(coll.json['score_deciles'])


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
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'CDU',
                                        'comment': 'Test Constellation HD',
                                        'discourseme_ids': [disc['id'] for disc in discoursemes.json]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        # collocation in whole corpus
        description = client.post(url_for('mmda.constellation.description.create_description', constellation_id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1,
                                      's': 'text',
                                      'overlap': 'full'
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        collocation = client.post(url_for('mmda.constellation.description.collocation.create_collocation',
                                          constellation_id=constellation.json['id'],
                                          description_id=description.json['id']),
                                  json={
                                      'focus_discourseme_id': union_id,
                                      'p': 'lemma',
                                      'window': 10,
                                      'include_negative': True
                                  },
                                  headers=auth_header)
        assert collocation.status_code == 200

        coll = client.get(url_for('mmda.constellation.description.collocation.get_collocation_items',
                                  constellation_id=constellation.json['id'],
                                  description_id=description.json['id'],
                                  collocation_id=collocation.json['id'],
                                  page_size=10, sort_by='O11'),
                          headers=auth_header)
        assert coll.status_code == 200

        # collocation in subcorpus with global marginals
        description = client.post(url_for('mmda.constellation.description.create_description', constellation_id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1,
                                      'subcorpus_id': 1,
                                      's': 'text',
                                      'overlap': 'full'
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        collocation = client.post(url_for('mmda.constellation.description.collocation.create_collocation',
                                          constellation_id=constellation.json['id'],
                                          description_id=description.json['id']),
                                  json={
                                      'focus_discourseme_id': union_id,
                                      'p': 'lemma',
                                      'window': 10,
                                      'marginals': 'global',
                                      'include_negative': True
                                  },
                                  headers=auth_header)
        assert collocation.status_code == 200

        coll_glob = client.get(url_for('mmda.constellation.description.collocation.get_collocation_items',
                                       constellation_id=constellation.json['id'],
                                       description_id=description.json['id'],
                                       collocation_id=collocation.json['id'],
                                       page_size=10, sort_by='O11'),
                               headers=auth_header)

        # collocation in subcorpus with local marginals
        collocation = client.post(url_for('mmda.constellation.description.collocation.create_collocation',
                                          constellation_id=constellation.json['id'],
                                          description_id=description.json['id']),
                                  json={
                                      'focus_discourseme_id': union_id,
                                      'p': 'lemma',
                                      'window': 10,
                                      'include_negative': True
                                  },
                                  headers=auth_header)
        assert collocation.status_code == 200

        coll_loc = client.get(url_for('mmda.constellation.description.collocation.get_collocation_items',
                                      constellation_id=constellation.json['id'],
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
        coll_conv = {c['measure']: c['score'] for c in coll.json['items'][0]['scores'] + coll.json['items'][0]['raw_scores']}
        assert int(coll_conv['N']) == 149800
        assert int(coll_conv['R1']) == 14647
        assert int(coll_conv['C1']) == 13765
        assert int(coll_conv['O11']) == 1434

        # collocation in subcorpus with global marginals
        coll_conv = {c['measure']: c['score'] for c in coll_glob.json['items'][0]['scores'] + coll_glob.json['items'][0]['raw_scores']}
        assert int(coll_conv['N']) == 149800
        assert int(coll_conv['R1']) == 3367
        assert int(coll_conv['C1']) == 13765
        assert int(coll_conv['O11']) == 306

        # collocation in subcorpus with local marginals
        coll_conv = {c['measure']: c['score'] for c in coll_loc.json['items'][0]['scores'] + coll_loc.json['items'][0]['raw_scores']}
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
            df = DataFrame(coll.json['discourseme_scores'][1]['item_scores'][i]['raw_scores'])
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
            df = DataFrame(coll.json['discourseme_scores'][1]['unigram_item_scores'][i]['raw_scores'])
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
            df = DataFrame(coll_glob.json['discourseme_scores'][1]['item_scores'][i]['raw_scores'])
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
            df = DataFrame(coll_glob.json['discourseme_scores'][1]['unigram_item_scores'][i]['raw_scores'])
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
            df = DataFrame(coll_loc.json['discourseme_scores'][1]['item_scores'][i]['raw_scores'])
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
            df = DataFrame(coll_loc.json['discourseme_scores'][1]['unigram_item_scores'][i]['raw_scores'])
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
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'CDU',
                                        'comment': 'Test Constellation HD',
                                        'discourseme_ids': [disc['id'] for disc in discoursemes.json]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        # create desription
        description = client.post(url_for('mmda.constellation.description.create_description', constellation_id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1,
                                      's': 'text',
                                      'overlap': 'match'
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        # collocation in whole corpus
        collocation = client.post(url_for('mmda.constellation.description.collocation.create_collocation',
                                          constellation_id=constellation.json['id'],
                                          description_id=description.json['id']),
                                  json={
                                      'focus_discourseme_id': union_id,
                                      'p': 'lemma',
                                      'window': 10
                                  },
                                  headers=auth_header)
        assert collocation.status_code == 200

        coll = client.get(url_for('mmda.constellation.description.collocation.get_collocation_items',
                                  constellation_id=constellation.json['id'],
                                  description_id=description.json['id'],
                                  collocation_id=collocation.json['id'],
                                  page_size=10, sort_by='O11'),
                          headers=auth_header)
        assert coll.status_code == 200

        assert len(coll.json['items']) == 10
        # number of tokens in window: R1 = 14647
        # most frequent collocate: "die" with O11 = 1481 co-occurrences
        assert coll.json['items'][0]['item'] == 'die'
        coll_conv = {c['measure']: c['score'] for c in coll.json['items'][0]['scores'] + coll.json['items'][0]['raw_scores']}
        assert int(coll_conv["R1"]) == 14647
        assert int(coll_conv["O11"]) == 1434

        # 2nd order collocates with "Zuruf"
        collocation = client.post(url_for('mmda.constellation.description.collocation.create_collocation',
                                          constellation_id=constellation.json['id'],
                                          description_id=description.json['id']),
                                  json={
                                      'focus_discourseme_id': union_id,
                                      'p': 'lemma',
                                      'window': 10,
                                      'filter_item': 'Zuruf'
                                  },
                                  headers=auth_header)
        assert collocation.status_code == 200

        coll = client.get(url_for('mmda.constellation.description.collocation.get_collocation_items',
                                  constellation_id=constellation.json['id'],
                                  description_id=description.json['id'],
                                  collocation_id=collocation.json['id'],
                                  page_size=10, sort_by='O11'),
                          headers=auth_header)
        assert coll.status_code == 200

        assert len(coll.json['items']) == 10
        # number of tokens in window: R1 = 1769
        # most frequent collocate: "die" with O11 = 181 co-occurrences
        assert coll.json['items'][0]['item'] == 'die'
        coll_conv = {c['measure']: c['score'] for c in coll.json['items'][0]['scores'] + coll.json['items'][0]['raw_scores']}
        assert int(coll_conv["R1"]) == 1769
        assert int(coll_conv["O11"]) == 180

        # 2nd order collocates with discourseme 2 ("FDP")
        collocation = client.post(url_for('mmda.constellation.description.collocation.create_collocation',
                                          constellation_id=constellation.json['id'],
                                          description_id=description.json['id']),
                                  json={
                                      'focus_discourseme_id': union_id,
                                      'p': 'lemma',
                                      'window': 10,
                                      'filter_discourseme_ids': [2]
                                  },
                                  headers=auth_header)
        assert collocation.status_code == 200

        coll = client.get(url_for('mmda.constellation.description.collocation.get_collocation_items',
                                  constellation_id=constellation.json['id'],
                                  description_id=description.json['id'],
                                  collocation_id=collocation.json['id'],
                                  page_size=10, sort_by='O11'),
                          headers=auth_header)
        assert coll.status_code == 200

        assert len(coll.json['items']) == 10
        # number of tokens in window: R1 = 6584
        # most frequent collocate: "die" with O11 = 817 co-occurrences
        assert coll.json['items'][0]['item'] == 'die'
        coll_conv = {c['measure']: c['score'] for c in coll.json['items'][0]['scores'] + coll.json['items'][0]['raw_scores']}
        assert int(coll_conv["R1"]) == 6584
        assert int(coll_conv["O11"]) == 817

        # 2nd order collocates with "Zuruf" and discourseme "FDP"
        collocation = client.post(url_for('mmda.constellation.description.collocation.create_collocation',
                                          constellation_id=constellation.json['id'],
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

        coll = client.get(url_for('mmda.constellation.description.collocation.get_collocation_items',
                                  constellation_id=constellation.json['id'],
                                  description_id=description.json['id'],
                                  collocation_id=collocation.json['id'],
                                  page_size=10, sort_by='O11'),
                          headers=auth_header)
        assert coll.status_code == 200

        assert len(coll.json['items']) == 10
        # number of tokens in window: R1 = 169
        # most frequent collocate: "die" with O11 = 18 co-occurrences
        assert coll.json['items'][0]['item'] == 'die'
        coll_conv = {c['measure']: c['score'] for c in coll.json['items'][0]['scores'] + coll.json['items'][0]['raw_scores']}
        assert int(coll_conv["R1"]) == 169
        assert int(coll_conv["O11"]) == 18


def test_constellation_collocation_empty_queries(client, auth):

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

        # create collocation
        collocation = client.post(url_for('mmda.constellation.description.collocation.create_collocation',
                                          constellation_id=constellation.json['id'],
                                          description_id=description.json['id']),
                                  json={
                                      'focus_discourseme_id': 1,
                                      'p': 'lemma',
                                      'window': 10
                                  },
                                  headers=auth_header)
        assert collocation.status_code == 200

        collocation_items = client.get(url_for('mmda.constellation.description.collocation.get_collocation_items',
                                               constellation_id=constellation.json['id'],
                                               description_id=description.json['id'],
                                               collocation_id=collocation.json['id']),
                                       headers=auth_header)
        assert collocation_items.status_code == 200


@pytest.mark.now
def test_constellation_collocation_map(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get some discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  headers=auth_header)
        assert discoursemes.status_code == 200
        union_id = discoursemes.json[0]['id']

        # create constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'CDU',
                                        'comment': 'Test Constellation HD',
                                        'discourseme_ids': [disc['id'] for disc in discoursemes.json]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        # collocation in whole corpus
        description = client.post(url_for('mmda.constellation.description.create_description', constellation_id=constellation.json['id']),
                                  json={
                                      'corpus_id': 1,
                                      's': 'text',
                                      'overlap': 'full'
                                  },
                                  headers=auth_header)
        assert description.status_code == 200

        collocation = client.post(url_for('mmda.constellation.description.collocation.create_collocation',
                                          constellation_id=constellation.json['id'],
                                          description_id=description.json['id']),
                                  json={
                                      'focus_discourseme_id': union_id,
                                      'p': 'lemma',
                                      'window': 10,
                                      'include_negative': True
                                  },
                                  headers=auth_header)
        assert collocation.status_code == 200

        coll = client.get(url_for('mmda.constellation.description.collocation.get_collocation_map',
                                  constellation_id=constellation.json['id'],
                                  description_id=description.json['id'],
                                  collocation_id=collocation.json['id'],
                                  page_size=50, sort_by='conservative_log_ratio'),
                          headers=auth_header)
        assert coll.status_code == 200

        assert coll.json['map'][0]['discourseme_id'] is None
        assert coll.json['map'][9]['discourseme_id'] is None

        from pprint import pprint
        pprint(coll.json['score_deciles'])


def test_constellation_collocation_coordinates(client, auth):

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

        # collocation in whole corpus
        collocation = client.post(url_for('mmda.constellation.description.collocation.create_collocation',
                                          constellation_id=constellation.json['id'],
                                          description_id=description.json['id']),
                                  json={
                                      'focus_discourseme_id': discoursemes[0]['id'],
                                      'p': 'lemma',
                                      'window': 10
                                  },
                                  headers=auth_header)
        assert collocation.status_code == 200

        # their items
        collocation_items = client.get(url_for('mmda.constellation.description.collocation.get_collocation_items',
                                               constellation_id=constellation.json['id'],
                                               description_id=description.json['id'],
                                               collocation_id=collocation.json['id'],
                                               page_size=10, sort_by='O11', return_coordinates=True),
                                       headers=auth_header)
        assert collocation_items.status_code == 200

        assert len(collocation_items.json['discourseme_coordinates']) == len(discoursemes)


def test_constellation_collocation_map_nan(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  headers=auth_header)
        assert discoursemes.status_code == 200
        discoursemes = discoursemes.json[0:4]

        discourseme = client.post(url_for('mmda.discourseme.create_discourseme'),
                                  json={
                                      'name': 'Empty',
                                      'comment': 'Testdiskursem ohne Treffer',
                                      'template': [
                                          {'surface': 'naaaah', 'p': 'lemma'}
                                      ],
                                  },
                                  content_type='application/json',
                                  headers=auth_header)
        assert discourseme.status_code == 200

        # create constellation
        constellation = client.post(url_for('mmda.constellation.create_constellation'),
                                    json={
                                        'name': 'CDU',
                                        'comment': 'Test Constellation HD',
                                        'discourseme_ids': [disc['id'] for disc in discoursemes] + [discourseme.json['id']]
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

        # collocation in whole corpus
        collocation = client.post(url_for('mmda.constellation.description.collocation.create_collocation',
                                          constellation_id=constellation.json['id'],
                                          description_id=description.json['id']),
                                  json={
                                      'focus_discourseme_id': discoursemes[0]['id'],
                                      'p': 'lemma',
                                      'window': 10
                                  },
                                  headers=auth_header)
        assert collocation.status_code == 200

        # their items
        collocation_items = client.get(url_for('mmda.constellation.description.collocation.get_collocation_items',
                                               constellation_id=constellation.json['id'],
                                               description_id=description.json['id'],
                                               collocation_id=collocation.json['id'],
                                               page_size=10, sort_by='O11', return_coordinates=True),
                                       headers=auth_header)
        assert collocation_items.status_code == 200

        assert len(collocation_items.json['discourseme_scores']) == len(discoursemes) + 1
