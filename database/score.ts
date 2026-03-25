import { getDatabase } from './schema';
import { formatDate, SKIP_VALUE } from './completions';

/**
 * Habit strength score using exponential smoothing, inspired by the original
 * Loop Habit Tracker algorithm.
 *
 * Score is a value between 0 and 100 representing how consistently the habit
 * has been performed. Each completed day increases the score; each missed day
 * decreases it. Skipped days are ignored (neutral).
 *
 * The smoothing factor (alpha) controls how quickly the score reacts:
 * - Higher alpha = more responsive to recent behavior
 * - Lower alpha = more stable, slower to change
 */
const ALPHA_UP = 0.052;   // ~13 days to reach ~50% from 0
const ALPHA_DOWN = 0.035;  // ~20 days to drop to ~50% from 100

export async function getHabitScore(
  habitId: string,
  targetValue: number | null = null,
  days: number = 90
): Promise<number> {
  const db = await getDatabase();

  // Get completions for the last N days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const rows = await db.getAllAsync<{ date: string; value: number }>(
    'SELECT date, value FROM completions WHERE habit_id = ? AND date >= ? AND date <= ? ORDER BY date ASC',
    habitId, formatDate(startDate), formatDate(endDate)
  );

  const completionMap = new Map<string, number>();
  for (const row of rows) {
    completionMap.set(row.date, row.value);
  }

  const threshold = targetValue ?? 1;
  let score = 0;

  // Walk through each day
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = formatDate(current);
    const value = completionMap.get(dateStr);

    if (value === SKIP_VALUE || value === undefined && isBeforeCreation(dateStr)) {
      // Skip — no change to score
    } else if (value !== undefined && value >= threshold) {
      // Completed
      score = score + ALPHA_UP * (1 - score);
    } else {
      // Missed
      score = score * (1 - ALPHA_DOWN);
    }

    current.setDate(current.getDate() + 1);
  }

  return Math.round(score * 100);
}

function isBeforeCreation(_dateStr: string): boolean {
  // In a real implementation, we'd check against habit.createdAt
  // For now, treat all days in range as relevant
  return false;
}

/**
 * Get scores for all active habits
 */
export async function getAllHabitScores(
  habits: { id: string; targetValue: number | null }[]
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  for (const habit of habits) {
    const score = await getHabitScore(habit.id, habit.targetValue);
    scores.set(habit.id, score);
  }
  return scores;
}

/**
 * Get daily score history for a single habit (for chart display)
 */
export async function getHabitScoreHistory(
  habitId: string,
  targetValue: number | null = null,
  days: number = 90
): Promise<{ date: string; score: number }[]> {
  const db = await getDatabase();

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const rows = await db.getAllAsync<{ date: string; value: number }>(
    'SELECT date, value FROM completions WHERE habit_id = ? AND date >= ? AND date <= ? ORDER BY date ASC',
    habitId, formatDate(startDate), formatDate(endDate)
  );

  const completionMap = new Map<string, number>();
  for (const row of rows) {
    completionMap.set(row.date, row.value);
  }

  const threshold = targetValue ?? 1;
  let score = 0;
  const history: { date: string; score: number }[] = [];

  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = formatDate(current);
    const value = completionMap.get(dateStr);

    if (value !== undefined && value === SKIP_VALUE) {
      // Skip
    } else if (value !== undefined && value >= threshold) {
      score = score + ALPHA_UP * (1 - score);
    } else {
      score = score * (1 - ALPHA_DOWN);
    }

    history.push({ date: dateStr, score: Math.round(score * 100) });
    current.setDate(current.getDate() + 1);
  }

  return history;
}
