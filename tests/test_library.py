import os

from flask import url_for


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
