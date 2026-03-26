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
  | '#03A9F4' // Light Blue
  | '#009688' // Teal
  | '#00BCD4' // Cyan
  | '#4CAF50' // Green
  | '#8BC34A' // Light Green
  | '#CDDC39' // Lime
  | '#FFEB3B' // Yellow
  | '#FFC107' // Amber
  | '#FF9800' // Orange
  | '#FF5722' // Deep Orange
  | '#795548' // Brown
  | '#607D8B' // Blue Grey
  | '#9E9E9E' // Grey
  | '#212121'; // Black

export const HABIT_COLORS: HabitColor[] = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7',
  '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
  '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
  '#FFEB3B', '#FFC107', '#FF9800', '#FF5722',
  '#795548', '#607D8B', '#9E9E9E', '#212121',
];

export type HabitType = 'boolean' | 'numeric';

export interface Habit {
  id: string;
  name: string;
  description: string;
  color: HabitColor;
  frequency: HabitFrequency;
  type: HabitType;
  targetValue: number | null; // e.g. 8 (glasses of water)
  unit: string; // e.g. "glasses", "minutes", "miles"
  createdAt: number; // Unix timestamp
  archivedAt: number | null;
}

export interface HabitCompletion {
  habitId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  value: number; // 1 for boolean, actual value for numeric
}
