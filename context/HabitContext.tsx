import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Habit, HabitCompletion, HabitColor, HabitFrequency } from '@/types/habit';
import { getAllHabits, createHabit as dbCreateHabit, deleteHabit as dbDeleteHabit } from '@/database/habits';
import { scheduleHabitReminder, cancelHabitReminder } from '@/services/notifications';
import {
  toggleCompletion as dbToggleCompletion,
  getCompletionsForDateRange,
  getStreakForHabit,
  getLast7Dates,
  formatDate,
} from '@/database/completions';

interface HabitWithStats extends Habit {
  streak: number;
}

interface HabitContextType {
  habits: HabitWithStats[];
  completions: Map<string, Set<string>>;
  loading: boolean;
  createHabit: (name: string, description: string, color: HabitColor, frequency: HabitFrequency, reminderTime?: string | null) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  toggleCompletion: (habitId: string, date: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const HabitContext = createContext<HabitContextType | null>(null);

export function HabitProvider({ children }: { children: React.ReactNode }) {
  const [habits, setHabits] = useState<HabitWithStats[]>([]);
  const [completions, setCompletions] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const allHabits = await getAllHabits();
      const dates = getLast7Dates();
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];

      const habitIds = allHabits.map((h) => h.id);
      const allCompletions = await getCompletionsForDateRange(habitIds, startDate, endDate);

      const compMap = new Map<string, Set<string>>();
      for (const c of allCompletions) {
        if (!compMap.has(c.habitId)) {
          compMap.set(c.habitId, new Set());
        }
        compMap.get(c.habitId)!.add(c.date);
      }

      const habitsWithStats: HabitWithStats[] = await Promise.all(
        allHabits.map(async (habit) => ({
          ...habit,
          streak: await getStreakForHabit(habit.id),
        }))
      );

      setHabits(habitsWithStats);
      setCompletions(compMap);
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
    reminderTime: string | null = null
  ) => {
    const habit = await dbCreateHabit(name, description, color, frequency, reminderTime);
    if (reminderTime) {
      await scheduleHabitReminder(habit.id, habit.name, reminderTime);
    }
    await loadData();
  }, [loadData]);

  const deleteHabit = useCallback(async (id: string) => {
    await cancelHabitReminder(id);
    await dbDeleteHabit(id);
    await loadData();
  }, [loadData]);

  const toggleCompletion = useCallback(async (habitId: string, date: string) => {
    await dbToggleCompletion(habitId, date);
    await loadData();
  }, [loadData]);

  return (
    <HabitContext.Provider
      value={{
        habits,
        completions,
        loading,
        createHabit,
        deleteHabit,
        toggleCompletion,
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
