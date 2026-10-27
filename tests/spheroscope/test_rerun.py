from flask import url_for


def test_rerun_reuses_versions_and_queries(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        def post(endpoint, **json):
            return client.post(url_for(endpoint, corpus_id=1), json=json, headers=auth_header)

        def history(id):
            return client.get(url_for('spheroscope.query_history.get_history', id=id), headers=auth_header).json

        def add(history_id, query_id, comment='manual'):
            return client.put(url_for('spheroscope.query_history.add_query', id=history_id),
                              json={'query_id': query_id, 'comment': comment}, headers=auth_header)

        def library():
            wordlists = client.get(url_for('library.get_word_lists', corpus_id=1), headers=auth_header).json
            macros = client.get(url_for('library.get_macros', corpus_id=1), headers=auth_header).json
            return sorted((w['name'], w['version']) for w in wordlists if w['name'].startswith('rerun_')) + \
                sorted((m['name'], m['version']) for m in macros if m['name'].startswith('rerun_'))

        def slot_queries():
            return [q['id'] for q in client.get(url_for('spheroscope.slot_query.get_all', corpus_id=1),
                                                headers=auth_header).json]

        def session(name):
            """replays a development session: draft, change, rollback"""

            post('library.create_word_list', name='rerun_verbs', words=['sagen'])
            post('library.create_macro_endpoint', name='rerun_vg', valency=0, body='[lemma = $rerun_verbs]')
            q = client.put(url_for('spheroscope.slot_query.get_or_create'),
                           json={'cqp_query': '/rerun_vg[] [pos = "ART"]', 'corpus_id': 1, 'slots': [], 'corrections': []},
                           headers=auth_header).json
            h = client.post(url_for('spheroscope.query_history.create'), json={'name': name}, headers=auth_header).json['id']
            add(h, q['id'])
            changed = post('library.create_word_list', name='rerun_verbs', words=['sagen', 'erklären'])
            rollback = post('library.create_word_list', name='rerun_verbs', words=['sagen'])
            return h, q, changed, rollback

        # first run
        h1, q1, changed, rollback = session('rerun-1')
        assert changed.status_code == 201
        assert rollback.status_code == 200 and rollback.json['restored'] is True and rollback.json['version'] == 1
        assert [(m['name'], m['version']) for m in rollback.json['propagated']['macros']] == [('rerun_vg', 1)]
        assert rollback.json['propagated']['queries'][0]['id'] == q1['id']

        # the history returns to the first query (a query can occur several times)
        entries = history(h1)['entries']
        assert [e['query']['id'] for e in entries] == [q1['id'], entries[1]['query']['id'], q1['id']]
        assert entries[1]['query']['id'] != q1['id']
        assert entries[2]['comment'] == 'auto: rerun_verbs v2 → v1 (via rerun_vg v2 → v1)'
        assert entries[2]['query']['up_to_date'] is True
        assert [e['id'] for e in entries] == sorted(e['id'] for e in entries)

        library_after_first = library()
        assert library_after_first == [('rerun_verbs', 1), ('rerun_verbs', 2), ('rerun_vg', 1), ('rerun_vg', 2)]
        queries_after_first = slot_queries()

        # second run: no new library versions or slot queries
        h2, q2, changed, rollback = session('rerun-2')
        assert q2['id'] == q1['id']
        assert changed.status_code == 200 and changed.json['restored'] is True and changed.json['version'] == 2
        assert rollback.status_code == 200 and rollback.json['restored'] is True and rollback.json['version'] == 1
        assert library() == library_after_first
        assert slot_queries() == queries_after_first
        assert [e['query']['id'] for e in history(h2)['entries']] == [e['query']['id'] for e in entries]
        # the change and rollback are also recorded in the first history (with existing queries)
        assert [e['query']['id'] for e in history(h1)['entries']] == [e['query']['id'] for e in entries + entries[1:]]

        # adding the newest query of a history again does not add an entry
        assert len(add(h2, q1['id']).json['entries']) == 3

        # deleting a query from a history removes all its entries
        deleted = client.delete(url_for('spheroscope.query_history.delete_history_entry', hid=h2, qid=q1['id']),
                                headers=auth_header)
        assert deleted.status_code == 200
        assert len(history(h2)['entries']) == 1
