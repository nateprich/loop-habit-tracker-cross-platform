import { useState } from 'react';
import { StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { HABIT_COLORS, HabitColor } from '@/types/habit';
import { useHabits } from '@/context/HabitContext';

export default function EditHabitScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { id } = useLocalSearchParams<{ id: string }>();
  const { habits, updateHabit } = useHabits();

  const habit = habits.find((h) => h.id === id);

  const [name, setName] = useState(habit?.name ?? '');
  const [description, setDescription] = useState(habit?.description ?? '');
  const [selectedColor, setSelectedColor] = useState<HabitColor>(habit?.color ?? HABIT_COLORS[0]);
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>(
    habit?.frequency.type === 'weekly' ? 'weekly' : 'daily'
  );
  const [saving, setSaving] = useState(false);

  if (!habit) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: colors.secondaryText }}>Habit not found</Text>
      </View>
    );
  }

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await updateHabit(habit.id, {
        name: name.trim(),
        description: description.trim(),
        color: selectedColor,
        frequency: frequency === 'daily'
          ? { type: 'daily' }
          : { type: 'weekly', days: [1, 2, 3, 4, 5] },
      });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={[styles.input, {
          backgroundColor: colors.card,
          color: colors.text,
          borderColor: colors.border,
        }]}
        placeholder="Habit name"
        placeholderTextColor={colors.secondaryText}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea, {
          backgroundColor: colors.card,
          color: colors.text,
          borderColor: colors.border,
        }]}
        placeholder="Add details about this habit..."
        placeholderTextColor={colors.secondaryText}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />

      <Text style={styles.label}>Color</Text>
      <View style={styles.colorGrid}>
        {HABIT_COLORS.map((color) => (
          <Pressable
            key={color}
            style={[
              styles.colorCircle,
              { backgroundColor: color },
              selectedColor === color && styles.colorCircleSelected,
            ]}
            onPress={() => setSelectedColor(color)}
          />
        ))}
      </View>

      <Text style={styles.label}>Frequency</Text>
      <View style={styles.frequencyRow}>
        <Pressable
          style={[
            styles.frequencyOption,
            { borderColor: colors.border },
            frequency === 'daily' && { backgroundColor: colors.tint, borderColor: colors.tint },
          ]}
          onPress={() => setFrequency('daily')}
        >
          <Text style={[
            styles.frequencyText,
            frequency === 'daily' && styles.frequencyTextSelected,
          ]}>
            Every day
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.frequencyOption,
            { borderColor: colors.border },
            frequency === 'weekly' && { backgroundColor: colors.tint, borderColor: colors.tint },
          ]}
          onPress={() => setFrequency('weekly')}
        >
          <Text style={[
            styles.frequencyText,
            frequency === 'weekly' && styles.frequencyTextSelected,
          ]}>
            Specific days
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.saveButton, {
          backgroundColor: name.trim() ? colors.tint : colors.border,
        }]}
        onPress={handleSave}
        disabled={!name.trim() || saving}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
      </Pressable>
    </ScrollView>
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
    gap: 8,
    paddingBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 8,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  frequencyOption: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  frequencyText: {
    fontSize: 15,
    fontWeight: '500',
  },
  frequencyTextSelected: {
    color: '#fff',
  },
  saveButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
