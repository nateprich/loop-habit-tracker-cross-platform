import { StyleSheet, ActivityIndicator } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useHabits } from '@/context/HabitContext';
import { formatDate } from '@/database/completions';

export default function StatisticsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { habits, completions, loading } = useHabits();

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
  const completedToday = habits.filter(
    (h) => completions.get(h.id)?.has(todayStr)
  ).length;
  const completionPct = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;

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
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.secondaryText }]}>
          Total Habits
        </Text>
        <Text style={[styles.cardValue, { color: colors.tint }]}>{totalHabits}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.secondaryText }]}>
          Current Best Streak
        </Text>
        <Text style={[styles.cardValue, { color: colors.tint }]}>
          {bestStreakHabit && bestStreakHabit.streak > 0
            ? `${bestStreakHabit.streak} day${bestStreakHabit.streak !== 1 ? 's' : ''}`
            : 'No streaks yet'}
        </Text>
        {bestStreakHabit && bestStreakHabit.streak > 0 && (
          <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
            {bestStreakHabit.name}
          </Text>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.secondaryText }]}>
          Today's Completion
        </Text>
        <Text style={[styles.cardValue, { color: colors.tint }]}>{completionPct}%</Text>
        <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
          {completedToday} of {totalHabits} habit{totalHabits !== 1 ? 's' : ''}
        </Text>
      </View>

      <Text style={[styles.placeholder, { color: colors.secondaryText }]}>
        Detailed charts and history coming soon
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
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
  card: {
    borderRadius: 12,
    padding: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  placeholder: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 14,
    fontStyle: 'italic',
  },
});
