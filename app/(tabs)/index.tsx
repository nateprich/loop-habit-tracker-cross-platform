import { StyleSheet, FlatList, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

// Sample data for initial UI — will be replaced with real storage later
const SAMPLE_HABITS = [
  { id: '1', name: 'Meditate', color: '#9C27B0', streak: 5 },
  { id: '2', name: 'Exercise', color: '#4CAF50', streak: 12 },
  { id: '3', name: 'Read', color: '#2196F3', streak: 3 },
  { id: '4', name: 'Drink water', color: '#009688', streak: 30 },
];

// Days of the week for the header
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function CheckmarkCell({ filled, color }: { filled: boolean; color: string }) {
  return (
    <View style={[styles.checkCell, filled && { backgroundColor: color + '30' }]}>
      {filled && <Text style={[styles.checkmark, { color }]}>✓</Text>}
    </View>
  );
}

function HabitRow({ habit }: { habit: typeof SAMPLE_HABITS[0] }) {
  // Generate mock last-7-days data
  const last7 = [true, true, false, true, true, true, false];

  return (
    <View style={styles.habitRow}>
      <View style={[styles.colorStrip, { backgroundColor: habit.color }]} />
      <View style={styles.habitInfo}>
        <Text style={styles.habitName}>{habit.name}</Text>
      </View>
      <View style={styles.checksContainer}>
        {last7.map((done, i) => (
          <CheckmarkCell key={i} filled={done} color={habit.color} />
        ))}
      </View>
    </View>
  );
}

export default function HabitsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <View style={styles.container}>
      {/* Weekday header */}
      <View style={styles.weekdayHeader}>
        <View style={styles.habitInfoPlaceholder} />
        <View style={styles.checksContainer}>
          {WEEKDAYS.map((day, i) => (
            <View key={i} style={styles.checkCell}>
              <Text style={[styles.weekdayLabel, { color: colors.secondaryText }]}>{day}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Habit list */}
      <FlatList
        data={SAMPLE_HABITS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <HabitRow habit={item} />}
        contentContainerStyle={styles.list}
      />

      {/* FAB */}
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
  list: {
    paddingBottom: 80,
  },
  weekdayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E7E0EC',
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
    borderBottomColor: '#E7E0EC',
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
    fontSize: 12,
    fontWeight: '600',
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
