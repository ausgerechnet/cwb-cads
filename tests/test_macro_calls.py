from types import SimpleNamespace

from flask import url_for

from cads.database import mangle_macro_call, parse_macro_calls


def calls(text):
    return [(c.name, c.arguments) for c in parse_macro_calls(text)]


def test_parse_macro_calls():

    # as CQP: commas separate arguments, whitespace is irrelevant, quotes are kept
    assert calls('/adjp[]') == [('adjp', [])]
    assert calls('/adjp[ ]') == [('adjp', [])]
    assert calls('/m1[NN]') == [('m1', ['NN'])]
    assert calls('/m2[ART, NN]') == [('m2', ['ART', 'NN'])]
    assert calls('/m2[ART,NN]') == [('m2', ['ART', 'NN'])]
    assert calls('/m2[ART,  NN]') == [('m2', ['ART', 'NN'])]
    assert calls('/m2["ART", "NN"]') == [('m2', ['"ART"', '"NN"'])]
    assert calls("/m1['NN']") == [('m1', ["'NN'"])]

    # quotes protect ',' and ']'
    assert calls('/w1[","]') == [('w1', ['","'])]
    assert calls("/w1[',']") == [('w1', ["','"])]
    assert calls('/m1["N[NE]"]') == [('m1', ['"N[NE]"'])]
    assert calls('/w1["Haus, Baum"]') == [('w1', ['"Haus, Baum"'])]
    assert calls('/w1[\'"\']') == [('w1', ['\'"\''])]
    assert calls('/w1["a\\"]"]') == [('w1', ['"a\\"]"'])]

    # several calls, calls in macro bodies, calls inside strings are ignored
    assert calls('/np[$1] /pp[$0, $1]\n/adjp[]') == [('np', ['$1']), ('pp', ['$0', '$1']), ('adjp', [])]
    assert calls('[word = "/np[]"] /np[]') == [('np', [])]
    assert calls('[word="a"] </s>') == []

    # unterminated calls are ignored
    assert calls('/np[a, b') == []


def test_mangle_macro_call():

    m2 = SimpleNamespace(name='m2', valency=2, canonical_name='m2__2__v3')
    m1 = SimpleNamespace(name='m2', valency=1, canonical_name='m2__1__v1')

    text = '/m2[ART,  NN] /m2[","] /m2["a, b", \'c]\'] /m2_other[a, b] [word="/m2[a, b]"]'
    assert mangle_macro_call(text, m2) == \
        '/m2__2__v3[ART,  NN] /m2[","] /m2__2__v3["a, b", \'c]\'] /m2_other[a, b] [word="/m2[a, b]"]'
    assert mangle_macro_call(text, m1) == \
        '/m2[ART,  NN] /m2__1__v1[","] /m2["a, b", \'c]\'] /m2_other[a, b] [word="/m2[a, b]"]'


def test_macro_call_arguments_in_queries(client, auth):

    auth_header = auth.login()
    with client:
        client.get("/")

        for name, valency, body in [('call_word', 1, '[word = "$0"]'),
                                    ('call_pos', 1, '[pos = "$0"]'),
                                    ('call_pos', 2, '[pos = "$0"] [pos = "$1"]')]:
            macro = client.post(url_for('library.create_macro_endpoint', corpus_id=1),
                                json={'name': name, 'valency': valency, 'body': body}, headers=auth_header)
            assert macro.status_code in [200, 201]

        # nested calls with quoted arguments
        nested = client.post(url_for('library.create_macro_endpoint', corpus_id=1),
                             json={'name': 'call_nested', 'valency': 0, 'body': '/call_word[","] /call_pos[\'ART\', NN]'},
                             headers=auth_header)
        assert nested.status_code in [200, 201]
        assert {(m['name'], m['valency']) for m in nested.json['dependencies']['macros']} == \
            {('call_word', 1), ('call_pos', 2)}

        # numbers of matches as obtained with plain CQP on GERMAPARL1386
        for cqp_query, nr_matches in [('/call_word[","]', 7870),
                                      ("/call_word[',']", 7870),
                                      ('/call_pos["N[NE]"]', 39313),
                                      ('/call_pos[ART,  NN]', 9210),
                                      ('/call_pos["ART", "NN"]', 9210)]:
            slot_query = client.put(url_for('spheroscope.slot_query.get_or_create'),
                                    json={'cqp_query': cqp_query, 'corpus_id': 1}, headers=auth_header)
            assert slot_query.status_code == 200, cqp_query
            matches = client.get(url_for('spheroscope.slot_query.matches', id=slot_query.json['id']),
                                 headers=auth_header)
            assert matches.json['nr_matches'] == nr_matches, cqp_query
