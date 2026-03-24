import { useState } from 'react';
import { StyleSheet, TextInput, Pressable, ScrollView, Switch, Platform } from 'react-native';
import { router } from 'expo-router';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { HABIT_COLORS, HabitColor } from '@/types/habit';
import { useHabits } from '@/context/HabitContext';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}

function toTimeString(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export default function CreateHabitScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { createHabit } = useHabits();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState<HabitColor>(HABIT_COLORS[0]);
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState(8);
  const [reminderMinute, setReminderMinute] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const reminderTime = reminderEnabled ? toTimeString(reminderHour, reminderMinute) : null;
      await createHabit(
        name.trim(),
        description.trim(),
        selectedColor,
        frequency === 'daily' ? { type: 'daily' } : { type: 'weekly', days: [1, 2, 3, 4, 5] },
        reminderTime
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

      <Text style={styles.label}>Reminder</Text>
      <View style={[styles.reminderToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.reminderToggleText, { color: colors.text }]}>
          Daily reminder
        </Text>
        <Switch
          value={reminderEnabled}
          onValueChange={setReminderEnabled}
          trackColor={{ false: colors.border, true: colors.tint + '80' }}
          thumbColor={reminderEnabled ? colors.tint : '#f4f3f4'}
        />
      </View>

      {reminderEnabled && (
        <View style={styles.timePickerContainer}>
          <View style={styles.timePickerRow}>
            <View style={styles.timePickerColumn}>
              <Text style={[styles.timePickerLabel, { color: colors.secondaryText }]}>Hour</Text>
              <ScrollView style={[styles.timePickerScroll, { backgroundColor: colors.card, borderColor: colors.border }]} nestedScrollEnabled>
                {HOURS.map((h) => (
                  <Pressable
                    key={h}
                    style={[
                      styles.timePickerItem,
                      reminderHour === h && { backgroundColor: colors.tint },
                    ]}
                    onPress={() => setReminderHour(h)}
                  >
                    <Text style={[
                      styles.timePickerItemText,
                      { color: colors.text },
                      reminderHour === h && { color: '#fff', fontWeight: '700' },
                    ]}>
                      {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <View style={styles.timePickerColumn}>
              <Text style={[styles.timePickerLabel, { color: colors.secondaryText }]}>Minute</Text>
              <ScrollView style={[styles.timePickerScroll, { backgroundColor: colors.card, borderColor: colors.border }]} nestedScrollEnabled>
                {MINUTES.map((m) => (
                  <Pressable
                    key={m}
                    style={[
                      styles.timePickerItem,
                      reminderMinute === m && { backgroundColor: colors.tint },
                    ]}
                    onPress={() => setReminderMinute(m)}
                  >
                    <Text style={[
                      styles.timePickerItemText,
                      { color: colors.text },
                      reminderMinute === m && { color: '#fff', fontWeight: '700' },
                    ]}>
                      :{String(m).padStart(2, '0')}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
          <Text style={[styles.selectedTime, { color: colors.tint }]}>
            Reminder at {formatTime(reminderHour, reminderMinute)}
          </Text>
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
  reminderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  reminderToggleText: {
    fontSize: 15,
    fontWeight: '500',
  },
  timePickerContainer: {
    marginTop: 8,
  },
  timePickerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timePickerColumn: {
    flex: 1,
  },
  timePickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  timePickerScroll: {
    height: 150,
    borderWidth: 1,
    borderRadius: 8,
  },
  timePickerItem: {
    padding: 10,
    alignItems: 'center',
    borderRadius: 4,
    marginHorizontal: 4,
    marginVertical: 1,
  },
  timePickerItemText: {
    fontSize: 15,
  },
  selectedTime: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
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
