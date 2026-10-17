import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import type { ScanRecord } from '../types/scan';
import { formatScanDate } from '../utils/datetime';

interface ScanCardProps {
  scan: ScanRecord;
  onPress: () => void;
  onLongPress?: () => void;
  selectionMode?: boolean;
  selected?: boolean;
}

export function ScanCard({ scan, onPress, onLongPress, selectionMode, selected }: ScanCardProps) {
  const { colors, radii, typography, spacing } = useTheme();
  const displayText = (scan.editedText ?? scan.extractedText).trim();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Scan ${scan.title}, ${formatScanDate(scan.updatedAt)}`}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={selectionMode && !onLongPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: selected ? colors.accent : colors.border,
          borderRadius: radii.lg,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        accessible={false}
        style={[
          styles.thumbWrap,
          { backgroundColor: colors.surfaceSecondary, borderRadius: radii.md },
        ]}
      >
        {scan.thumbnailPath ? (
          <Image source={{ uri: scan.thumbnailPath }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Feather name="file-text" size={20} color={colors.textTertiary} />
        )}
      </View>
      <View style={[styles.textWrap, { gap: 2 }]}>
        <Text style={[typography.bodyStrong, { color: colors.text }]} numberOfLines={1}>
          {scan.title}
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
          {displayText.length > 0 ? displayText.replace(/\s+/g, ' ') : 'Empty scan'}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[typography.micro, { color: colors.textTertiary }]} numberOfLines={1}>
            {formatScanDate(scan.updatedAt)}
          </Text>
          <View style={[styles.dot, { backgroundColor: colors.textTertiary }]} />
          <Text style={[typography.micro, { color: colors.textTertiary }]}>
            {scan.wordCount} words
          </Text>
        </View>
      </View>
      {selectionMode ? (
        <View
          style={[
            styles.checkbox,
            {
              borderColor: selected ? colors.accent : colors.border,
              backgroundColor: selected ? colors.accent : 'transparent',
              borderRadius: radii.full,
            },
          ]}
        >
          {selected ? <Feather name="check" size={14} color={colors.onAccent} /> : null}
        </View>
      ) : (
        <Feather name="chevron-right" size={18} color={colors.textTertiary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  thumbWrap: {
    alignItems: 'center',
    height: 56,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 56,
  },
  textWrap: {
    flex: 1,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  dot: {
    borderRadius: 1.5,
    height: 3,
    opacity: 0.7,
    width: 3,
  },
  checkbox: {
    alignItems: 'center',
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
});
