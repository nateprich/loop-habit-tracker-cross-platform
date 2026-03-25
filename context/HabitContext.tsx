import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Habit, HabitCompletion, HabitColor, HabitFrequency, HabitType } from '@/types/habit';
import { getAllHabits, createHabit as dbCreateHabit, deleteHabit as dbDeleteHabit, updateHabit as dbUpdateHabit } from '@/database/habits';
import {
  toggleCompletion as dbToggleCompletion,
  setNumericValue as dbSetNumericValue,
  getCompletionsForDateRange,
  getStreakForHabit,
  getLast7Dates,
  formatDate,
} from '@/database/completions';

interface HabitWithStats extends Habit {
  streak: number;
}

// completionValues: habitId -> Map<date, value>
interface HabitContextType {
  habits: HabitWithStats[];
  completions: Map<string, Set<string>>; // habitId -> Set of completed date strings
  completionValues: Map<string, Map<string, number>>; // habitId -> Map<date, numeric value>
  loading: boolean;
  createHabit: (name: string, description: string, color: HabitColor, frequency: HabitFrequency, type?: HabitType, targetValue?: number | null, unit?: string) => Promise<void>;
  updateHabit: (id: string, updates: Partial<Pick<Habit, 'name' | 'description' | 'color' | 'frequency' | 'type' | 'targetValue' | 'unit'>>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  toggleCompletion: (habitId: string, date: string) => Promise<void>;
  setNumericValue: (habitId: string, date: string, value: number) => Promise<void>;
  refresh: () => Promise<void>;
}

const HabitContext = createContext<HabitContextType | null>(null);

export function HabitProvider({ children }: { children: React.ReactNode }) {
  const [habits, setHabits] = useState<HabitWithStats[]>([]);
  const [completions, setCompletions] = useState<Map<string, Set<string>>>(new Map());
  const [completionValues, setCompletionValues] = useState<Map<string, Map<string, number>>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const allHabits = await getAllHabits();
      const dates = getLast7Dates();
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];

      const habitIds = allHabits.map((h) => h.id);
      const allCompletions = await getCompletionsForDateRange(habitIds, startDate, endDate);

      // Build completions map and values map
      const compMap = new Map<string, Set<string>>();
      const valMap = new Map<string, Map<string, number>>();
      for (const c of allCompletions) {
        if (!compMap.has(c.habitId)) {
          compMap.set(c.habitId, new Set());
        }
        compMap.get(c.habitId)!.add(c.date);

        if (!valMap.has(c.habitId)) {
          valMap.set(c.habitId, new Map());
        }
        valMap.get(c.habitId)!.set(c.date, c.value);
      }

      // Get streaks
      const habitsWithStats: HabitWithStats[] = await Promise.all(
        allHabits.map(async (habit) => ({
          ...habit,
          streak: await getStreakForHabit(habit.id, habit.targetValue),
        }))
      );

      setHabits(habitsWithStats);
      setCompletions(compMap);
      setCompletionValues(valMap);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createHabit = useCallback(async (
    name: string,
    description: string,
    color: HabitColor,
    frequency: HabitFrequency,
    type: HabitType = 'boolean',
    targetValue: number | null = null,
    unit: string = ''
  ) => {
    await dbCreateHabit(name, description, color, frequency, type, targetValue, unit);
    await loadData();
  }, [loadData]);

  const updateHabit = useCallback(async (
    id: string,
    updates: Partial<Pick<Habit, 'name' | 'description' | 'color' | 'frequency' | 'type' | 'targetValue' | 'unit'>>
  ) => {
    await dbUpdateHabit(id, updates);
    await loadData();
  }, [loadData]);

  const deleteHabit = useCallback(async (id: string) => {
    await dbDeleteHabit(id);
    await loadData();
  }, [loadData]);

  const toggleCompletion = useCallback(async (habitId: string, date: string) => {
    await dbToggleCompletion(habitId, date);
    await loadData();
  }, [loadData]);

  const setNumericValue = useCallback(async (habitId: string, date: string, value: number) => {
    await dbSetNumericValue(habitId, date, value);
    await loadData();
  }, [loadData]);

  return (
    <HabitContext.Provider
      value={{
        habits,
        completions,
        completionValues,
        loading,
        createHabit,
        updateHabit,
        deleteHabit,
        toggleCompletion,
        setNumericValue,
        refresh: loadData,
      }}
    >
      {children}
    </HabitContext.Provider>
  );
}

export function useHabits() {
  const context = useContext(HabitContext);
  if (!context) {
    throw new Error('useHabits must be used within a HabitProvider');
  }
  return context;
}
