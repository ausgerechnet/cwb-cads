#!/usr/bin/python3
# -*- coding: utf-8 -*-

from datetime import datetime

from flask import Blueprint
import click
from .. import db
from ..database import Corpus
from glob import glob
import os


bp = Blueprint('spheroscope-database', __name__, url_prefix='/spheroscope-database', cli_group='spheroscope-database')


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


class SlotQuery(db.Model):

    __table_args__ = (
        db.UniqueConstraint('name', 'corpus_id', name='unique_name_corpus'),
    )

    id = db.Column(db.Integer, primary_key=True)
    modified = db.Column(db.DateTime, nullable=False, default=datetime.now())

    corpus_id = db.Column(db.Integer, db.ForeignKey('corpus.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

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
    def slots(self):
        return self._slots

    @property
    def corrections(self):
        return self._corrections


def import_macro(path):

    name = path.split("/")[-1].split(".")[0]
    with open(path, "rt") as f:
        macro = f.read().strip()

    db.session.add(Macro(
        name=name,
        macro=macro,
        comment='imported macro'
    ))

    db.session.commit()


def import_wordlist(path):

    name = path.split('/')[-1].split('.')[0]
    with open(path, "rt") as f:
        words = f.read().strip().split("\n")

    wordlist = WordList(
        name=name,
        comment='imported wordlist'
    )
    db.session.add(wordlist)
    db.session.commit()
    for word in words:
        db.session.add(WordListWords(wordlist_id=wordlist.id, word=word))
    db.session.commit()


@bp.cli.command('import-library')
@click.option('--lib_dir', default='tests/library/')
def import_library(lib_dir):

    paths_macros = glob(os.path.join(lib_dir, "macros", "*.txt"))
    paths_wordlists = glob(os.path.join(lib_dir, "wordlists", "*.txt"))

    for path in paths_macros:
        import_macro(path)
    for path in paths_wordlists:
        import_wordlist(path)
