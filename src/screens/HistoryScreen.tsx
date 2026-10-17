import React, { useCallback, useRef, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { ConfirmDialog } from '../components/Dialogs';
import { EmptyState } from '../components/EmptyState';
import { IconButton } from '../components/IconButton';
import { LoadingView } from '../components/LoadingView';
import { ScanCard } from '../components/ScanCard';
import { Screen } from '../components/Screen';
import { getScansRepository } from '../services/database/repositoryProvider';
import { deleteScanFiles } from '../services/storage/fileStorage';
import { friendlyError } from '../types/errors';
import type { ScanRecord } from '../types/scan';
import { useTheme } from '../theme/ThemeProvider';
import { useScans } from '../hooks/useScans';
import type { RootStackParamList } from '../navigation/types';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function HistoryScreen() {
  const navigation = useNavigation<Navigation>();
  const { colors, typography, spacing, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const { scans, loading, failed, refresh } = useScans(query);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteVisible, setDeleteVisible] = useState(false);
  const searchInputRef = useRef<TextInput | null>(null);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  }, []);

  const enterSelection = useCallback((id: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  }, []);

  const exitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const confirmDelete = useCallback(async () => {
    try {
      const repository = await getScansRepository();
      for (const id of selectedIds) {
        const record = await repository.remove(id);
        if (record) deleteScanFiles(record);
      }
    } catch (error) {
      const friendly = friendlyError(error);
      Alert.alert(friendly.title, friendly.hint);
    } finally {
      setDeleteVisible(false);
      exitSelection();
      void refresh();
    }
  }, [exitSelection, refresh, selectedIds]);

  const renderRow = useCallback(
    ({ item }: { item: ScanRecord }) => (
      <ScanCard
        scan={item}
        selectionMode={selectionMode}
        selected={selectedIds.has(item.id)}
        onPress={() =>
          selectionMode
            ? toggleSelected(item.id)
            : navigation.navigate('Result', { scanId: item.id, source: 'history' })
        }
        onLongPress={selectionMode ? () => toggleSelected(item.id) : () => enterSelection(item.id)}
      />
    ),
    [enterSelection, navigation, selectionMode, selectedIds, toggleSelected]
  );

  return (
    <Screen style={styles.screen} padded>
      <View style={{ paddingTop: Math.max(insets.top, spacing.lg) }}>
        {selectionMode ? (
          <View style={[styles.selectionBar, { marginTop: spacing.sm }]}>
            <IconButton icon="x" label="Cancel selection" onPress={exitSelection} />
            <Text style={[typography.heading, { color: colors.text, flex: 1 }]}>
              {selectedIds.size} selected
            </Text>
            <IconButton
              icon="trash-2"
              label={`Delete ${selectedIds.size} scans`}
              danger
              disabled={selectedIds.size === 0}
              onPress={() => setDeleteVisible(true)}
            />
          </View>
        ) : (
          <>
            <Text style={[typography.display, styles.title, { color: colors.text }]}>History</Text>
            <View
              style={[
                styles.searchWrap,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: radii.md,
                  marginTop: spacing.lg,
                  gap: spacing.sm,
                  paddingHorizontal: spacing.md,
                },
              ]}
            >
              <Feather name="search" size={18} color={colors.textTertiary} />
              <TextInput
                ref={searchInputRef}
                accessibilityLabel="Search scans"
                autoCorrect={false}
                onChangeText={setQuery}
                placeholder="Search titles and text"
                placeholderTextColor={colors.textTertiary}
                style={[typography.body, { color: colors.text, flex: 1, minHeight: 44 }]}
                value={query}
              />
              {query.length > 0 ? (
                <IconButton icon="x-circle" label="Clear search" onPress={() => setQuery('')} size={16} />
              ) : null}
            </View>
          </>
        )}
      </View>

      {loading ? (
        <LoadingView message="Loading scans…" />
      ) : scans.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon={query.trim() ? 'search' : 'clock'}
            title={query.trim() ? 'No matches' : 'No scans yet'}
            message={
              query.trim()
                ? `Nothing matches “${query.trim()}”.`
                : 'Scans you save will appear here so you can find them anytime.'
            }
          />
        </View>
      ) : (
        <FlatList
          data={scans}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl }}
          renderItem={renderRow}
        />
      )}

      <ConfirmDialog
        visible={deleteVisible}
        title="Delete scans?"
        message={`${selectedIds.size} scan${selectedIds.size === 1 ? '' : 's'} will be permanently removed from this device.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  title: {},
  selectionBar: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  searchWrap: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});

