#!/usr/bin/python3
# -*- coding: utf-8 -*-

from datetime import datetime

from .. import db
from ..breakdown import ccc_breakdown
from ..database import Breakdown, Corpus, Query, SubCorpus, get_or_create

# from ccc.utils import cqp_escape
# from flask import Blueprint


# bp = Blueprint('mmda-database', __name__, url_prefix='/mmda-database', cli_group='mmda-database')


constellation_discourseme = db.Table(
    'constellation_discourseme',
    db.Column('constellation_id', db.Integer, db.ForeignKey('constellation.id')),
    db.Column('discourseme_id', db.Integer, db.ForeignKey('discourseme.id'))
)

constellation_discourseme_description = db.Table(
    'constellation_discourseme_description',
    db.Column('constellation_description_id', db.Integer, db.ForeignKey('constellation_description.id')),
    db.Column('discourseme_description_id', db.Integer, db.ForeignKey('discourseme_description.id'))
)


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
        # items = set(self.template_items)
        # for _query in self.queries:
        #     for breakdown in _query.breakdowns:
        #         if breakdown.p == p:
        #             items = items.union(set([cqp_escape(item.item) for item in breakdown.items]))
        # items = sorted(list(items))
        raise NotImplementedError("generate template from descriptions")


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
    collocation_items = db.RelationshipProperty("CollocationDiscoursemeItem", backref="discourseme_description", cascade='all, delete')
    keyword_items = db.RelationshipProperty("KeywordDiscoursemeItem", backref="discourseme_description", cascade='all, delete')

    @property
    def _query(self):
        return db.get_or_404(Query, self.query_id)

    @property
    def corpus(self):
        return db.get_or_404(Corpus, self.corpus_id)

    @property
    def subcorpus(self):
        return db.get_or_404(SubCorpus, self.subcorpus_id) if self.subcorpus_id else None

    def update_from_items(self, items=[]):

        from .discourseme import description_items_to_query

        # get new items, delete old ones
        items = [item.item for item in self.items] if len(items) == 0 else items
        [db.session.delete(item) for item in self.items]

        # query
        query = description_items_to_query(
            items,
            self.p,
            self.s,
            self.corpus,
            self.subcorpus,
            self.match_strategy
        )
        self.query_id = query.id

        # zero matches?
        if query.error or query.zero_matches:
            return

        # breakdown
        breakdown = get_or_create(Breakdown, query_id=query.id, p=self.p)
        breakdown_df = ccc_breakdown(breakdown)

        # description items
        discourseme_description_items = breakdown_df.reset_index()[['item']]
        discourseme_description_items['discourseme_description_id'] = self.id
        discourseme_description_items.to_sql("discourseme_description_items", con=db.engine, if_exists='append', index=False)
        db.session.commit()


class DiscoursemeDescriptionItems(db.Model):
    """Discourseme Description Items

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
    comment = db.Column(db.Unicode, nullable=True)

    discoursemes = db.relationship("Discourseme", secondary=constellation_discourseme)


class ConstellationDescription(db.Model):
    """Constellation Description

    """
    __table_args__ = {'sqlite_autoincrement': True}

    id = db.Column(db.Integer, primary_key=True)
    modified = db.Column(db.DateTime, default=datetime.utcnow)  # (→ queries need update)

    constellation_id = db.Column(db.Integer, db.ForeignKey('constellation.id', ondelete='CASCADE'))
    corpus_id = db.Column(db.Integer, db.ForeignKey('corpus.id', ondelete='CASCADE'))
    subcorpus_id = db.Column(db.Integer, db.ForeignKey('sub_corpus.id', ondelete='CASCADE'))
    p = db.Column(db.String(), nullable=True)  # analysis / description layer
    s = db.Column(db.String(), nullable=True)  # for max. query context
    match_strategy = db.Column(db.Unicode, default='longest')
    overlap = db.Column(db.Unicode, default='partial')  # when to count a discourseme to be in context (partial, full, match, matchend)

    discourseme_descriptions = db.relationship("DiscoursemeDescription", secondary=constellation_discourseme_description)
    semantic_map_id = db.Column(db.Integer, db.ForeignKey('semantic_map.id', ondelete='CASCADE'))

    @property
    def corpus(self):
        return db.get_or_404(Corpus, self.corpus_id)

    @property
    def subcorpus(self):
        return db.get_or_404(SubCorpus, self.subcorpus_id) if self.subcorpus_id else None


###############
# COLLOCATION #
###############
class CollocationDiscoursemeItem(db.Model):
    """

    """

    id = db.Column(db.Integer, primary_key=True)

    collocation_id = db.Column(db.Integer, db.ForeignKey('collocation.id', ondelete='CASCADE'), index=True)
    discourseme_description_id = db.Column(db.Integer, db.ForeignKey('discourseme_description.id', ondelete='CASCADE'), index=True)

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

    collocation_id = db.Column(db.Integer, db.ForeignKey('collocation.id', ondelete='CASCADE'), index=True)
    collocation_item_id = db.Column(db.Integer, db.ForeignKey('collocation_discourseme_item.id', ondelete='CASCADE'), index=True)

    measure = db.Column(db.Unicode)
    score = db.Column(db.Float)


###########
# KEYWORD #
###########
class KeywordDiscoursemeItem(db.Model):
    """

    """

    id = db.Column(db.Integer, primary_key=True)

    keyword_id = db.Column(db.Integer, db.ForeignKey('keyword.id', ondelete='CASCADE'), index=True)
    discourseme_description_id = db.Column(db.Integer, db.ForeignKey('discourseme_description.id', ondelete='CASCADE'), index=True)

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


################
# SEMANTIC MAP #
################
class DiscoursemeCoordinates(db.Model):
    """

    """

    id = db.Column(db.Integer, primary_key=True)

    semantic_map_id = db.Column(db.Integer, db.ForeignKey('semantic_map.id', ondelete='CASCADE'))
    discourseme_id = db.Column(db.Integer, db.ForeignKey('discourseme.id', ondelete='CASCADE'))

    x = db.Column(db.Float, nullable=False)
    y = db.Column(db.Float, nullable=False)
    x_user = db.Column(db.Float)
    y_user = db.Column(db.Float)
