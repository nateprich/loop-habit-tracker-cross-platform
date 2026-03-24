import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'loophabits.db';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await initializeDatabase(db);
  return db;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '#F44336',
      frequency_type TEXT NOT NULL DEFAULT 'daily',
      frequency_days TEXT DEFAULT NULL,
      frequency_times_per_week INTEGER DEFAULT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      reminder_time TEXT DEFAULT NULL,
      created_at INTEGER NOT NULL,
      archived_at INTEGER DEFAULT NULL
    );

    -- Migration: add reminder_time if missing (for existing databases)
    CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY);
    INSERT OR IGNORE INTO _migrations (id) VALUES ('add_reminder_time');

    CREATE TABLE IF NOT EXISTS completions (
      habit_id TEXT NOT NULL,
      date TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (habit_id, date),
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
    );
  `);
}
