import { getDatabase } from './schema';
import { HabitCompletion } from '@/types/habit';

export async function toggleCompletion(habitId: string, date: string): Promise<boolean> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ value: number }>(
    'SELECT value FROM completions WHERE habit_id = ? AND date = ?',
    habitId, date
  );

  if (existing) {
    await db.runAsync(
      'DELETE FROM completions WHERE habit_id = ? AND date = ?',
      habitId, date
    );
    return false;
  } else {
    await db.runAsync(
      'INSERT INTO completions (habit_id, date, value) VALUES (?, ?, 1)',
      habitId, date
    );
    return true;
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

    if (row && row.value >= threshold) {
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
  const dates: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(formatDate(d));
  }
  return dates;
}
