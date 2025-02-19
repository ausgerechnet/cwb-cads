#!/usr/bin/python3
# -*- coding: utf-8 -*-

import json
import os
from datetime import datetime

from ccc.cqpy import cqpy_dump
from flask import current_app

from .. import db
from ..database import Query

from flexiconc import Concordance

class SlotQuery(Query):

    _corrections = db.Column(db.Unicode)
    _slots = db.Column(db.Unicode)

    __mapper_args__ = {
        "polymorphic_identity": "slot_query",
    }

    @property
    def path(self):
        identifier = self.name if self.name else str(self.corpus_id)
        return os.path.join(current_app.config['CCC_LIB_DIR'], f"corpus_{self.corpus_id}", "queries", identifier + ".cqpy")

    @property
    def slots(self):
        if self._slots:
            return json.loads(self._slots)
        return []

    @property
    def corrections(self):
        if self._corrections:
            return json.loads(self._corrections)
        return []

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


class FlexiConcSession(db.Model):

    query_id = db.Column(db.Integer, db.ForeignKey("query.id"), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), primary_key=True)

    created = db.Column(db.DateTime, default=datetime.utcnow)
    tree = db.Column(db.String)

    cqp_query = db.relationship("Query")
    user = db.relationship("User")

    _flexiconc = None

    @property
    def concordance(self):

        if not self._flexiconc:
            c = Concordance()
            # TODO: work with actual concordance data frome the DB
            c.retrieve_from_cwb(
                query=self.cqp_query.mangled_query,
                corpus=self.cqp_query.corpus.ccc()
            )
            
            if self.tree:
                # undump previous tree from DB
                current_app.logger.debug(f"flexiconc :: using saved tree")
                tree = json.loads(self.tree)
                c.root = c._build_tree_from_data(tree)
            else:
                # dump fresh tree to DB
                from .flexiconc import TreeNodeOut
                current_app.logger.debug(f"flexiconc :: dumping initial tree")
                self.tree = json.dumps(TreeNodeOut().dump(c.root))
                db.session.commit()

            self._flexiconc = c
        
        return self._flexiconc


    def save_tree(self):
        from .flexiconc import TreeNodeOut
        self.tree = json.dumps(TreeNodeOut().dump(self.concordance.root))
        db.session.merge(self)
        db.session.commit()


    def delete_tree(self):
        self.tree = None
        self._flexiconc = None
        db.session.merge(self)
        db.session.commit()
