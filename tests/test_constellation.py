from flask import url_for
import pytest


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
        constellation = client.post(url_for('constellation.create'),
                                    json={
                                        'name': 'CDU',
                                        'description': 'Test Constellation 1',
                                        'filter_discourseme_ids': [discourseme['id']]
                                    },
                                    headers=auth_header)

        constellation = client.get(url_for('constellation.get_constellation', id=constellation.json['id']),
                                   headers=auth_header)

        constellations = client.get(url_for('constellation.get_constellations'),
                                    headers=auth_header)

        assert constellations.status_code == 200


def test_constellation_concordance(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get some discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  headers=auth_header).json

        # corpora
        corpora = client.get(url_for('corpus.get_corpora'),
                             headers=auth_header).json
        corpus = corpora[0]

        # create constellation
        constellation = client.post(url_for('constellation.create'),
                                    json={
                                        'name': 'CDU',
                                        'description': 'Test Constellation HD',
                                        'filter_discourseme_ids': [discoursemes[0]['id']],
                                        'highlight_discourseme_ids': [disc['id'] for disc in discoursemes[1:len(discoursemes)]]
                                    },
                                    headers=auth_header)

        constellation = client.get(url_for('constellation.get_constellation', id=constellation.json['id']),
                                   headers=auth_header).json

        concordance = client.get(url_for('constellation.concordance_lines',
                                         id=constellation['id'], corpus_id=corpus['id']),
                                 follow_redirects=True,
                                 headers=auth_header)

        assert concordance.status_code == 200


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

        # corpora
        corpora = client.get(url_for('corpus.get_corpora'),
                             headers=auth_header).json
        corpus = corpora[0]

        # create constellation
        constellation = client.post(url_for('constellation.create'),
                                    json={
                                        'name': 'CDU',
                                        'description': 'Test Constellation HD',
                                        'filter_discourseme_ids': [union_id],
                                        'highlight_discourseme_ids': [disc['id'] for disc in discoursemes[1:len(discoursemes)]]
                                    },
                                    headers=auth_header).json

        # filter item
        lines = client.get(url_for('constellation.concordance_lines',
                                   id=constellation['id'], corpus_id=corpus['id'],
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
        lines = client.get(url_for('constellation.concordance_lines',
                                   id=constellation['id'], corpus_id=corpus['id'],
                                   filter_discourseme_ids=[reaktion_id],
                                   window=10),
                           follow_redirects=True,
                           headers=auth_header)
        assert lines.status_code == 200

        for line in lines.json['lines']:
            assert reaktion_id in [r['discourseme_id'] for r in line['discourseme_ranges']]

        nr_reaktion = lines.json['nr_lines']

        # filter two discoursemes
        lines = client.get(url_for('constellation.concordance_lines',
                                   id=constellation['id'], corpus_id=corpus['id'],
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
        lines = client.get(url_for('constellation.concordance_lines',
                                   id=constellation['id'], corpus_id=corpus['id'],
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


def test_constellation_collocation(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get some discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  headers=auth_header)

        assert discoursemes.status_code == 200
        union_id = discoursemes.json[0]['id']

        # corpora
        corpora = client.get(url_for('corpus.get_corpora'),
                             headers=auth_header)
        assert corpora.status_code == 200
        corpus = corpora.json[0]

        # create constellation
        constellation = client.post(url_for('constellation.create'),
                                    json={
                                        'name': 'CDU',
                                        'description': 'Test Constellation HD',
                                        'filter_discourseme_ids': [union_id],
                                        'highlight_discourseme_ids': [disc['id'] for disc in discoursemes.json[1:len(discoursemes.json)]]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        # collocation in whole corpus
        collocation = client.get(url_for('constellation.collocation',
                                         id=constellation.json['id'], corpus_id=corpus['id'],
                                         p='lemma', window=10),
                                 follow_redirects=True,
                                 headers=auth_header)
        assert collocation.status_code == 200

        coll = client.get(url_for('collocation.get_collocation_items',
                                  id=collocation.json['id'],
                                  page_size=10, sort_by='O11'),
                          follow_redirects=True,
                          headers=auth_header)
        assert coll.status_code == 200

        # collocation in subcorpus with global marginals
        collocation = client.get(url_for('constellation.collocation',
                                         id=constellation.json['id'], corpus_id=corpus['id'], subcorpus_id=1,
                                         p='lemma', window=10, marginals='global'),
                                 follow_redirects=True,
                                 headers=auth_header)
        assert collocation.status_code == 200

        coll_glob = client.get(url_for('collocation.get_collocation_items',
                                       id=collocation.json['id'],
                                       page_size=10, sort_by='O11'),
                               follow_redirects=True,
                               headers=auth_header)

        # collocation in subcorpus with local marginals
        collocation = client.get(url_for('constellation.collocation',
                                         id=constellation.json['id'], corpus_id=corpus['id'], subcorpus_id=1,
                                         p='lemma', window=10),
                                 follow_redirects=True,
                                 headers=auth_header)
        assert collocation.status_code == 200

        coll_loc = client.get(url_for('collocation.get_collocation_items',
                                      id=collocation.json['id'],
                                      page_size=10, sort_by='O11'),
                              follow_redirects=True,
                              headers=auth_header)

        ##############
        # ITEM SCORES
        ##############

        # sizes:
        # - 149800 tokens in corpus
        # - 35980  tokens in subcorpus
        # - 14989  tokens in context of discourseme in corpus
        # - 3448   tokens in context of discourseme in subcorpus

        # item 'die' (most frequent word in context) appears:
        # - 13765 times in corpus
        # - 3642  times in subcorpus
        # - 1481  times in context of discourseme in corpus
        # - 310   times in context of discourseme in subcorpus

        # collocation in whole corpus
        coll_conv = {c['measure']: c['score'] for c in coll.json['items'][0]['scores']}
        assert int(coll_conv['N']) == 149800
        assert int(coll_conv['R1']) == 14989
        assert int(coll_conv['C1']) == 13765
        assert int(coll_conv['O11']) == 1481

        # collocation in subcorpus with global marginals
        coll_conv = {c['measure']: c['score'] for c in coll_glob.json['items'][0]['scores']}
        assert int(coll_conv['N']) == 149800
        assert int(coll_conv['R1']) == 3448
        assert int(coll_conv['C1']) == 13765
        assert int(coll_conv['O11']) == 310

        # collocation in subcorpus with local marginals
        coll_conv = {c['measure']: c['score'] for c in coll_loc.json['items'][0]['scores']}
        assert int(coll_conv['N']) == 35980
        assert int(coll_conv['R1']) == 3448
        assert int(coll_conv['C1']) == 3642
        assert int(coll_conv['O11']) == 310

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

        assert coll.json['discourseme_scores'][0]['discourseme_id'] == 2
        assert coll_glob.json['discourseme_scores'][0]['discourseme_id'] == 2
        assert coll_loc.json['discourseme_scores'][0]['discourseme_id'] == 2

        from pandas import DataFrame, concat
        ##########
        # GLOBAL
        ##########
        coll_conv = {c['measure']: c['score'] for c in coll.json['discourseme_scores'][0]['global_scores']}
        assert int(coll_conv['N']) == 149800
        assert int(coll_conv['R1']) == 14989
        assert int(coll_conv['C1']) == 501
        assert int(coll_conv['O11']) == 290

        dfs = list()
        for i in range(len(coll.json['discourseme_scores'][0]['item_scores'])):
            item = coll.json['discourseme_scores'][0]['item_scores'][i]['item']
            df = DataFrame(coll.json['discourseme_scores'][0]['item_scores'][i]['scores'])
            df['item'] = item
            df = df.pivot(index='item', columns='measure', values='score')
            dfs.append(df)
        df = concat(dfs)
        assert int(df.loc['F. D. P.', 'N']) == 149800
        assert int(df.loc['F. D. P.', 'R1']) == 14989
        assert int(df.loc['F. D. P.', 'C1']) == 397
        assert int(df.loc['F. D. P.', 'O11']) == 286
        assert int(df.loc['[ F. D. P. ]', 'N']) == 149800
        assert int(df.loc['[ F. D. P. ]', 'R1']) == 14989
        assert int(df.loc['[ F. D. P. ]', 'C1']) == 14
        assert int(df.loc['[ F. D. P. ]', 'O11']) == 3
        assert int(df.loc['[ F. D. P. ]:', 'N']) == 149800
        assert int(df.loc['[ F. D. P. ]:', 'R1']) == 14989
        assert int(df.loc['[ F. D. P. ]:', 'C1']) == 90
        assert int(df.loc['[ F. D. P. ]:', 'O11']) == 1

        dfs = list()
        for i in range(len(coll.json['discourseme_scores'][0]['unigram_item_scores'])):
            item = coll.json['discourseme_scores'][0]['unigram_item_scores'][i]['item']
            df = DataFrame(coll.json['discourseme_scores'][0]['unigram_item_scores'][i]['scores'])
            df['item'] = item
            df = df.pivot(index='item', columns='measure', values='score')
            dfs.append(df)
        df = concat(dfs)
        assert int(df.loc['F.', 'N']) == 149800
        assert int(df.loc['F.', 'R1']) == 14989
        assert int(df.loc['F.', 'C1']) == 501
        assert int(df.loc['F.', 'O11']) == 290
        assert int(df.loc['D.', 'N']) == 149800
        assert int(df.loc['D.', 'R1']) == 14989
        assert int(df.loc['D.', 'C1']) == 501
        assert int(df.loc['D.', 'O11']) == 290
        assert int(df.loc['P.', 'N']) == 149800
        assert int(df.loc['P.', 'R1']) == 14989
        assert int(df.loc['P.', 'C1']) == 501
        assert int(df.loc['P.', 'O11']) == 290
        assert int(df.loc['[', 'N']) == 149800
        assert int(df.loc['[', 'R1']) == 14989
        assert int(df.loc['[', 'C1']) == 104
        assert int(df.loc['[', 'O11']) == 4
        assert int(df.loc[']', 'N']) == 149800
        assert int(df.loc[']', 'R1']) == 14989
        assert int(df.loc[']', 'C1']) == 14
        assert int(df.loc[']', 'O11']) == 3
        assert int(df.loc[']:', 'N']) == 149800
        assert int(df.loc[']:', 'R1']) == 14989
        assert int(df.loc[']:', 'C1']) == 90
        assert int(df.loc[']:', 'O11']) == 1

        ##################################
        # SUBCORPUS WITH GLOBAL MARGINALS
        ##################################
        coll_conv = {c['measure']: c['score'] for c in coll_glob.json['discourseme_scores'][0]['global_scores']}
        assert int(coll_conv['N']) == 149800
        assert int(coll_conv['R1']) == 3448
        assert int(coll_conv['C1']) == 501
        assert int(coll_conv['O11']) == 17

        dfs = list()
        for i in range(len(coll_glob.json['discourseme_scores'][0]['item_scores'])):
            item = coll_glob.json['discourseme_scores'][0]['item_scores'][i]['item']
            df = DataFrame(coll_glob.json['discourseme_scores'][0]['item_scores'][i]['scores'])
            df['item'] = item
            df = df.pivot(index='item', columns='measure', values='score')
            dfs.append(df)
        df = concat(dfs)

        assert int(df.loc['F. D. P.', 'N']) == 149800
        assert int(df.loc['F. D. P.', 'R1']) == 3448
        assert int(df.loc['F. D. P.', 'C1']) == 397
        assert int(df.loc['F. D. P.', 'O11']) == 17
        assert int(df.loc['[ F. D. P. ]', 'N']) == 149800
        assert int(df.loc['[ F. D. P. ]', 'R1']) == 3448
        assert int(df.loc['[ F. D. P. ]', 'C1']) == 14
        assert int(df.loc['[ F. D. P. ]', 'O11']) == 0
        assert int(df.loc['[ F. D. P. ]:', 'N']) == 149800
        assert int(df.loc['[ F. D. P. ]:', 'R1']) == 3448
        assert int(df.loc['[ F. D. P. ]:', 'C1']) == 90
        assert int(df.loc['[ F. D. P. ]:', 'O11']) == 0

        dfs = list()
        for i in range(len(coll_glob.json['discourseme_scores'][0]['unigram_item_scores'])):
            item = coll_glob.json['discourseme_scores'][0]['unigram_item_scores'][i]['item']
            df = DataFrame(coll_glob.json['discourseme_scores'][0]['unigram_item_scores'][i]['scores'])
            df['item'] = item
            df = df.pivot(index='item', columns='measure', values='score')
            dfs.append(df)
        df = concat(dfs)
        assert int(df.loc['F.', 'N']) == 149800
        assert int(df.loc['F.', 'R1']) == 3448
        assert int(df.loc['F.', 'C1']) == 501
        assert int(df.loc['F.', 'O11']) == 17
        assert int(df.loc['D.', 'N']) == 149800
        assert int(df.loc['D.', 'R1']) == 3448
        assert int(df.loc['D.', 'C1']) == 501
        assert int(df.loc['D.', 'O11']) == 17
        assert int(df.loc['P.', 'N']) == 149800
        assert int(df.loc['P.', 'R1']) == 3448
        assert int(df.loc['P.', 'C1']) == 501
        assert int(df.loc['P.', 'O11']) == 17
        assert int(df.loc['[', 'N']) == 149800
        assert int(df.loc['[', 'R1']) == 3448
        assert int(df.loc['[', 'C1']) == 104
        assert int(df.loc['[', 'O11']) == 0
        assert int(df.loc[']', 'N']) == 149800
        assert int(df.loc[']', 'R1']) == 3448
        assert int(df.loc[']', 'C1']) == 14
        assert int(df.loc[']', 'O11']) == 0
        assert int(df.loc[']:', 'N']) == 149800
        assert int(df.loc[']:', 'R1']) == 3448
        assert int(df.loc[']:', 'C1']) == 90
        assert int(df.loc[']:', 'O11']) == 0

        #################################
        # SUBCORPUS WITH LOCAL MARGINALS
        #################################
        coll_conv = {c['measure']: c['score'] for c in coll_loc.json['discourseme_scores'][0]['global_scores']}
        assert int(coll_conv['N']) == 35980
        assert int(coll_conv['R1']) == 3448
        assert int(coll_conv['C1']) == 87
        assert int(coll_conv['O11']) == 17

        dfs = list()
        for i in range(len(coll_loc.json['discourseme_scores'][0]['item_scores'])):
            item = coll_loc.json['discourseme_scores'][0]['item_scores'][i]['item']
            df = DataFrame(coll_loc.json['discourseme_scores'][0]['item_scores'][i]['scores'])
            df['item'] = item
            df = df.pivot(index='item', columns='measure', values='score')
            dfs.append(df)
        df = concat(dfs)
        assert int(df.loc['F. D. P.', 'N']) == 35980
        assert int(df.loc['F. D. P.', 'R1']) == 3448
        assert int(df.loc['F. D. P.', 'C1']) == 41
        assert int(df.loc['F. D. P.', 'O11']) == 17
        assert int(df.loc['[ F. D. P. ]', 'N']) == 35980
        assert int(df.loc['[ F. D. P. ]', 'R1']) == 3448
        assert int(df.loc['[ F. D. P. ]', 'C1']) == 4
        assert int(df.loc['[ F. D. P. ]', 'O11']) == 0
        assert int(df.loc['[ F. D. P. ]:', 'N']) == 35980
        assert int(df.loc['[ F. D. P. ]:', 'R1']) == 3448
        assert int(df.loc['[ F. D. P. ]:', 'C1']) == 42
        assert int(df.loc['[ F. D. P. ]:', 'O11']) == 0

        dfs = list()
        for i in range(len(coll_loc.json['discourseme_scores'][0]['unigram_item_scores'])):
            item = coll_loc.json['discourseme_scores'][0]['unigram_item_scores'][i]['item']
            df = DataFrame(coll_loc.json['discourseme_scores'][0]['unigram_item_scores'][i]['scores'])
            df['item'] = item
            df = df.pivot(index='item', columns='measure', values='score')
            dfs.append(df)
        df = concat(dfs)
        assert int(df.loc['F.', 'N']) == 35980
        assert int(df.loc['F.', 'R1']) == 3448
        assert int(df.loc['F.', 'C1']) == 87
        assert int(df.loc['F.', 'O11']) == 17
        assert int(df.loc['D.', 'N']) == 35980
        assert int(df.loc['D.', 'R1']) == 3448
        assert int(df.loc['D.', 'C1']) == 87
        assert int(df.loc['D.', 'O11']) == 17
        assert int(df.loc['P.', 'N']) == 35980
        assert int(df.loc['P.', 'R1']) == 3448
        assert int(df.loc['P.', 'C1']) == 87
        assert int(df.loc['P.', 'O11']) == 17
        assert int(df.loc['[', 'N']) == 35980
        assert int(df.loc['[', 'R1']) == 3448
        assert int(df.loc['[', 'C1']) == 46
        assert int(df.loc['[', 'O11']) == 0
        assert int(df.loc[']', 'N']) == 35980
        assert int(df.loc[']', 'R1']) == 3448
        assert int(df.loc[']', 'C1']) == 4
        assert int(df.loc[']', 'O11']) == 0
        assert int(df.loc[']:', 'N']) == 35980
        assert int(df.loc[']:', 'R1']) == 3448
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

        # corpora
        corpora = client.get(url_for('corpus.get_corpora'),
                             headers=auth_header)
        assert corpora.status_code == 200
        corpus = corpora.json[0]

        # create constellation
        constellation = client.post(url_for('constellation.create'),
                                    json={
                                        'name': 'CDU',
                                        'description': 'Test Constellation HD',
                                        'filter_discourseme_ids': [union_id],
                                        'highlight_discourseme_ids': [disc['id'] for disc in discoursemes.json[1:len(discoursemes.json)]]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        # collocates in whole corpus
        collocation = client.get(url_for('constellation.collocation',
                                         id=constellation.json['id'], corpus_id=corpus['id'],
                                         p='lemma', window=10),
                                 follow_redirects=True,
                                 headers=auth_header)
        assert collocation.status_code == 200

        coll = client.get(url_for('collocation.get_collocation_items',
                                  id=collocation.json['id'],
                                  page_size=10, sort_by='O11'),
                          follow_redirects=True,
                          headers=auth_header)

        assert coll.status_code == 200
        assert len(coll.json['items']) == 10
        # most frequent collocate: "die"
        # number of tokens in window: R1 = 14989
        # number 1: "die" with O11 = 1481 co-occurrences
        assert coll.json['items'][0]['item'] == 'die'
        coll_conv = {c['measure']: c['score'] for c in coll.json['items'][0]['scores']}
        assert int(coll_conv["R1"]) == 14989
        assert int(coll_conv["O11"]) == 1481

        # 2nd order collocates with "Zuruf"
        collocation = client.get(url_for('constellation.collocation',
                                         id=constellation.json['id'], corpus_id=corpus['id'],
                                         p='lemma', window=10,
                                         filter_item='Zuruf'),
                                 follow_redirects=True,
                                 headers=auth_header)
        assert collocation.status_code == 200
        coll = client.get(url_for('collocation.get_collocation_items',
                                  id=collocation.json['id'],
                                  page_size=10, sort_by='O11'),
                          follow_redirects=True,
                          headers=auth_header)
        assert coll.status_code == 200
        assert len(coll.json['items']) == 10
        # most frequent collocate: "die"
        # number of tokens in window: R1 = 1790
        # number 1: "die" with O11 = 181 co-occurrences
        assert coll.json['items'][0]['item'] == 'die'
        coll_conv = {c['measure']: c['score'] for c in coll.json['items'][0]['scores']}
        assert int(coll_conv["R1"]) == 1790
        assert int(coll_conv["O11"]) == 181

        # 2nd order collocates with discourseme 2 ("FDP")
        collocation = client.get(url_for('constellation.collocation',
                                         id=constellation.json['id'], corpus_id=corpus['id'],
                                         p='lemma',
                                         filter_discourseme_ids=[2]),
                                 follow_redirects=True,
                                 headers=auth_header)
        assert collocation.status_code == 200
        coll = client.get(url_for('collocation.get_collocation_items',
                                  id=collocation.json['id'],
                                  page_size=10, sort_by='O11'),
                          follow_redirects=True,
                          headers=auth_header)
        assert coll.status_code == 200
        assert len(coll.json['items']) == 10
        # most frequent collocate: "die"
        # number of tokens in window: R1 = 6790
        # number 1: "die" with O11 = 856 co-occurrences
        assert coll.json['items'][0]['item'] == 'die'
        coll_conv = {c['measure']: c['score'] for c in coll.json['items'][0]['scores']}
        assert int(coll_conv["R1"]) == 6790
        assert int(coll_conv["O11"]) == 856

        # 2nd order collocates with "Zuruf" and discourseme "FDP"
        collocation = client.get(url_for('constellation.collocation',
                                         id=constellation.json['id'], corpus_id=corpus['id'],
                                         p='lemma', window=10,
                                         filter_discourseme_ids=[2],
                                         filter_item='Zuruf'),
                                 follow_redirects=True,
                                 headers=auth_header)
        assert collocation.status_code == 200
        coll = client.get(url_for('collocation.get_collocation_items',
                                  id=collocation.json['id'],
                                  page_size=10, sort_by='O11'),
                          follow_redirects=True,
                          headers=auth_header)
        assert coll.status_code == 200
        assert len(coll.json['items']) == 10
        # most frequent collocate: "die"
        # number of tokens in window: R1 = 173
        # number 1: "die" with O11 = 19 co-occurrences
        assert coll.json['items'][0]['item'] == 'die'
        coll_conv = {c['measure']: c['score'] for c in coll.json['items'][0]['scores']}
        assert int(coll_conv["R1"]) == 173
        assert int(coll_conv["O11"]) == 19


def test_constellation_keyword(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get some discoursemes
        discoursemes = client.get(url_for('mmda.discourseme.get_discoursemes'),
                                  headers=auth_header).json

        # create constellation
        constellation = client.post(url_for('constellation.create'),
                                    json={
                                        'name': 'CDU',
                                        'description': 'Test Constellation Keywords',
                                        'highlight_discourseme_ids': [disc['id'] for disc in discoursemes]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200
        assert isinstance(constellation.json['id'], int)

        keyword = client.post(url_for('keyword.create_keyword'),
                              json={
                                  'constellation_id': constellation.json['id'],
                                  'corpus_id': 1,
                                  'subcorpus_id': 1,
                                  'corpus_id_reference': 1,
                                  'p': 'lemma',
                                  'p_reference': 'lemma'
                              },
                              headers=auth_header)

        assert keyword.status_code == 200
        assert keyword.json['constellation_id'] == constellation.json['id']

        keyword_items = client.get(url_for('keyword.get_keyword_items', id=keyword.json['id']),
                                   headers=auth_header)

        assert keyword_items.status_code == 200
        assert len(keyword_items.json['discourseme_scores']) == len(discoursemes)

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
        assert int(scores['O21']) == 356
        assert int(scores['R1']) == 35980
        assert int(scores['R2']) == 113820

        assert keyword_items.json['discourseme_scores'][1]['unigram_item_scores'][0]['item'] == 'D.'
        scores = {k['measure']: k['score'] for k in keyword_items.json['discourseme_scores'][1]['unigram_item_scores'][0]['scores']}
        assert int(scores['O11']) == 87
        assert int(scores['O21']) == 414
        assert int(scores['R1']) == 35980
        assert int(scores['R2']) == 113820
