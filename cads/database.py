#!/usr/bin/python3
# -*- coding: utf-8 -*-

from datetime import datetime

# from sqlalchemy_utils import IntRangeType
from ccc.utils import cqp_escape
from flask import Blueprint, current_app
from flask_login import UserMixin
from pandas import read_sql
from werkzeug.security import generate_password_hash

from . import db
from .utils import time_it

bp = Blueprint('database', __name__, url_prefix='/database', cli_group='database')

users_roles = db.Table(
    'UsersRoles',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id')),
    db.Column('role_id', db.Integer, db.ForeignKey('role.id'))
)

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

    roles = db.relationship('Role', secondary=users_roles, backref=db.backref('user'))
    discoursemes = db.relationship('Discourseme', backref='user')
    constellations = db.relationship('Constellation', backref='user')

    collocations = db.relationship('Collocation', backref='user')
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
    attributes = db.relationship('CorpusAttributes', backref='corpus', passive_deletes=True, cascade='all, delete')

    @property
    def s_atts(self):
        return [att.level for att in self.attributes if att.attribute == 's_atts']

    @property
    def p_atts(self):
        return [att.level for att in self.attributes if att.attribute == 'p_atts']


class CorpusAttributes(db.Model):
    """Corpus Attributes

    """
    id = db.Column(db.Integer, primary_key=True)
    corpus_id = db.Column(db.Integer, db.ForeignKey('corpus.id', ondelete='CASCADE'), index=True)
    attribute = db.Column(db.Unicode())  # p or s
    level = db.Column(db.Unicode())  # text, p, s, ...


class SubCorpus(db.Model):
    """SubCorpus

    """

    id = db.Column(db.Integer, primary_key=True)
    corpus_id = db.Column(db.Unicode)

    name = db.Column(db.Unicode)
    description = db.Column(db.Unicode)

    cqp_nqr_matches = db.Column(db.Unicode)
    matches = db.relationship('Matches', backref='subcorpus')


# class Embeddings(db.Model):
#     """Embeddings

#     """
#     id = db.Column(db.Integer, primary_key=True)
#     name = db.Column(db.Unicode)
#     language = db.Column(db.Unicode)
#     register = db.Column(db.Unicode)
#     p = db.Column(db.Unicode)


class Segmentation(db.Model):
    """Corpus segmentation / annotation layers

    """

    id = db.Column(db.Integer, primary_key=True)
    corpus_id = db.Column(db.Integer, db.ForeignKey('corpus.id', ondelete='CASCADE'))
    level = db.Column(db.Unicode)  # collection, text, p, s
    spans = db.relationship('SegmentationSpan', backref='segmentation', passive_deletes=True, cascade='all, delete')
    annotations = db.relationship('SegmentationAnnotation', backref='segmentation', passive_deletes=True, cascade='all, delete')


class SegmentationAnnotation(db.Model):
    """

    """

    id = db.Column(db.Integer, primary_key=True)
    segmentation_id = db.Column(db.Integer, db.ForeignKey('segmentation.id', ondelete='CASCADE'), index=True)
    key = db.Column(db.Unicode)
    value_type = db.Column(db.Unicode)
    segmentation_span_annotation = db.relationship('SegmentationSpanAnnotation', backref='segmentation_annotation',
                                                   passive_deletes=True, cascade='all, delete')


class SegmentationSpan(db.Model):
    """

    """

    id = db.Column(db.Integer, primary_key=True)
    segmentation_id = db.Column(db.Integer, db.ForeignKey('segmentation.id', ondelete='CASCADE'), index=True)
    match = db.Column(db.Integer)
    matchend = db.Column(db.Integer)
    segmentation_span_annotation = db.relationship('SegmentationSpanAnnotation', backref='segmentation_span', passive_deletes=True, cascade='all, delete')


class SegmentationSpanAnnotation(db.Model):
    """Segmentation annotation (= meta data)

    """

    id = db.Column(db.Integer, primary_key=True)
    segmentation_annotation_id = db.Column(db.Integer, db.ForeignKey('segmentation_annotation.id', ondelete='CASCADE'), index=True)
    segmentation_span_id = db.Column(db.Integer, db.ForeignKey('segmentation_span.id', ondelete='CASCADE'), index=True)
    value_boolean = db.Column(db.Boolean)
    value_unicode = db.Column(db.Unicode)
    value_datetime = db.Column(db.DateTime)
    value_numeric = db.Column(db.Numeric)


class Discourseme(db.Model):
    """Discourseme


    """

    __table_args__ = {'sqlite_autoincrement': True}

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'))
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    name = db.Column(db.Unicode(255), nullable=True)
    description = db.Column(db.Unicode, nullable=True)

    items = db.Column(db.Unicode)  # "\t"-joined list

    queries = db.relationship("Query", backref="discourseme", lazy=True)

    @property
    def _items(self):
        return self.get_items()

    def get_items(self, corpus_id=None):

        items = set(self.items.split("\t")) if self.items else set()
        queries = [query for query in self.queries if (not corpus_id or query.corpus_id == corpus_id)]
        for _query in queries:
            if _query.breakdowns:  # TODO several for different p-atts, here ignored
                items = items.union(set([cqp_escape(item.item) for item in _query.breakdowns[0].items]))
        return sorted(list(items))

    @time_it
    def get_cpos(self, corpus_id=None):

        queries = [query for query in self.queries if (not corpus_id or query.corpus_id == corpus_id)]
        cpos = set()
        for _query in queries:
            sql_query = Matches.query.filter(Matches.query_id == _query.id)
            matches = read_sql(sql_query.statement, con=db.engine, index_col='id')
            if len(matches) > 0:
                sets = matches.apply(lambda row: set(range(row['match'], row['matchend'] + 1)), axis=1)
                cpos.update(set.union(*sets.to_list()))
        return cpos

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
            'items': self.get_items(),
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
                                          backref=db.backref('constellations_filtered'))
    highlight_discoursemes = db.relationship("Discourseme", secondary=constellation_highlight_discoursemes,
                                             backref=db.backref('constellation_highlighted'))

    collocation_analyses = db.relationship('Collocation', backref='constellation', cascade='all, delete')
    keyword_analyses = db.relationship('Keyword', backref='constellation', cascade='all, delete')

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

    corpus_id = db.Column(db.Integer, db.ForeignKey('corpus.id', ondelete='CASCADE'))
    discourseme_id = db.Column(db.Integer, db.ForeignKey('discourseme.id', ondelete='CASCADE'))
    s = db.Column(db.Unicode)

    nqr_name = db.Column(db.Unicode)  # run on previously defined NQR?
    cqp_query = db.Column(db.Unicode)
    match_strategy = db.Column(db.Unicode, default='longest')

    cqp_nqr_matches = db.Column(db.Unicode)  # resulting NQR in CWB

    matches = db.relationship('Matches', backref='_query', passive_deletes=True)
    breakdowns = db.relationship('Breakdown', backref='_query', passive_deletes=True)
    collocations = db.relationship('Collocation', backref='_query', passive_deletes=True)
    # concordances = db.relationship('Concordance', backref='_query')

    @property
    def subcorpus(self):

        # is this on a subcorpus?
        if self.nqr_name:
            if self.nqr_name.startswith("SOC-"):
                subcorpus = "SOC"
            else:
                subcorpus = SubCorpus.query.filter_by(cqp_nqr_matches=self.nqr_name).first().name
        else:
            subcorpus = None

        return subcorpus


class Matches(db.Model):
    """Matches

    """

    id = db.Column(db.Integer, primary_key=True)
    # created = db.Column(db.DateTime, default=datetime.utcnow)

    query_id = db.Column(db.Integer, db.ForeignKey('query.id', ondelete='CASCADE'), index=True)
    subcorpus_id = db.Column(db.Integer, db.ForeignKey('sub_corpus.id', ondelete='CASCADE'), index=True)

    match = db.Column(db.Integer, nullable=False)
    matchend = db.Column(db.Integer, nullable=False)
    # region = db.Column(IntRangeType)


class Breakdown(db.Model):
    """Breakdown

    """

    id = db.Column(db.Integer, primary_key=True)
    created = db.Column(db.DateTime, default=datetime.utcnow)

    query_id = db.Column(db.Integer, db.ForeignKey('query.id', ondelete='CASCADE'))

    p = db.Column(db.Unicode, nullable=False)

    items = db.relationship('BreakdownItems', backref='breakdown')


class BreakdownItems(db.Model):
    """Breakdown Items

    """

    id = db.Column(db.Integer, primary_key=True)
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    breakdown_id = db.Column(db.Integer, db.ForeignKey('breakdown.id', ondelete='CASCADE'))

    item = db.Column(db.Unicode)
    freq = db.Column(db.Integer)


# class Concordance(db.Model):
#     """Concordance

#     """

#     id = db.Column(db.Integer, primary_key=True)
#     created = db.Column(db.DateTime, default=datetime.utcnow)

#     query_id = db.Column(db.Integer, db.ForeignKey('query.id', ondelete='CASCADE'))

#     p = db.Column(db.Unicode, nullable=False)
#     context = db.Column(db.Integer)
#     s_break = db.Column(db.Unicode)

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
    coordinates = db.relationship('Coordinates', backref='semantic_map')
    collocations = db.relationship('Collocation', backref='semantic_map')
    keywords = db.relationship('Keyword', backref='semantic_map')


class Coordinates(db.Model):
    """Coordinates

    """

    id = db.Column(db.Integer(), primary_key=True)
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    semantic_map_id = db.Column(db.Integer, db.ForeignKey('semantic_map.id', ondelete='CASCADE'))

    item = db.Column(db.Unicode, nullable=False)
    x = db.Column(db.Float, nullable=False)
    y = db.Column(db.Float, nullable=False)
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
    constellation_id = db.Column(db.Integer, db.ForeignKey('constellation.id', ondelete='CASCADE'))

    items = db.relationship('CollocationItems', backref='collocation', passive_deletes=True)

    @property
    def serialize(self):
        """Return object data in easily serializeable format

        :return: Dictionary containing the collocation analysis values
        :rtype: dict

        """

        # is this on a subcorpus?
        nqr_name = self._query.nqr_name
        if nqr_name:
            if nqr_name.startswith("SOC-"):
                subcorpus = "SOC"
            else:
                subcorpus = SubCorpus.query.filter_by(cqp_nqr_matches=nqr_name).first().name
        else:
            subcorpus = None

        return {
            'id': self.id,
            'corpus': self._query.corpus.cwb_id,
            'subcorpus': subcorpus,
            'user_id': self.user_id,
            'topic_id': self._query.discourseme.id,
            'constellation_id': self.constellation_id,
            'p_query': 'lemma',
            'flags_query': '',
            'escape_query': False,
            'p_collocation': self.p,
            's_break': self.s_break,
            'context': self.context,
            'items': self._query.discourseme.get_items(),
            'topic_discourseme': self._query.discourseme.serialize
        }


class CollocationItems(db.Model):
    """

    """

    id = db.Column(db.Integer, primary_key=True)

    collocation_id = db.Column(db.Integer, db.ForeignKey('collocation.id', ondelete='CASCADE'))

    item = db.Column(db.Unicode)
    window = db.Column(db.Integer)
    discourseme_id = db.Column(db.Integer, db.ForeignKey('discourseme.id'))

    f = db.Column(db.Integer)
    f1 = db.Column(db.Integer)
    f2 = db.Column(db.Integer)
    N = db.Column(db.Integer)


class Keyword(db.Model):
    """Keyword Analysis

    """

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer(), db.ForeignKey('user.id', ondelete='CASCADE'))
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    corpus_id = db.Column(db.Unicode(255), nullable=False)
    corpus_id_reference = db.Column(db.Unicode(255), nullable=False)

    p = db.Column(db.Unicode(255), nullable=False)
    p_reference = db.Column(db.Unicode(255), nullable=False)

    semantic_map_id = db.Column(db.Integer, db.ForeignKey('semantic_map.id', ondelete='CASCADE'))
    constellation_id = db.Column(db.Integer, db.ForeignKey('constellation.id', ondelete='CASCADE'))

    items = db.relationship('KeywordItems', backref='keyword')

    @property
    def serialize(self):
        """Return object data in easily serializeable format

        :return: Dictionary containing the analysis values
        :rtype: dict

        """
        corpus = Corpus.query.filter_by(id=self.corpus_id).first()
        corpus_reference = Corpus.query.filter_by(id=self.corpus_id_reference).first()
        return {
            'id': self.id,
            'user_id': self.user_id,
            'corpus': corpus.cwb_id,
            'corpus_reference': corpus_reference.cwb_id,
            'p': self.p,
            'p_reference': self.p_reference
        }


class KeywordItems(db.Model):
    """

    """

    id = db.Column(db.Integer, primary_key=True)

    keyword_id = db.Column(db.Integer, db.ForeignKey('keyword.id', ondelete='CASCADE'))

    item = db.Column(db.Unicode)

    f1 = db.Column(db.Integer)
    N1 = db.Column(db.Integer)
    f2 = db.Column(db.Integer)
    N2 = db.Column(db.Integer)


@bp.cli.command('init')
def init_db():
    """clear the existing data and create new tables"""

    db.drop_all()
    db.create_all()

    # roles
    admin_role = Role(name='admin', description='admin stuff')
    db.session.add(admin_role)
    db.session.commit()

    # users
    admin = User(username='admin',
                 password_hash=generate_password_hash(current_app.config['ADMIN_PASSWORD']),
                 first_name='Admin',
                 last_name='Istrinator',
                 email='admin@istrination.com')
    admin.roles.append(admin_role)
    db.session.add(admin)
    db.session.commit()
