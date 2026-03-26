import * as FileSystem from 'expo-file-system';
import { getDatabase } from './schema';
import { Habit } from '@/types/habit';

export interface BackupData {
  version: 1;
  exportedAt: number;
  habits: any[];
  completions: any[];
}

export async function exportBackup(): Promise<string> {
  const db = await getDatabase();

  const habits = await db.getAllAsync('SELECT * FROM habits ORDER BY position ASC');
  const completions = await db.getAllAsync('SELECT * FROM completions ORDER BY date ASC');

  const data: BackupData = {
    version: 1,
    exportedAt: Date.now(),
    habits,
    completions,
  };

  const json = JSON.stringify(data, null, 2);
  const path = `${FileSystem.documentDirectory}loop-habits-backup.json`;
  await FileSystem.writeAsStringAsync(path, json);

  return path;
}

export async function getBackupJson(): Promise<string> {
  const db = await getDatabase();

  const habits = await db.getAllAsync('SELECT * FROM habits ORDER BY position ASC');
  const completions = await db.getAllAsync('SELECT * FROM completions ORDER BY date ASC');

  const data: BackupData = {
    version: 1,
    exportedAt: Date.now(),
    habits,
    completions,
  };

  return JSON.stringify(data, null, 2);
}

export async function importBackup(json: string): Promise<{ habits: number; completions: number }> {
  const data: BackupData = JSON.parse(json);

  if (!data.version || !data.habits || !data.completions) {
    throw new Error('Invalid backup file format');
  }

  const db = await getDatabase();

  // Clear existing data
  await db.runAsync('DELETE FROM completions');
  await db.runAsync('DELETE FROM habits');

  // Import habits
  for (const h of data.habits) {
    await db.runAsync(
      `INSERT INTO habits (id, name, description, color, frequency_type, frequency_days, frequency_times_per_week, position, type, target_value, unit, created_at, archived_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      h.id,
      h.name,
      h.description ?? '',
      h.color ?? '#F44336',
      h.frequency_type ?? 'daily',
      h.frequency_days ?? null,
      h.frequency_times_per_week ?? null,
      h.position ?? 0,
      h.type ?? 'boolean',
      h.target_value ?? null,
      h.unit ?? '',
      h.created_at ?? Date.now(),
      h.archived_at ?? null
    );
  }

  // Import completions
  for (const c of data.completions) {
    await db.runAsync(
      `INSERT OR IGNORE INTO completions (habit_id, date, value) VALUES (?, ?, ?)`,
      c.habit_id,
      c.date,
      c.value ?? 1
    );
  }

  return { habits: data.habits.length, completions: data.completions.length };
}

export async function importBackupFromFile(filePath: string): Promise<{ habits: number; completions: number }> {
  const json = await FileSystem.readAsStringAsync(filePath);
  return importBackup(json);
}
