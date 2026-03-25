import { useMemo } from 'react';
import { StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useHabits } from '@/context/HabitContext';
import { formatDate, getLastNDates } from '@/database/completions';

// --- Bar chart for weekly completion rates ---
function WeeklyCompletionChart({
  habits,
  completions,
  completionValues,
  colors,
}: {
  habits: { id: string; type: string; targetValue: number | null }[];
  completions: Map<string, Set<string>>;
  completionValues: Map<string, Map<string, number>>;
  colors: typeof Colors.light;
}) {
  const data = useMemo(() => {
    const last7 = getLastNDates(7);
    return last7.map((date) => {
      const total = habits.length;
      if (total === 0) return { date, pct: 0 };
      let done = 0;
      for (const h of habits) {
        if (!completions.get(h.id)?.has(date)) continue;
        if (h.type === 'numeric' && h.targetValue != null) {
          const val = completionValues.get(h.id)?.get(date) ?? 0;
          if (val >= h.targetValue) done++;
        } else {
          done++;
        }
      }
      return { date, pct: Math.round((done / total) * 100) };
    });
  }, [habits, completions, completionValues]);

  const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const chartW = 280;
  const chartH = 120;
  const barW = 28;
  const gap = (chartW - barW * 7) / 8;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={chartW} height={chartH + 28}>
        {data.map((d, i) => {
          const x = gap + i * (barW + gap);
          const barH = (d.pct / 100) * chartH;
          const dayIdx = new Date(d.date + 'T12:00:00').getDay();
          return (
            <React.Fragment key={d.date}>
              <Rect
                x={x}
                y={chartH - barH}
                width={barW}
                height={Math.max(barH, 2)}
                rx={4}
                fill={d.pct >= 80 ? colors.success : d.pct >= 50 ? colors.tint : colors.border}
              />
              {d.pct > 0 && (
                <SvgText
                  x={x + barW / 2}
                  y={chartH - barH - 4}
                  fontSize={10}
                  fill={colors.secondaryText}
                  textAnchor="middle"
                >
                  {d.pct}%
                </SvgText>
              )}
              <SvgText
                x={x + barW / 2}
                y={chartH + 16}
                fontSize={11}
                fill={colors.text}
                textAnchor="middle"
                fontWeight="500"
              >
                {DAYS[dayIdx]}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

// --- Score bar for each habit ---
function HabitScoreBar({
  name,
  score,
  color,
  colors,
}: {
  name: string;
  score: number;
  color: string;
  colors: typeof Colors.light;
}) {
  const barWidth = 180;
  const filled = (score / 100) * barWidth;
  return (
    <View style={scoreStyles.row}>
      <Text style={[scoreStyles.name, { color: colors.text }]} numberOfLines={1}>
        {name}
      </Text>
      <View style={scoreStyles.barContainer}>
        <Svg width={barWidth} height={12}>
          <Rect x={0} y={0} width={barWidth} height={12} rx={6} fill={colors.border} />
          <Rect x={0} y={0} width={Math.max(filled, 2)} height={12} rx={6} fill={color} />
        </Svg>
      </View>
      <Text style={[scoreStyles.pct, { color: colors.secondaryText }]}>{score}%</Text>
    </View>
  );
}

import React from 'react';

export default function StatisticsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { habits, completions, completionValues, loading } = useHabits();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  const totalHabits = habits.length;

  const bestStreakHabit = habits.reduce<{ name: string; streak: number } | null>(
    (best, h) => (!best || h.streak > best.streak ? { name: h.name, streak: h.streak } : best),
    null
  );

  const todayStr = formatDate(new Date());
  const completedToday = habits.filter((h) => {
    if (!completions.get(h.id)?.has(todayStr)) return false;
    if (h.type === 'numeric' && h.targetValue != null) {
      const val = completionValues.get(h.id)?.get(todayStr) ?? 0;
      return val >= h.targetValue;
    }
    return true;
  }).length;
  const completionPct = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;

  const avgScore = totalHabits > 0
    ? Math.round(habits.reduce((sum, h) => sum + h.score, 0) / totalHabits)
    : 0;

  if (totalHabits === 0) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
          Create some habits to see your statistics
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Summary cards */}
      <View style={styles.cardRow}>
        <View style={[styles.card, styles.cardHalf, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.secondaryText }]}>Today</Text>
          <Text style={[styles.cardValue, { color: colors.tint }]}>{completionPct}%</Text>
          <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
            {completedToday}/{totalHabits}
          </Text>
        </View>
        <View style={[styles.card, styles.cardHalf, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.secondaryText }]}>Overall Strength</Text>
          <Text style={[styles.cardValue, { color: avgScore >= 50 ? colors.success : colors.tint }]}>{avgScore}%</Text>
        </View>
      </View>

      <View style={styles.cardRow}>
        <View style={[styles.card, styles.cardHalf, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.secondaryText }]}>Best Streak</Text>
          <Text style={[styles.cardValue, { color: colors.tint }]}>
            {bestStreakHabit && bestStreakHabit.streak > 0
              ? `${bestStreakHabit.streak}d`
              : '—'}
          </Text>
          {bestStreakHabit && bestStreakHabit.streak > 0 && (
            <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]} numberOfLines={1}>
              {bestStreakHabit.name}
            </Text>
          )}
        </View>
        <View style={[styles.card, styles.cardHalf, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.secondaryText }]}>Total Habits</Text>
          <Text style={[styles.cardValue, { color: colors.tint }]}>{totalHabits}</Text>
        </View>
      </View>

      {/* Weekly chart */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Last 7 Days</Text>
        <WeeklyCompletionChart
          habits={habits}
          completions={completions}
          completionValues={completionValues}
          colors={colors}
        />
      </View>

      {/* Habit strength scores */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Habit Strength</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.secondaryText }]}>
          Based on consistency over the last 90 days
        </Text>
        {habits
          .sort((a, b) => b.score - a.score)
          .map((h) => (
            <HabitScoreBar
              key={h.id}
              name={h.name}
              score={h.score}
              color={h.color}
              colors={colors}
            />
          ))}
      </View>
    </ScrollView>
  );
}

const scoreStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  name: {
    width: 80,
    fontSize: 13,
    fontWeight: '500',
  },
  barContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  pct: {
    width: 36,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
  },
  cardHalf: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: 8,
  },
});
