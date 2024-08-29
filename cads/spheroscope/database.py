#!/usr/bin/python3
# -*- coding: utf-8 -*-

import json
import os
from datetime import datetime

from ccc.cqpy import cqpy_dump
from flask import current_app

from .. import db
from ..database import Corpus


class WordList(db.Model):

    __table_args__ = {'sqlite_autoincrement': True}

    # __table_args__ = (
    #     db.UniqueConstraint('name', 'corpus_id', name='unique_name_corpus'),
    # )

    id = db.Column(db.Integer, primary_key=True)
    modified = db.Column(db.DateTime, nullable=False, default=datetime.now())

    # corpus_id = db.Column(db.Integer, db.ForeignKey('corpus.id'), nullable=False)
    # user_id = db.Column(db.Integer, db.ForeignKey('user.id'))

    name = db.Column(db.Unicode(255), nullable=False)
    words = db.relationship("WordListWords", backref="word_list", cascade="all, delete")
    # p_att = db.Column(db.Unicode(50), nullable=False)

    comment = db.Column(db.Unicode)

    @property
    def path(self):
        return os.path.join(current_app.config['CCC_LIB_DIR'], "wordlists", self.name + ".txt")

    def write(self):
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        with open(self.path, "wt") as f:
            f.write("\n".join([w. word for w in self.words]))


class WordListWords(db.Model):

    __table_args__ = {'sqlite_autoincrement': True}

    id = db.Column(db.Integer(), primary_key=True)
    wordlist_id = db.Column(db.Integer, db.ForeignKey('word_list.id', ondelete='CASCADE'))

    word = db.Column(db.Unicode(), nullable=True)


class Macro(db.Model):

    __table_args__ = {'sqlite_autoincrement': True}

    # __table_args__ = (
    #     db.UniqueConstraint('name', 'corpus_id', name='unique_name_corpus'),
    # )

    id = db.Column(db.Integer, primary_key=True)
    modified = db.Column(db.DateTime, nullable=False, default=datetime.now())

    # corpus_id = db.Column(db.Integer, db.ForeignKey('corpus.id'), nullable=False)
    # user_id = db.Column(db.Integer, db.ForeignKey('user.id'))

    name = db.Column(db.Unicode(255), nullable=False)
    macro = db.Column(db.Unicode)

    comment = db.Column(db.Unicode)

    @property
    def path(self):
        return os.path.join(current_app.config['CCC_LIB_DIR'], "macros", self.name + ".txt")

    def write(self):
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        with open(self.path, "wt") as f:
            f.write(self.macro)


class SlotQuery(db.Model):

    # __table_args__ = (
    #     db.UniqueConstraint('name', 'corpus_id', name='unique_name_corpus'),
    # )

    id = db.Column(db.Integer, primary_key=True)
    modified = db.Column(db.DateTime, nullable=False, default=datetime.now())

    corpus_id = db.Column(db.Integer, db.ForeignKey('corpus.id'), nullable=False)
    # user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    name = db.Column(db.Unicode(255), nullable=False)

    _corrections = db.Column(db.Unicode)
    _slots = db.Column(db.Unicode)
    cqp_query = db.Column(db.Unicode)
    match_strategy = db.Column(db.Unicode, default='longest')

    comment = db.Column(db.Unicode)

    @property
    def corpus(self):
        return db.get_or_404(Corpus, self.corpus_id)

    @property
    def path(self):
        return os.path.join(current_app.config['CCC_LIB_DIR'], "queries", self.name + ".cqpy")

    @property
    def slots(self):
        return json.loads(self._slots)

    @property
    def corrections(self):
        return json.loads(self._corrections)

    def serialize(self):

        return {
            'meta': {
                'name': self.name,
                'comment': self.comment
            },
            'cqp': self.cqp_query,
            'anchors': {
                'corrections': self.corrections,
                'slots': self.slots
            }
        }

    def write(self):
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        cqpy_dump(self.serialize(), self.path)


class QueryHistory(db.Model):

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.Unicode)

    history_entries = db.relationship("QueryHistoryEntry", back_populates="parent", passive_deletes=True, cascade='all, delete')


    def add_entry(self, query_id, comment):

        entry = QueryHistoryEntry(
            history_id = self.id,
            query_id = query_id,
            comment = comment
        )

        self.history_entries.append(entry)

        return entry


class QueryHistoryEntry(db.Model):

    history_id = db.Column(db.Integer, db.ForeignKey("query_history.id", ondelete="CASCADE"), primary_key=True)
    query_id = db.Column(db.Integer, db.ForeignKey("query.id", ondelete="CASCADE"), primary_key=True)

    time = db.Column(db.DateTime, default=datetime.utcnow, primary_key=True)
    comment = db.Column(db.Unicode)

    parent = db.relationship("QueryHistory", back_populates="history_entries")
