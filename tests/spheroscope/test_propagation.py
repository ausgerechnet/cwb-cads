from flask import url_for


def test_propagation(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        def post(endpoint, propagate=True, **json):
            return client.post(url_for(endpoint, corpus_id=1, propagate=propagate), json=json, headers=auth_header)

        def history(id):
            return client.get(url_for('spheroscope.query_history.get_history', id=id), headers=auth_header).json

        def new_history(name, query_id):
            h = client.post(url_for('spheroscope.query_history.create'), json={'name': name}, headers=auth_header)
            client.put(url_for('spheroscope.query_history.add_query', id=h.json['id']),
                       json={'query_id': query_id, 'comment': 'manual'}, headers=auth_header)
            return h.json['id']

        def slot_query(cqp):
            q = client.put(url_for('spheroscope.slot_query.get_or_create'),
                           json={'cqp_query': cqp, 'corpus_id': 1, 'slots': [], 'corrections': []},
                           headers=auth_header)
            assert q.status_code == 200
            return q.json

        def latest(name):
            macros = client.get(url_for('library.get_macros', corpus_id=1), headers=auth_header).json
            return max(m['version'] for m in macros if m['name'] == name)

        # library
        post('library.create_word_list', name='prop_speech_verbs', words=['sagen'])
        post('library.create_word_list', name='prop_actors', words=['Kanzler'])
        post('library.create_word_list', name='prop_brexit_terms', words=['Europa'])
        post('library.create_macro_endpoint', name='prop_speech_verb', valency=0,
             body='[lemma = $prop_speech_verbs & pos = "V.*"]')
        post('library.create_macro_endpoint', name='prop_speech_vg', valency=0,
             body='/prop_speech_verb[] [pos = "PTKVZ|ADV"]?')
        post('library.create_macro_endpoint', name='prop_actor', valency=0, body='[lemma = $prop_actors]')
        post('library.create_macro_endpoint', name='prop_brexit', valency=0, body='[lemma = $prop_brexit_terms]')

        q1 = slot_query('/prop_actor[] /prop_speech_vg[] [word="dass"]? []{0,10} /prop_brexit[]')
        q2 = slot_query('/prop_brexit[] [pos = "V.*"]')
        h1 = new_history('prop-1', q1['id'])
        h2 = new_history('prop-2', q2['id'])

        # new word list version: propagated to the macros using it, and to the current query of h1
        wl = post('library.create_word_list', name='prop_speech_verbs', words=['sagen', 'erklären'])
        assert wl.status_code == 201
        assert [(m['name'], m['version']) for m in wl.json['propagated']['macros']] == \
            [('prop_speech_verb', 2), ('prop_speech_vg', 2)]
        assert latest('prop_actor') == latest('prop_brexit') == 1
        vg = wl.json['propagated']['macros'][1]
        assert vg['up_to_date'] is True
        assert vg['comment'] == 'auto: prop_speech_verbs v1 → v2 (via prop_speech_verb v1 → v2)'
        assert len(wl.json['propagated']['queries']) == 1
        propagated = wl.json['propagated']['queries'][0]
        assert propagated['previous_id'] == q1['id'] and propagated['history_ids'] == [h1]

        entries = history(h1)['entries']
        assert len(entries) == 2
        old, new = entries
        assert old['query']['id'] == q1['id'] and old['auto'] is False and old['query']['up_to_date'] is False
        assert new['query']['id'] == propagated['id']
        assert new['query']['cqp_query'] == q1['cqp_query']
        assert new['query']['up_to_date'] is True
        assert new['auto'] is True
        assert new['comment'] == \
            'auto: prop_speech_verbs v1 → v2 (via prop_speech_verb v1 → v2, prop_speech_vg v1 → v2)'
        assert new['trigger'] == {
            'changes': [{'kind': 'wordlist', 'name': 'prop_speech_verbs', 'from': 1, 'to': 2,
                         'path': ['prop_speech_vg', 'prop_speech_verb']}],
            'previous_query_id': q1['id']
        }

        # a history using /prop_brexit[] only is unaffected
        assert len(history(h2)['entries']) == 1

        # new queries are executed lazily
        conc = client.get(url_for('spheroscope.slot_query.concordance', id=new['query']['id'], page_size=5),
                          headers=auth_header)
        assert conc.status_code == 200

        # outdated entries are not propagated: h3 has only the old (outdated) query
        h3 = new_history('prop-3', q1['id'])
        # same current query in two histories: created once, added to both
        h4 = new_history('prop-4', new['query']['id'])

        # both histories using /prop_brexit[] get a new entry
        wl = post('library.create_word_list', name='prop_brexit_terms', words=['Europa', 'Brexit'])
        assert [(m['name'], m['version']) for m in wl.json['propagated']['macros']] == [('prop_brexit', 2)]
        queries = {q['previous_id']: q for q in wl.json['propagated']['queries']}
        assert set(queries) == {new['query']['id'], q2['id']}
        assert queries[new['query']['id']]['history_ids'] == [h1, h4]
        assert queries[q2['id']]['history_ids'] == [h2]
        assert len(history(h1)['entries']) == 3
        assert len(history(h2)['entries']) == 2
        assert len(history(h3)['entries']) == 1
        assert history(h4)['entries'][-1]['query']['id'] == history(h1)['entries'][-1]['query']['id']
        newest = history(h2)['entries'][-1]
        assert newest['comment'] == 'auto: prop_brexit_terms v1 → v2 (via prop_brexit v1 → v2)'
        assert newest['trigger']['changes'][0]['path'] == ['prop_brexit']

        # identical definitions are not propagated
        wl = post('library.create_word_list', name='prop_brexit_terms', words=['Europa', 'Brexit'])
        assert wl.status_code == 200
        assert wl.json['propagated'] == {'macros': [], 'queries': []}

        # restore: new version with the words of v1, propagated like any other change
        actors_v1 = [w for w in client.get(url_for('library.get_word_lists', corpus_id=1), headers=auth_header).json
                     if w['name'] == 'prop_actors'][0]
        wl = post('library.create_word_list', name='prop_actors', words=['Kanzler', 'Premier'])
        assert [(m['name'], m['version']) for m in wl.json['propagated']['macros']] == [('prop_actor', 2)]
        restored = client.post(url_for('library.restore_word_list', corpus_id=1, id=actors_v1['id']),
                               headers=auth_header)
        assert restored.status_code == 201
        assert (restored.json['version'], restored.json['words'], restored.json['comment']) == (3, ['Kanzler'], 'restore v1')
        assert [(m['name'], m['version']) for m in restored.json['propagated']['macros']] == [('prop_actor', 3)]
        assert [q['history_ids'] for q in restored.json['propagated']['queries']] == [[h1, h4]]
        assert history(h1)['entries'][-1]['comment'] == 'auto: prop_actors v2 → v3 (via prop_actor v2 → v3)'
        assert len(history(h1)['entries']) == 5

        # restoring a macro with an identical definition reuses the latest version
        vg_v1 = [m for m in client.get(url_for('library.get_macros', corpus_id=1), headers=auth_header).json
                 if m['name'] == 'prop_speech_vg' and m['version'] == 1][0]
        restored = client.post(url_for('library.restore_macro', corpus_id=1, id=vg_v1['id']), headers=auth_header)
        assert restored.status_code == 200
        assert restored.json['version'] == 2
        assert restored.json['propagated'] == {'macros': [], 'queries': []}

        # import: new macro version propagated to nesting macros and queries
        imported = client.post(url_for('library.import_definitions', corpus_id=1),
                               json={'macros': 'MACRO prop_speech_verb(0)\n[lemma = $prop_speech_verbs & pos = "VV.*"]\n;'},
                               headers=auth_header)
        assert imported.status_code == 200
        assert [(m['name'], m['version']) for m in imported.json['macros']] == [('prop_speech_verb', 3)]
        assert [(m['name'], m['version']) for m in imported.json['propagated']['macros']] == [('prop_speech_vg', 3)]
        assert [q['history_ids'] for q in imported.json['propagated']['queries']] == [[h1, h4]]
        newest = history(h1)['entries'][-1]
        assert newest['comment'] == 'auto: prop_speech_verb v2 → v3 (via prop_speech_vg v2 → v3)'
        assert newest['trigger']['changes'] == [{'kind': 'macro', 'name': 'prop_speech_verb', 'valency': 0,
                                                 'from': 2, 'to': 3, 'path': ['prop_speech_vg']}]
        assert newest['query']['up_to_date'] is True
        assert len(history(h1)['entries']) == 6

        # opt-out
        wl = post('library.create_word_list', propagate=False, name='prop_actors', words=['Kanzler', 'Premier'])
        assert wl.status_code == 201
        assert 'propagated' not in wl.json
        assert latest('prop_actor') == 3
        assert len(history(h1)['entries']) == 6
        assert history(h1)['entries'][-1]['query']['up_to_date'] is False
