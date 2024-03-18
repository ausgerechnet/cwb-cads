#!/usr/bin/python3
# -*- coding: utf-8 -*-

from ..database import Corpus, SubCorpus


def serialize_user(user):
    """Return object data in easily serializeable format

    :return: Dictionary containing the user values
    :rtype: dict

    """

    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'email_confirmed_at': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'active': user.active,
    }


def serialize_discourseme(discourseme):
    """Return object data in easily serializeable format

    :return: Dictionary containing the discourseme values
    :rtype: dict

    """

    return {
        'id': discourseme.id,
        'name': discourseme.name,
        'is_topic': False,
        'user_id': discourseme.user_id,
        'items': discourseme.get_items(),
        'collocation_analyses': []
    }


def serialize_constellation(constellation):
    """Return object data in easily serializeable format

    :return: Dictionary containing the constellation values
    :rtype: dict

    """
    discoursemes = constellation.filter_discoursemes + constellation.highlight_discoursemes
    return {
        'id': constellation.id,
        'user_id': constellation.user_id,
        'name': constellation.name,
        'discoursemes': [discourseme.id for discourseme in discoursemes],
        'discoursemes_names': [discourseme.name for discourseme in discoursemes]
    }


def serialize_collocation(collocation):
    """Return object data in easily serializeable format

    :return: Dictionary containing the collocation analysis values
    :rtype: dict

    """

    # is this on a subcorpus?
    nqr_cqp = collocation._query.nqr_cqp
    if nqr_cqp:
        if nqr_cqp.startswith("SOC-"):
            subcorpus = "SOC"
        else:
            subcorpus = SubCorpus.query.filter_by(nqr_cqp=nqr_cqp).first().name
    else:
        subcorpus = None

    return {
        'id': collocation.id,
        'corpus': collocation._query.corpus.cwb_id,
        'subcorpus': subcorpus,
        'user_id': collocation.user_id,
        'topic_id': collocation._query.discourseme.id,
        'constellation_id': collocation.constellation_id,
        'p_query': 'lemma',
        'flags_query': '',
        'escape_query': False,
        'p_collocation': collocation.p,
        's_break': collocation.s_break,
        'context': collocation.context,
        'items': collocation._query.discourseme.get_items(),
        'topic_discourseme': collocation._query.discourseme.serialize
    }


def serialize_keyword(keyword):
    """Return object data in easily serializeable format

    :return: Dictionary containing the analysis values
    :rtype: dict

    """
    corpus = Corpus.query.filter_by(id=keyword.corpus_id).first()
    corpus_reference = Corpus.query.filter_by(id=keyword.corpus_id_reference).first()
    return {
        'id': keyword.id,
        'user_id': keyword.user_id,
        'corpus': corpus.cwb_id,
        'corpus_reference': corpus_reference.cwb_id,
        'p': keyword.p,
        'p_reference': keyword.p_reference
    }
