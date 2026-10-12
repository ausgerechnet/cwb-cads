from pandas import DataFrame

from cads.spheroscope.slot_query import (categorise_pair, diff_matches,
                                         pair_matches)


def matches(spans, anchors=None):
    """Synthetic dump: list of (match, matchend), optional list of anchor dicts"""

    rows = list()
    for i, (match, matchend) in enumerate(spans):
        row = {'match': match, 'matchend': matchend, 'context': match - 5, 'contextend': matchend + 5}
        if anchors:
            row.update(anchors[i])
        rows.append(row)

    return DataFrame(rows)


def categories(df_a, df_b, **kwargs):

    df = diff_matches(df_a, df_b, **kwargs)

    return list(zip(df['match'], df['matchend'], df['category']))


def test_categorise_pair():

    def m(match, matchend, anchors={}):
        return {'match': match, 'matchend': matchend, 'anchors': anchors}

    assert categorise_pair(m(10, 15, {'0': 10}), m(10, 15, {'0': 10})) == 'identical'
    assert categorise_pair(m(10, 15, {'0': 10}), m(10, 15, {'0': 11})) == 'anchors'
    assert categorise_pair(m(10, 15), m(10, 16)) == 'near'
    assert categorise_pair(m(10, 15), m(9, 14)) == 'near'
    assert categorise_pair(m(10, 15), m(10, 17)) == 'extended'
    assert categorise_pair(m(10, 15), m(8, 15)) == 'extended'
    assert categorise_pair(m(10, 15), m(10, 12)) == 'reduced'
    assert categorise_pair(m(10, 15), m(13, 20)) == 'shifted'
    assert categorise_pair(m(10, 15), None) == 'only_A'
    assert categorise_pair(None, m(10, 15)) == 'only_B'

    # tolerance
    assert categorise_pair(m(10, 15), m(10, 16), tolerance=0) == 'extended'
    assert categorise_pair(m(10, 15), m(10, 17), tolerance=2) == 'near'


def test_pair_start():

    df_a = matches([(10, 15), (20, 25), (30, 35), (40, 45)])
    df_b = matches([(10, 15), (20, 26), (36, 38), (40, 50), (60, 61)])

    assert sorted(pair_matches(df_a, df_b, 'start'), key=str) == sorted([
        (0, 0), (1, 1), (2, None), (3, 3), (None, 2), (None, 4)
    ], key=str)

    assert sorted(categories(df_a, df_b)) == [
        (10, 15, 'identical'),
        (20, 26, 'near'),
        (30, 35, 'only_A'),
        (36, 38, 'only_B'),
        (40, 50, 'extended'),
        (60, 61, 'only_B'),
    ]


def test_pair_span():

    df_a = matches([(10, 15), (20, 25)])
    df_b = matches([(10, 15), (20, 26)])

    assert sorted(categories(df_a, df_b, same='span')) == [
        (10, 15, 'identical'),
        (20, 25, 'only_A'),
        (20, 26, 'only_B'),
    ]


def test_touching_not_merged():

    # adjacent but disjoint matches stay separate
    df_a = matches([(10, 15)])
    df_b = matches([(16, 20)])

    for same in ['start', 'span', 'overlap']:
        assert sorted(categories(df_a, df_b, same=same)) == [
            (10, 15, 'only_A'),
            (16, 20, 'only_B'),
        ]


def test_pair_overlap():

    df_a = matches([(10, 15), (20, 25), (30, 35), (40, 45)])
    df_b = matches([(9, 12), (13, 22), (31, 34), (40, 42), (50, 55)])

    # A(10, 15) pairs with first overlapping B(9, 12); B(13, 22) then pairs with A(20, 25)
    assert sorted(categories(df_a, df_b, same='overlap')) == [
        (9, 15, 'shifted'),
        (13, 25, 'shifted'),
        (30, 35, 'near'),
        (40, 45, 'reduced'),
        (50, 55, 'only_B'),
    ]


def test_anchors_and_delta():

    df_a = matches([(10, 15), (20, 25)], [{0: 10, 1: 12}, {0: 20, 1: 22}])
    df_b = matches([(10, 15), (20, 25)], [{0: 10, 1: 12}, {0: 20, 1: 23}])

    df = diff_matches(df_a, df_b)
    assert df['category'].to_list() == ['identical', 'anchors']
    assert df['delta'].to_list()[1] == {'match': 0, 'matchend': 0, 'anchors': ['1']}
    assert df['A'].to_list()[1]['anchors'] == {'0': 20, '1': 22}
    assert df['B'].to_list()[1]['anchors'] == {'0': 20, '1': 23}


def test_empty():

    df_a = matches([(10, 15)])
    df_b = DataFrame(columns=['match', 'matchend', 'context', 'contextend'])

    assert categories(df_a, df_b) == [(10, 15, 'only_A')]
    assert categories(df_b, df_b) == []
