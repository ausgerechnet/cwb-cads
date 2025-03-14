#!/usr/bin/python3
# -*- coding: utf-8 -*-

from datetime import datetime

from ccc import Corpus as Crps
from flask import Blueprint, current_app
from flask_login import UserMixin
from numpy import log
from pandas import DataFrame
from sqlalchemy import text
from werkzeug.security import generate_password_hash

from . import db

bp = Blueprint('database', __name__, url_prefix='/database', cli_group='database')


def get_or_create(model, **kwargs):
    """
    """

    instance = model.query.filter_by(**kwargs).first()

    if not instance:
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
    'users_roles',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id')),
    db.Column('role_id', db.Integer, db.ForeignKey('role.id'))
)

subcorpus_segmentation_span = db.Table(
    'sub_corpus_segmentation_span',
    db.Column('subcorpus_id', db.Integer, db.ForeignKey('sub_corpus.id')),
    db.Column('segmentation_span_id', db.Integer, db.ForeignKey('segmentation_span.id'))
)


# USERS #
#########
class User(db.Model, UserMixin):
    """User

    """

    __table_args__ = {'sqlite_autoincrement': True}

    id = db.Column(db.Integer, primary_key=True)
    created = db.Column(db.DateTime, default=datetime.utcnow)
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    first_name = db.Column(db.Unicode(255), nullable=False, server_default=u'')
    last_name = db.Column(db.Unicode(255), nullable=False, server_default=u'')
    username = db.Column(db.Unicode(255), nullable=False, server_default=u'', unique=True)
    email = db.Column(db.Unicode(255), nullable=False, server_default=u'', unique=True)
    email_confirmed_at = db.Column(db.DateTime)

    password_hash = db.Column(db.Unicode(255), nullable=False, server_default='')
    reset_password_token = db.Column(db.Unicode(255), nullable=False, server_default=u'')

    active = db.Column('is_active', db.Boolean(), nullable=False, server_default='0')
    roles = db.relationship('Role', secondary=users_roles)

    discoursemes = db.relationship('Discourseme', backref='user')
    constellations = db.relationship('Constellation', backref='user')
    # collocations = db.relationship('Collocation', backref='user')
    # keywords = db.relationship('Keyword', backref='user')


class Role(db.Model):
    """Role

    """

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Unicode(255), nullable=False, server_default=u'', unique=True)  # for @roles_accepted()
    description = db.Column(db.Unicode(255), server_default=u'')


# CORPORA #
###########
class Corpus(db.Model):
    """Corpus

    """

    __table_args__ = {'sqlite_autoincrement': True}

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.Unicode)
    language = db.Column(db.Unicode)
    register = db.Column(db.Unicode)
    description = db.Column(db.Unicode)

    cwb_id = db.Column(db.Unicode)
    embeddings = db.Column(db.Unicode)  # TODO → attributes

    attributes = db.relationship('CorpusAttributes', backref='corpus', passive_deletes=True, cascade='all, delete')
    segmentations = db.relationship('Segmentation', backref='corpus', passive_deletes=True, cascade='all, delete')
    subcorpora = db.relationship('SubCorpus', backref='corpus', passive_deletes=True, cascade='all, delete')
    queries = db.relationship('Query', backref='corpus', passive_deletes=True, cascade='all, delete')

    @property
    def s_default(self):
        """default s-attribute to link matches to contexts"""
        from .corpus import sort_s
        return sort_s(self.s_atts)[0]

    @property
    def p_default(self):
        """default p-attribute for discourseme descriptions ("analyses")"""
        from .corpus import sort_p
        return sort_p(self.p_atts)[0]

    @property
    def p_atts(self):
        return [att.level for att in self.attributes if att.attribute == 'p_atts']

    @property
    def s_atts(self):
        return [att.level for att in self.attributes if att.attribute == 's_atts']

    @property
    def s_annotations(self):
        return [att.level for att in self.attributes if att.attribute == 's_annotations']

    @property
    def nr_tokens(self):
        return self.ccc().size()

    def ccc(self):
        return Crps(corpus_name=self.cwb_id,
                    lib_dir=current_app.config['CCC_LIB_DIR'],
                    cqp_bin=current_app.config['CCC_CQP_BIN'],
                    registry_dir=current_app.config['CCC_REGISTRY_DIR'],
                    data_dir=current_app.config['CCC_DATA_DIR'],
                    inval_cache=False)


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

    __table_args__ = {'sqlite_autoincrement': True}

    id = db.Column(db.Integer, primary_key=True)
    corpus_id = db.Column(db.Integer, db.ForeignKey('corpus.id', ondelete='CASCADE'), index=True)
    segmentation_id = db.Column(db.Integer, db.ForeignKey('segmentation.id', ondelete='CASCADE'), index=True)

    name = db.Column(db.Unicode)
    description = db.Column(db.Unicode)

    nqr_cqp = db.Column(db.Unicode)

    spans = db.relationship('SegmentationSpan', secondary=subcorpus_segmentation_span, backref=db.backref('sub_corpus'))
    queries = db.relationship('Query', backref='subcorpus', passive_deletes=True, cascade='all, delete')

    @property
    def nr_tokens(self):
        return self.ccc().size()

    def ccc(self):
        crps = self.corpus.ccc()
        if self.nqr_cqp is None:
            current_app.logger.debug('subcorpus :: creating NQR')
            df = DataFrame([vars(s) for s in self.spans], columns=['match', 'matchend']).sort_values(by='match')
            subcrps = crps.subcorpus(subcorpus_name=None, df_dump=df, overwrite=True)
            self.nqr_cqp = subcrps.subcorpus_name
            db.session.commit()
        else:
            subcrps = crps.subcorpus(subcorpus_name=self.nqr_cqp)
        return subcrps


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


# QUERIES #
###########
class Query(db.Model):
    """Query: executed in CQP and dumped to disk

    """

    __table_args__ = ({'sqlite_autoincrement': True})

    id = db.Column(db.Integer, primary_key=True)
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    corpus_id = db.Column(db.Integer, db.ForeignKey('corpus.id', ondelete='CASCADE'))
    subcorpus_id = db.Column(db.Integer, db.ForeignKey('sub_corpus.id', ondelete='CASCADE'))  # run on previously defined subcorpus
    zero_matches = db.Column(db.Boolean, default=False)
    error = db.Column(db.Boolean, default=False)

    filter_sequence = db.Column(db.Unicode)

    match_strategy = db.Column(db.Unicode, default='longest')
    cqp_query = db.Column(db.Unicode)
    s = db.Column(db.Unicode)   # should be segmentation_id

    nqr_cqp = db.Column(db.Unicode)  # resulting NQR in CWB
    random_seed = db.Column(db.Integer, default=42)  # for concordancing

    matches = db.relationship('Matches', backref='_query', passive_deletes=True, cascade='all, delete')
    breakdowns = db.relationship('Breakdown', backref='_query', passive_deletes=True, cascade='all, delete')
    collocations = db.relationship('Collocation', backref='_query', passive_deletes=True, cascade='all, delete')
    concordances = db.relationship('Concordance', backref='_query', passive_deletes=True, cascade='all, delete')
    cotexts = db.relationship('Cotext', backref='_query', passive_deletes=True, cascade='all, delete')

    @property
    def number_matches(self):
        sql_query = f"SELECT count(*) FROM matches WHERE query_id == {self.id};"
        con = db.session.connection()
        result = con.execute(text(sql_query))
        return result.first()[0]

    @property
    def corpus_name(self):
        return self.corpus.name

    def get_breakdown(self, p):

        breakdowns = [b for b in self.breakdowns if b.p == p]

        if len(breakdowns) == 0:
            from .breakdown import ccc_breakdown
            current_app.logger.debug("no breakdown found, creating")
            breakdown = get_or_create(Breakdown, query_id=self.id, p=p)
            ccc_breakdown(breakdown)
            return breakdown
        elif len(breakdowns) == 1:
            current_app.logger.debug("found exactly one breakdown")
            return breakdowns[0]
        else:
            current_app.logger.warning("no unique breakdown found, returning last")
            return breakdowns[-1]


class Matches(db.Model):
    """Matches

    """

    id = db.Column(db.Integer, primary_key=True)

    contextid = db.Column(db.Integer, index=True)  # should be segmentation_span_id
    query_id = db.Column(db.Integer, db.ForeignKey('query.id', ondelete='CASCADE'), index=True)

    match = db.Column(db.Integer, nullable=False, index=True)
    matchend = db.Column(db.Integer, nullable=False, index=True)


# BREAKDOWN #
#############
class Breakdown(db.Model):
    """Breakdown

    """

    __table_args__ = {'sqlite_autoincrement': True}

    id = db.Column(db.Integer, primary_key=True)
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    query_id = db.Column(db.Integer, db.ForeignKey('query.id', ondelete='CASCADE'), index=True)

    p = db.Column(db.Unicode, nullable=False)

    items = db.relationship('BreakdownItems', backref='breakdown', passive_deletes=True, cascade='all, delete')

    _nr_tokens = None

    @property
    def nr_tokens(self):
        if self._nr_tokens is None:
            self._nr_tokens = self._query.subcorpus.nr_tokens if self._query.subcorpus else self._query.corpus.nr_tokens
        return self._nr_tokens


class BreakdownItems(db.Model):
    """Breakdown Items

    """

    id = db.Column(db.Integer, primary_key=True)

    breakdown_id = db.Column(db.Integer, db.ForeignKey('breakdown.id', ondelete='CASCADE'), index=True)

    item = db.Column(db.Unicode)
    freq = db.Column(db.Integer)

    @property
    def nr_tokens(self):
        return self.breakdown.nr_tokens

    @property
    def ipm(self):
        return self.freq / self.nr_tokens * 10**6


# CONCORDANCE #
###############
class Concordance(db.Model):
    """Concordance

    """

    __table_args__ = {'sqlite_autoincrement': True}

    id = db.Column(db.Integer, primary_key=True)

    query_id = db.Column(db.Integer, db.ForeignKey('query.id', ondelete='CASCADE'), index=True)

    sort_by = db.Column(db.String)
    sort_offset = db.Column(db.Integer)
    random_seed = db.Column(db.Integer)

    lines = db.relationship('ConcordanceLines', backref='concordance', passive_deletes=True, cascade='all, delete')


class ConcordanceLines(db.Model):
    """Concordance Lines

    """

    id = db.Column(db.Integer, primary_key=True)

    concordance_id = db.Column(db.Integer, db.ForeignKey('concordance.id', ondelete='CASCADE'), index=True)

    match = db.Column(db.Integer)  # , db.ForeignKey('matches.id', ondelete='CASCADE'))
    contextid = db.Column(db.Integer)


# COTEXT #
##########
class Cotext(db.Model):
    """Cotext

    """

    __table_args__ = {'sqlite_autoincrement': True}

    id = db.Column(db.Integer, primary_key=True)
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    query_id = db.Column(db.Integer, db.ForeignKey('query.id', ondelete='CASCADE'), index=True)

    context = db.Column(db.Integer)  # max. offset / window
    context_break = db.Column(db.String)  # s-attribute

    lines = db.relationship('CotextLines', backref='cotext', passive_deletes=True, cascade='all, delete')


class CotextLines(db.Model):
    """Cotext Lines

    """

    id = db.Column(db.Integer, primary_key=True)

    cotext_id = db.Column(db.Integer, db.ForeignKey('cotext.id', ondelete='CASCADE'), index=True)

    match_pos = db.Column(db.Integer, index=True)  # should link to matches
    cpos = db.Column(db.Integer, index=True)
    offset = db.Column(db.Integer)


# SEMANTIC MAPS #
#################
class SemanticMap(db.Model):
    """Semantic Map

    """

    __table_args__ = {'sqlite_autoincrement': True}

    id = db.Column(db.Integer, primary_key=True)
    modified = db.Column(db.DateTime, default=datetime.utcnow)
    name = db.Column(db.Unicode)
    embeddings = db.Column(db.Unicode)
    method = db.Column(db.Unicode)
    coordinates = db.relationship('Coordinates', backref='semantic_map', passive_deletes=True, cascade='all, delete')
    collocations = db.relationship('Collocation', backref='semantic_map', passive_deletes=True, cascade='all, delete')
    keywords = db.relationship('Keyword', backref='semantic_map', passive_deletes=True, cascade='all, delete')


class Coordinates(db.Model):
    """Coordinates

    """

    __table_args__ = (db.UniqueConstraint('semantic_map_id', 'item'),)

    id = db.Column(db.Integer(), primary_key=True)
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    semantic_map_id = db.Column(db.Integer, db.ForeignKey('semantic_map.id', ondelete='CASCADE'))

    item = db.Column(db.Unicode, nullable=False)
    x = db.Column(db.Float, nullable=False)
    y = db.Column(db.Float, nullable=False)
    x_user = db.Column(db.Float)
    y_user = db.Column(db.Float)


# COLLOCATION #
###############
class Collocation(db.Model):
    """Collocation Analysis

    """

    __table_args__ = {'sqlite_autoincrement': True}

    id = db.Column(db.Integer, primary_key=True)
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    p = db.Column(db.Unicode(255), nullable=False)
    s_break = db.Column(db.Unicode(255), nullable=True)
    window = db.Column(db.Integer, nullable=True)
    marginals = db.Column(db.Unicode, nullable=False)

    query_id = db.Column(db.Integer, db.ForeignKey('query.id', ondelete='CASCADE'))

    semantic_map_id = db.Column(db.Integer, db.ForeignKey('semantic_map.id', ondelete='CASCADE'))

    items = db.relationship('CollocationItem', backref='collocation', passive_deletes=True, cascade='all, delete')

    measure_ranges = dict()

    @property
    def nr_items(self):
        sql_query = f"SELECT count(*) FROM collocation_item WHERE collocation_id == {self.id};"
        con = db.session.connection()
        result = con.execute(text(sql_query))
        return result.first()[0]

    @property
    def corpus(self):
        return self._query.corpus

    def get_measure_range(self, measure):

        if measure not in self.measure_ranges.keys():
            items = CollocationItemScore.query.filter_by(collocation_id=self.id, measure=measure)
            measure_min = items.order_by(CollocationItemScore.score).first().score
            measure_max = items.order_by(CollocationItemScore.score.desc()).first().score
            self.measure_ranges.update({measure: {'min': measure_min, 'max': measure_max}})

        return self.measure_ranges[measure]

    def top_items(self, per_am=200):
        """Return top items of collocation analysis.

        Breakdown of nodes is included separately but excluded from the 200 per AM.

        """
        from .utils import AMS_DICT

        focus_items = self._query.get_breakdown(self.p).items
        focus_items_surface = [i.item for i in focus_items]
        focus_items_collocation_item_ids = [i.id for i in self.items if i.item in focus_items_surface]

        collocation_item_ids = set()
        for am in AMS_DICT.keys():
            scores = CollocationItemScore.query.filter(
                CollocationItemScore.collocation_id == self.id,
                CollocationItemScore.measure == am,
                ~ CollocationItemScore.collocation_item_id.in_(focus_items_collocation_item_ids)
            ).order_by(CollocationItemScore.score.desc()).paginate(page=1, per_page=per_am)
            disc_items_ids = {s.collocation_item_id for s in scores}
            collocation_item_ids.update(disc_items_ids)

        collocation_items = CollocationItem.query.filter(CollocationItem.id.in_(collocation_item_ids))
        top_items = [item.item for item in collocation_items if ((item.f / item.f1) > ((item.f2 - item.f) / (item.N - item.f1)))]
        top_items.extend([i.item for i in focus_items])

        return top_items


class CollocationItem(db.Model):
    """Per-item frequency counts for collocation analyses.

    """

    id = db.Column(db.Integer, primary_key=True)

    collocation_id = db.Column(db.Integer, db.ForeignKey('collocation.id', ondelete='CASCADE'), index=True)

    item = db.Column(db.Unicode)

    f = db.Column(db.Integer)
    f1 = db.Column(db.Integer)
    f2 = db.Column(db.Integer)
    N = db.Column(db.Integer)

    scores = db.relationship("CollocationItemScore", backref='collocation_item', passive_deletes=True, cascade='all, delete')

    @property
    def raw_scores(self):

        O11 = self.f
        O12 = self.f1 - O11
        O21 = self.f2 - O11
        O22 = self.N - O11 - O12 - O21
        R1 = O11 + O12
        R2 = O21 + O22
        C1 = O11 + O21
        C2 = O12 + O22
        N = R1 + R2

        return [
            {'measure': 'O11', 'score': O11},
            {'measure': 'O12', 'score': O12},
            {'measure': 'O21', 'score': O21},
            {'measure': 'O22', 'score': O22},
            {'measure': 'R1', 'score': R1},
            {'measure': 'R2', 'score': R2},
            {'measure': 'C1', 'score': C1},
            {'measure': 'C2', 'score': C2},
            {'measure': 'N', 'score': N}
        ]

    def scale_measure(self, measure='conservative_log_ratio'):

        measure_max = self.collocation.get_measure_range(measure)['max']
        measure = [s.score for s in self.scores if s.measure == measure][0]

        if measure_max == 0:
            return measure

        if measure == 'log_likelihood':
            return log(measure) / log(measure_max)

        return measure / measure_max

    @property
    def scaled_scores(self):

        return [
            {'measure': measure, 'score': self.scale_measure(measure)} for measure in [
                'O11', 'E11', 'ipm', 'ipm_reference', 'ipm_expected',
                'conservative_log_ratio',
                'log_likelihood',
                'dice',
                'log_ratio',
                'mutual_information'
            ]
        ]


class CollocationItemScore(db.Model):
    """Per-item and per-measure scores for collocation analyses.

    """
    id = db.Column(db.Integer, primary_key=True)

    collocation_id = db.Column(db.Integer, db.ForeignKey('collocation.id', ondelete='CASCADE'), index=True)
    collocation_item_id = db.Column(db.Integer, db.ForeignKey('collocation_item.id', ondelete='CASCADE'), index=True)

    measure = db.Column(db.Unicode)
    score = db.Column(db.Float)


# KEYWORD #
###########
class Keyword(db.Model):
    """Keyword Analysis

    """

    __table_args__ = {'sqlite_autoincrement': True}

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer(), db.ForeignKey('user.id', ondelete='CASCADE'))
    modified = db.Column(db.DateTime, default=datetime.utcnow)

    corpus_id = db.Column(db.Integer(), db.ForeignKey('corpus.id', ondelete='CASCADE'), nullable=False)
    subcorpus_id = db.Column(db.Integer(), db.ForeignKey('sub_corpus.id', ondelete='CASCADE'), nullable=True)
    p = db.Column(db.Unicode(255), nullable=False)  # TODO

    corpus_id_reference = db.Column(db.Integer(), db.ForeignKey('corpus.id', ondelete='CASCADE'), nullable=False)
    subcorpus_id_reference = db.Column(db.Integer(), db.ForeignKey('sub_corpus.id', ondelete='CASCADE'), nullable=True)
    p_reference = db.Column(db.Unicode(255), nullable=False)  # TODO

    semantic_map_id = db.Column(db.Integer, db.ForeignKey('semantic_map.id', ondelete='CASCADE'))

    sub_vs_rest = db.Column(db.Boolean)
    min_freq = db.Column(db.Integer)

    items = db.relationship('KeywordItem', backref='keyword', passive_deletes=True, cascade='all, delete')

    measure_ranges = dict()     # will be populated by get_measure_range

    @property
    def nr_items(self):
        sql_query = f"SELECT count(*) FROM keyword_item WHERE keyword_id == {self.id};"
        con = db.session.connection()
        result = con.execute(text(sql_query))
        return result.first()[0]

    @property
    def corpus(self):
        return db.get_or_404(Corpus, self.corpus_id)

    @property
    def corpus_name(self):
        return self.corpus.name

    @property
    def subcorpus(self):
        return db.get_or_404(SubCorpus, self.subcorpus_id) if self.subcorpus_id else None

    @property
    def subcorpus_name(self):
        return self.subcorpus.name if self.subcorpus else None

    @property
    def corpus_reference(self):
        return db.get_or_404(Corpus, self.corpus_id_reference)

    @property
    def corpus_name_reference(self):
        return self.corpus_reference.name

    @property
    def subcorpus_reference(self):
        return db.get_or_404(SubCorpus, self.subcorpus_id_reference) if self.subcorpus_id_reference else None

    @property
    def subcorpus_name_reference(self):
        return self.subcorpus_reference.name if self.subcorpus_reference else None

    @property
    def N1(self):
        return self.items[0].N1

    @property
    def N2(self):
        return self.items[0].N2

    def get_measure_range(self, measure):

        if measure not in self.measure_ranges.keys():
            items = KeywordItemScore.query.filter_by(keyword_id=self.id, measure=measure)
            measure_min = items.order_by(KeywordItemScore.score).first().score
            measure_max = items.order_by(KeywordItemScore.score.desc()).first().score
            self.measure_ranges.update({measure: {'min': measure_min, 'max': measure_max}})

        return self.measure_ranges[measure]

    def top_items(self, per_am=200):
        """Return top items of keyword analysis.

        """
        from .utils import AMS_DICT
        keyword_item_ids = set()
        for measure in AMS_DICT.keys():
            items = KeywordItemScore.query.filter_by(keyword_id=self.id, measure=measure)
            scores = items.order_by(KeywordItemScore.score.desc()).paginate(page=1, per_page=per_am)
            keyword_item_ids.update({s.keyword_item_id for s in scores})
        keyword_items = KeywordItem.query.filter(KeywordItem.id.in_(keyword_item_ids))
        return [item.item for item in keyword_items if ((item.f1 / item.N1) > (item.f2/item.N2))]

    def sub_vs_rest_strategy(self):
        """check if target is subcorpus of reference (or vice versa), and whether to apply sub-vs-rest correction

        """

        sub_vs_rest = False

        if self.subcorpus_id:
            corpus = self.subcorpus
            target_is_subcorpus = True
        else:
            corpus = self.corpus
            target_is_subcorpus = False

        if self.subcorpus_id_reference:
            corpus_reference = self.subcorpus_reference
            reference_is_subcorpus = True
        else:
            corpus_reference = self.corpus_reference
            reference_is_subcorpus = False

        if self.sub_vs_rest and (target_is_subcorpus ^ reference_is_subcorpus):  # xor
            if target_is_subcorpus:
                if corpus.corpus.id == corpus_reference.id:
                    sub_vs_rest = True
            if reference_is_subcorpus:
                if corpus_reference.corpus.id == corpus.id:
                    sub_vs_rest = True

        return {
            'sub_vs_rest': sub_vs_rest,
            'target': corpus,
            'target_is_subcorpus': target_is_subcorpus,
            'reference': corpus_reference,
            'reference_is_subcorpus': reference_is_subcorpus
        }


class KeywordItem(db.Model):
    """Per-item frequency counts for keyword analyses.

    """

    id = db.Column(db.Integer, primary_key=True)

    keyword_id = db.Column(db.Integer, db.ForeignKey('keyword.id', ondelete='CASCADE'), index=True)

    item = db.Column(db.Unicode)

    f1 = db.Column(db.Integer)
    N1 = db.Column(db.Integer)
    f2 = db.Column(db.Integer)
    N2 = db.Column(db.Integer)

    scores = db.relationship("KeywordItemScore", backref='keyword_item', passive_deletes=True, cascade='all, delete')

    @property
    def raw_scores(self):

        O11 = self.f1
        O12 = self.N1 - O11
        O21 = self.f2
        O22 = self.N2 - O21
        R1 = O11 + O12
        R2 = O21 + O22
        C1 = O11 + O21
        C2 = O12 + O22
        N = R1 + R2

        return [
            {'measure': 'O11', 'score': O11},
            {'measure': 'O12', 'score': O12},
            {'measure': 'O21', 'score': O21},
            {'measure': 'O22', 'score': O22},
            {'measure': 'R1', 'score': R1},
            {'measure': 'R2', 'score': R2},
            {'measure': 'C1', 'score': C1},
            {'measure': 'C2', 'score': C2},
            {'measure': 'N', 'score': N}
        ]

    def scale_measure(self, measure='conservative_log_ratio'):

        measure_max = self.keyword.get_measure_range(measure)['max']
        measure = [s.score for s in self.scores if s.measure == measure][0]

        if measure_max == 0:
            return measure

        if measure == 'log_likelihood':
            import numpy as np
            return np.log(measure) / np.log(measure_max)

        return measure / measure_max

    @property
    def scaled_scores(self):

        return [
            {'measure': measure, 'score': self.scale_measure(measure)} for measure in [
                'O11', 'E11', 'ipm', 'ipm_reference', 'ipm_expected',
                'conservative_log_ratio',
                'log_likelihood',
                'dice',
                'log_ratio',
                'mutual_information'
            ]
        ]


class KeywordItemScore(db.Model):
    """Per-item and per-measure scores for keyword analyses.

    """
    id = db.Column(db.Integer, primary_key=True)

    keyword_id = db.Column(db.Integer, db.ForeignKey('keyword.id', ondelete='CASCADE'), index=True)
    keyword_item_id = db.Column(db.Integer, db.ForeignKey('keyword_item.id', ondelete='CASCADE'), index=True)

    measure = db.Column(db.Unicode)
    score = db.Column(db.Float)


# CLI #
#######
@bp.cli.command('init')
def init_db_cmd():

    init_db()
