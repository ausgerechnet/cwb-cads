from flask import url_for
from pprint import pprint


def test_concordance(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        discoursemes = client.get(url_for('discourseme.get_discoursemes'), headers=auth_header).json
        union = discoursemes[0]
        kanzler = discoursemes[3]

        # create query matches for beifall
        client.post(url_for('query.create_assisted'),
                    json={
                        'discourseme_id': kanzler['id'],
                        'corpus_id': 1,
                        'items': kanzler['_items'],
                        'p': 'lemma',
                        's': 's',
                        'escape': False
                    },
                    headers=auth_header)

        # create query matches for union
        union_query = client.post(url_for('query.create_assisted'),
                                  json={
                                      'discourseme_id': union['id'],
                                      'corpus_id': 1,
                                      'items': union['_items'],
                                      'p': 'lemma',
                                      's': 's',
                                      'escape': False
                                  },
                                  headers=auth_header)

        lines = client.get(url_for('query.concordance.lines', query_id=union_query.json['id'],
                                   page_size=10, page_number=5),
                           headers=auth_header)
        assert lines.status_code == 200

        # pprint(lines.json)
        # pprint(lines.json['lines'][0])

        line = client.get(url_for('query.concordance.context', id=lines.json['lines'][0]['id'], query_id=union_query.json['id'],
                                  window=50),
                          headers=auth_header)

        assert line.status_code == 200
        # pprint(line.json)
