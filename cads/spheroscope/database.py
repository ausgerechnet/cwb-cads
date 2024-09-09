#!/usr/bin/python3
# -*- coding: utf-8 -*-

import json
import os
from datetime import datetime

from ccc.cqpy import cqpy_dump
from flask import current_app

from .. import db
from ..database import Corpus


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
        return os.path.join(current_app.config['CCC_LIB_DIR'], f"corpus_{self.corpus_id}", "queries", self.name + ".cqpy")

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

    __table_args__ = {'sqlite_autoincrement': True}

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.Unicode)

    entries = db.relationship("QueryHistoryEntry", back_populates="parent", passive_deletes=True, cascade='all, delete')


    def add_entry(self, query_id, comment):

        entry = QueryHistoryEntry(
            history_id = self.id,
            query_id = query_id,
            comment = comment
        )

        self.entries.append(entry)

        return entry


class QueryHistoryEntry(db.Model):

    history_id = db.Column(db.Integer, db.ForeignKey("query_history.id", ondelete="CASCADE"), primary_key=True)
    query_id = db.Column(db.Integer, db.ForeignKey("query.id", ondelete="CASCADE"), primary_key=True)

    time = db.Column(db.DateTime, default=datetime.utcnow, primary_key=True)
    comment = db.Column(db.Unicode)

    parent = db.relationship("QueryHistory", back_populates="entries")
    query = db.relationship("Query")
