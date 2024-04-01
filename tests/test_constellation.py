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


@pytest.mark.now
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

        # collocation
        coll = client.get(url_for('constellation.collocation',
                                  id=constellation['id'], corpus_id=corpus['id'],
                                  page_size=10, page_number=1,
                                  p='lemma', window=10),
                          follow_redirects=True,
                          headers=auth_header)

        # from pprint import pprint
        # pprint(coll.json['discourseme_scores'])
