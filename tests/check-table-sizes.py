#!/usr/bin/env python3

import argparse
import sqlite3

import pandas as pd


def get_sizes(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    rows = []

    try:
        cursor.execute(
            """
            SELECT
                name,
                SUM(pgsize) / 1024.0 / 1024.0 AS size_mb
            FROM dbstat
            GROUP BY name
            ORDER BY size_mb DESC
            """
        )

        for name, size_mb in cursor.fetchall():

            # row count only makes sense for tables
            row_count = None

            if not name.startswith("sqlite_"):
                try:
                    row_count = cursor.execute(
                        f'SELECT COUNT(*) FROM "{name}"'
                    ).fetchone()[0]
                except sqlite3.OperationalError:
                    # indexes and other objects
                    pass

            rows.append(
                {
                    "name": name,
                    "size_mb": round(size_mb, 2),
                    "rows": row_count,
                }
            )

    finally:
        conn.close()

    return pd.DataFrame(rows)


def main():
    parser = argparse.ArgumentParser(
        description="Show SQLite table/index sizes and row counts."
    )

    parser.add_argument(
        "database",
        help="Path to SQLite database file",
    )

    args = parser.parse_args()

    df = get_sizes(args.database)

    print(df.to_string(index=False))


if __name__ == "__main__":
    main()
