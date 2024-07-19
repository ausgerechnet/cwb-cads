from flask import url_for


def test_get_keyword(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        keyword = client.post(url_for('keyword.create_keyword'),
                              json={
                                  'corpus_id': 1,
                                  'corpus_id_reference': 1,
                                  'p': 'lemma',
                                  'p_reference': 'word'
                              },
                              headers=auth_header)

        assert keyword.status_code == 200

        keyword = client.post(url_for('keyword.create_keyword'),
                              json={
                                  'corpus_id': 1,
                                  'corpus_id_reference': 1,
                                  'subcorpus_id_reference': 1,
                                  'p': 'lemma',
                                  'p_reference': 'lemma'
                              },
                              headers=auth_header)

        assert keyword.status_code == 200

        keyword_items = client.get(url_for('keyword.get_keyword_items', id=keyword.json['id']),
                                   headers=auth_header)
        assert keyword_items.status_code == 200
        assert len(keyword_items.json['items']) == 10


def test_get_all_keyword(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        keywords = client.get(url_for('keyword.get_all_keyword'),
                              headers=auth_header)

        assert keywords.status_code == 200
