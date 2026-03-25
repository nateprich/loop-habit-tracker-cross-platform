import { StyleSheet, Pressable, Linking } from 'react-native';
import { router } from 'expo-router';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useHabits } from '@/context/HabitContext';

function SettingsRow({
  label,
  value,
  onPress,
  colors,
  danger,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  colors: typeof Colors.light;
  danger?: boolean;
}) {
  return (
    <Pressable
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
      {value !== undefined && (
        <Text style={[styles.rowValue, { color: colors.secondaryText }]}>{value}</Text>
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { archivedHabits } = useHabits();

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionHeader, { color: colors.secondaryText }]}>Habits</Text>
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <SettingsRow
          label="Archived Habits"
          value={archivedHabits.length > 0 ? `${archivedHabits.length}` : ''}
          onPress={() => router.push('/archived-habits')}
          colors={colors}
        />
      </View>

      <Text style={[styles.sectionHeader, { color: colors.secondaryText }]}>Appearance</Text>
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <SettingsRow
          label="Theme"
          value={colorScheme === 'dark' ? 'Dark' : 'Light'}
          colors={colors}
        />
      </View>

      <Text style={[styles.sectionHeader, { color: colors.secondaryText }]}>About</Text>
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <SettingsRow
          label="Version"
          value="1.0.0"
          colors={colors}
        />
        <SettingsRow
          label="Source Code"
          onPress={() => Linking.openURL('https://github.com/nateprich/loop-habit-tracker-cross-platform')}
          colors={colors}
        />
        <SettingsRow
          label="Original Loop Habit Tracker"
          onPress={() => Linking.openURL('https://github.com/iSoron/uhabits')}
          colors={colors}
        />
      </View>

      <Text style={[styles.footer, { color: colors.secondaryText }]}>
        Inspired by Loop Habit Tracker by iSoron.{'\n'}Licensed under GPLv3.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 6,
    marginLeft: 16,
  },
  section: {
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    fontSize: 16,
  },
  rowValue: {
    fontSize: 15,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 32,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
});
