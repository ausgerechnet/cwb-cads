from flask import url_for
import pytest


def test_create_query(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        query = client.post(url_for('query.create'),
                            json={
                                'corpus_id': 1,
                                'cqp_query': '[word="der"] [lemma="Bundeskanzler"]',
                                's': 's'
                            },
                            headers=auth_header)

        assert query.status_code == 200

        queries = client.get(url_for('query.get_queries'),
                             headers=auth_header)

        query = client.get(url_for('query.get_query', id=queries.json[0]['id']),
                           headers=auth_header)

        assert query.status_code == 200


def test_create_query_assisted(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # query
        query = client.post(url_for('query.create_assisted'),
                            json={
                                'corpus_id': 1,
                                'items': ['bei', 'zu'],
                                'p': 'lemma',
                                'ignore_case': True,
                                'ignore_diacritics': True,
                                's': 's'
                            },
                            headers=auth_header,
                            follow_redirects=True)

        assert query.status_code == 200


def test_execute_query(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        queries = client.get(url_for('query.get_queries'),
                             headers=auth_header)

        response = client.post(url_for('query.execute', id=queries.json[0]['id']),
                               headers=auth_header)

        assert response.status_code == 200


def test_query_concordance(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        discoursemes = client.get(url_for('discourseme.get_discoursemes'), headers=auth_header).json
        union = discoursemes[0]

        # create query matches for union
        union_query = client.get(url_for('discourseme.get_query', id=union['id'], corpus_id=1),
                                 content_type='application/json',
                                 headers=auth_header)

        print(union_query)
        assert union_query.status_code == 200

        lines = client.get(url_for('query.concordance_lines', query_id=union_query.json['id'], page_size=10, page_number=5),
                           headers=auth_header)
        assert lines.status_code == 200

        line = client.get(url_for('query.concordance_line', match_id=lines.json['lines'][0]['id'], query_id=union_query.json['id'],
                                  window=50),
                          headers=auth_header)
        assert line.status_code == 200


def test_query_concordance_filter(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        discoursemes = client.get(url_for('discourseme.get_discoursemes'), headers=auth_header).json
        union = discoursemes[0]

        # create query matches for union
        union_query = client.get(url_for('discourseme.get_query', id=union['id'], corpus_id=1),
                                 content_type='application/json',
                                 headers=auth_header)

        assert union_query.status_code == 200

        lines = client.get(url_for('query.concordance_lines', query_id=union_query.json['id'], page_size=10, page_number=5, filter_item='Beifall'),
                           headers=auth_header)

        assert lines.status_code == 200

        for line in lines.json['lines']:
            row = [t['primary'] for t in line['tokens'] if not t['out_of_window']]
            assert 'Beifall' in row


def test_query_concordance_sort(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        discoursemes = client.get(url_for('discourseme.get_discoursemes'), headers=auth_header).json
        union = discoursemes[0]

        # create query matches for union
        union_query = client.get(url_for('discourseme.get_query', id=union['id'], corpus_id=1),
                                 content_type='application/json',
                                 headers=auth_header)

        assert union_query.status_code == 200

        lines = client.get(url_for('query.concordance_lines', query_id=union_query.json['id'], page_size=100, page_number=2,
                                   sort_by_p_att='word', sort_by_offset=-2, sort_order='ascending', window=2),
                           headers=auth_header)

        assert lines.status_code == 200

        tokens = list()
        for line in lines.json['lines']:
            t = [t['primary'] for t in line['tokens'] if t['offset'] == -2][0]
            tokens.append(t)

        assert list(sorted(tokens)) == tokens

        lines = client.get(url_for('query.concordance_lines', query_id=union_query.json['id'], page_size=100, page_number=2,
                                   sort_by_p_att='word', sort_by_offset=-2, sort_order='descending', window=2),
                           headers=auth_header)

        assert lines.status_code == 200

        tokens = list()
        for line in lines.json['lines']:
            t = [t['primary'] for t in line['tokens'] if t['offset'] == -2][0]
            tokens.append(t)

        assert list(reversed(sorted(tokens))) == tokens


def test_query_concordance_filter_sort(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        discoursemes = client.get(url_for('discourseme.get_discoursemes'), headers=auth_header).json
        union = discoursemes[0]

        # create query matches for union
        union_query = client.get(url_for('discourseme.get_query', id=union['id'], corpus_id=1),
                                 content_type='application/json',
                                 headers=auth_header)

        assert union_query.status_code == 200

        lines = client.get(url_for('query.concordance_lines', query_id=union_query.json['id'], page_size=100, page_number=1, filter_item='Beifall',
                                   sort_by_p_att='word', sort_by_offset=-2, sort_order='ascending', window=8),
                           headers=auth_header)

        assert lines.status_code == 200

        tokens = list()
        for line in lines.json['lines']:
            t = [t['primary'] for t in line['tokens'] if t['offset'] == -2][0]
            tokens.append(t)
            row = [t['primary'] for t in line['tokens'] if not t['out_of_window']]
            assert 'Beifall' in row

        assert list(sorted(tokens)) == tokens

        lines = client.get(url_for('query.concordance_lines', query_id=union_query.json['id'], page_size=100, page_number=1, filter_item='Beifall',
                                   sort_by_p_att='word', sort_by_offset=-2, sort_order='descending', window=8),
                           headers=auth_header)

        assert lines.status_code == 200

        tokens = list()
        for line in lines.json['lines']:
            t = [t['primary'] for t in line['tokens'] if t['offset'] == -2][0]
            tokens.append(t)

        assert list(reversed(sorted(tokens))) == tokens


def test_query_breakdown(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        discoursemes = client.get(url_for('discourseme.get_discoursemes'), headers=auth_header).json
        union = discoursemes[0]

        # create query matches for union
        union_query = client.get(url_for('discourseme.get_query', id=union['id'], corpus_id=1),
                                 content_type='application/json',
                                 headers=auth_header)

        assert union_query.status_code == 200

        breakdown = client.get(url_for('query.get_breakdown', query_id=union_query.json['id'], p='lemma',
                                       # page_size=100, page_number=1, filter_item='Beifall',
                                       # sort_by_p_att='word', sort_by_offset=-2, sort_order='ascending', window=8
                                       ),
                               headers=auth_header)

        assert breakdown.status_code == 200
        # print(breakdown.json)


def test_query_collocation(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        discoursemes = client.get(url_for('discourseme.get_discoursemes'), headers=auth_header).json
        union = discoursemes[0]

        # create query matches for union
        union_query = client.get(url_for('discourseme.get_query', id=union['id'], corpus_id=1),
                                 content_type='application/json',
                                 headers=auth_header)

        assert union_query.status_code == 200

        collocation = client.get(url_for('query.get_collocation',
                                         query_id=union_query.json['id'], p='lemma', window=10,
                                         page_size=10, page_number=1,
                                         sort_by='conservative_log_ratio'),
                                 headers=auth_header)

        assert collocation.status_code == 200
        assert collocation.json['items'][0]['item'] == 'CSU'
