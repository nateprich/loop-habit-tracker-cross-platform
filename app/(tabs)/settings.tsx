import { useState } from 'react';
import { StyleSheet, Pressable, Linking, Alert, Modal, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useHabits } from '@/context/HabitContext';
import { exportBackup, getBackupJson, importBackup } from '@/database/backup';

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
  const { archivedHabits, refresh } = useHabits();
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [exportJson, setExportJson] = useState('');
  const [importJson, setImportJson] = useState('');
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      const json = await getBackupJson();
      setExportJson(json);
      setShowExportModal(true);

      // Also write to file
      const path = await exportBackup();
      Alert.alert('Backup Created', `Saved to:\n${path}\n\nYou can also copy the JSON from the next screen.`);
    } catch (e: any) {
      Alert.alert('Export Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importJson.trim()) {
      Alert.alert('No Data', 'Please paste your backup JSON first.');
      return;
    }
    Alert.alert(
      'Restore Backup',
      'This will replace ALL current habits and history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const result = await importBackup(importJson);
              await refresh();
              setShowImportModal(false);
              setImportJson('');
              Alert.alert('Restored', `Imported ${result.habits} habits and ${result.completions} entries.`);
            } catch (e: any) {
              Alert.alert('Import Failed', e.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={[styles.sectionHeader, { color: colors.secondaryText }]}>Habits</Text>
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <SettingsRow
          label="Archived Habits"
          value={archivedHabits.length > 0 ? `${archivedHabits.length}` : ''}
          onPress={() => router.push('/archived-habits')}
          colors={colors}
        />
      </View>

      <Text style={[styles.sectionHeader, { color: colors.secondaryText }]}>Data</Text>
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <SettingsRow
          label="Export Backup"
          onPress={handleExport}
          colors={colors}
        />
        <SettingsRow
          label="Import Backup"
          onPress={() => setShowImportModal(true)}
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

      {/* Export modal — shows JSON for copying */}
      <Modal visible={showExportModal} animationType="slide" onRequestClose={() => setShowExportModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Backup JSON</Text>
            <Pressable onPress={() => setShowExportModal(false)}>
              <Text style={[styles.modalClose, { color: colors.tint }]}>Done</Text>
            </Pressable>
          </View>
          <Text style={[styles.modalHint, { color: colors.secondaryText }]}>
            Select all and copy this JSON to save your backup
          </Text>
          <TextInput
            style={[styles.jsonInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            value={exportJson}
            multiline
            editable={false}
            selectTextOnFocus
          />
        </View>
      </Modal>

      {/* Import modal — paste JSON to restore */}
      <Modal visible={showImportModal} animationType="slide" onRequestClose={() => setShowImportModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Restore Backup</Text>
            <Pressable onPress={() => { setShowImportModal(false); setImportJson(''); }}>
              <Text style={[styles.modalClose, { color: colors.tint }]}>Cancel</Text>
            </Pressable>
          </View>
          <Text style={[styles.modalHint, { color: colors.secondaryText }]}>
            Paste your backup JSON below
          </Text>
          <TextInput
            style={[styles.jsonInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            value={importJson}
            onChangeText={setImportJson}
            multiline
            placeholder='{"version":1, ...}'
            placeholderTextColor={colors.secondaryText}
          />
          <Pressable
            style={[styles.restoreBtn, { backgroundColor: colors.tint, opacity: loading ? 0.5 : 1 }]}
            onPress={handleImport}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.restoreBtnText}>Restore</Text>
            )}
          </Pressable>
        </View>
      </Modal>
    </ScrollView>
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
    marginBottom: 40,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  modalContainer: {
    flex: 1,
    padding: 16,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalClose: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalHint: {
    fontSize: 13,
    marginBottom: 12,
  },
  jsonInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 12,
    fontFamily: 'monospace',
    textAlignVertical: 'top',
  },
  restoreBtn: {
    marginTop: 12,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  restoreBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
