import importlib.util
import shutil
import sqlite3
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    'migration', Path(__file__).parent.parent / 'migrations' / '2026-10-27-current-versions.py'
)
migration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(migration)


def test_migration_current_versions():

    tmp = Path(__file__).parent / 'tmp' / 'migration'
    tmp.mkdir(parents=True, exist_ok=True)
    try:
        con = sqlite3.connect(tmp / 'old.sqlite')
        con.executescript("""
        CREATE TABLE word_list (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, name VARCHAR(255) NOT NULL,
            version INTEGER NOT NULL, corpus_id INTEGER NOT NULL, modified DATETIME NOT NULL, comment VARCHAR);
        CREATE TABLE macro (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, name VARCHAR(255) NOT NULL,
            valency INTEGER NOT NULL, argument_names VARCHAR(255), version INTEGER NOT NULL,
            corpus_id INTEGER NOT NULL, modified DATETIME NOT NULL, body VARCHAR, comment VARCHAR);
        CREATE TABLE query_history_entry (history_id INTEGER NOT NULL, query_id INTEGER NOT NULL, time DATETIME,
            comment VARCHAR, _trigger VARCHAR, auto BOOLEAN, PRIMARY KEY (history_id, query_id));
        INSERT INTO word_list (name, version, corpus_id, modified) VALUES ('a', 1, 1, '2026'), ('a', 2, 1, '2026');
        INSERT INTO macro (name, valency, version, corpus_id, modified) VALUES ('m', 0, 1, 1, '2026');
        INSERT INTO query_history_entry VALUES (1, 7, '2026-01-02', 'second', NULL, 1),
                                               (1, 5, '2026-01-01', 'first', NULL, 0);
        """)
        con.commit()

        for _ in range(2):      # idempotent
            with con:
                migration.add_activated(con, 'word_list')
                migration.add_activated(con, 'macro')
                migration.add_entry_id(con)

        assert con.execute("SELECT version, activated FROM word_list ORDER BY id").fetchall() == [(1, 1), (2, 2)]
        assert con.execute("SELECT version, activated FROM macro").fetchall() == [(1, 1)]
        assert con.execute("SELECT id, query_id, comment FROM query_history_entry ORDER BY id").fetchall() == \
            [(1, 5, 'first'), (2, 7, 'second')]
        # the same query can now occur twice in a history
        con.execute("INSERT INTO query_history_entry (history_id, query_id) VALUES (1, 5)")
        con.close()
    finally:
        shutil.rmtree(tmp)
