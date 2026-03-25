import { useMemo } from 'react';
import { StyleSheet, ScrollView, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Svg, { Circle, Rect } from 'react-native-svg';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useHabits } from '@/context/HabitContext';
import { formatDate } from '@/database/completions';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Calendar grid dimensions
const CELL_SIZE = 14;
const CELL_GAP = 2;

export default function HabitDetailScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { id } = useLocalSearchParams<{ id: string }>();
  const { habits, completions, completionValues } = useHabits();

  const habit = habits.find((h) => h.id === id);

  if (!habit) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: colors.secondaryText }}>Habit not found</Text>
      </View>
    );
  }

  const habitCompletions = completions.get(habit.id) ?? new Set();
  const habitValues = completionValues.get(habit.id) ?? new Map();

  // Calculate stats
  const stats = useMemo(() => {
    const totalEntries = habitCompletions.size;
    const isNumeric = habit.type === 'numeric';
    const target = habit.targetValue ?? 1;

    // Best streak (computed from all completions)
    const sortedDates = Array.from(habitCompletions).sort();
    let bestStreak = 0;
    let currentStreak = 0;
    let prevDate: Date | null = null;

    for (const dateStr of sortedDates) {
      if (isNumeric) {
        const val = habitValues.get(dateStr) ?? 0;
        if (val < target) {
          currentStreak = 0;
          prevDate = null;
          continue;
        }
      }

      const d = new Date(dateStr + 'T12:00:00');
      if (prevDate) {
        const diff = (d.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        if (Math.round(diff) === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      if (currentStreak > bestStreak) bestStreak = currentStreak;
      prevDate = d;
    }

    // Completion rate (last 30 days)
    const today = new Date();
    let completedLast30 = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = formatDate(d);
      if (isNumeric) {
        if ((habitValues.get(ds) ?? 0) >= target) completedLast30++;
      } else {
        if (habitCompletions.has(ds)) completedLast30++;
      }
    }
    const completionRate = Math.round((completedLast30 / 30) * 100);

    // Average value (numeric only)
    let avgValue = 0;
    if (isNumeric && totalEntries > 0) {
      let sum = 0;
      for (const [, val] of habitValues) {
        sum += val;
      }
      avgValue = sum / habitValues.size;
    }

    return { totalEntries, bestStreak, currentStreak: habit.streak, completionRate, avgValue };
  }, [habit, habitCompletions, habitValues]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerColorDot, { backgroundColor: habit.color }]} />
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: colors.text }]}>{habit.name}</Text>
          {habit.description ? (
            <Text style={[styles.headerDesc, { color: colors.secondaryText }]}>{habit.description}</Text>
          ) : null}
          {habit.type === 'numeric' && (
            <Text style={[styles.headerMeta, { color: colors.secondaryText }]}>
              Target: {habit.targetValue} {habit.unit}
            </Text>
          )}
        </View>
        <Pressable
          style={[styles.editBtn, { borderColor: colors.border }]}
          onPress={() => router.push({ pathname: '/edit-habit', params: { id: habit.id } })}
        >
          <Text style={[styles.editBtnText, { color: colors.tint }]}>Edit</Text>
        </Pressable>
      </View>

      {/* Stats cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: habit.color }]}>{stats.currentStreak}</Text>
          <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Current{'\n'}Streak</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: habit.color }]}>{stats.bestStreak}</Text>
          <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Best{'\n'}Streak</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: habit.color }]}>{stats.completionRate}%</Text>
          <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Last 30{'\n'}Days</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: habit.color }]}>{stats.totalEntries}</Text>
          <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Total{'\n'}Entries</Text>
        </View>
      </View>

      {/* Numeric average */}
      {habit.type === 'numeric' && stats.totalEntries > 0 && (
        <View style={[styles.avgCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.avgLabel, { color: colors.secondaryText }]}>Average</Text>
          <Text style={[styles.avgValue, { color: habit.color }]}>
            {stats.avgValue.toFixed(1)} {habit.unit}
          </Text>
        </View>
      )}

      {/* Calendar heatmap (last 6 months) */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>History</Text>
      <CalendarHeatmap
        habitColor={habit.color}
        completions={habitCompletions}
        values={habitValues}
        isNumeric={habit.type === 'numeric'}
        target={habit.targetValue ?? 1}
        colors={colors}
      />

      {/* Weekly breakdown */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Weekly Breakdown</Text>
      <WeeklyBreakdown
        habitColor={habit.color}
        completions={habitCompletions}
        values={habitValues}
        isNumeric={habit.type === 'numeric'}
        target={habit.targetValue ?? 1}
        colors={colors}
      />
    </ScrollView>
  );
}

// --- Calendar Heatmap (last ~6 months) ---
function CalendarHeatmap({
  habitColor,
  completions,
  values,
  isNumeric,
  target,
  colors,
}: {
  habitColor: string;
  completions: Set<string>;
  values: Map<string, number>;
  isNumeric: boolean;
  target: number;
  colors: any;
}) {
  const weeks = useMemo(() => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 182); // ~26 weeks
    // Align to Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const result: { date: string; level: number }[][] = [];
    let currentWeek: { date: string; level: number }[] = [];
    const d = new Date(startDate);

    while (d <= today) {
      const ds = formatDate(d);
      let level = 0;
      if (isNumeric) {
        const val = values.get(ds) ?? 0;
        if (val > 0) {
          level = val >= target ? 2 : 1;
        }
      } else {
        if (completions.has(ds)) level = 2;
      }

      currentWeek.push({ date: ds, level });

      if (d.getDay() === 6) { // Saturday = end of week
        result.push(currentWeek);
        currentWeek = [];
      }

      d.setDate(d.getDate() + 1);
    }
    if (currentWeek.length > 0) result.push(currentWeek);

    return result;
  }, [completions, values, isNumeric, target]);

  const width = weeks.length * (CELL_SIZE + CELL_GAP) + 20;
  const height = 7 * (CELL_SIZE + CELL_GAP) + 20;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={[styles.heatmapContainer, { backgroundColor: colors.card }]}>
        {/* Day labels */}
        <View style={styles.heatmapDayLabels}>
          {DAY_LABELS.map((label, i) => (
            <Text
              key={i}
              style={[styles.heatmapDayLabel, { color: colors.secondaryText }]}
            >
              {i % 2 === 0 ? '' : label}
            </Text>
          ))}
        </View>
        <Svg width={width} height={height}>
          {weeks.map((week, wi) =>
            week.map((day, di) => (
              <Rect
                key={day.date}
                x={wi * (CELL_SIZE + CELL_GAP)}
                y={di * (CELL_SIZE + CELL_GAP)}
                width={CELL_SIZE}
                height={CELL_SIZE}
                rx={2}
                fill={
                  day.level === 0
                    ? (colors.background)
                    : day.level === 1
                    ? habitColor + '60'
                    : habitColor
                }
              />
            ))
          )}
        </Svg>
      </View>
    </ScrollView>
  );
}

// --- Weekly Breakdown (completions by day of week) ---
function WeeklyBreakdown({
  habitColor,
  completions,
  values,
  isNumeric,
  target,
  colors,
}: {
  habitColor: string;
  completions: Set<string>;
  values: Map<string, number>;
  isNumeric: boolean;
  target: number;
  colors: any;
}) {
  const dayStats = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0]; // completions per day of week
    const totals = [0, 0, 0, 0, 0, 0, 0]; // total days per day of week (last 12 weeks)

    const today = new Date();
    for (let i = 0; i < 84; i++) { // 12 weeks
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = formatDate(d);
      const dow = d.getDay();
      totals[dow]++;
      if (isNumeric) {
        if ((values.get(ds) ?? 0) >= target) counts[dow]++;
      } else {
        if (completions.has(ds)) counts[dow]++;
      }
    }

    return DAY_LABELS.map((label, i) => ({
      label: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
      pct: totals[i] > 0 ? Math.round((counts[i] / totals[i]) * 100) : 0,
    }));
  }, [completions, values, isNumeric, target]);

  const maxPct = Math.max(...dayStats.map((d) => d.pct), 1);

  return (
    <View style={[styles.weeklyContainer, { backgroundColor: colors.card }]}>
      {dayStats.map((day) => (
        <View key={day.label} style={styles.weeklyRow}>
          <Text style={[styles.weeklyDayLabel, { color: colors.secondaryText }]}>{day.label}</Text>
          <View style={[styles.weeklyBarTrack, { backgroundColor: colors.background }]}>
            <View
              style={[
                styles.weeklyBarFill,
                {
                  backgroundColor: habitColor,
                  width: `${(day.pct / maxPct) * 100}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.weeklyPct, { color: colors.text }]}>{day.pct}%</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 22,
    fontWeight: '700',
  },
  headerDesc: {
    fontSize: 14,
    marginTop: 2,
  },
  headerMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  editBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  avgCard: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avgLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  avgValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  // Section title
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  // Heatmap
  heatmapContainer: {
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
  },
  heatmapDayLabels: {
    marginRight: 4,
    justifyContent: 'space-around',
  },
  heatmapDayLabel: {
    fontSize: 9,
    height: CELL_SIZE + CELL_GAP,
    lineHeight: CELL_SIZE + CELL_GAP,
  },
  // Weekly breakdown
  weeklyContainer: {
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  weeklyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weeklyDayLabel: {
    width: 32,
    fontSize: 13,
    fontWeight: '500',
  },
  weeklyBarTrack: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  weeklyBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  weeklyPct: {
    width: 36,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
});
