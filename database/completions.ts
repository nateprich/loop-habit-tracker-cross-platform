import { getDatabase } from './schema';
import { HabitCompletion } from '@/types/habit';

// Special value for "skip" — doesn't break streak but doesn't count as completed
export const SKIP_VALUE = -1;

export async function toggleCompletion(habitId: string, date: string): Promise<boolean> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ value: number }>(
    'SELECT value FROM completions WHERE habit_id = ? AND date = ?',
    habitId, date
  );

  if (existing && existing.value > 0) {
    // Currently completed -> remove
    await db.runAsync(
      'DELETE FROM completions WHERE habit_id = ? AND date = ?',
      habitId, date
    );
    return false;
  } else if (existing && existing.value === SKIP_VALUE) {
    // Currently skipped -> mark completed
    await db.runAsync(
      'UPDATE completions SET value = 1 WHERE habit_id = ? AND date = ?',
      habitId, date
    );
    return true;
  } else {
    await db.runAsync(
      'INSERT INTO completions (habit_id, date, value) VALUES (?, ?, 1)',
      habitId, date
    );
    return true;
  }
}

export async function skipDay(habitId: string, date: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO completions (habit_id, date, value) VALUES (?, ?, ?)
     ON CONFLICT(habit_id, date) DO UPDATE SET value = excluded.value`,
    habitId, date, SKIP_VALUE
  );
}

export async function unskipDay(habitId: string, date: string): Promise<void> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ value: number }>(
    'SELECT value FROM completions WHERE habit_id = ? AND date = ?',
    habitId, date
  );
  if (existing && existing.value === SKIP_VALUE) {
    await db.runAsync(
      'DELETE FROM completions WHERE habit_id = ? AND date = ?',
      habitId, date
    );
  }
}

export async function setNumericValue(habitId: string, date: string, value: number): Promise<void> {
  const db = await getDatabase();
  if (value <= 0) {
    await db.runAsync(
      'DELETE FROM completions WHERE habit_id = ? AND date = ?',
      habitId, date
    );
  } else {
    await db.runAsync(
      `INSERT INTO completions (habit_id, date, value) VALUES (?, ?, ?)
       ON CONFLICT(habit_id, date) DO UPDATE SET value = excluded.value`,
      habitId, date, value
    );
  }
}

export async function getCompletionsForDateRange(
  habitIds: string[],
  startDate: string,
  endDate: string
): Promise<HabitCompletion[]> {
  if (habitIds.length === 0) return [];

  const db = await getDatabase();
  const placeholders = habitIds.map(() => '?').join(',');
  const rows = await db.getAllAsync<{ habit_id: string; date: string; value: number }>(
    `SELECT habit_id, date, value FROM completions
     WHERE habit_id IN (${placeholders}) AND date >= ? AND date <= ?`,
    ...habitIds, startDate, endDate
  );

  return rows.map((row) => ({
    habitId: row.habit_id,
    date: row.date,
    completed: row.value > 0,
    value: row.value,
  }));
}

export async function getCompletionsForHabit(habitId: string): Promise<HabitCompletion[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ habit_id: string; date: string; value: number }>(
    'SELECT habit_id, date, value FROM completions WHERE habit_id = ? ORDER BY date DESC',
    habitId
  );

  return rows.map((row) => ({
    habitId: row.habit_id,
    date: row.date,
    completed: row.value > 0,
    value: row.value,
  }));
}

export async function getStreakForHabit(habitId: string, targetValue: number | null = null): Promise<number> {
  const today = new Date();
  let streak = 0;
  let currentDate = new Date(today);

  const db = await getDatabase();
  const threshold = targetValue ?? 1;

  while (true) {
    const dateStr = formatDate(currentDate);
    const row = await db.getFirstAsync<{ value: number }>(
      'SELECT value FROM completions WHERE habit_id = ? AND date = ?',
      habitId, dateStr
    );

    if (row && row.value === SKIP_VALUE) {
      // Skipped day — don't break streak, don't count it
      currentDate.setDate(currentDate.getDate() - 1);
      continue;
    } else if (row && row.value >= threshold) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      // If today has no completion, check if yesterday starts a streak
      if (streak === 0 && dateStr === formatDate(today)) {
        currentDate.setDate(currentDate.getDate() - 1);
        continue;
      }
      break;
    }
  }

  return streak;
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getLast7Dates(): string[] {
  return getLastNDates(7);
}

export function getLastNDates(n: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(formatDate(d));
  }
  return dates;
}

/** Returns completion counts by day of week (0=Sun..6=Sat) over last N days */
export async function getCompletionsByDayOfWeek(
  habitIds: string[],
  days: number = 90
): Promise<{ day: number; completed: number; total: number }[]> {
  if (habitIds.length === 0) {
    return Array.from({ length: 7 }, (_, i) => ({ day: i, completed: 0, total: 0 }));
  }

  const dates = getLastNDates(days);
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  const db = await getDatabase();
  const placeholders = habitIds.map(() => '?').join(',');
  const rows = await db.getAllAsync<{ date: string; value: number }>(
    `SELECT date, value FROM completions
     WHERE habit_id IN (${placeholders}) AND date >= ? AND date <= ? AND value > 0`,
    ...habitIds, startDate, endDate
  );

  // Count completions per day of week
  const completedByDay = new Array(7).fill(0);
  for (const row of rows) {
    const dayOfWeek = new Date(row.date + 'T12:00:00').getDay();
    completedByDay[dayOfWeek]++;
  }

  // Count total possible per day of week (habits * occurrences of that day)
  const totalByDay = new Array(7).fill(0);
  for (const dateStr of dates) {
    const dayOfWeek = new Date(dateStr + 'T12:00:00').getDay();
    totalByDay[dayOfWeek] += habitIds.length;
  }

  return Array.from({ length: 7 }, (_, i) => ({
    day: i,
    completed: completedByDay[i],
    total: totalByDay[i],
  }));
}
