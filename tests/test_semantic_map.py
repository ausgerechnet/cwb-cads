from flask import url_for


def test_create_semmap(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # get discoursemes
        discoursemes = client.get(url_for('discourseme.get_discoursemes'),
                                  content_type='application/json',
                                  headers=auth_header).json

        discourseme = discoursemes[0]

        query = client.get(url_for('discourseme.get_query', id=discourseme['id'], corpus_id=1),
                           content_type='application/json',
                           headers=auth_header)

        # constellation
        constellation = client.post(url_for('constellation.create'),
                                    json={
                                        'name': 'CDU',
                                        'description': 'Test Constellation 1',
                                        'filter_discourseme_ids': [discourseme['id']]
                                    },
                                    headers=auth_header)

        # collocation
        collocation = client.post(url_for('collocation.create', query_id=query.json['id']),
                                  json={
                                      'constellation_id': constellation.json['id'],
                                      'p': 'lemma',
                                      's_break': 's',
                                      'context': 5,
                                  },
                                  headers=auth_header)

        collocation = client.get(url_for('collocation.get_collocation', query_id=query.json['id'], id=collocation.json['id']),
                                 headers=auth_header)

        collocation = client.post(url_for('collocation.execute', query_id=query.json['id'], id=collocation.json['id']),
                                  headers=auth_header)

        assert collocation.status_code == 200

        # semmap
        semantic_map = client.post(url_for('collocation.create_semantic_map', query_id=query.json['id'], id=collocation.json['id']),
                                   headers=auth_header)

        assert semantic_map.status_code == 200


# def test_execute_semmap(client, auth):

#     auth.login()
#     with client:
#         client.get("/")
#         client.post(url_for('semantic_map.execute', id=1),
#                     headers=auth_header)

#         items = client.get(url_for('semantic_map.get_coordinates', id=1),
#                            headers=auth_header)

#         assert items.status_code == 200
