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
      type TEXT NOT NULL DEFAULT 'boolean',
      target_value REAL DEFAULT NULL,
      unit TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      archived_at INTEGER DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS completions (
      habit_id TEXT NOT NULL,
      date TEXT NOT NULL,
      value REAL NOT NULL DEFAULT 1,
      PRIMARY KEY (habit_id, date),
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
    );
  `);

  // Migrate existing databases: add new columns if missing
  await migrateIfNeeded(database);
}

async function migrateIfNeeded(database: SQLite.SQLiteDatabase): Promise<void> {
  const columns = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(habits)"
  );
  const colNames = columns.map((c) => c.name);

  if (!colNames.includes('type')) {
    await database.execAsync(`
      ALTER TABLE habits ADD COLUMN type TEXT NOT NULL DEFAULT 'boolean';
      ALTER TABLE habits ADD COLUMN target_value REAL DEFAULT NULL;
      ALTER TABLE habits ADD COLUMN unit TEXT NOT NULL DEFAULT '';
    `);
  }

  // Migrate completions: rename 'completed' to 'value' if needed
  const compColumns = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(completions)"
  );
  const compColNames = compColumns.map((c) => c.name);

  if (!compColNames.includes('value') && compColNames.includes('completed')) {
    await database.execAsync(`
      ALTER TABLE completions RENAME COLUMN completed TO value;
    `);
  }
}
