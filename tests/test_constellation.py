import pytest
from flask import url_for


def test_create_get_constellation(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get discoursemes
        discoursemes = client.get(url_for('discourseme.get_discoursemes'),
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
        discoursemes = client.get(url_for('discourseme.get_discoursemes'),
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
        discoursemes = client.get(url_for('discourseme.get_discoursemes'),
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
        discoursemes = client.get(url_for('discourseme.get_discoursemes'),
                                  headers=auth_header).json

        union_id = discoursemes[0]['id']

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
        coll = client.get(url_for('constellation.collocation',
                                  id=constellation['id'], corpus_id=corpus['id'],
                                  page_size=10, page_number=1,
                                  p='lemma', window=10,
                                  sort_by='O11'),
                          follow_redirects=True,
                          headers=auth_header)
        coll_conv = {c['measure']: c['score'] for c in coll.json['items'][0]['scores']}
        assert int(coll_conv['N']) == 149800
        assert int(coll_conv['R1']) == 14989
        assert int(coll_conv['C1']) == 13765
        assert int(coll_conv['O11']) == 1481

        # collocation in subcorpus with global marginals
        coll_glob = client.get(url_for('constellation.collocation',
                                       subcorpus_id=1,
                                       id=constellation['id'], corpus_id=corpus['id'],
                                       page_size=10, page_number=1,
                                       p='lemma', window=10,
                                       marginals='global',
                                       sort_by='O11'),
                               follow_redirects=True,
                               headers=auth_header)
        coll_conv = {c['measure']: c['score'] for c in coll_glob.json['items'][0]['scores']}
        assert int(coll_conv['N']) == 149800
        assert int(coll_conv['R1']) == 3448
        assert int(coll_conv['C1']) == 13765
        assert int(coll_conv['O11']) == 310

        # collocation in subcorpus with local marginals
        coll_loc = client.get(url_for('constellation.collocation',
                                      subcorpus_id=1,
                                      id=constellation['id'], corpus_id=corpus['id'],
                                      page_size=10, page_number=1,
                                      p='lemma', window=10,
                                      sort_by='O11'),
                              follow_redirects=True,
                              headers=auth_header)
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


@pytest.mark.now
def test_constellation_2nd_order_collocation(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get some discoursemes
        discoursemes = client.get(url_for('discourseme.get_discoursemes'),
                                  headers=auth_header).json

        union_id = discoursemes[0]['id']

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

        from pprint import pprint

        # collocation in whole corpus
        coll = client.get(url_for('constellation.collocation',
                                  id=constellation['id'], corpus_id=corpus['id'],
                                  page_size=10, page_number=1,
                                  p='lemma', window=10,
                                  sort_by='O11'),
                          follow_redirects=True,
                          headers=auth_header)
        pprint(coll.json)

        coll = client.get(url_for('constellation.collocation',
                                  id=constellation['id'], corpus_id=corpus['id'],
                                  page_size=10, page_number=1,
                                  p='lemma', window=10,
                                  filter_item='Zuruf',
                                  sort_by='O11'),
                          follow_redirects=True,
                          headers=auth_header)
        pprint(coll.json)

        coll = client.get(url_for('constellation.collocation',
                                  id=constellation['id'], corpus_id=corpus['id'],
                                  page_size=10, page_number=1,
                                  p='lemma', window=10,
                                  filter_discourseme_ids=[2],
                                  sort_by='O11'),
                          follow_redirects=True,
                          headers=auth_header)
        pprint(coll.json)

        coll = client.get(url_for('constellation.collocation',
                                  id=constellation['id'], corpus_id=corpus['id'],
                                  page_size=10, page_number=1,
                                  p='lemma', window=10,
                                  filter_discourseme_ids=[2],
                                  filter_item='Zuruf',
                                  sort_by='O11'),
                          follow_redirects=True,
                          headers=auth_header)
        pprint(coll.json)
