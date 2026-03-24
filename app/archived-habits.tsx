import { StyleSheet, Pressable, Alert, FlatList } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useHabits } from '@/context/HabitContext';
import { Habit } from '@/types/habit';

function ArchivedRow({
  habit,
  onRestore,
  onDelete,
  colors,
}: {
  habit: Habit;
  onRestore: () => void;
  onDelete: () => void;
  colors: typeof Colors.light;
}) {
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.colorStrip, { backgroundColor: habit.color }]} />
      <View style={styles.info}>
        <Text style={styles.name}>{habit.name}</Text>
        {habit.archivedAt && (
          <Text style={[styles.date, { color: colors.secondaryText }]}>
            Archived {new Date(habit.archivedAt).toLocaleDateString()}
          </Text>
        )}
      </View>
      <Pressable style={[styles.actionBtn, { backgroundColor: colors.tint }]} onPress={onRestore}>
        <Text style={styles.actionBtnText}>Restore</Text>
      </Pressable>
      <Pressable style={[styles.actionBtn, { backgroundColor: colors.danger }]} onPress={onDelete}>
        <Text style={styles.actionBtnText}>Delete</Text>
      </Pressable>
    </View>
  );
}

export default function ArchivedHabitsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { archivedHabits, unarchiveHabit, deleteHabit } = useHabits();

  const confirmDelete = (habit: Habit) => {
    Alert.alert(
      'Permanently Delete',
      `Delete "${habit.name}" and all its history? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteHabit(habit.id) },
      ]
    );
  };

  if (archivedHabits.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
          No archived habits
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={archivedHabits}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <ArchivedRow
          habit={item}
          colors={colors}
          onRestore={() => unarchiveHabit(item.id)}
          onDelete={() => confirmDelete(item)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
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
  list: {
    paddingVertical: 8,
  },
  row: {
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
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
  },
  date: {
    fontSize: 12,
    marginTop: 2,
  },
  actionBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
