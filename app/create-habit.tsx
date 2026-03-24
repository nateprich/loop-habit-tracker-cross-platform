import { useState } from 'react';
import { StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { HABIT_COLORS, HabitColor } from '@/types/habit';

export default function CreateHabitScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState<HabitColor>(HABIT_COLORS[0]);
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');

  const handleSave = () => {
    // TODO: Save to storage
    router.back();
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

      <Pressable
        style={[styles.saveButton, {
          backgroundColor: name.trim() ? colors.tint : colors.border,
        }]}
        onPress={handleSave}
        disabled={!name.trim()}
      >
        <Text style={styles.saveButtonText}>Save</Text>
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
