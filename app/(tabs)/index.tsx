import { useState } from 'react';
import { StyleSheet, FlatList, Pressable, ActivityIndicator, Modal, TextInput } from 'react-native';
import { Link } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
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

// --- Colored circle checkmark (Loop-style) ---
const CIRCLE_SIZE = 32;
const CIRCLE_RADIUS = 13;
const CIRCLE_STROKE = 2.5;
const CHECK_ICON = '✓';

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
    <Pressable style={styles.checkCell} onPress={onPress}>
      <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
        {/* Background ring (always visible) */}
        <Circle
          cx={CIRCLE_SIZE / 2}
          cy={CIRCLE_SIZE / 2}
          r={CIRCLE_RADIUS}
          stroke={color + (filled ? 'FF' : '40')}
          strokeWidth={CIRCLE_STROKE}
          fill={filled ? color : 'transparent'}
        />
      </Svg>
      {filled && (
        <Text style={styles.checkIcon}>✓</Text>
      )}
    </Pressable>
  );
}

// --- Progress ring for numeric habits ---
const RING_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

function NumericCell({
  value,
  target,
  color,
  onPress,
}: {
  value: number;
  target: number | null;
  color: string;
  onPress: () => void;
}) {
  const met = target ? value >= target : value > 0;
  const progress = target && target > 0 ? Math.min(value / target, 1) : (value > 0 ? 1 : 0);
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <Pressable style={styles.checkCell} onPress={onPress}>
      <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
        {/* Background ring track */}
        <Circle
          cx={CIRCLE_SIZE / 2}
          cy={CIRCLE_SIZE / 2}
          r={CIRCLE_RADIUS}
          stroke={color + '25'}
          strokeWidth={CIRCLE_STROKE}
          fill="transparent"
        />
        {/* Progress arc */}
        {value > 0 && (
          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={CIRCLE_RADIUS}
            stroke={color}
            strokeWidth={CIRCLE_STROKE}
            fill={met ? color : 'transparent'}
            strokeDasharray={`${RING_CIRCUMFERENCE}`}
            strokeDashoffset={met ? 0 : strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
          />
        )}
      </Svg>
      {value > 0 && (
        <Text style={[styles.numericValue, { color: met ? '#fff' : color }]}>
          {value % 1 === 0 ? value.toString() : value.toFixed(1)}
        </Text>
      )}
    </Pressable>
  );
}

function HabitRow({
  habit,
  completedDates,
  valuesByDate,
  dates,
  onToggle,
  onNumericTap,
}: {
  habit: Habit & { streak: number };
  completedDates: Set<string>;
  valuesByDate: Map<string, number>;
  dates: string[];
  onToggle: (habitId: string, date: string) => void;
  onNumericTap: (habitId: string, date: string, currentValue: number) => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.habitRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.colorStrip, { backgroundColor: habit.color }]} />
      <View style={styles.habitInfo}>
        <Text style={styles.habitName}>{habit.name}</Text>
        {habit.type === 'numeric' && habit.unit ? (
          <Text style={[styles.streakText, { color: colors.secondaryText }]}>
            {habit.streak > 0 ? `${habit.streak}d streak · ` : ''}{habit.targetValue ?? '—'} {habit.unit}
          </Text>
        ) : (
          habit.streak > 0 && (
            <Text style={[styles.streakText, { color: colors.secondaryText }]}>
              {habit.streak}d streak
            </Text>
          )
        )}
      </View>
      <View style={styles.checksContainer}>
        {dates.map((date) =>
          habit.type === 'numeric' ? (
            <NumericCell
              key={date}
              value={valuesByDate.get(date) ?? 0}
              target={habit.targetValue}
              color={habit.color}
              onPress={() => onNumericTap(habit.id, date, valuesByDate.get(date) ?? 0)}
            />
          ) : (
            <CheckmarkCell
              key={date}
              filled={completedDates.has(date)}
              color={habit.color}
              onPress={() => onToggle(habit.id, date)}
            />
          )
        )}
      </View>
    </View>
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

function NumericInputModal({
  visible,
  habitName,
  unit,
  currentValue,
  onSave,
  onCancel,
}: {
  visible: boolean;
  habitName: string;
  unit: string;
  currentValue: number;
  onSave: (value: number) => void;
  onCancel: () => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const [text, setText] = useState(currentValue > 0 ? String(currentValue) : '');

  const handleSave = () => {
    const num = parseFloat(text);
    onSave(isNaN(num) ? 0 : num);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.modalOverlay} onPress={onCancel}>
        <Pressable style={[styles.modalContent, { backgroundColor: colors.card }]} onPress={() => {}}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>{habitName}</Text>
          <View style={styles.modalInputRow}>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={text}
              onChangeText={setText}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.secondaryText}
              autoFocus
              selectTextOnFocus
            />
            {unit ? <Text style={[styles.modalUnit, { color: colors.secondaryText }]}>{unit}</Text> : null}
          </View>
          <View style={styles.modalButtons}>
            <Pressable style={[styles.modalBtn, { borderColor: colors.border }]} onPress={onCancel}>
              <Text style={{ color: colors.text }}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.modalBtn, { backgroundColor: colors.tint }]} onPress={handleSave}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>Save</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function HabitsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { habits, completions, completionValues, loading, toggleCompletion, setNumericValue } = useHabits();
  const dates = getLast7Dates();

  const [numericModal, setNumericModal] = useState<{
    habitId: string;
    habitName: string;
    unit: string;
    date: string;
    currentValue: number;
  } | null>(null);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Weekday header */}
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

      {/* Habit list */}
      <FlatList
        data={habits}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <HabitRow
            habit={item}
            completedDates={completions.get(item.id) ?? new Set()}
            valuesByDate={completionValues.get(item.id) ?? new Map()}
            dates={dates}
            onToggle={toggleCompletion}
            onNumericTap={(habitId, date, currentValue) => {
              setNumericModal({
                habitId,
                habitName: item.name,
                unit: item.unit,
                date,
                currentValue,
              });
            }}
          />
        )}
        contentContainerStyle={habits.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={EmptyState}
      />

      {/* Numeric input modal */}
      {numericModal && (
        <NumericInputModal
          visible
          habitName={numericModal.habitName}
          unit={numericModal.unit}
          currentValue={numericModal.currentValue}
          onSave={(value) => {
            setNumericValue(numericModal.habitId, numericModal.date, value);
            setNumericModal(null);
          }}
          onCancel={() => setNumericModal(null)}
        />
      )}

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
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    position: 'absolute',
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  numericValue: {
    position: 'absolute',
    fontSize: 10,
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
  // Numeric input modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    width: 280,
    borderRadius: 16,
    padding: 24,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalUnit: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: 12,
    alignItems: 'center',
  },
});
