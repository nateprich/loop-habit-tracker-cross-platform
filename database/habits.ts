import { getDatabase } from './schema';
import { Habit, HabitFrequency, HabitColor } from '@/types/habit';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function frequencyToDb(freq: HabitFrequency): { type: string; days: string | null; timesPerWeek: number | null } {
  switch (freq.type) {
    case 'daily':
      return { type: 'daily', days: null, timesPerWeek: null };
    case 'weekly':
      return { type: 'weekly', days: JSON.stringify(freq.days), timesPerWeek: null };
    case 'xPerWeek':
      return { type: 'xPerWeek', days: null, timesPerWeek: freq.timesPerWeek };
  }
}

function frequencyFromDb(type: string, days: string | null, timesPerWeek: number | null): HabitFrequency {
  switch (type) {
    case 'weekly':
      return { type: 'weekly', days: days ? JSON.parse(days) : [] };
    case 'xPerWeek':
      return { type: 'xPerWeek', timesPerWeek: timesPerWeek ?? 1 };
    default:
      return { type: 'daily' };
  }
}

function rowToHabit(row: any): Habit {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color as HabitColor,
    frequency: frequencyFromDb(row.frequency_type, row.frequency_days, row.frequency_times_per_week),
    createdAt: row.created_at,
    archivedAt: row.archived_at,
  };
}

export async function getAllHabits(): Promise<Habit[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    'SELECT * FROM habits WHERE archived_at IS NULL ORDER BY position ASC, created_at ASC'
  );
  return rows.map(rowToHabit);
}

export async function createHabit(
  name: string,
  description: string,
  color: HabitColor,
  frequency: HabitFrequency
): Promise<Habit> {
  const db = await getDatabase();
  const id = generateId();
  const now = Date.now();
  const freq = frequencyToDb(frequency);

  // Get next position
  const result = await db.getFirstAsync<{ max_pos: number | null }>(
    'SELECT MAX(position) as max_pos FROM habits'
  );
  const position = (result?.max_pos ?? -1) + 1;

  await db.runAsync(
    `INSERT INTO habits (id, name, description, color, frequency_type, frequency_days, frequency_times_per_week, position, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, name, description, color, freq.type, freq.days, freq.timesPerWeek, position, now
  );

  return {
    id,
    name,
    description,
    color,
    frequency,
    createdAt: now,
    archivedAt: null,
  };
}

export async function deleteHabit(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM habits WHERE id = ?', id);
}

export async function updateHabit(
  id: string,
  updates: Partial<Pick<Habit, 'name' | 'description' | 'color' | 'frequency'>>
): Promise<void> {
  const db = await getDatabase();
  const sets: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    sets.push('name = ?');
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    sets.push('description = ?');
    values.push(updates.description);
  }
  if (updates.color !== undefined) {
    sets.push('color = ?');
    values.push(updates.color);
  }
  if (updates.frequency !== undefined) {
    const freq = frequencyToDb(updates.frequency);
    sets.push('frequency_type = ?', 'frequency_days = ?', 'frequency_times_per_week = ?');
    values.push(freq.type, freq.days, freq.timesPerWeek);
  }

  if (sets.length === 0) return;

  values.push(id);
  await db.runAsync(`UPDATE habits SET ${sets.join(', ')} WHERE id = ?`, ...values);
}
