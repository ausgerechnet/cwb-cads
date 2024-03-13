from flask import url_for


def test_create_collocation(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get discoursemes
        discoursemes = client.get(url_for('discourseme.get_discoursemes'),
                                  content_type='application/json',
                                  headers=auth_header).json
        discourseme = discoursemes[0]

        # query
        # - create
        query = client.get(url_for('discourseme.get_query', id=discourseme['id'], corpus_id=1),
                           content_type='application/json',
                           headers=auth_header)
        assert query.status_code == 200

        # constellation
        constellation = client.post(url_for('constellation.create'),
                                    json={
                                        'name': 'CDU',
                                        'description': 'Test Constellation 1',
                                        'filter_discourseme_ids': [discourseme['id']]
                                    },
                                    headers=auth_header)
        assert constellation.status_code == 200

        constellation = client.get(url_for('constellation.get_constellation', id=constellation.json['id']),
                                   headers=auth_header)
        assert constellation.status_code == 200

        # collocation
        # - create
        collocation = client.post(url_for('collocation.create', query_id=query.json['id']),
                                  json={
                                      'constellation_id': 1,
                                      'p': 'lemma',
                                      's_break': 's',
                                      'context': 10,
                                  },
                                  headers=auth_header)
        assert collocation.status_code == 200


def test_create_or_get_cotext(client, auth):

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
                                        'description': 'Test Constellation 2',
                                        'filter_discourseme_ids': [discourseme['id']]
                                    },
                                    headers=auth_header)

        constellation = client.get(url_for('constellation.get_constellation', id=constellation.json['id']),
                                   headers=auth_header)

        # query
        # - create
        query = client.get(url_for('discourseme.get_query', id=1, corpus_id=1),
                           content_type='application/json',
                           headers=auth_header)
        assert query.status_code == 200

        # collocation
        # - create
        collocation = client.post(url_for('collocation.create', query_id=query.json['id']),
                                  json={
                                      'constellation_id': 1,
                                      'p': 'lemma',
                                      's_break': 's',
                                      'context': 10,
                                  },
                                  headers=auth_header)
        assert collocation.status_code == 200

        # from cads.database import Collocation
        # from cads.query import get_or_create_cotext
        # collocation = Collocation.query.filter_by(id=collocation.json['id']).first()
        # df_cooc = get_or_create_cotext(collocation._query, collocation.context, collocation.s_break, return_df=True)
        # df_cooc_2 = get_or_create_cotext(collocation._query, collocation.context, collocation.s_break, return_df=True)
        # assert df_cooc.equals(df_cooc_2)


def test_execute_collocation(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        collocation = client.post(url_for('collocation.execute', query_id=1, id=1),
                                  headers=auth_header)

        collocation = client.post(url_for('collocation.execute', query_id=1, id=1),
                                  headers=auth_header)

        items = client.get(url_for('collocation.get_collocation_items', query_id=1, id=collocation.json['id']),
                           headers=auth_header)

        assert items.status_code == 200
