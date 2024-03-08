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
                                 headers=auth_header)

        assert concordance.status_code == 200
        from pprint import pprint
        pprint(concordance.json)


def test_constellation_concordance_filter(client, auth):

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
                                    headers=auth_header).json

        concordance = client.get(url_for('constellation.concordance_lines',
                                         id=constellation['id'], corpus_id=corpus['id'],
                                         filter_item='und',
                                         filter_discourseme_ids=[2],
                                         window=3),
                                 headers=auth_header)

        assert concordance.status_code == 200
        from pprint import pprint
        pprint(concordance.json)
