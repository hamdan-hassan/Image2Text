import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { AppButton } from '../../components/AppButton';
import { ConfirmDialog, TextInputDialog } from '../../components/Dialogs';
import { IconButton } from '../../components/IconButton';
import { LoadingView } from '../../components/LoadingView';
import { Screen } from '../../components/Screen';
import { useToast } from '../../components/Toast';
import { languageLabel } from '../../constants/config';
import { getScansRepository } from '../../services/database/repositoryProvider';
import { interstitialManager } from '../../services/ads/adService';
import { deleteScanFiles } from '../../services/storage/fileStorage';
import { shareText } from '../../services/storage/shareService';
import { formatScanDate } from '../../utils/datetime';
import { countCharacters, countWords } from '../../utils/textStats';
import { friendlyError } from '../../types/errors';
import type { ScanRecord } from '../../types/scan';
import { useTheme } from '../../theme/ThemeProvider';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import type { RootStackParamList } from '../../navigation/types';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function ResultScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<RouteProp<RootStackParamList, 'Result'>>();
  const { scanId, source } = route.params;
  const { colors, typography, spacing, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const fromHistory = source === 'history';

  /** Shows the interstitial after fresh scans (capped by the ad service), never from History. */
  const exitWithAds = useCallback(
    (navigate: () => void) => {
      if (!fromHistory) interstitialManager.maybeShow();
      navigate();
    },
    [fromHistory]
  );

  const [scan, setScan] = useState<ScanRecord | null>(null);
  const [text, setText] = useState('');
  const [failed, setFailed] = useState(false);
  const [renameVisible, setRenameVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const repository = await getScansRepository();
        const record = await repository.get(scanId);
        if (!record) throw new Error('scan missing');
        if (!mounted) return;
        setScan(record);
        setText(record.editedText ?? record.extractedText);
      } catch {
        if (mounted) setFailed(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [scanId]);

  const persistText = useCallback(
    async (value: string) => {
      try {
        const repository = await getScansRepository();
        await repository.updateEditedText(scanId, value === scan?.extractedText ? null : value, countWords(value), countCharacters(value));
      } catch {
        // autosave is best-effort; explicit Save surfaces errors
      }
    },
    [scan?.extractedText, scanId]
  );

  const debouncedSave = useDebouncedCallback((value: string) => void persistText(value), 700);

  const handleChangeText = useCallback(
    (value: string) => {
      setText(value);
      debouncedSave.schedule(value);
    },
    [debouncedSave]
  );

  const handleCopyAll = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(text);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      showToast('Text copied', 'success');
    } catch {
      showToast('Could not copy text', 'error');
    }
  }, [showToast, text]);

  const handleShare = useCallback(async () => {
    try {
      await shareText(text);
    } catch {
      showToast('Sharing was interrupted', 'error');
    }
  }, [showToast, text]);

  const flushAndConfirmSaved = useCallback(async () => {
    debouncedSave.flush(text);
    await persistText(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    showToast('Saved', 'success');
  }, [debouncedSave, persistText, showToast, text]);

  const handleRename = useCallback(
    async (title: string) => {
      setRenameVisible(false);
      if (!scan || title.trim().length === 0) return;
      try {
        const repository = await getScansRepository();
        await repository.rename(scan.id, title.trim());
        setScan({ ...scan, title: title.trim() });
      } catch (error) {
        const friendly = friendlyError(error);
        Alert.alert(friendly.title, friendly.hint);
      }
    },
    [scan]
  );

  const handleDelete = useCallback(async () => {
    setDeleteVisible(false);
    try {
      const repository = await getScansRepository();
      const removed = await repository.remove(scanId);
      if (removed) deleteScanFiles(removed);
      exitWithAds(() => navigation.popToTop());
    } catch (error) {
      const friendly = friendlyError(error);
      Alert.alert(friendly.title, friendly.hint);
    }
  }, [exitWithAds, navigation, scanId]);

  const stats = useMemo(
    () => ({ words: countWords(text), characters: countCharacters(text) }),
    [text]
  );

  if (failed) {
    return (
      <Screen style={styles.screen}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
          <Feather name="alert-circle" size={36} color={colors.textTertiary} />
          <Text style={[typography.heading, { color: colors.text }]}>Scan unavailable</Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
            This scan no longer exists on your device.
          </Text>
          <AppButton label="Back to Home" onPress={() => navigation.popToTop()} />
        </View>
      </Screen>
    );
  }

  if (!scan) {
    return <Screen style={styles.screen}><LoadingView fullScreen message="Opening scan…" /></Screen>;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <Screen style={styles.screen}>
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, spacing.md) }]}>
          <IconButton
            icon="x"
            label="Close scan"
            onPress={() => exitWithAds(() => navigation.goBack())}
          />
          <View style={{ flex: 1, alignItems: 'center' }}>
            {scan.thumbnailPath ? (
              <Image
                source={{ uri: scan.thumbnailPath }}
                style={styles.thumb}
                accessibilityLabel="Scan thumbnail"
              />
            ) : null}
            <PressableTitle title={scan.title} onPress={() => setRenameVisible(true)} />
            <Text style={[typography.micro, { color: colors.textTertiary }]} numberOfLines={1}>
              {formatScanDate(scan.createdAt)} · {languageLabel(scan.script)}
            </Text>
          </View>
          <IconButton icon="trash-2" label="Delete scan" danger onPress={() => setDeleteVisible(true)} />
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingVertical: spacing.lg,
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            accessibilityLabel="Extracted text editor"
            autoCorrect={false}
            multiline
            onChangeText={handleChangeText}
            placeholder="No text detected"
            placeholderTextColor={colors.textTertiary}
            selectionColor={colors.accent}
            style={[
              typography.body,
              styles.editor,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.lg,
                color: colors.text,
                padding: spacing.lg,
                textAlignVertical: 'top',
              },
            ]}
            value={text}
          />

          <View style={[styles.statsRow, { marginTop: spacing.md, gap: spacing.md }]}>
            <StatChip icon="calendar" label={formatScanDate(scan.updatedAt)} stretch />
            <StatChip icon="type" label={`${stats.words} words`} />
            <StatChip icon="hash" label={`${stats.characters} chars`} />
          </View>
        </ScrollView>

        <View
          style={[
            styles.actions,
            {
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
              gap: spacing.sm,
            },
          ]}
        >
          <View style={styles.actionRow}>
            <View style={{ flex: 1 }}>
              <AppButton label="Copy All" icon="copy" onPress={() => void handleCopyAll()} />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton label="Share" icon="share-2" variant="secondary" onPress={() => void handleShare()} />
            </View>
          </View>
          <View style={styles.actionRow}>
            <View style={{ flex: 1 }}>
              <AppButton label="Save" icon="save" variant="secondary" onPress={() => void flushAndConfirmSaved()} />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton
                label="New Scan"
                icon="plus"
                variant="ghost"
                onPress={() => exitWithAds(() => navigation.navigate('Tabs', { screen: 'Home' }))}
              />
            </View>
          </View>
        </View>

        <TextInputDialog
          visible={renameVisible}
          title="Rename scan"
          initialValue={scan.title}
          confirmLabel="Rename"
          onCancel={() => setRenameVisible(false)}
          onConfirm={(value) => void handleRename(value)}
        />
        <ConfirmDialog
          visible={deleteVisible}
          title="Delete this scan?"
          message="The extracted text and saved image will be permanently removed."
          confirmLabel="Delete"
          destructive
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleteVisible(false)}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

function PressableTitle({ title, onPress }: { title: string; onPress: () => void }) {
  const { typography, colors } = useTheme();
  return (
    <Text
      accessibilityRole="button"
      accessibilityHint="Renames this scan"
      onPress={onPress}
      style={[typography.heading, styles.title, { color: colors.text }]}
      numberOfLines={1}
    >
      {title} <Feather name="edit-2" size={13} color={colors.textTertiary} />
    </Text>
  );
}

function StatChip({ icon, label, stretch }: { icon: keyof typeof Feather.glyphMap; label: string; stretch?: boolean }) {
  const { colors, typography, spacing, radii } = useTheme();
  return (
    <View
      accessibilityRole="text"
      style={[
        styles.chip,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.full,
          gap: spacing.xs,
          paddingHorizontal: spacing.md,
          flex: stretch ? 1 : undefined,
        },
      ]}
    >
      <Feather name={icon} size={12} color={colors.textTertiary} />
      <Text style={[typography.micro, { color: colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  topBar: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  thumb: {
    alignSelf: 'center',
    borderRadius: 8,
    height: 40,
    marginBottom: 6,
    width: 40,
  },
  title: {},
  editor: {
    minHeight: 220,
  },
  statsRow: {
    flexDirection: 'row',
  },
  chip: {
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 30,
  },
  actions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
