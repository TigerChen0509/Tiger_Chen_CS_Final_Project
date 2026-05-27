const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'tasktock.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
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
`);

module.exports = db;
