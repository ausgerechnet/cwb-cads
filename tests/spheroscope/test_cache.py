from uuid import uuid4

from ccc.cwb import Corpus as Crps
from flask import url_for


def test_reuse_results_of_identical_content(client, auth, monkeypatch):

    auth_header = auth.login()
    with client:
        client.get("/")

        def post(endpoint, **json):
            return client.post(url_for(endpoint, corpus_id=1, propagate=False), json=json, headers=auth_header)

        def slot_query(cqp):
            q = client.put(url_for('spheroscope.slot_query.get_or_create'),
                           json={'cqp_query': cqp, 'corpus_id': 1, 'slots': [], 'corrections': []},
                           headers=auth_header)
            assert q.status_code == 200
            return q.json['id']

        # count CQP processes started while getting matches
        started = list()
        start_cqp = Crps.start_cqp

        def counting_start_cqp(self):
            started.append(1)
            return start_cqp(self)

        monkeypatch.setattr(Crps, 'start_cqp', counting_start_cqp)

        def matches(id):
            started.clear()
            m = client.get(url_for('spheroscope.slot_query.matches', id=id), headers=auth_header)
            assert m.status_code == 200
            return m.json['matches'], len(started)

        cqp = '/cache_vg[]'
        # the ccc cache outlives the database: make the content new in every run (without matching anything)
        run = f"never-{uuid4().hex}"

        # v1
        post('library.create_word_list', name='cache_verbs', words=['sagen', 'betonen', run])
        post('library.create_macro_endpoint', name='cache_vg', valency=0, body='[lemma = $cache_verbs]')
        q1 = slot_query(cqp)
        matches_1, cqp_first = matches(q1)
        assert len(matches_1) > 0
        assert cqp_first > 0
        _, cqp_cached = matches(q1)
        assert cqp_cached < cqp_first

        # v2: different content
        post('library.create_word_list', name='cache_verbs', words=['sagen', run])
        post('library.create_macro_endpoint', name='cache_vg', valency=0, body='[lemma = $cache_verbs]')
        q2 = slot_query(cqp)
        assert q2 != q1
        matches_2, cqp_new = matches(q2)
        assert len(matches_2) < len(matches_1)
        assert cqp_new == cqp_first

        # v3: content of v1 again (word order does not matter), with new versions of word list and macro
        wl = post('library.create_word_list', name='cache_verbs', words=[run, 'betonen', 'sagen'])
        assert wl.json['version'] == 3
        macro = post('library.create_macro_endpoint', name='cache_vg', valency=0, body='[lemma = $cache_verbs]')
        assert macro.json['version'] == 3
        q3 = slot_query(cqp)
        assert q3 not in (q1, q2)

        # results of q1 are reused without running CQP
        matches_3, cqp_reused = matches(q3)
        assert matches_3 == matches_1
        assert cqp_reused == cqp_cached
