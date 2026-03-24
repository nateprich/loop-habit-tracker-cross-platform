export type HabitFrequency =
  | { type: 'daily' }
  | { type: 'weekly'; days: number[] } // 0=Sun, 1=Mon, ..., 6=Sat
  | { type: 'xPerWeek'; timesPerWeek: number };

export type HabitColor =
  | '#F44336' // Red
  | '#E91E63' // Pink
  | '#9C27B0' // Purple
  | '#673AB7' // Deep Purple
  | '#3F51B5' // Indigo
  | '#2196F3' // Blue
  | '#009688' // Teal
  | '#4CAF50' // Green
  | '#8BC34A' // Light Green
  | '#FF9800' // Orange
  | '#795548' // Brown
  | '#607D8B'; // Blue Grey

export const HABIT_COLORS: HabitColor[] = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7',
  '#3F51B5', '#2196F3', '#009688', '#4CAF50',
  '#8BC34A', '#FF9800', '#795548', '#607D8B',
];

export interface Habit {
  id: string;
  name: string;
  description: string;
  color: HabitColor;
  frequency: HabitFrequency;
  createdAt: number; // Unix timestamp
  archivedAt: number | null;
}

export interface HabitCompletion {
  habitId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
}
