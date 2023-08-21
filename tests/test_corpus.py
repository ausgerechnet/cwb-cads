from flask import url_for


def test_get_corpora(client, auth):

    auth.login()
    with client:
        client.get("/")

        # discourseme
        corpora = client.get(url_for('corpus.get_corpora'),
                             auth=('admin', '0000'))

        corpus = client.get(url_for('corpus.get_corpus', id=corpora.json[0]['id']),
                            auth=('admin', '0000'))

        assert corpus.status_code == 200
