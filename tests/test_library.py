import os
import shutil

from flask import url_for

from cads import db
from cads.database import Macro, MacroCall, Query, WordList
from cads.library import import_library
from cads.spheroscope.database import SlotQuery


PHRASES = open("tests/library/macros/phrases.txt").read()


def test_get_library(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        macros = client.get(url_for('library.get_macros', corpus_id=1), headers=auth_header)
        assert macros.status_code == 200
        np_entity = [m for m in macros.json if m['name'] == 'np_entity'][0]
        assert np_entity['valency'] == 0
        assert "$nouns_entity__v1" in np_entity['body']

        wordlists = client.get(url_for('library.get_word_lists', corpus_id=1), headers=auth_header)
        assert wordlists.status_code == 200
        nouns_entity = [wl for wl in wordlists.json if wl['name'] == 'nouns_entity'][0]
        assert len(nouns_entity['words']) > 0


def test_create_word_list_versions(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        wl = client.post(url_for('library.create_word_list', corpus_id=2),
                         json={'name': 'test_versions', 'words': ['a', 'b']},
                         headers=auth_header)
        assert wl.status_code == 201
        assert wl.json['version'] == 1
        assert wl.json['words'] == ['a', 'b']

        # identical (comment is ignored): reuse
        wl_same = client.post(url_for('library.create_word_list', corpus_id=2),
                              json={'name': 'test_versions', 'words': ['a', 'b'], 'comment': 'other'},
                              headers=auth_header)
        assert wl_same.status_code == 200
        assert wl_same.json['id'] == wl.json['id']

        # changed: new version
        wl_new = client.post(url_for('library.create_word_list', corpus_id=2),
                             json={'name': 'test_versions', 'words': ['a', 'b', 'c']},
                             headers=auth_header)
        assert wl_new.status_code == 201
        assert wl_new.json['version'] == 2

        # invalid name
        wl_invalid = client.post(url_for('library.create_word_list', corpus_id=2),
                                 json={'name': 'no spaces', 'words': ['a']},
                                 headers=auth_header)
        assert wl_invalid.status_code == 400


def test_create_macro_versions(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        client.post(url_for('library.create_word_list', corpus_id=2),
                    json={'name': 'test_nouns', 'words': ['Haus', 'Baum']},
                    headers=auth_header)

        body = '[lemma = $test_nouns & pos = "$0"]'
        macro = client.post(url_for('library.create_macro_endpoint', corpus_id=2),
                            json={'name': 'test_noun', 'argument_names': ['POS'], 'body': body},
                            headers=auth_header)
        assert macro.status_code == 201
        assert macro.json['version'] == 1
        assert macro.json['valency'] == 1
        assert macro.json['argument_names'] == ['POS']
        assert '$test_nouns__v1' in macro.json['body']
        with client.application.app_context():
            assert os.path.exists(os.path.join(client.application.config['CCC_LIB_DIR'], 'corpus_2',
                                               'macros', 'test_noun__1__v1.txt'))

        # identical: reuse
        macro_same = client.post(url_for('library.create_macro_endpoint', corpus_id=2),
                                 json={'name': 'test_noun', 'argument_names': ['POS'], 'body': body},
                                 headers=auth_header)
        assert macro_same.status_code == 200
        assert macro_same.json['id'] == macro.json['id']

        # nested word list changes: new version pointing to new word list version
        client.post(url_for('library.create_word_list', corpus_id=2),
                    json={'name': 'test_nouns', 'words': ['Haus', 'Baum', 'Tisch']},
                    headers=auth_header)
        macro_new = client.post(url_for('library.create_macro_endpoint', corpus_id=2),
                                json={'name': 'test_noun', 'argument_names': ['POS'], 'body': body},
                                headers=auth_header)
        assert macro_new.status_code == 201
        assert macro_new.json['version'] == 2
        assert '$test_nouns__v2' in macro_new.json['body']

        # same name, different valency: independent versioning
        macro_other = client.post(url_for('library.create_macro_endpoint', corpus_id=2),
                                  json={'name': 'test_noun', 'valency': 0, 'body': '[lemma = $test_nouns]'},
                                  headers=auth_header)
        assert macro_other.status_code == 201
        assert macro_other.json['version'] == 1

        # undefined dependency
        macro_undefined = client.post(url_for('library.create_macro_endpoint', corpus_id=2),
                                      json={'name': 'test_undefined', 'valency': 0, 'body': '/undefined[]'},
                                      headers=auth_header)
        assert macro_undefined.status_code == 400

        # valency does not match argument names
        macro_mismatch = client.post(url_for('library.create_macro_endpoint', corpus_id=2),
                                     json={'name': 'test_mismatch', 'valency': 2, 'argument_names': ['A'],
                                           'body': '[word = "$0"]'},
                                     headers=auth_header)
        assert macro_mismatch.status_code == 400


def test_import(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # macros in reverse order: dependencies are resolved anyway
        definitions = "\n".join(reversed(PHRASES.split("\n\n")))
        imported = client.post(url_for('library.import_definitions', corpus_id=2),
                               json={'macros': definitions,
                                     'wordlists': [{'name': 'test_import', 'words': ['x', 'y']}]},
                               headers=auth_header)
        assert imported.status_code == 200
        assert len(imported.json['wordlists']) == 1
        assert {(m['name'], m['valency']) for m in imported.json['macros']} == \
            {('adjp', 0), ('np', 1), ('np', 2), ('pp', 2)}
        pp = [m for m in imported.json['macros'] if m['name'] == 'pp'][0]
        assert pp['argument_names'] == ['Prep', 'N_Adj']
        assert '/np__1__v1[' in pp['body']

        # re-import: everything is reused
        reimported = client.post(url_for('library.import_definitions', corpus_id=2),
                                 json={'macros': PHRASES},
                                 headers=auth_header)
        assert reimported.status_code == 200
        assert {m['id'] for m in reimported.json['macros']} == {m['id'] for m in imported.json['macros']}

        # failure: nothing is imported
        failed = client.post(url_for('library.import_definitions', corpus_id=2),
                             json={'macros': "MACRO test_ok(0)\n[word = \"a\"]\n;\nMACRO test_broken(0)\n/missing[]\n;",
                                   'wordlists': [{'name': 'test_rollback', 'words': ['x']}]},
                             headers=auth_header)
        assert failed.status_code == 400
        macros = client.get(url_for('library.get_macros', corpus_id=2), headers=auth_header)
        assert 'test_ok' not in {m['name'] for m in macros.json}
        wordlists = client.get(url_for('library.get_word_lists', corpus_id=2), headers=auth_header)
        assert 'test_rollback' not in {wl['name'] for wl in wordlists.json}


def test_delete(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        wl = client.post(url_for('library.create_word_list', corpus_id=2),
                         json={'name': 'test_delete', 'words': ['a']},
                         headers=auth_header)
        macro = client.post(url_for('library.create_macro_endpoint', corpus_id=2),
                            json={'name': 'test_delete_macro', 'valency': 0, 'body': '[word = $test_delete]'},
                            headers=auth_header)
        nesting = client.post(url_for('library.create_macro_endpoint', corpus_id=2),
                              json={'name': 'test_delete_nesting', 'valency': 0, 'body': '/test_delete_macro[]'},
                              headers=auth_header)

        # referenced by a macro
        assert client.delete(url_for('library.delete_word_list', corpus_id=2, id=wl.json['id']),
                             headers=auth_header).status_code == 409
        assert client.delete(url_for('library.delete_macro', corpus_id=2, id=macro.json['id']),
                             headers=auth_header).status_code == 409

        # unreferenced
        assert client.delete(url_for('library.delete_macro', corpus_id=2, id=nesting.json['id']),
                             headers=auth_header).status_code == 200
        assert client.delete(url_for('library.delete_macro', corpus_id=2, id=macro.json['id']),
                             headers=auth_header).status_code == 200
        assert client.delete(url_for('library.delete_word_list', corpus_id=2, id=wl.json['id']),
                             headers=auth_header).status_code == 200
        assert client.get(url_for('library.get_word_list', corpus_id=2, id=wl.json['id']),
                          headers=auth_header).status_code == 404

        # referenced by a query
        wl = client.post(url_for('library.create_word_list', corpus_id=2),
                         json={'name': 'test_delete_query', 'words': ['a']},
                         headers=auth_header)
        client.post(url_for('query.create_query'),
                    json={'corpus_id': 2, 'cqp_query': '[word = $test_delete_query]', 's': 's'},
                    headers=auth_header)
        assert client.delete(url_for('library.delete_word_list', corpus_id=2, id=wl.json['id']),
                             headers=auth_header).status_code == 409


def test_reimport_library(app):

    tmp_lib = "tests/tmp/library"

    def counts():
        return (
            WordList.query.filter_by(corpus_id=2).count(),
            Macro.query.filter_by(corpus_id=2).count(),
            SlotQuery.query.filter_by(corpus_id=2).count()
        )

    def latest(model, name):
        return model.query.filter_by(corpus_id=2, name=name).order_by(model.version.desc()).first()

    with app.app_context():

        import_library("tests/library/", corpus_id=2, username='admin')
        before = counts()

        # unchanged: everything is reused
        import_library("tests/library/", corpus_id=2, username='admin')
        assert counts() == before

        nouns_entity_v1 = latest(WordList, 'nouns_entity')
        np_entity_v1 = latest(Macro, 'np_entity')
        slot_query_v1 = SlotQuery.query.filter_by(corpus_id=2, name='pattern3_np_will_np').one()
        assert MacroCall.query.filter_by(query_id=slot_query_v1.id, macro_id=np_entity_v1.id).one()

        # changed word list: new versions of word list, dependent macro, dependent queries
        try:
            shutil.copytree("tests/library/", tmp_lib)
            with open(os.path.join(tmp_lib, "wordlists", "nouns_entity.txt"), "at") as f:
                f.write("\nTestnomen\n")
            import_library(tmp_lib, corpus_id=2, username='admin')
        finally:
            shutil.rmtree("tests/tmp")

        nouns_entity_v2 = latest(WordList, 'nouns_entity')
        assert nouns_entity_v2.version == nouns_entity_v1.version + 1
        assert nouns_entity_v2.word_list[-1] == 'Testnomen'

        np_entity_v2 = latest(Macro, 'np_entity')
        assert np_entity_v2.version == np_entity_v1.version + 1
        assert f"$nouns_entity__v{nouns_entity_v2.version}" in np_entity_v2.body

        slot_queries = SlotQuery.query.filter_by(corpus_id=2, name='pattern3_np_will_np').all()
        assert len(slot_queries) == 2
        assert np_entity_v2.canonical_name in slot_queries[-1].mangled_query

        # old versions and provenance are kept
        assert db.session.get(WordList, nouns_entity_v1.id)
        assert db.session.get(Macro, np_entity_v1.id)
        assert np_entity_v1.canonical_name in db.session.get(SlotQuery, slot_query_v1.id).mangled_query

        # macros and queries without dependency on the changed word list are reused
        assert latest(Macro, 'np_generic').version == 1


def test_dependencies_and_usage(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        def post(endpoint, **json):
            return client.post(url_for(endpoint, corpus_id=2), json=json, headers=auth_header)

        nouns = post('library.create_word_list', name='dep_nouns', words=['Haus'])
        inner = post('library.create_macro_endpoint', name='dep_inner', valency=0, body='[lemma = $dep_nouns]')
        outer = post('library.create_macro_endpoint', name='dep_outer', valency=0, body='/dep_inner[] [pos = "V.*"]')
        definition = {'cqp_query': '@0[::] /dep_outer[] @1[::] [word = $dep_nouns]', 'corpus_id': 2,
                      'slots': [], 'corrections': []}
        slot_query = client.post(url_for('spheroscope.slot_query.create'), json=definition, headers=auth_header)
        assert slot_query.status_code == 200

        # dependency tree
        assert slot_query.json['up_to_date'] is True
        dependencies = slot_query.json['dependencies']
        assert dependencies['wordlists'] == [
            {'id': nouns.json['id'], 'name': 'dep_nouns', 'version': 1, 'latest_version': 1}
        ]
        assert len(dependencies['macros']) == 1
        dep_outer = dependencies['macros'][0]
        assert (dep_outer['id'], dep_outer['valency'], dep_outer['version']) == (outer.json['id'], 0, 1)
        assert dep_outer['wordlists'] == []
        dep_inner = dep_outer['macros'][0]
        assert dep_inner['id'] == inner.json['id']
        assert dep_inner['wordlists'][0]['id'] == nouns.json['id']
        assert outer.json['dependencies']['macros'][0]['id'] == inner.json['id']

        # usage (direct and via nested macros)
        usage = client.get(url_for('library.get_word_list_usage', corpus_id=2, id=nouns.json['id']), headers=auth_header)
        assert {m['name'] for m in usage.json['macros']} == {'dep_inner', 'dep_outer'}
        assert [q['id'] for q in usage.json['queries']] == [slot_query.json['id']]
        usage = client.get(url_for('library.get_macro_usage', corpus_id=2, id=inner.json['id']), headers=auth_header)
        assert [m['name'] for m in usage.json['macros']] == ['dep_outer']
        assert [q['id'] for q in usage.json['queries']] == [slot_query.json['id']]
        usage = client.get(url_for('library.get_macro_usage', corpus_id=2, id=outer.json['id']), headers=auth_header)
        assert usage.json['macros'] == []
        assert [q['id'] for q in usage.json['queries']] == [slot_query.json['id']]

        # PUT returns the existing query while it is up to date
        put = client.put(url_for('spheroscope.slot_query.get_or_create'), json=definition, headers=auth_header)
        assert put.json['id'] == slot_query.json['id']

        # new word list version: query and macros using it are outdated
        nouns_v2 = post('library.create_word_list', name='dep_nouns', words=['Haus', 'Baum'])
        assert nouns_v2.json['version'] == 2
        old = client.get(url_for('spheroscope.slot_query.get_one', id=slot_query.json['id']), headers=auth_header)
        assert old.json['up_to_date'] is False
        assert old.json['dependencies']['wordlists'][0]['latest_version'] == 2
        outer_now = client.get(url_for('library.get_macro', corpus_id=2, id=outer.json['id']), headers=auth_header)
        assert outer_now.json['up_to_date'] is False

        outdated = client.get(url_for('spheroscope.slot_query.get_all', outdated=True), headers=auth_header)
        assert slot_query.json['id'] in {q['id'] for q in outdated.json}
        current = client.get(url_for('spheroscope.slot_query.get_all', outdated=False), headers=auth_header)
        assert slot_query.json['id'] not in {q['id'] for q in current.json}

        # PUT now creates a new query with the latest word list version (and reuses that one afterwards)
        put = client.put(url_for('spheroscope.slot_query.get_or_create'), json=definition, headers=auth_header)
        assert put.json['id'] != slot_query.json['id']
        assert put.json['dependencies']['wordlists'][0]['version'] == 2
        put_again = client.put(url_for('spheroscope.slot_query.get_or_create'), json=definition, headers=auth_header)
        assert put_again.json['id'] == put.json['id']

        # undefined library calls
        undefined = client.post(url_for('spheroscope.slot_query.create'),
                                json={**definition, 'cqp_query': '/dep_undefined[]'}, headers=auth_header)
        assert undefined.status_code == 400
        undefined = client.put(url_for('spheroscope.slot_query.get_or_create'),
                               json={**definition, 'cqp_query': '[word = $dep_undefined]'}, headers=auth_header)
        assert undefined.status_code == 400


def test_query_library_from(app):

    with app.app_context():

        from cads.library import save_wordlist

        save_wordlist('copy_nouns', ['Haus'], 2)
        focus = Query(corpus_id=2, cqp_query='[lemma = $copy_nouns]', s='s')
        db.session.add(focus)
        db.session.commit()

        # new version: a copy with library_from keeps the version of the focus query
        save_wordlist('copy_nouns', ['Haus', 'Baum'], 2)
        copy = Query(corpus_id=2, cqp_query=focus.cqp_query, s='s', library_from=focus)
        fresh = Query(corpus_id=2, cqp_query=focus.cqp_query, s='s')
        db.session.add_all([copy, fresh])
        db.session.commit()

        assert copy.mangled_query == focus.mangled_query == '[lemma = $copy_nouns__v1]'
        assert fresh.mangled_query == '[lemma = $copy_nouns__v2]'
        assert focus.up_to_date is False and copy.up_to_date is False and fresh.up_to_date is True


def test_macro_definition_and_timestamps(client, auth):

    from datetime import datetime, timezone
    from time import sleep

    auth_header = auth.login()
    with client:
        client.get("/")

        def post(endpoint, **json):
            return client.post(url_for(endpoint, corpus_id=2), json=json, headers=auth_header)

        # word list names sharing a prefix, nested macro with arguments
        post('library.create_word_list', name='def_noun', words=['Haus'])
        post('library.create_word_list', name='def_nouns', words=['Haus', 'Baum'])
        post('library.create_macro_endpoint', name='def_inner', argument_names=['Word'], body='[word = "$0"]')
        body = '[lemma = $def_noun | lemma = $def_nouns] /def_inner["und"]\n'
        macro = post('library.create_macro_endpoint', name='def_outer', valency=0, body=body)
        assert macro.status_code == 201
        assert '$def_noun__v1' in macro.json['body'] and '/def_inner__1__v1[' in macro.json['body']
        assert macro.json['definition'] == body

        # definition can be posted again: same version
        again = post('library.create_macro_endpoint', name='def_outer', valency=0, body=macro.json['definition'])
        assert again.status_code == 200
        assert again.json['id'] == macro.json['id']

        # the mangled body cannot
        mangled = post('library.create_macro_endpoint', name='def_outer', valency=0, body=macro.json['body'])
        assert mangled.status_code == 400

        # timestamps are set at creation time
        first = post('library.create_word_list', name='time_a', words=['a'])
        sleep(1.1)
        second = post('library.create_word_list', name='time_b', words=['b'])
        t1, t2 = (datetime.fromisoformat(r.json['modified']) for r in [first, second])
        assert t2 > t1
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        assert abs((now - t2).total_seconds()) < 60

        # unknown ids
        assert client.get(url_for('library.get_macro', corpus_id=2, id=999999), headers=auth_header).status_code == 404
        assert client.get(url_for('library.get_word_list', corpus_id=2, id=999999), headers=auth_header).status_code == 404


def test_ids_not_reused(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        # queries
        query = client.post(url_for('query.create_query'),
                            json={'corpus_id': 2, 'cqp_query': '[word="ids_not_reused"]', 's': 's'},
                            headers=auth_header)
        assert client.delete(url_for('query.delete_query', query_id=query.json['id']),
                             headers=auth_header).status_code == 200
        query_new = client.post(url_for('query.create_query'),
                                json={'corpus_id': 2, 'cqp_query': '[word="ids_not_reused_2"]', 's': 's'},
                                headers=auth_header)
        assert query_new.json['id'] > query.json['id']

        # word lists
        wl = client.post(url_for('library.create_word_list', corpus_id=2),
                         json={'name': 'ids_not_reused', 'words': ['a']}, headers=auth_header)
        assert client.delete(url_for('library.delete_word_list', corpus_id=2, id=wl.json['id']),
                             headers=auth_header).status_code == 200
        wl_new = client.post(url_for('library.create_word_list', corpus_id=2),
                             json={'name': 'ids_not_reused_2', 'words': ['a']}, headers=auth_header)
        assert wl_new.json['id'] > wl.json['id']

        # macros
        macro = client.post(url_for('library.create_macro_endpoint', corpus_id=2),
                            json={'name': 'ids_not_reused', 'valency': 0, 'body': '[word = "a"]'}, headers=auth_header)
        assert client.delete(url_for('library.delete_macro', corpus_id=2, id=macro.json['id']),
                             headers=auth_header).status_code == 200
        macro_new = client.post(url_for('library.create_macro_endpoint', corpus_id=2),
                                json={'name': 'ids_not_reused_2', 'valency': 0, 'body': '[word = "a"]'},
                                headers=auth_header)
        assert macro_new.json['id'] > macro.json['id']
