from flask import url_for


def test_get_corpus(client, auth):

    auth_header = auth.login()

    with client:

        client.get("/")

        # discourseme
        corpora = client.get(url_for('corpus.get_corpora'),
                             content_type='application/json',
                             headers=auth_header)

        corpus = client.get(url_for('corpus.get_corpus', id=corpora.json[0]['id']),
                            content_type='application/json',
                            headers=auth_header)

        assert corpus.status_code == 200
