from flask import url_for
import pytest
from mmda.database import Collocation
from pandas import DataFrame


@pytest.mark.now
def test_create_collocation(client, auth):

    auth.login()
    with client:
        client.get("/")

        # discourseme
        # - create
        discourseme = client.post(url_for('discourseme.create'),
                                  json={
                                      'name': 'CDU',
                                      'description': 'Test Discourseme 1'
                                  },
                                  auth=('admin', '0000'))
        # constellation
        constellation = client.post(url_for('constellation.create'),
                                    json={
                                        'name': 'CDU',
                                        'description': 'Test Constellation 1',
                                        'filter_discourseme_ids': [discourseme.json['id']]
                                    },
                                    auth=('admin', '0000'))

        constellation = client.get(url_for('constellation.get_constellation', id=constellation.json['id']),
                                   auth=('admin', '0000'))

        # query
        # - create
        query = client.post(url_for('query.create'),
                            json={
                                'discourseme_id': discourseme.json['id'],
                                'corpus_id': 1,
                                'cqp_query': '[lemma="und"]'
                            },
                            auth=('admin', '0000'))

        # - execute
        query = client.post(url_for('query.execute', id=query.json['id']),
                            auth=('admin', '0000'))

        # collocation
        # - create
        collocation = client.post(url_for('query.collocation.create', query_id=query.json['id']),
                                  json={
                                      'constellation_id': 1,
                                      'p': 'lemma',
                                      's_break': 's',
                                      'context': 10,
                                  },
                                  auth=('admin', '0000'))

        assert collocation.status_code == 200


def test_create_or_get_cooc(client, auth):

    auth.login()
    with client:
        client.get("/")

        # discourseme
        # - create
        discourseme = client.post(url_for('discourseme.create'),
                                  json={
                                      'name': 'CDU',
                                      'description': 'Test Discourseme 2'
                                  },
                                  auth=('admin', '0000'))
        # constellation
        constellation = client.post(url_for('constellation.create'),
                                    json={
                                        'name': 'CDU',
                                        'description': 'Test Constellation 2',
                                        'filter_discourseme_ids': [discourseme.json['id']]
                                    },
                                    auth=('admin', '0000'))

        constellation = client.get(url_for('constellation.get_constellation', id=constellation.json['id']),
                                   auth=('admin', '0000'))

        # query
        # - create
        query = client.post(url_for('query.create'),
                            json={
                                'discourseme_id': discourseme.json['id'],
                                'corpus_id': 1,
                                'cqp_query': '[lemma="und"]'
                            },
                            auth=('admin', '0000'))

        # - execute
        query = client.post(url_for('query.execute', id=query.json['id']),
                            auth=('admin', '0000'))

        # collocation
        # - create
        collocation = client.post(url_for('query.collocation.create', query_id=query.json['id']),
                                  json={
                                      'constellation_id': 1,
                                      'p': 'lemma',
                                      's_break': 's',
                                      'context': 10,
                                  },
                                  auth=('admin', '0000'))

        collocation = Collocation.query.filter_by(id=collocation.json['id']).first()
        matches = collocation._query.matches
        matches_df = DataFrame([vars(s) for s in matches], columns=['match', 'matchend']).set_index(['match', 'matchend'])

        from ccc import Corpus
        from flask import current_app
        from mmda.collocation import create_or_get_cooc

        corpus = Corpus(corpus_name=collocation._query.corpus.cwb_id,
                        lib_dir=None,
                        cqp_bin=current_app.config['CCC_CQP_BIN'],
                        registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                        data_dir=current_app.config['CCC_DATA_DIR'])
        subcorpus = corpus.subcorpus(subcorpus_name=None, df_dump=matches_df, overwrite=False).set_context(
            collocation.context, collocation.s_break, overwrite=False
        )
        df_cooc = create_or_get_cooc(subcorpus.df, collocation._query.id, collocation.context, collocation.s_break)
        df_cooc_2 = create_or_get_cooc(subcorpus.df, collocation._query.id, collocation.context, collocation.s_break)
        assert df_cooc.equals(df_cooc_2)


@pytest.mark.now
def test_execute_collocation(client, auth):

    auth.login()
    with client:
        client.get("/")

        collocation = client.post(url_for('query.collocation.execute', query_id=1, id=1),
                                  auth=('admin', '0000'))

        collocation = client.post(url_for('query.collocation.execute', query_id=1, id=1),
                                  auth=('admin', '0000'))

        items = client.get(url_for('query.collocation.get_collocation_items', query_id=1, id=collocation.json['id']),
                           auth=('admin', '0000'))

        assert items.status_code == 200
