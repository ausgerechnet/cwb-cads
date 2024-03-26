#!/usr/bin/python3
# -*- coding: utf-8 -*-

from datetime import datetime

from ccc.utils import cqp_escape
from flask import Blueprint, current_app
from flask_login import UserMixin
from werkzeug.security import generate_password_hash

from . import db

bp = Blueprint('database', __name__, url_prefix='/database', cli_group='database')


def get_or_create(model, **kwargs):
    """
    """

    instance = model.query.filter_by(**kwargs).first()

    if instance:
        return instance
    else:
        instance = model(**kwargs)
        db.session.add(instance)
        db.session.commit()

    return instance


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

subcorpus_segmentation_span = db.Table(
    'SubCorpusSegmentation',
    db.Column('subcorpus_id', db.Integer, db.ForeignKey('sub_corpus.id')),
    db.Column('segmentation_span_id', db.Integer, db.ForeignKey('segmentation_span.id'))
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
    roles = db.relationship('Role', secondary=users_roles)

    discoursemes = db.relationship('Discourseme', backref='user')
    constellations = db.relationship('Constellation', backref='user')
    # collocations = db.relationship('Collocation', backref='user')
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
    embeddings = db.Column(db.Unicode)  # TODO → attributes

    queries = db.relationship('Query', backref='corpus', passive_deletes=True, cascade='all, delete')
    attributes = db.relationship('CorpusAttributes', backref='corpus', passive_deletes=True, cascade='all, delete')
    subcorpora = db.relationship('SubCorpus', backref='corpus', passive_deletes=True, cascade='all, delete')

    @property
    def p_atts(self):
        return [att.level for att in self.attributes if att.attribute == 'p_atts']

    @property
    def s_atts(self):
        return [att.level for att in self.attributes if att.attribute == 's_atts']

    @property
    def s_annotations(self):
        return [att.level for att in self.attributes if att.attribute == 's_annotations']


class CorpusAttributes(db.Model):
    """Corpus Attributes

    """
    id = db.Column(db.Integer, primary_key=True)
    corpus_id = db.Column(db.Integer, db.ForeignKey('corpus.id', ondelete='CASCADE'), index=True)
    attribute = db.Column(db.Unicode)  # p or s
    level = db.Column(db.Unicode)  # text, p, s, ...
    embeddings = db.Column(db.Integer, db.ForeignKey('embeddings.id'))  # only for p-attributes


class SubCorpus(db.Model):
    """SubCorpus

    """

    id = db.Column(db.Integer, primary_key=True)
    corpus_id = db.Column(db.Integer, db.ForeignKey('corpus.id', ondelete='CASCADE'), index=True)
    segmentation_id = db.Column(db.Integer, db.ForeignKey('segmentation.id', ondelete='CASCADE'), index=True)

    name = db.Column(db.Unicode)
    description = db.Column(db.Unicode)

    nqr_cqp = db.Column(db.Unicode)
    spans = db.relationship('SegmentationSpan', secondary=subcorpus_segmentation_span,
                            backref=db.backref('sub_corpus'))
    queries = db.relationship('Query', backref='subcorpus', passive_deletes=True, cascade='all, delete')


class Embeddings(db.Model):
    """Embeddings

    """
    id = db.Column(db.Integer, primary_key=True)
    path = db.Column(db.Unicode)
    name = db.Column(db.Unicode)
    description = db.Column(db.Unicode)
    language = db.Column(db.Unicode)
    register = db.Column(db.Unicode)


class Segmentation(db.Model):
    """Corpus segmentation / annotation layers

    """

    id = db.Column(db.Integer, primary_key=True)
    corpus_id = db.Column(db.Integer, db.ForeignKey('corpus.id', ondelete='CASCADE'))
    level = db.Column(db.Unicode)  # collection, text, p, s, ...
    spans = db.relationship('SegmentationSpan', backref='segmentation', passive_deletes=True, cascade='all, delete')
    annotations = db.relationship('SegmentationAnnotation', backref='segmentation', passive_deletes=True, cascade='all, delete')


class SegmentationAnnotation(db.Model):
    """

    """

    id = db.Column(db.Integer, primary_key=True)
    segmentation_id = db.Column(db.Integer, db.ForeignKey('segmentation.id', ondelete='CASCADE'), index=True)
    key = db.Column(db.Unicode)
    value_type = db.Column(db.Unicode)  # boolean, unicode, datetime, numeric
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

    queries = db.relationship("Query", backref="discourseme", lazy=True)
    template = db.RelationshipProperty("DiscoursemeTemplateItems", backref="discourseme")

    def generate_template(self, p='word'):
        items = set(self.template_items)
        for _query in self.queries:
            for breakdown in _query.breakdowns:
                if breakdown.p == p:
                    items = items.union(set([cqp_escape(item.item) for item in breakdown.items]))
        items = sorted(list(items))
        raise NotImplementedError("insert items in db")


class DiscoursemeTemplateItems(db.Model):
    """Constellation

    """

    __table_args__ = {'sqlite_autoincrement': True}
    id = db.Column(db.Integer(), primary_key=True)
    discourseme_id = db.Column(db.Integer, db.ForeignKey('discourseme.id', ondelete='CASCADE'))
    surface = db.Column(db.String(), nullable=True)
    p = db.Column(db.String(), nullable=True)
    cqp_query = db.Column(db.String(), nullable=True)


class Constellation(db.Model):
    """Constellation

    """

    __table_args__ = {'sqlite_autoincrement': True}

    id = db.Column(db.Integer(), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'))
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    name = db.Column(db.Unicode(255), nullable=True)
    description = db.Column(db.Unicode, nullable=True)

    filter_discoursemes = db.relationship("Discourseme", secondary=constellation_filter_discoursemes)
    # backref=db.backref('constellations_filtered'))
    highlight_discoursemes = db.relationship("Discourseme", secondary=constellation_highlight_discoursemes)
    # backref=db.backref('constellation_highlighted'))

    collocation_analyses = db.relationship('Collocation', backref='constellation', cascade='all, delete')
    keyword_analyses = db.relationship('Keyword', backref='constellation', cascade='all, delete')


class Query(db.Model):
    """Query: executed in CQP and dumped to disk

    """

    __table_args__ = (
        db.UniqueConstraint('discourseme_id', 'corpus_id', name='_customer_location_uc'),
        {'sqlite_autoincrement': True},
    )

    id = db.Column(db.Integer, primary_key=True)
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    corpus_id = db.Column(db.Integer, db.ForeignKey('corpus.id', ondelete='CASCADE'))
    subcorpus_id = db.Column(db.Integer, db.ForeignKey('sub_corpus.id', ondelete='CASCADE'))  # run on previously defined subcorpus

    discourseme_id = db.Column(db.Integer, db.ForeignKey('discourseme.id', ondelete='CASCADE'))

    match_strategy = db.Column(db.Unicode, default='longest')
    cqp_query = db.Column(db.Unicode)
    s = db.Column(db.Unicode)   # should be segmentation_id

    nqr_cqp = db.Column(db.Unicode)  # resulting NQR in CWB
    random_seed = db.Column(db.Integer, default=42)  # for concordancing

    matches = db.relationship('Matches', backref='_query', passive_deletes=True)
    breakdowns = db.relationship('Breakdown', backref='_query', passive_deletes=True)
    collocations = db.relationship('Collocation', backref='_query', passive_deletes=True)
    concordances = db.relationship('Concordance', backref='_query', passive_deletes=True)
    cotexts = db.relationship('Cotext', backref='_query', passive_deletes=True)

    @property
    def number_matches(self):
        return len(self.matches)


class Matches(db.Model):
    """Matches

    """

    id = db.Column(db.Integer, primary_key=True)

    contextid = db.Column(db.Integer, index=True)  # should be segmentation_span_id
    query_id = db.Column(db.Integer, db.ForeignKey('query.id', ondelete='CASCADE'), index=True)

    match = db.Column(db.Integer, nullable=False, index=True)
    matchend = db.Column(db.Integer, nullable=False)


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


class Concordance(db.Model):

    id = db.Column(db.Integer, primary_key=True)

    query_id = db.Column(db.Integer, db.ForeignKey('query.id', ondelete='CASCADE'), index=True)
    sort_by = db.Column(db.String)
    sort_offset = db.Column(db.Integer)
    random_seed = db.Column(db.Integer)

    lines = db.relationship('ConcordanceLines', backref='concordance')


class ConcordanceLines(db.Model):

    id = db.Column(db.Integer, primary_key=True)
    concordance_id = db.Column(db.Integer, db.ForeignKey('concordance.id', ondelete='CASCADE'))
    match = db.Column(db.Integer)  # , db.ForeignKey('matches.id', ondelete='CASCADE'))
    contextid = db.Column(db.Integer)


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

    cotext_id = db.Column(db.Integer, db.ForeignKey('cotext.id', ondelete='CASCADE'), index=True)

    match_pos = db.Column(db.Integer, index=True)
    cpos = db.Column(db.Integer, index=True)
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
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    p = db.Column(db.Unicode(255), nullable=False)
    s_break = db.Column(db.Unicode(255), nullable=True)
    window = db.Column(db.Integer, nullable=True)

    query_id = db.Column(db.Integer, db.ForeignKey('query.id', ondelete='CASCADE'))

    semantic_map_id = db.Column(db.Integer, db.ForeignKey('semantic_map.id', ondelete='CASCADE'))
    constellation_id = db.Column(db.Integer, db.ForeignKey('constellation.id', ondelete='CASCADE'))

    items = db.relationship('CollocationItems', backref='collocation', passive_deletes=True)


class CollocationItems(db.Model):
    """

    """

    id = db.Column(db.Integer, primary_key=True)

    collocation_id = db.Column(db.Integer, db.ForeignKey('collocation.id', ondelete='CASCADE'), index=True)

    item = db.Column(db.Unicode)

    f = db.Column(db.Integer)
    f1 = db.Column(db.Integer)
    f2 = db.Column(db.Integer)
    N = db.Column(db.Integer)

    scores = db.relationship("ItemScore", backref='collocation_items', cascade='all, delete')


class ItemScore(db.Model):
    """

    """
    id = db.Column(db.Integer, primary_key=True)
    collocation_item_id = db.Column(db.Integer, db.ForeignKey('collocation_items.id', ondelete='CASCADE'))
    collocation_id = db.Column(db.Integer, db.ForeignKey('collocation.id', ondelete='CASCADE'), index=True)
    measure = db.Column(db.Unicode)
    score = db.Column(db.Float)


class Keyword(db.Model):
    """Keyword Analysis

    """

    id = db.Column(db.Integer, primary_key=True)
    # user_id = db.Column(db.Integer(), db.ForeignKey('user.id', ondelete='CASCADE'))
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    corpus_id = db.Column(db.Unicode(255), nullable=False)
    corpus_id_reference = db.Column(db.Unicode(255), nullable=False)

    p = db.Column(db.Unicode(255), nullable=False)
    p_reference = db.Column(db.Unicode(255), nullable=False)

    semantic_map_id = db.Column(db.Integer, db.ForeignKey('semantic_map.id', ondelete='CASCADE'))
    constellation_id = db.Column(db.Integer, db.ForeignKey('constellation.id', ondelete='CASCADE'))

    items = db.relationship('KeywordItems', backref='keyword')


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
def init_db_cmd():

    init_db()
