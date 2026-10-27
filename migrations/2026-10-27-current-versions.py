#! /usr/bin/env python
# -*- coding: utf-8 -*-

"""Migrates an existing SQLite database to explicit current versions (issue #17):

- word_list, macro: new column `activated` (current version = activated last),
  initialised with the version number, so the highest version stays current
- query_history_entry: surrogate primary key `id` (a query can occur several
  times in a history), assigned in order of time

Run once, with the server stopped; make a backup first.
"""

import argparse
import sqlite3


def columns(con, table):
    return [row[1] for row in con.execute(f"PRAGMA table_info({table})")]


def add_activated(con, table):

    if 'activated' in columns(con, table):
        print(f"{table}: column 'activated' exists, skipping")
        return

    con.execute(f"ALTER TABLE {table} ADD COLUMN activated INTEGER NOT NULL DEFAULT 0")
    con.execute(f"UPDATE {table} SET activated = version")
    print(f"{table}: added column 'activated'")


def add_entry_id(con):

    if 'id' in columns(con, 'query_history_entry'):
        print("query_history_entry: column 'id' exists, skipping")
        return

    con.executescript("""
    CREATE TABLE query_history_entry_new (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        history_id INTEGER NOT NULL,
        query_id INTEGER NOT NULL,
        time DATETIME,
        comment VARCHAR,
        _trigger VARCHAR,
        auto BOOLEAN,
        FOREIGN KEY(history_id) REFERENCES query_history (id) ON DELETE CASCADE,
        FOREIGN KEY(query_id) REFERENCES "query" (id) ON DELETE CASCADE
    );
    INSERT INTO query_history_entry_new (history_id, query_id, time, comment, _trigger, auto)
        SELECT history_id, query_id, time, comment, _trigger, auto
        FROM query_history_entry ORDER BY time, history_id, query_id;
    DROP TABLE query_history_entry;
    ALTER TABLE query_history_entry_new RENAME TO query_history_entry;
    CREATE INDEX ix_query_history_entry_history_id ON query_history_entry (history_id);
    CREATE INDEX ix_query_history_entry_query_id ON query_history_entry (query_id);
    """)
    print("query_history_entry: added primary key 'id'")


if __name__ == '__main__':

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('database', help='path to the SQLite database, e.g. instance/cwb-cads-prod.sqlite')
    args = parser.parse_args()

    con = sqlite3.connect(args.database)
    try:
        with con:
            add_activated(con, 'word_list')
            add_activated(con, 'macro')
            add_entry_id(con)
    finally:
        con.close()
