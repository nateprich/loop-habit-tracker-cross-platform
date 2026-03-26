import { useState, useRef, useCallback } from 'react';
import { StyleSheet, FlatList, Pressable, ActivityIndicator, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useHabits } from '@/context/HabitContext';
import { getLastNDates } from '@/database/completions';
import { Habit } from '@/types/habit';

const VISIBLE_DAYS = 30;
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return WEEKDAY_LABELS[d.getDay()];
}

function getDateNum(dateStr: string): string {
  return dateStr.slice(8); // DD from YYYY-MM-DD
}

function isFirstOfMonth(dateStr: string): boolean {
  return dateStr.endsWith('-01');
}

function getMonthLabel(dateStr: string): string {
  const m = parseInt(dateStr.slice(5, 7), 10) - 1;
  return MONTH_LABELS[m];
}

// --- Colored circle checkmark (Loop-style) ---
const CIRCLE_SIZE = 32;
const CIRCLE_RADIUS = 13;
const CIRCLE_STROKE = 2.5;

function CheckmarkCell({
  filled,
  skipped,
  color,
  onPress,
  onLongPress,
}: {
  filled: boolean;
  skipped: boolean;
  color: string;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.8, { duration: 80 }),
      withSpring(1, { damping: 8, stiffness: 300 })
    );
    onPress();
  };

  return (
    <Pressable style={styles.checkCell} onPress={handlePress} onLongPress={onLongPress} delayLongPress={400}>
      <Animated.View style={[styles.checkCellInner, animatedStyle]}>
        <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={CIRCLE_RADIUS}
            stroke={skipped ? '#9E9E9E' : color + (filled ? 'FF' : '40')}
            strokeWidth={CIRCLE_STROKE}
            fill={skipped ? '#9E9E9E40' : filled ? color : 'transparent'}
          />
        </Svg>
        {filled && !skipped && (
          <Text style={styles.checkIcon}>✓</Text>
        )}
        {skipped && (
          <Text style={styles.skipIcon}>—</Text>
        )}
      </Animated.View>
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
        <Circle
          cx={CIRCLE_SIZE / 2}
          cy={CIRCLE_SIZE / 2}
          r={CIRCLE_RADIUS}
          stroke={color + '25'}
          strokeWidth={CIRCLE_STROKE}
          fill="transparent"
        />
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

// --- Date column header cell ---
function DateHeaderCell({ dateStr, colors }: { dateStr: string; colors: any }) {
  const dayLabel = getDayLabel(dateStr);
  const dateNum = getDateNum(dateStr);
  return (
    <View style={styles.dateHeaderCell}>
      <Text style={[styles.dayOfWeekLabel, { color: colors.secondaryText }]}>{dayLabel}</Text>
      <Text style={[styles.dateNumLabel, { color: colors.text }]}>{dateNum}</Text>
    </View>
  );
}

function HabitRow({
  habit,
  completedDates,
  skippedDates,
  valuesByDate,
  dates,
  onToggle,
  onNumericTap,
  onSkip,
  onLongPress,
  scrollRef,
}: {
  habit: Habit & { streak: number };
  completedDates: Set<string>;
  skippedDates: Set<string>;
  valuesByDate: Map<string, number>;
  dates: string[];
  onToggle: (habitId: string, date: string) => void;
  onNumericTap: (habitId: string, date: string, currentValue: number) => void;
  onSkip: (habitId: string, date: string) => void;
  onLongPress: (habit: Habit) => void;
  scrollRef: React.RefObject<ScrollView | null>;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const rowScrollRef = useRef<ScrollView>(null);

  return (
    <View style={[styles.habitRow, { borderBottomColor: colors.border }]}>
      <Pressable
        style={styles.habitInfoTouchable}
        onPress={() => router.push({ pathname: '/habit-detail', params: { id: habit.id } })}
        onLongPress={() => onLongPress(habit)}
        delayLongPress={400}
      >
        <View style={[styles.colorStrip, { backgroundColor: habit.color }]} />
        <View style={styles.habitInfo}>
          <Text style={styles.habitName} numberOfLines={1}>{habit.name}</Text>
          {habit.type === 'numeric' && habit.unit ? (
            <Text style={[styles.streakText, { color: colors.secondaryText }]} numberOfLines={1}>
              {habit.streak > 0 ? `${habit.streak}d · ` : ''}{habit.targetValue ?? '—'} {habit.unit}
            </Text>
          ) : (
            habit.streak > 0 && (
              <Text style={[styles.streakText, { color: colors.secondaryText }]}>
                {habit.streak}d streak
              </Text>
            )
          )}
        </View>
      </Pressable>
      <ScrollView
        ref={rowScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.checksScroll}
        onLayout={() => {
          // Scroll to end (most recent) on mount
          rowScrollRef.current?.scrollToEnd({ animated: false });
        }}
      >
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
              skipped={skippedDates.has(date)}
              color={habit.color}
              onPress={() => onToggle(habit.id, date)}
              onLongPress={() => onSkip(habit.id, date)}
            />
          )
        )}
      </ScrollView>
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

function ReorderRow({
  habit,
  index,
  total,
  onMoveUp,
  onMoveDown,
  colors,
}: {
  habit: Habit & { streak: number };
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  colors: typeof Colors.light;
}) {
  return (
    <View style={[styles.reorderRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.colorStrip, { backgroundColor: habit.color }]} />
      <Text style={[styles.reorderName, { color: colors.text }]} numberOfLines={1}>{habit.name}</Text>
      <View style={styles.reorderButtons}>
        <Pressable
          style={[styles.reorderArrow, index === 0 && styles.reorderArrowDisabled]}
          onPress={onMoveUp}
          disabled={index === 0}
        >
          <Text style={[styles.reorderArrowText, { color: index === 0 ? colors.border : colors.tint }]}>▲</Text>
        </Pressable>
        <Pressable
          style={[styles.reorderArrow, index === total - 1 && styles.reorderArrowDisabled]}
          onPress={onMoveDown}
          disabled={index === total - 1}
        >
          <Text style={[styles.reorderArrowText, { color: index === total - 1 ? colors.border : colors.tint }]}>▼</Text>
        </Pressable>
      </View>
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
            <Pressable
              style={[styles.modalBtn, { backgroundColor: colors.tint }]}
              onPress={() => {
                const num = parseFloat(text);
                onSave(isNaN(num) ? 0 : num);
              }}
            >
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
  const { habits, completions, completionValues, skippedDays, loading, toggleCompletion, skipDay, setNumericValue, archiveHabit, deleteHabit, reorderHabits } = useHabits();
  const dates = getLastNDates(VISIBLE_DAYS);
  const headerScrollRef = useRef<ScrollView>(null);
  const [reorderMode, setReorderMode] = useState(false);

  const moveHabit = useCallback((index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= habits.length) return;
    const ids = habits.map(h => h.id);
    [ids[index], ids[newIndex]] = [ids[newIndex], ids[index]];
    reorderHabits(ids);
  }, [habits, reorderHabits]);

  const [numericModal, setNumericModal] = useState<{
    habitId: string;
    habitName: string;
    unit: string;
    date: string;
    currentValue: number;
  } | null>(null);

  const handleLongPress = useCallback((habit: Habit) => {
    Alert.alert(
      habit.name,
      undefined,
      [
        {
          text: 'Edit',
          onPress: () => router.push({ pathname: '/edit-habit', params: { id: habit.id } }),
        },
        {
          text: 'Archive',
          onPress: () => archiveHabit(habit.id),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Habit',
              `Permanently delete "${habit.name}" and all its history?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteHabit(habit.id) },
              ]
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [archiveHabit, deleteHabit]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Reorder toggle */}
      {habits.length > 1 && (
        <View style={[styles.reorderBar, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => setReorderMode(!reorderMode)}>
            <Text style={[styles.reorderBtn, { color: colors.tint }]}>
              {reorderMode ? 'Done' : 'Reorder'}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Date header row */}
      {habits.length > 0 && !reorderMode && (
        <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
          <View style={styles.headerInfoPlaceholder} />
          <ScrollView
            ref={headerScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.checksScroll}
            scrollEnabled={false}
            onLayout={() => {
              headerScrollRef.current?.scrollToEnd({ animated: false });
            }}
          >
            {dates.map((date) => (
              <DateHeaderCell key={date} dateStr={date} colors={colors} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Habit list */}
      <FlatList
        data={habits}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) =>
          reorderMode ? (
            <ReorderRow
              habit={item}
              index={index}
              total={habits.length}
              onMoveUp={() => moveHabit(index, -1)}
              onMoveDown={() => moveHabit(index, 1)}
              colors={colors}
            />
          ) : (
            <HabitRow
              habit={item}
              completedDates={completions.get(item.id) ?? new Set()}
              skippedDates={skippedDays.get(item.id) ?? new Set()}
              valuesByDate={completionValues.get(item.id) ?? new Map()}
              dates={dates}
              onToggle={toggleCompletion}
              onSkip={skipDay}
              onLongPress={handleLongPress}
              onNumericTap={(habitId, date, currentValue) => {
                setNumericModal({
                  habitId,
                  habitName: item.name,
                  unit: item.unit,
                  date,
                  currentValue,
                });
              }}
              scrollRef={headerScrollRef}
            />
          )
        }
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

const CELL_WIDTH = CIRCLE_SIZE + 4; // 36px per column

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
  // Date header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerInfoPlaceholder: {
    width: 120,
  },
  dateHeaderCell: {
    width: CELL_WIDTH,
    alignItems: 'center',
    paddingVertical: 2,
  },
  dayOfWeekLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  dateNumLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Habit rows
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  habitInfoTouchable: {
    width: 120,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  colorStrip: {
    width: 4,
    height: '100%',
    minHeight: 40,
    borderRadius: 2,
    marginRight: 8,
  },
  habitInfo: {
    flex: 1,
    paddingRight: 4,
  },
  habitName: {
    fontSize: 14,
    fontWeight: '500',
  },
  streakText: {
    fontSize: 11,
    marginTop: 1,
  },
  checksScroll: {
    flexDirection: 'row',
    gap: 0,
  },
  checkCell: {
    width: CELL_WIDTH,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCellInner: {
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
  skipIcon: {
    position: 'absolute',
    color: '#9E9E9E',
    fontSize: 16,
    fontWeight: '700',
  },
  numericValue: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '700',
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
  reorderBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reorderBtn: {
    fontSize: 14,
    fontWeight: '600',
  },
  reorderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reorderName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    marginRight: 8,
  },
  reorderButtons: {
    flexDirection: 'row',
    gap: 4,
    marginRight: 12,
  },
  reorderArrow: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderArrowDisabled: {
    opacity: 0.3,
  },
  reorderArrowText: {
    fontSize: 16,
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
