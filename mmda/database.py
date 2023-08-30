#!/usr/bin/python3
# -*- coding: utf-8 -*-

import json
from datetime import datetime

from flask import Blueprint, current_app
from flask_login import UserMixin
from werkzeug.security import generate_password_hash

from . import db

bp = Blueprint('database', __name__, url_prefix='/database', cli_group='database')

users_roles = db.Table(
    'UsersRoles',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id')),
    db.Column('role_id', db.Integer, db.ForeignKey('role.id'))
)

# keyword_discoursemes = db.Table(
#     'KeywordDiscoursemes',
#     db.Column('keyword_id', db.Integer, db.ForeignKey('keyword.id')),
#     db.Column('discourseme_id', db.Integer, db.ForeignKey('discourseme.id'))
# )

constellation_filter_discoursemes = db.Table(
    'ConstellationFilterDiscoursemes',
    db.Column('constellation_id', db.Integer, db.ForeignKey('constellation.id')),
    db.Column('discourseme_id', db.Integer, db.ForeignKey('discourseme.id'))
)

constellation_highlight_discoursemes = db.Table(
    'ConstellationHighlightDiscoursemes',
    db.Column('constellation_id', db.Integer, db.ForeignKey('constellation.id')),
    db.Column('discourseme_id', db.Integer, db.ForeignKey('discourseme.id'))
)

collocation_items_discoursemes = db.Table(
    'CollocationItemsDiscoursemes',
    db.Column('collocation_items_id', db.Integer, db.ForeignKey('collocation_items.id')),
    db.Column('discourseme_id', db.Integer, db.ForeignKey('discourseme.id'))
)


class User(db.Model, UserMixin):
    """User

    """

    id = db.Column(db.Integer, primary_key=True)
    created = db.Column(db.DateTime, default=datetime.utcnow)
    username = db.Column(db.Unicode(255), nullable=False, server_default=u'', unique=True)
    email = db.Column(db.Unicode(255), nullable=False, server_default=u'', unique=True)
    email_confirmed_at = db.Column(db.DateTime)
    password_hash = db.Column(db.Unicode(255), nullable=False, server_default='')
    reset_password_token = db.Column(db.Unicode(255), nullable=False, server_default=u'')
    active = db.Column('is_active', db.Boolean(), nullable=False, server_default='0')
    first_name = db.Column(db.Unicode(255), nullable=False, server_default=u'')
    last_name = db.Column(db.Unicode(255), nullable=False, server_default=u'')

    roles = db.relationship('Role', secondary=users_roles, backref=db.backref('user', lazy='dynamic'))
    discoursemes = db.relationship('Discourseme', backref='user', lazy=True)
    constellations = db.relationship('Constellation', backref='user', lazy=True)

    collocations = db.relationship('Collocation', backref='user', lazy=True)
    # keyword_analyses = db.relationship('Keyword', backref='user', lazy=True)

    @property
    def serialize(self):
        """Return object data in easily serializeable format

        :return: Dictionary containing the user values
        :rtype: dict

        """

        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'email_confirmed_at': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'active': self.active,
        }


class Role(db.Model):
    """Role

    """

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Unicode(255), nullable=False, server_default=u'', unique=True)  # for @roles_accepted()
    description = db.Column(db.Unicode(255), server_default=u'')


class Corpus(db.Model):
    """Corpus

    """

    id = db.Column(db.Integer, primary_key=True)
    cwb_id = db.Column(db.Unicode)
    name = db.Column(db.Unicode)
    language = db.Column(db.Unicode)
    register = db.Column(db.Unicode)
    description = db.Column(db.Unicode)
    embeddings = db.Column(db.Unicode)  # TODO

    queries = db.relationship('Query', backref='corpus', passive_deletes=True, cascade='all, delete')


# class Embeddings(db.Model):
#     """Embeddings

#     """
#     id = db.Column(db.Integer, primary_key=True)
#     name = db.Column(db.Unicode)
#     language = db.Column(db.Unicode)
#     register = db.Column(db.Unicode)
#     p = db.Column(db.Unicode)


class Discourseme(db.Model):
    """Discourseme

    """

    __table_args__ = {'sqlite_autoincrement': True}

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'))
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    name = db.Column(db.Unicode(255), nullable=True)
    description = db.Column(db.Unicode, nullable=True)
    items = db.Column(db.Unicode, default="")
    queries = db.relationship("Query", backref="discourseme", lazy=True)

    @property
    def serialize(self):
        """Return object data in easily serializeable format

        :return: Dictionary containing the discourseme values
        :rtype: dict

        """

        return {
            'id': self.id,
            'name': self.name,
            'is_topic': False,
            'user_id': self.user_id,
            'items': self.items.split("\t"),
            'collocation_analyses': []
        }


class Constellation(db.Model):
    """Constellation

    """

    __table_args__ = {'sqlite_autoincrement': True}

    id = db.Column(db.Integer(), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'))
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    name = db.Column(db.Unicode(255), nullable=True)
    description = db.Column(db.Unicode, nullable=True)

    filter_discoursemes = db.relationship("Discourseme", secondary=constellation_filter_discoursemes,
                                          backref=db.backref('constellations_filtered', lazy=True))
    highlight_discoursemes = db.relationship("Discourseme", secondary=constellation_highlight_discoursemes,
                                             backref=db.backref('constellation_highlighted', lazy=True))

    collocation_analyses = db.relationship('Collocation', backref='constellation', lazy=True)

    @property
    def serialize(self):
        """Return object data in easily serializeable format

        :return: Dictionary containing the constellation values
        :rtype: dict

        """
        discoursemes = self.filter_discoursemes + self.highlight_discoursemes
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'discoursemes': [discourseme.id for discourseme in discoursemes],
            'discoursemes_names': [discourseme.name for discourseme in discoursemes]
        }


class Query(db.Model):
    """Query: executed in CQP and dumped to disk

    """

    __table_args__ = {'sqlite_autoincrement': True}

    id = db.Column(db.Integer, primary_key=True)
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    discourseme_id = db.Column(db.Integer, db.ForeignKey('discourseme.id', ondelete='CASCADE'))
    corpus_id = db.Column(db.Integer, db.ForeignKey('corpus.id', ondelete='CASCADE'))
    nqr_name = db.Column(db.Unicode)  # run on previously defined NQR?

    cqp_query = db.Column(db.Unicode)
    cqp_nqr_matches = db.Column(db.Unicode)  # resulting NQR in CWB
    match_strategy = db.Column(db.Unicode, default='longest')
    matches = db.relationship('Matches', backref='_query')
    breakdowns = db.relationship('Breakdown', backref='_query')
    collocations = db.relationship('Collocation', backref='_query')
    concordances = db.relationship('Concordance', backref='_query')


class Matches(db.Model):
    """Matches

    """

    id = db.Column(db.Integer, primary_key=True)
    created = db.Column(db.DateTime, default=datetime.utcnow)

    query_id = db.Column(db.Integer, db.ForeignKey('query.id', ondelete='CASCADE'))

    match = db.Column(db.Integer, nullable=False)
    matchend = db.Column(db.Integer, nullable=False)


class Breakdown(db.Model):
    """Breakdown

    """

    id = db.Column(db.Integer, primary_key=True)
    created = db.Column(db.DateTime, default=datetime.utcnow)

    query_id = db.Column(db.Integer, db.ForeignKey('query.id', ondelete='CASCADE'))

    p = db.Column(db.Unicode, nullable=False)

    items = db.relationship('BreakdownItems', backref='breakdown', lazy=True)


class BreakdownItems(db.Model):
    """Breakdown Items

    """

    id = db.Column(db.Integer, primary_key=True)
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    breakdown_id = db.Column(db.Integer, db.ForeignKey('breakdown.id', ondelete='CASCADE'))

    item = db.Column(db.Unicode)
    freq = db.Column(db.Integer)


class Concordance(db.Model):
    """Concordance

    """

    id = db.Column(db.Integer, primary_key=True)
    created = db.Column(db.DateTime, default=datetime.utcnow)

    query_id = db.Column(db.Integer, db.ForeignKey('query.id', ondelete='CASCADE'))

    p = db.Column(db.Unicode, nullable=False)
    context = db.Column(db.Integer)
    s_break = db.Column(db.Unicode)

#     lines = db.relationship('ConcordanceLine', backref='concordance', lazy=True)


# class ConcordanceLines(db.Model):
#     """Concordance Lines

#     """

#     id = db.Column(db.Integer, primary_key=True)
#     modified = db.Column(db.DateTime, default=datetime.utcnow)

#     breakdown_id = db.Column(db.Integer, db.ForeignKey('breakdown.id', ondelete='CASCADE'))

#     item = db.Column(db.Unicode)
#     freq = db.Column(db.Integer)


class Cotext(db.Model):
    """Cotext

    """

    id = db.Column(db.Integer, primary_key=True)
    created = db.Column(db.DateTime, default=datetime.utcnow)

    query_id = db.Column(db.Integer, db.ForeignKey('query.id', ondelete='CASCADE'))

    context = db.Column(db.Integer)
    context_break = db.Column(db.String)

    lines = db.relationship('CotextLines', backref='cotext')


class CotextLines(db.Model):
    """Cotext Lines

    """

    id = db.Column(db.Integer, primary_key=True)
    created = db.Column(db.DateTime, default=datetime.utcnow)

    cotext_id = db.Column(db.Integer, db.ForeignKey('cotext.id', ondelete='CASCADE'))

    match_pos = db.Column(db.Integer)
    cpos = db.Column(db.Integer)
    offset = db.Column(db.Integer)


class SemanticMap(db.Model):
    """Semantic Map

    """

    id = db.Column(db.Integer, primary_key=True)
    modified = db.Column(db.DateTime, default=datetime.utcnow)
    name = db.Column(db.Unicode)
    embeddings = db.Column(db.Unicode)
    method = db.Column(db.Unicode)
    coordinates = db.relationship('Coordinates', backref='semantic_map', lazy=True)
    collocations = db.relationship('Collocation', backref='semantic_map', lazy=True)


class Coordinates(db.Model):
    """Coordinates

    """

    id = db.Column(db.Integer(), primary_key=True)
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    semantic_map_id = db.Column(db.Integer, db.ForeignKey('semantic_map.id', ondelete='CASCADE'))

    item = db.Column(db.Unicode)
    x = db.Column(db.Float)
    y = db.Column(db.Float)
    x_user = db.Column(db.Float)
    y_user = db.Column(db.Float)


class Collocation(db.Model):
    """Collocation Analysis

    """

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer(), db.ForeignKey('user.id', ondelete='CASCADE'))
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    p = db.Column(db.Unicode(255), nullable=False)
    s_break = db.Column(db.Unicode(255), nullable=False)
    context = db.Column(db.Integer, nullable=True)

    query_id = db.Column(db.Integer, db.ForeignKey('query.id', ondelete='CASCADE'))

    semantic_map_id = db.Column(db.Integer, db.ForeignKey('semantic_map.id', ondelete='CASCADE'))
    items = db.relationship('CollocationItems', backref='collocation')
    constellation_id = db.Column(db.Integer, db.ForeignKey('constellation.id', ondelete='CASCADE'))

    @property
    def serialize(self):
        """Return object data in easily serializeable format

        :return: Dictionary containing the collocation analysis values
        :rtype: dict

        """
        return {
            'id': self.id,
            'corpus': self._query.corpus.cwb_id,
            'user_id': self.user_id,
            'topic_id': self._query.discourseme.id,
            'p_query': 'lemma',
            'flags_query': '',
            'escape_query': False,
            'p_collocation': self.p,
            's_break': self.s_break,
            'context': self.context,
            'items': self._query.discourseme.items.split("\t"),
            'topic_discourseme': self._query.discourseme.serialize
        }


class CollocationItems(db.Model):
    """

    """

    id = db.Column(db.Integer, primary_key=True)
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    collocation_id = db.Column(db.Integer, db.ForeignKey('collocation.id', ondelete='CASCADE'))

    item = db.Column(db.Unicode)
    discourseme_ids = db.relationship("Discourseme", secondary=collocation_items_discoursemes,
                                      backref=db.backref('collocation_items', lazy=True))
    window = db.Column(db.Integer)

    f = db.Column(db.Integer)
    f1 = db.Column(db.Integer)
    f2 = db.Column(db.Integer)
    N = db.Column(db.Integer)

# class Keyword(db.Model):
#     """Keyword Analysis

#     """

#     id = db.Column(db.Integer, primary_key=True)
#     user_id = db.Column(db.Integer(), db.ForeignKey('user.id', ondelete='CASCADE'))
#     modified = db.Column(db.DateTime, default=datetime.utcnow)
#     name = db.Column(db.Unicode(255))

#     corpus_id = db.Column(db.Unicode(255), nullable=False)
#     corpus_id_reference = db.Column(db.Unicode(255), nullable=False)
#     p = db.Column(db.Unicode(255), nullable=False)
#     p_reference = db.Column(db.Unicode(255), nullable=False)

#     highlight_queries = db.relationship("Discourseme", secondary=keyword_discoursemes, backref=db.backref('keyword_associated', lazy=True))

#     # RELATIONSHIP DEFINITIONS FOR CHILDREN
#     coordinates = db.relationship("Coordinates", backref='keyword', cascade='all, delete', lazy=True)
#     # associated discoursemes


# class KeywordItems(db.Modell):
#     """Query: executed in CQP and dumped to disk

#     """
#     id = db.Column(db.Integer, primary_key=True)
#     modified = db.Column(db.DateTime, default=datetime.utcnow)

@bp.cli.command('init')
def init_db():
    """clear the existing data and create new tables"""

    db.drop_all()
    db.create_all()

    db.session.add(User(username='admin',
                        password_hash=generate_password_hash(current_app.config['ADMIN_PASSWORD']),
                        first_name='Admin',
                        last_name='Istrinator',
                        email='admin@istrination.com'))

    corpora = json.load(open(current_app.config['CORPORA'], 'rt'))
    for corpus in corpora:
        db.session.add(Corpus(**corpus))

    db.session.commit()

    db.session.add(Discourseme(user_id=1, items="\t".join(['CDU', 'CSU', 'CDU / CSU', r'\[ CDU / CSU \]:?']), name='CDU/CSU'))
    db.session.add(Discourseme(user_id=1, items="\t".join([r'F\. D\. P\.', r'\[ F\. D\. P\. \]:?']), name='FDP'))
    db.session.add(Discourseme(user_id=1, items="\t".join(['Beifall', 'Heiterkeit', 'Lache']), name='Reaktion'))
    db.session.add(Discourseme(user_id=1, items="\t".join(['Bundeskanzler', 'Kanzler']), name='Kanzler'))
    db.session.add(Discourseme(user_id=1, items="\t".join(['Präsident']), name='Präsident'))

    db.session.commit()
