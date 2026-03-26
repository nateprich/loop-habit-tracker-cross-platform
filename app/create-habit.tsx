import { useState } from 'react';
import { StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { HABIT_COLORS, HabitColor, HabitType } from '@/types/habit';
import { useHabits } from '@/context/HabitContext';

export default function CreateHabitScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { createHabit } = useHabits();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState<HabitColor>(HABIT_COLORS[0]);
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [habitType, setHabitType] = useState<HabitType>('boolean');
  const [targetValue, setTargetValue] = useState('');
  const [unit, setUnit] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const parsedTarget = parseFloat(targetValue);
      await createHabit(
        name.trim(),
        description.trim(),
        selectedColor,
        frequency === 'daily' ? { type: 'daily' } : { type: 'weekly', days: selectedDays },
        habitType,
        habitType === 'numeric' && !isNaN(parsedTarget) ? parsedTarget : null,
        habitType === 'numeric' ? unit.trim() : ''
      );
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
        placeholder="e.g., Meditate, Exercise, Read"
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

      <Text style={styles.label}>Type</Text>
      <View style={styles.frequencyRow}>
        <Pressable
          style={[
            styles.frequencyOption,
            { borderColor: colors.border },
            habitType === 'boolean' && { backgroundColor: colors.tint, borderColor: colors.tint },
          ]}
          onPress={() => setHabitType('boolean')}
        >
          <Text style={[
            styles.frequencyText,
            habitType === 'boolean' && styles.frequencyTextSelected,
          ]}>
            Yes/No
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.frequencyOption,
            { borderColor: colors.border },
            habitType === 'numeric' && { backgroundColor: colors.tint, borderColor: colors.tint },
          ]}
          onPress={() => setHabitType('numeric')}
        >
          <Text style={[
            styles.frequencyText,
            habitType === 'numeric' && styles.frequencyTextSelected,
          ]}>
            Measurable
          </Text>
        </Pressable>
      </View>

      {habitType === 'numeric' && (
        <View style={styles.numericFields}>
          <View style={styles.numericRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Target</Text>
              <TextInput
                style={[styles.input, {
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                placeholder="e.g., 8"
                placeholderTextColor={colors.secondaryText}
                value={targetValue}
                onChangeText={setTargetValue}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Unit</Text>
              <TextInput
                style={[styles.input, {
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                placeholder="e.g., glasses"
                placeholderTextColor={colors.secondaryText}
                value={unit}
                onChangeText={setUnit}
              />
            </View>
          </View>
        </View>
      )}

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

      {frequency === 'weekly' && (
        <View style={styles.dayPickerRow}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => {
            const isSelected = selectedDays.includes(index);
            return (
              <Pressable
                key={index}
                style={[
                  styles.dayCircle,
                  { borderColor: colors.border },
                  isSelected && { backgroundColor: colors.tint, borderColor: colors.tint },
                ]}
                onPress={() => {
                  setSelectedDays((prev) =>
                    prev.includes(index)
                      ? prev.filter((d) => d !== index)
                      : [...prev, index].sort()
                  );
                }}
              >
                <Text style={[
                  styles.dayText,
                  { color: colors.text },
                  isSelected && { color: '#fff' },
                ]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Pressable
        style={[styles.saveButton, {
          backgroundColor: name.trim() ? colors.tint : colors.border,
        }]}
        onPress={handleSave}
        disabled={!name.trim() || saving}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 8,
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
    gap: 10,
    paddingVertical: 8,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  dayPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 6,
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
  },
  numericFields: {
    marginTop: 4,
  },
  numericRow: {
    flexDirection: 'row',
    gap: 12,
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
