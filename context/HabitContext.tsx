import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Habit, HabitCompletion, HabitColor, HabitFrequency, HabitType } from '@/types/habit';
import {
  getAllHabits,
  getArchivedHabits,
  createHabit as dbCreateHabit,
  deleteHabit as dbDeleteHabit,
  updateHabit as dbUpdateHabit,
  archiveHabit as dbArchiveHabit,
  unarchiveHabit as dbUnarchiveHabit,
  reorderHabits as dbReorderHabits,
} from '@/database/habits';
import {
  toggleCompletion as dbToggleCompletion,
  setNumericValue as dbSetNumericValue,
  skipDay as dbSkipDay,
  unskipDay as dbUnskipDay,
  getCompletionsForDateRange,
  getStreakForHabit,
  getLastNDates,
  formatDate,
  SKIP_VALUE,
} from '@/database/completions';
import { getAllHabitScores } from '@/database/score';

interface HabitWithStats extends Habit {
  streak: number;
  score: number; // 0-100 habit strength
}

// completionValues: habitId -> Map<date, value>
interface HabitContextType {
  habits: HabitWithStats[];
  archivedHabits: Habit[];
  completions: Map<string, Set<string>>;
  completionValues: Map<string, Map<string, number>>;
  loading: boolean;
  createHabit: (name: string, description: string, color: HabitColor, frequency: HabitFrequency, type?: HabitType, targetValue?: number | null, unit?: string) => Promise<void>;
  updateHabit: (id: string, updates: Partial<Pick<Habit, 'name' | 'description' | 'color' | 'frequency' | 'type' | 'targetValue' | 'unit'>>) => Promise<void>;
  archiveHabit: (id: string) => Promise<void>;
  unarchiveHabit: (id: string) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  toggleCompletion: (habitId: string, date: string) => Promise<void>;
  skipDay: (habitId: string, date: string) => Promise<void>;
  setNumericValue: (habitId: string, date: string, value: number) => Promise<void>;
  reorderHabits: (orderedIds: string[]) => Promise<void>;
  skippedDays: Map<string, Set<string>>;
  refresh: () => Promise<void>;
}

const HabitContext = createContext<HabitContextType | null>(null);

export function HabitProvider({ children }: { children: React.ReactNode }) {
  const [habits, setHabits] = useState<HabitWithStats[]>([]);
  const [archivedHabits, setArchivedHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<Map<string, Set<string>>>(new Map());
  const [completionValues, setCompletionValues] = useState<Map<string, Map<string, number>>>(new Map());
  const [skippedDays, setSkippedDays] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const allHabits = await getAllHabits();
      const dates = getLastNDates(30);
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];

      const habitIds = allHabits.map((h) => h.id);
      const allCompletions = await getCompletionsForDateRange(habitIds, startDate, endDate);

      // Build completions map, values map, and skipped map
      const compMap = new Map<string, Set<string>>();
      const valMap = new Map<string, Map<string, number>>();
      const skipMap = new Map<string, Set<string>>();
      for (const c of allCompletions) {
        if (c.value === SKIP_VALUE) {
          if (!skipMap.has(c.habitId)) skipMap.set(c.habitId, new Set());
          skipMap.get(c.habitId)!.add(c.date);
          continue;
        }
        if (!compMap.has(c.habitId)) {
          compMap.set(c.habitId, new Set());
        }
        compMap.get(c.habitId)!.add(c.date);

        if (!valMap.has(c.habitId)) {
          valMap.set(c.habitId, new Map());
        }
        valMap.get(c.habitId)!.set(c.date, c.value);
      }

      // Get streaks and scores
      const scores = await getAllHabitScores(allHabits.map(h => ({ id: h.id, targetValue: h.targetValue })));
      const habitsWithStats: HabitWithStats[] = await Promise.all(
        allHabits.map(async (habit) => ({
          ...habit,
          streak: await getStreakForHabit(habit.id, habit.targetValue),
          score: scores.get(habit.id) ?? 0,
        }))
      );

      const archived = await getArchivedHabits();

      setHabits(habitsWithStats);
      setArchivedHabits(archived);
      setCompletions(compMap);
      setCompletionValues(valMap);
      setSkippedDays(skipMap);
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

  const archiveHabit = useCallback(async (id: string) => {
    await dbArchiveHabit(id);
    await loadData();
  }, [loadData]);

  const unarchiveHabit = useCallback(async (id: string) => {
    await dbUnarchiveHabit(id);
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

  const skipDay = useCallback(async (habitId: string, date: string) => {
    // If already skipped, unskip; otherwise skip
    const isSkipped = skippedDays.get(habitId)?.has(date);
    if (isSkipped) {
      await dbUnskipDay(habitId, date);
    } else {
      await dbSkipDay(habitId, date);
    }
    await loadData();
  }, [loadData, skippedDays]);

  const setNumericValue = useCallback(async (habitId: string, date: string, value: number) => {
    await dbSetNumericValue(habitId, date, value);
    await loadData();
  }, [loadData]);

  const reorderHabits = useCallback(async (orderedIds: string[]) => {
    await dbReorderHabits(orderedIds);
    await loadData();
  }, [loadData]);

  return (
    <HabitContext.Provider
      value={{
        habits,
        archivedHabits,
        completions,
        completionValues,
        loading,
        createHabit,
        updateHabit,
        archiveHabit,
        unarchiveHabit,
        deleteHabit,
        toggleCompletion,
        skipDay,
        setNumericValue,
        reorderHabits,
        skippedDays,
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
