import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Divider, RowItem, SectionHeader, SwitchRow } from '../components/Card';
import { ConfirmDialog } from '../components/Dialogs';
import { SegmentedControl } from '../components/SegmentedControl';
import { Screen } from '../components/Screen';
import { SUPPORTED_LANGUAGES } from '../constants/config';
import { getScansRepository } from '../services/database/repositoryProvider';
import { deleteScanFiles } from '../services/storage/fileStorage';
import { friendlyError } from '../types/errors';
import type { ThemePreference } from '../types/settings';
import { useSettings } from '../providers/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';

const VERSION = Constants.expoConfig?.version ?? '1.0.0';

export function SettingsScreen() {
  const { settings, update } = useSettings();
  const { colors, typography, spacing, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [clearDialogVisible, setClearDialogVisible] = useState(false);
  const [clearing, setClearing] = useState(false);

  const currentLanguage = SUPPORTED_LANGUAGES.find((l) => l.script === settings.script);

  const handleClearHistory = async () => {
    if (clearing) return;
    try {
      setClearing(true);
      const repository = await getScansRepository();
      const all = await repository.clear();
      for (const record of all) deleteScanFiles(record);
      Alert.alert('History cleared', `${all.length} scan${all.length === 1 ? '' : 's'} deleted.`);
    } catch (error) {
      const friendly = friendlyError(error);
      Alert.alert(friendly.title, friendly.hint);
    } finally {
      setClearing(false);
      setClearDialogVisible(false);
    }
  };

  return (
    <Screen>
      <View style={{ paddingTop: Math.max(insets.top, spacing.lg) }}>
        <Text style={[typography.display, styles.title, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxl, gap: spacing.xl, paddingTop: spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <SectionHeader title="Appearance" />
          <Card style={{ padding: spacing.md }}>
            <SegmentedControl<ThemePreference>
              accessibilityLabel="Theme"
              value={settings.theme}
              onChange={(value) => update({ theme: value })}
              options={[
                { value: 'system', label: 'System' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </Card>
        </View>

        <View>
          <SectionHeader title="Recognition" />
          <Card>
            <RowItem
              icon="globe"
              label="Recognition language"
              detail="Runs fully offline · models bundled"
              value={currentLanguage?.label ?? settings.script}
              onPress={() => setLanguageModalVisible(true)}
            />
          </Card>
        </View>

        <View>
          <SectionHeader title="Storage" />
          <Card>
            <SwitchRow
              label="Keep original images"
              detail="When off, the original photo is deleted after text extraction."
              value={settings.keepOriginals}
              onValueChange={(value) => update({ keepOriginals: value })}
            />
            <Divider inset={spacing.lg} />
            <RowItem
              icon="trash-2"
              label="Clear scan history"
              detail="Removes all scans and their images from this device."
              destructive
              onPress={() => setClearDialogVisible(true)}
            />
          </Card>
        </View>

        <View>
          <SectionHeader title="About" />
          <Card>
            <RowItem label="Version" value={VERSION} />
          </Card>
        </View>
      </ScrollView>

      <Modal
        visible={languageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
        accessibilityViewIsModal
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: colors.overlay, padding: spacing.xl }]}
          onPress={() => setLanguageModalVisible(false)}
        >
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.surface, borderRadius: radii.xl }]} onPress={() => undefined}>
            <Text style={[typography.title, { color: colors.text, padding: spacing.xl, paddingBottom: spacing.sm }]}>
              Recognition language
            </Text>
            {SUPPORTED_LANGUAGES.map((language) => {
              const selected = language.script === settings.script;
              return (
                <Pressable
                  key={language.script}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={language.label}
                  onPress={() => {
                    update({ script: language.script });
                    setLanguageModalVisible(false);
                  }}
                  style={({ pressed }) => [
                    styles.languageRow,
                    { opacity: pressed ? 0.6 : 1, paddingHorizontal: spacing.xl },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodyStrong, { color: selected ? colors.accent : colors.text }]}>
                      {language.label}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 2 }]} numberOfLines={2}>
                      {language.detail}
                    </Text>
                  </View>
                  {selected ? <Feather name="check" size={20} color={colors.accent} /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog
        visible={clearDialogVisible}
        title="Clear all scans?"
        message="Every saved scan, its images and its text will be permanently removed from this device."
        confirmLabel={clearing ? 'Deleting…' : 'Delete all'}
        destructive
        onConfirm={() => void handleClearHistory()}
        onCancel={() => setClearDialogVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  title: {},
  modalBackdrop: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  modalSheet: {
    alignSelf: 'stretch',
    maxWidth: 420,
    width: '100%',
  },
  languageRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingVertical: 12,
  },
});
