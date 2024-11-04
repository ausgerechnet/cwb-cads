from flask import url_for
import pytest


def test_create_query(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        query = client.post(url_for('query.create'),
                            json={
                                'corpus_id': 1,
                                'cqp_query': '[lemma="Wirtschaft"]',
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


# def test_execute_query(client, auth):

#     auth_header = auth.login()
#     with client:
#         client.get("/")

#         queries = client.get(url_for('query.get_queries'),
#                              headers=auth_header)

#         response = client.post(url_for('query.execute', id=queries.json[0]['id']),
#                                headers=auth_header)

#         assert response.status_code == 200


def test_query_concordance(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        query = client.post(url_for('query.create'),
                            json={
                                'corpus_id': 1,
                                'cqp_query': '[lemma="Wirtschaft"]',
                                's': 's'
                            },
                            headers=auth_header)
        assert query.status_code == 200

        lines = client.get(url_for('query.concordance_lines', query_id=query.json['id'], page_size=10, page_number=2),
                           headers=auth_header)
        assert lines.status_code == 200

        line = client.get(url_for('query.concordance_line', match_id=lines.json['lines'][0]['match_id'], query_id=query.json['id'],
                                  window=50),
                          headers=auth_header)

        assert line.status_code == 200


def test_query_concordance_filter(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        query = client.post(url_for('query.create'),
                            json={
                                'corpus_id': 1,
                                'cqp_query': '[lemma="SPD"]',
                                's': 's'
                            },
                            headers=auth_header)

        lines = client.get(url_for('query.concordance_lines', query_id=query.json['id'], page_size=10, page_number=2, filter_item='Beifall'),
                           headers=auth_header)

        assert lines.status_code == 200

        for line in lines.json['lines']:
            row = [t['primary'] for t in line['tokens'] if not t['out_of_window']]
            assert 'Beifall' in row


def test_query_concordance_sort(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        query = client.post(url_for('query.create'),
                            json={
                                'corpus_id': 1,
                                'cqp_query': '[lemma="Wirtschaft"]',
                                's': 's'
                            },
                            headers=auth_header)

        lines = client.get(url_for('query.concordance_lines', query_id=query.json['id'], page_size=10, page_number=2,
                                   sort_by_p_att='word', sort_by_offset=-2, sort_order='ascending', window=10),
                           headers=auth_header)

        assert lines.status_code == 200

        tokens = list()
        for line in lines.json['lines']:
            t = [t['primary'] for t in line['tokens'] if t['offset'] == -2][0]
            tokens.append(t)

        assert list(sorted(tokens)) == tokens

        lines = client.get(url_for('query.concordance_lines', query_id=query.json['id'], page_size=10, page_number=2,
                                   sort_by_p_att='word', sort_by_offset=-2, sort_order='descending', window=10),
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

        query = client.post(url_for('query.create'),
                            json={
                                'corpus_id': 1,
                                'cqp_query': '[lemma="SPD"]',
                                's': 's'
                            },
                            headers=auth_header)

        lines = client.get(url_for('query.concordance_lines', query_id=query.json['id'], page_size=200, page_number=1, filter_item='Beifall',
                                   sort_by_p_att='word', sort_by_offset=-2, sort_order='ascending', window=10),
                           headers=auth_header)

        assert lines.status_code == 200

        tokens = list()
        for line in lines.json['lines']:
            t = [t['primary'] for t in line['tokens'] if t['offset'] == -2][0]
            tokens.append(t)
            row = [t['primary'] for t in line['tokens'] if not t['out_of_window']]
            assert 'Beifall' in row

        assert list(sorted(tokens)) == tokens

        lines = client.get(url_for('query.concordance_lines', query_id=query.json['id'], page_size=200, page_number=1, filter_item='Beifall',
                                   sort_by_p_att='word', sort_by_offset=-2, sort_order='descending', window=10),
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

        query = client.post(url_for('query.create'),
                            json={
                                'corpus_id': 1,
                                'cqp_query': '[lemma="Wirtschaft"]',
                                's': 's'
                            },
                            headers=auth_header)

        breakdown = client.get(url_for('query.get_breakdown', query_id=query.json['id'], p='lemma',
                                       # page_size=100, page_number=1, filter_item='Beifall',
                                       # sort_by_p_att='word', sort_by_offset=-2, sort_order='ascending', window=8
                                       ),
                               headers=auth_header)

        assert breakdown.status_code == 200


def test_query_meta(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        query = client.post(url_for('query.create'),
                            json={
                                'corpus_id': 1,
                                'cqp_query': '[lemma="oder"]',
                                's': 's'
                            },
                            headers=auth_header)

        assert query.status_code == 200

        meta = client.get(url_for('query.get_meta', query_id=query.json['id'], level='text', key='parliamentary_group'),
                          headers=auth_header)

        assert meta.status_code == 200

        assert meta.json[0]['frequency'] == 50
        assert meta.json[0]['value'] == 'CDU/CSU'
        assert meta.json[0]['ipm'] == 1829.022936


def test_query_collocation(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        query = client.post(url_for('query.create'),
                            json={
                                'corpus_id': 1,
                                'cqp_query': '"CDU" "/" "CSU" | "CDU" | "CSU" | "CDU" "/" "CSU-Fraktion"',
                                's': 's'
                            },
                            headers=auth_header)

        assert query.status_code == 200

        collocation = client.get(url_for('query.get_collocation',
                                         query_id=query.json['id'],
                                         p='word',
                                         window=10,
                                         page_size=10, page_number=1,
                                         sort_by='conservative_log_ratio'),
                                 headers=auth_header)

        assert collocation.status_code == 200

        collocation_items = client.get(url_for('collocation.get_collocation_items', id=collocation.json['id']),
                                       headers=auth_header)

        assert collocation_items.status_code == 200

        assert collocation_items.json['items'][0]['item'] == 'Hornung'


@pytest.mark.now
def test_query_concordance_sort_complete(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        query = client.post(url_for('query.create'),
                            json={
                                'corpus_id': 1,
                                'cqp_query': '[lemma="SPD"]',
                                's': 's'
                            },
                            headers=auth_header)

        # sort_order first
        lines = client.get(url_for('query.concordance_lines', query_id=query.json['id'], page_size=100, page_number=3,
                                   sort_order='first', window=8),
                           headers=auth_header)
        assert lines.status_code == 200

        match_ids = list()
        for line in lines.json['lines']:
            match_ids.append(line['match_id'])
        assert list(sorted(match_ids)) == match_ids

        # sort_order last
        lines = client.get(url_for('query.concordance_lines', query_id=query.json['id'], page_size=100, page_number=3,
                                   sort_order='last', window=8),
                           headers=auth_header)
        assert lines.status_code == 200

        match_ids = list()
        for line in lines.json['lines']:
            match_ids.append(line['match_id'])
        assert list(reversed(sorted(match_ids))) == match_ids

        # sort_order random
        lines = client.get(url_for('query.concordance_lines', query_id=query.json['id'], page_size=100, page_number=3,
                                   sort_order='random', window=8),
                           headers=auth_header)
        assert lines.status_code == 200

        match_ids = list()
        for line in lines.json['lines']:
            match_ids.append(line['match_id'])
        assert list(reversed(sorted(match_ids))) != match_ids
        assert list(sorted(match_ids)) != match_ids

        # sort_order ascending: on word / match
        lines = client.get(url_for('query.concordance_lines', query_id=query.json['id'], page_size=100, page_number=3,
                                   sort_by_p_att='word', sort_by_offset=0, sort_order='ascending', window=8),
                           headers=auth_header)
        assert lines.status_code == 200

        tokens = list()
        for line in lines.json['lines']:
            t = [t['primary'] for t in line['tokens'] if t['offset'] == 0][0]
            tokens.append(t)
        assert list(sorted(tokens)) == tokens

        # sort_order ascending: on lemma / -2
        lines = client.get(url_for('query.concordance_lines', query_id=query.json['id'], page_size=100, page_number=3,
                                   sort_by_p_att='lemma', sort_by_offset=-2, sort_order='ascending', window=8),
                           headers=auth_header)
        assert lines.status_code == 200

        tokens = list()
        for line in lines.json['lines']:
            t = [t['primary'] for t in line['tokens'] if t['offset'] == -2][0]
            tokens.append(t)
        assert list(sorted(tokens)) == tokens

        # sort order descending: on word / -2
        lines = client.get(url_for('query.concordance_lines', query_id=query.json['id'], page_size=100, page_number=3,
                                   sort_by_p_att='word', sort_by_offset=-2, sort_order='descending', window=8),
                           headers=auth_header)
        assert lines.status_code == 200

        tokens = list()
        for line in lines.json['lines']:
            t = [t['primary'] for t in line['tokens'] if t['offset'] == -2][0]
            tokens.append(t)
        assert list(reversed(sorted(tokens))) == tokens
