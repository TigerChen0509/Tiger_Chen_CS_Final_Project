import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tasktock.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            email      TEXT    UNIQUE NOT NULL,
            password   TEXT    NOT NULL,
            name       TEXT    NOT NULL,
            created_at TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id                   INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id              INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            task_id              TEXT    UNIQUE NOT NULL,
            title                TEXT    NOT NULL,
            notes                TEXT    DEFAULT '',
            due_date             TEXT    NOT NULL,
            created_at           TEXT    NOT NULL DEFAULT (datetime('now')),
            repeat_type          TEXT    NOT NULL DEFAULT 'none',
            repeat_end           TEXT,
            status               TEXT    NOT NULL DEFAULT 'pending',
            snooze_count         INTEGER NOT NULL DEFAULT 0,
            alarm_enabled        INTEGER NOT NULL DEFAULT 1,
            completed_at         TEXT,
            instance_completions TEXT    NOT NULL DEFAULT '{}',
            category             TEXT    NOT NULL DEFAULT 'General'
        );

        CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(user_id, status);
    """)
    conn.commit()
    conn.close()
