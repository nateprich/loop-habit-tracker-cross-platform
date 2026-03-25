import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getAllHabits } from '@/database/habits';
import { getCompletionsForHabit } from '@/database/completions';

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function exportHabitsToCSV(): Promise<void> {
  const habits = await getAllHabits();
  if (habits.length === 0) return;

  // Gather all completion dates across all habits
  const allDates = new Set<string>();
  const completionsByHabit = new Map<string, Map<string, number>>();

  for (const habit of habits) {
    const completions = await getCompletionsForHabit(habit.id);
    const dateMap = new Map<string, number>();
    for (const c of completions) {
      dateMap.set(c.date, c.value);
      allDates.add(c.date);
    }
    completionsByHabit.set(habit.id, dateMap);
  }

  // Sort dates ascending
  const sortedDates = Array.from(allDates).sort();

  if (sortedDates.length === 0) {
    // No completions yet — export just habit names
    const header = 'Date,' + habits.map((h) => escapeCsv(h.name)).join(',');
    const csv = header + '\n(no completions recorded yet)\n';
    await shareCSV(csv);
    return;
  }

  // Build CSV: rows are dates, columns are habits
  const header = 'Date,' + habits.map((h) => escapeCsv(h.name)).join(',');
  const rows = sortedDates.map((date) => {
    const values = habits.map((h) => {
      const dateMap = completionsByHabit.get(h.id);
      const val = dateMap?.get(date);
      if (val === undefined) return '0';
      return h.type === 'numeric' ? String(val) : '1';
    });
    return date + ',' + values.join(',');
  });

  const csv = [header, ...rows].join('\n') + '\n';
  await shareCSV(csv);
}

async function shareCSV(csv: string): Promise<void> {
  const fileName = `habits-export-${new Date().toISOString().slice(0, 10)}.csv`;
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(csv);

  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export Habits',
    UTI: 'public.comma-separated-values-text',
  });
}
