import { getDatabase } from './schema';
import { HabitColor, HABIT_COLORS } from '@/types/habit';

/**
 * CSV Import for habit data.
 *
 * Supports two CSV formats:
 *
 * 1. Simple format (one habit per file):
 *    Date,Value
 *    2024-01-01,1
 *    2024-01-02,0
 *
 * 2. Multi-habit format:
 *    Date,Habit1,Habit2,Habit3
 *    2024-01-01,1,0,3.5
 *    2024-01-02,0,1,2.0
 *
 * Values: 1 = completed, 0 = not completed, -1 = skipped,
 * any positive number = numeric value
 */

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function parseCSV(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/);
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          result.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
    }
    result.push(current.trim());
    return result;
  });
}

function isDateString(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function importCSV(csvText: string): Promise<{ habits: number; completions: number }> {
  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    throw new Error('CSV must have a header row and at least one data row');
  }

  const header = rows[0];
  const dataRows = rows.slice(1);

  // Detect format
  const firstCol = header[0].toLowerCase();
  if (firstCol !== 'date') {
    throw new Error('First column must be "Date"');
  }

  const habitNames = header.slice(1);
  if (habitNames.length === 0) {
    throw new Error('CSV must have at least one habit column after "Date"');
  }

  // If single column named "Value", ask for a habit name
  const isSingleValueFormat = habitNames.length === 1 && habitNames[0].toLowerCase() === 'value';
  if (isSingleValueFormat) {
    habitNames[0] = 'Imported Habit';
  }

  const db = await getDatabase();

  // Create habits
  const habitIds: string[] = [];
  let habitsCreated = 0;

  for (let i = 0; i < habitNames.length; i++) {
    const name = habitNames[i];
    const id = generateId();
    const color = HABIT_COLORS[i % HABIT_COLORS.length];
    const now = Date.now();

    // Get next position
    const result = await db.getFirstAsync<{ max_pos: number | null }>(
      'SELECT MAX(position) as max_pos FROM habits'
    );
    const position = (result?.max_pos ?? -1) + 1;

    await db.runAsync(
      `INSERT INTO habits (id, name, description, color, frequency_type, frequency_days, frequency_times_per_week, position, type, target_value, unit, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, name, '', color, 'daily', null, null, position, 'boolean', null, '', now
    );

    habitIds.push(id);
    habitsCreated++;
  }

  // Import completions
  let completionsCreated = 0;

  for (const row of dataRows) {
    const dateStr = row[0];
    if (!isDateString(dateStr)) continue;

    for (let i = 0; i < habitIds.length; i++) {
      const valueStr = row[i + 1];
      if (valueStr === undefined || valueStr === '') continue;

      const value = parseFloat(valueStr);
      if (isNaN(value) || value === 0) continue;

      await db.runAsync(
        `INSERT OR IGNORE INTO completions (habit_id, date, value) VALUES (?, ?, ?)`,
        habitIds[i], dateStr, value
      );
      completionsCreated++;
    }
  }

  // Detect if any habit is numeric (has values > 1)
  for (let i = 0; i < habitIds.length; i++) {
    const maxVal = await db.getFirstAsync<{ max_val: number }>(
      'SELECT MAX(value) as max_val FROM completions WHERE habit_id = ? AND value > 0',
      habitIds[i]
    );
    if (maxVal && maxVal.max_val > 1) {
      await db.runAsync(
        "UPDATE habits SET type = 'numeric' WHERE id = ?",
        habitIds[i]
      );
    }
  }

  return { habits: habitsCreated, completions: completionsCreated };
}
