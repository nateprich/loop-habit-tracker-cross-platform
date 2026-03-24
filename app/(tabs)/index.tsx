import { StyleSheet, FlatList, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useHabits } from '@/context/HabitContext';
import { getLast7Dates } from '@/database/completions';
import { Habit } from '@/types/habit';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekdayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return WEEKDAY_LABELS[d.getDay()];
}

function CheckmarkCell({
  filled,
  color,
  onPress,
}: {
  filled: boolean;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.checkCell, filled && { backgroundColor: color + '30' }]}
      onPress={onPress}
    >
      {filled && <Text style={[styles.checkmark, { color }]}>✓</Text>}
    </Pressable>
  );
}

function HabitRow({
  habit,
  completedDates,
  dates,
  onToggle,
  onEdit,
  onDelete,
}: {
  habit: Habit & { streak: number };
  completedDates: Set<string>;
  dates: string[];
  onToggle: (habitId: string, date: string) => void;
  onEdit: (habitId: string) => void;
  onDelete: (habitId: string, name: string) => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <Pressable
      onPress={() => onEdit(habit.id)}
      onLongPress={() => onDelete(habit.id, habit.name)}
      delayLongPress={500}
    >
      <View style={[styles.habitRow, { borderBottomColor: colors.border }]}>
        <View style={[styles.colorStrip, { backgroundColor: habit.color }]} />
        <View style={styles.habitInfo}>
          <Text style={styles.habitName}>{habit.name}</Text>
          {habit.streak > 0 && (
            <Text style={[styles.streakText, { color: colors.secondaryText }]}>
              {habit.streak}d streak
            </Text>
          )}
        </View>
        <View style={styles.checksContainer}>
          {dates.map((date) => (
            <CheckmarkCell
              key={date}
              filled={completedDates.has(date)}
              color={habit.color}
              onPress={() => onToggle(habit.id, date)}
            />
          ))}
        </View>
      </View>
    </Pressable>
  );
}

function EmptyState() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyTitle, { color: colors.secondaryText }]}>
        No habits yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.secondaryText }]}>
        Tap the + button to create your first habit
      </Text>
    </View>
  );
}

export default function HabitsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { habits, completions, loading, toggleCompletion, archiveHabit } = useHabits();

  const handleEdit = (habitId: string) => {
    router.push({ pathname: '/edit-habit', params: { id: habitId } });
  };

  const confirmArchive = (habitId: string, name: string) => {
    Alert.alert(
      'Archive Habit',
      `Archive "${name}"? It will be hidden but you can restore it later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', onPress: () => archiveHabit(habitId) },
      ]
    );
  };
  const dates = getLast7Dates();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {habits.length > 0 && (
        <View style={[styles.weekdayHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.habitInfoPlaceholder} />
          <View style={styles.checksContainer}>
            {dates.map((date) => (
              <View key={date} style={styles.checkCell}>
                <Text style={[styles.weekdayLabel, { color: colors.secondaryText }]}>
                  {getWeekdayLabel(date)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <FlatList
        data={habits}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <HabitRow
            habit={item}
            completedDates={completions.get(item.id) ?? new Set()}
            dates={dates}
            onToggle={toggleCompletion}
            onEdit={handleEdit}
            onDelete={confirmArchive}
          />
        )}
        contentContainerStyle={habits.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={EmptyState}
      />

      <Link href="/create-habit" asChild>
        <Pressable style={[styles.fab, { backgroundColor: colors.tint }]}>
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      </Link>
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
  list: {
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
  },
  weekdayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  habitInfoPlaceholder: {
    flex: 1,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  colorStrip: {
    width: 4,
    height: '100%',
    minHeight: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '500',
  },
  streakText: {
    fontSize: 12,
    marginTop: 2,
  },
  checksContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  checkCell: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 16,
    fontWeight: '700',
  },
  weekdayLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
});
