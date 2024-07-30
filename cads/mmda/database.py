#!/usr/bin/python3
# -*- coding: utf-8 -*-

from datetime import datetime

from ccc.utils import cqp_escape
from flask import Blueprint

from .. import db

bp = Blueprint('mmda-database', __name__, url_prefix='/mmda-database', cli_group='mmda-database')


constellation_discoursemes = db.Table(
    'ConstellationDiscoursemes',
    db.Column('constellation_id', db.Integer, db.ForeignKey('constellation.id')),
    db.Column('discourseme_id', db.Integer, db.ForeignKey('discourseme.id'))
)

# constellation_highlight_discoursemes = db.Table(
#     'ConstellationHighlightDiscoursemes',
#     db.Column('constellation_id', db.Integer, db.ForeignKey('constellation.id')),
#     db.Column('discourseme_id', db.Integer, db.ForeignKey('discourseme.id'))
# )


class Discourseme(db.Model):
    """Discourseme


    """

    __table_args__ = {'sqlite_autoincrement': True}

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'))
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    name = db.Column(db.Unicode(255), nullable=True)
    comment = db.Column(db.Unicode, nullable=True)

    template = db.RelationshipProperty("DiscoursemeTemplateItems", backref="discourseme", cascade='all, delete')

    descriptions = db.relationship("DiscoursemeDescription", backref="discourseme", lazy=True)

    def generate_template(self, p='word'):
        items = set(self.template_items)
        for _query in self.queries:
            for breakdown in _query.breakdowns:
                if breakdown.p == p:
                    items = items.union(set([cqp_escape(item.item) for item in breakdown.items]))
        items = sorted(list(items))
        raise NotImplementedError("insert template items in db")


class DiscoursemeTemplateItems(db.Model):
    """Discourseme Template Items

    """

    __table_args__ = {'sqlite_autoincrement': True}

    id = db.Column(db.Integer(), primary_key=True)
    discourseme_id = db.Column(db.Integer, db.ForeignKey('discourseme.id', ondelete='CASCADE'))
    p = db.Column(db.String(), nullable=True)
    surface = db.Column(db.String(), nullable=True)
    cqp_query = db.Column(db.String(), nullable=True)


class DiscoursemeDescription(db.Model):
    """

    """
    __table_args__ = {'sqlite_autoincrement': True}

    id = db.Column(db.Integer, primary_key=True)
    modified = db.Column(db.DateTime, default=datetime.utcnow)  # (→ query needs update)

    discourseme_id = db.Column(db.Integer, db.ForeignKey('discourseme.id', ondelete='CASCADE'))
    corpus_id = db.Column(db.Integer, db.ForeignKey('corpus.id', ondelete='CASCADE'))
    subcorpus_id = db.Column(db.Integer, db.ForeignKey('sub_corpus.id', ondelete='CASCADE'))
    p = db.Column(db.String(), nullable=True)  # analysis / description layer
    s = db.Column(db.String(), nullable=True)  # for max. query context
    match_strategy = db.Column(db.Unicode, default='longest')

    query_id = db.Column(db.Integer, db.ForeignKey('query.id'))

    items = db.RelationshipProperty("DiscoursemeDescriptionItems", backref="discourseme_description", cascade='all, delete')


class DiscoursemeDescriptionItems(db.Model):
    """Constellation

    """

    __table_args__ = {'sqlite_autoincrement': True}

    id = db.Column(db.Integer(), primary_key=True)
    discourseme_description_id = db.Column(db.Integer, db.ForeignKey('discourseme_description.id', ondelete='CASCADE'))

    item = db.Column(db.String(), nullable=True)


class Constellation(db.Model):
    """Constellation

    """

    __table_args__ = {'sqlite_autoincrement': True}

    id = db.Column(db.Integer(), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'))
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    name = db.Column(db.Unicode(255), nullable=True)
    description = db.Column(db.Unicode, nullable=True)

    # filter_discoursemes = db.relationship("Discourseme", secondary=constellation_filter_discoursemes)
    # backref=db.backref('constellations_filtered'))
    discoursemes = db.relationship("Discourseme", secondary=constellation_discoursemes)
    # backref=db.backref('constellation_highlighted'))

    collocation_analyses = db.relationship('Collocation', backref='constellation', cascade='all, delete')
    keyword_analyses = db.relationship('Keyword', backref='constellation', cascade='all, delete')


###############
# COLLOCATION #
###############
class CollocationDiscoursemeUnigramItem(db.Model):
    """

    """

    id = db.Column(db.Integer, primary_key=True)

    collocation_id = db.Column(db.Integer, db.ForeignKey('collocation.id', ondelete='CASCADE'), index=True)
    discourseme_id = db.Column(db.Integer, db.ForeignKey('discourseme.id', ondelete='CASCADE'), index=True)
    item = db.Column(db.Unicode)

    f = db.Column(db.Integer)
    f1 = db.Column(db.Integer)
    f2 = db.Column(db.Integer)
    N = db.Column(db.Integer)

    scores = db.relationship("CollocationDiscoursemeUnigramItemScore", backref='collocation_discourseme_unigram_item', cascade='all, delete')


class CollocationDiscoursemeUnigramItemScore(db.Model):
    """

    """
    id = db.Column(db.Integer, primary_key=True)
    collocation_item_id = db.Column(db.Integer, db.ForeignKey('collocation_discourseme_unigram_item.id', ondelete='CASCADE'), index=True)
    collocation_id = db.Column(db.Integer, db.ForeignKey('collocation.id', ondelete='CASCADE'), index=True)
    measure = db.Column(db.Unicode)
    score = db.Column(db.Float)


class CollocationDiscoursemeItem(db.Model):
    """

    """

    id = db.Column(db.Integer, primary_key=True)

    collocation_id = db.Column(db.Integer, db.ForeignKey('collocation.id', ondelete='CASCADE'), index=True)
    discourseme_id = db.Column(db.Integer, db.ForeignKey('discourseme.id', ondelete='CASCADE'), index=True)
    item = db.Column(db.Unicode)

    f = db.Column(db.Integer)
    f1 = db.Column(db.Integer)
    f2 = db.Column(db.Integer)
    N = db.Column(db.Integer)

    scores = db.relationship("CollocationDiscoursemeItemScore", backref='collocation_discourseme_item', cascade='all, delete')


class CollocationDiscoursemeItemScore(db.Model):
    """

    """
    id = db.Column(db.Integer, primary_key=True)
    collocation_item_id = db.Column(db.Integer, db.ForeignKey('collocation_discourseme_item.id', ondelete='CASCADE'), index=True)
    collocation_id = db.Column(db.Integer, db.ForeignKey('collocation.id', ondelete='CASCADE'), index=True)
    measure = db.Column(db.Unicode)
    score = db.Column(db.Float)


###########
# KEYWORD #
###########
class KeywordDiscoursemeUnigramItem(db.Model):
    """

    """

    id = db.Column(db.Integer, primary_key=True)

    keyword_id = db.Column(db.Integer, db.ForeignKey('keyword.id', ondelete='CASCADE'), index=True)
    discourseme_id = db.Column(db.Integer, db.ForeignKey('discourseme.id', ondelete='CASCADE'), index=True)

    item = db.Column(db.Unicode)

    f1 = db.Column(db.Integer)
    N1 = db.Column(db.Integer)
    f2 = db.Column(db.Integer)
    N2 = db.Column(db.Integer)

    scores = db.relationship("KeywordDiscoursemeUnigramItemScore", backref='keyword_discourseme_unigram_item', cascade='all, delete')


class KeywordDiscoursemeUnigramItemScore(db.Model):
    """

    """
    id = db.Column(db.Integer, primary_key=True)

    keyword_id = db.Column(db.Integer, db.ForeignKey('keyword.id', ondelete='CASCADE'), index=True)
    keyword_item_id = db.Column(db.Integer, db.ForeignKey('keyword_discourseme_unigram_item.id', ondelete='CASCADE'), index=True)

    measure = db.Column(db.Unicode)
    score = db.Column(db.Float)


class KeywordDiscoursemeItem(db.Model):
    """

    """

    id = db.Column(db.Integer, primary_key=True)

    keyword_id = db.Column(db.Integer, db.ForeignKey('keyword.id', ondelete='CASCADE'), index=True)
    discourseme_id = db.Column(db.Integer, db.ForeignKey('discourseme.id', ondelete='CASCADE'), index=True)

    item = db.Column(db.Unicode)

    f1 = db.Column(db.Integer)
    N1 = db.Column(db.Integer)
    f2 = db.Column(db.Integer)
    N2 = db.Column(db.Integer)

    scores = db.relationship("KeywordDiscoursemeItemScore", backref='keyword_discourseme_item', cascade='all, delete')


class KeywordDiscoursemeItemScore(db.Model):
    """

    """
    id = db.Column(db.Integer, primary_key=True)

    keyword_item_id = db.Column(db.Integer, db.ForeignKey('keyword_discourseme_item.id', ondelete='CASCADE'), index=True)
    keyword_id = db.Column(db.Integer, db.ForeignKey('keyword.id', ondelete='CASCADE'), index=True)

    measure = db.Column(db.Unicode)
    score = db.Column(db.Float)
