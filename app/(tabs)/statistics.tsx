import { useState } from 'react';
import { StyleSheet, ActivityIndicator, Pressable, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useHabits } from '@/context/HabitContext';
import { formatDate } from '@/database/completions';
import { exportHabitsToCSV } from '@/services/export';
import WeeklyChart from '@/components/WeeklyChart';
import HabitStreakList from '@/components/HabitStreakList';

export default function StatisticsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { habits, archivedHabits, completions, loading } = useHabits();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportHabitsToCSV();
    } catch (e: any) {
      Alert.alert('Export failed', e.message || 'Something went wrong');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  const totalHabits = habits.length;

  const todayStr = formatDate(new Date());
  const completedToday = habits.filter(
    (h) => completions.get(h.id)?.has(todayStr)
  ).length;
  const completionPct = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;

  const streakHabits = habits
    .map((h) => ({ name: h.name, color: h.color, streak: h.streak }))
    .sort((a, b) => b.streak - a.streak);
  const maxStreak = streakHabits.length > 0 ? streakHabits[0].streak : 0;

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
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
      <View style={[styles.summaryRow]}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.secondaryText }]}>
            Today
          </Text>
          <Text style={[styles.cardValue, { color: colors.tint }]}>{completionPct}%</Text>
          <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
            {completedToday}/{totalHabits}
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.secondaryText }]}>
            Best Streak
          </Text>
          <Text style={[styles.cardValue, { color: colors.tint }]}>
            {maxStreak > 0 ? `${maxStreak}` : '0'}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
            {maxStreak !== 1 ? 'days' : 'day'}
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.secondaryText }]}>
            Habits
          </Text>
          <Text style={[styles.cardValue, { color: colors.tint }]}>{totalHabits}</Text>
          <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
            tracked
          </Text>
        </View>
      </View>

      <WeeklyChart
        habits={habits}
        completions={completions}
        barColor={colors.tint}
        secondaryTextColor={colors.secondaryText}
        cardColor={colors.card}
      />

      <HabitStreakList
        habits={streakHabits}
        maxStreak={maxStreak}
        secondaryTextColor={colors.secondaryText}
        textColor={colors.text}
        cardColor={colors.card}
      />

      {archivedHabits.length > 0 && (
        <Pressable
          style={[styles.outlineButton, { borderColor: colors.border }]}
          onPress={() => router.push('/archived-habits')}
        >
          <Text style={[styles.outlineButtonText, { color: colors.text }]}>
            Archived Habits ({archivedHabits.length})
          </Text>
        </Pressable>
      )}

      <Pressable
        style={[styles.exportButton, { backgroundColor: colors.tint }]}
        onPress={handleExport}
        disabled={exporting}
      >
        <Text style={styles.exportButtonText}>
          {exporting ? 'Exporting...' : 'Export to CSV'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  exportButton: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  outlineButton: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  outlineButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
