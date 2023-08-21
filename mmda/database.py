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

# collocation_discoursemes = db.Table(
#     'CollocationDiscoursemes',
#     db.Column('collocation_id', db.Integer, db.ForeignKey('collocation.id')),
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
    # user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'))
    # modified = db.Column(db.DateTime, default=datetime.utcnow)
    # subcorpus_id = db.Column(db.Unicode)

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

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'))
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    name = db.Column(db.Unicode(255), nullable=True)
    description = db.Column(db.Unicode, nullable=True)


class Constellation(db.Model):
    """Constellation

    """

    id = db.Column(db.Integer(), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'))
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    name = db.Column(db.Unicode(255), nullable=True)
    description = db.Column(db.Unicode, nullable=True)

    filter_discoursemes = db.relationship("Discourseme", secondary=constellation_filter_discoursemes,
                                          backref=db.backref('constellations_filtered', lazy=True))
    highlight_discoursemes = db.relationship("Discourseme", secondary=constellation_highlight_discoursemes,
                                             backref=db.backref('constellation_highlighted', lazy=True))

    # collocation_analyses = db.relationship('Collocation', backref='constellation', lazy=True)


class Query(db.Model):
    """Query: executed in CQP and dumped to disk

    """

    id = db.Column(db.Integer, primary_key=True)
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    discourseme_id = db.Column(db.Integer, db.ForeignKey('discourseme.id', ondelete='CASCADE'))
    corpus_id = db.Column(db.Integer, db.ForeignKey('corpus.id', ondelete='CASCADE'))

    cqp_query = db.Column(db.Unicode)
    cqp_id = db.Column(db.Unicode)
    match_strategy = db.Column(db.Unicode, default='longest')
    matches = db.relationship('Matches', backref='query', lazy=True)
    breakdowns = db.relationship('Breakdown', backref='query', lazy=True)
    collocations = db.relationship('Collocation', backref='query', lazy=True)
    concordances = db.relationship('Concordance', backref='query', lazy=True)


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

    matches_id = db.Column(db.Integer, db.ForeignKey('matches.id', ondelete='CASCADE'))

    context = db.Column(db.Integer)
    context_break = db.Column(db.String)


class CotextLines(db.Model):
    """Cotext Lines

    """

    id = db.Column(db.Integer, primary_key=True)
    created = db.Column(db.DateTime, default=datetime.utcnow)

    cotext_id = db.Column(db.Integer, db.ForeignKey('cotext.id', ondelete='CASCADE'))

    cpos = db.Column(db.Integer)
    offset = db.Column(db.Integer)


class SemMap(db.Model):
    """Semantic Map

    """

    id = db.Column(db.Integer, primary_key=True)
    modified = db.Column(db.DateTime, default=datetime.utcnow)


class Coordinates(db.Model):
    """Coordinates

    """

    id = db.Column(db.Integer(), primary_key=True)
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    sem_map_id = db.Column(db.Integer, db.ForeignKey('sem_map.id', ondelete='CASCADE'))

    item = db.Column(db.Unicode)
    x = db.Column(db.Float)
    y = db.Column(db.Float)


class Collocation(db.Model):
    """Collocation Analysis

    """

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer(), db.ForeignKey('user.id', ondelete='CASCADE'))
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    corpus_id = db.Column(db.Integer, db.ForeignKey('corpus.id', ondelete='CASCADE'))

    p = db.Column(db.Unicode(255), nullable=False)
    s_break = db.Column(db.Unicode(255), nullable=False)
    context = db.Column(db.Integer, nullable=True)

    query_id = db.Column(db.Integer, db.ForeignKey('query.id', ondelete='CASCADE'))

    sem_map_id = db.Column(db.Integer, db.ForeignKey('sem_map.id'))
    items = db.relationship('CollocationItems', backref='collocation', lazy=True)


class CollocationItems(db.Model):
    """

    """

    id = db.Column(db.Integer, primary_key=True)
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    collocation_id = db.Column(db.Integer, db.ForeignKey('collocation.id', ondelete='CASCADE'))

    item = db.Column(db.Unicode)
    discourseme_ids = db.relationship("Discourseme", secondary=collocation_items_discoursemes,
                                      backref=db.backref('collocation_items', lazy=True))
    am = db.Column(db.Unicode)
    value = db.Column(db.Float)


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

# @bp.cli.command('init')
def init_db():
    """clear the existing data and create new tables"""

    db.drop_all()
    db.create_all()
    db.session.add(
        User(username='admin',
             password_hash=generate_password_hash(current_app.config['ADMIN_PASSWORD']))
    )

    corpora = json.load(open(current_app.config['CORPORA'], 'rt'))
    for corpus in corpora:
        db.session.add(Corpus(
            **corpus
        ))

    db.session.commit()
