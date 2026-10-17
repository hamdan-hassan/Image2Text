import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  const { colors, radii } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radii.lg }, style]}>
      {children}
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[typography.caption, { color: colors.textTertiary, marginLeft: spacing.xs }]}>
        {title.toUpperCase()}
      </Text>
      {action}
    </View>
  );
}

interface RowItemProps {
  label: string;
  detail?: string;
  icon?: keyof typeof Feather.glyphMap;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  right?: React.ReactNode;
  accessibilityLabel?: string;
}

export function RowItem({ label, detail, icon, value, onPress, destructive, right, accessibilityLabel }: RowItemProps) {
  const { colors, typography, spacing, radii } = useTheme();
  const color = destructive ? colors.danger : colors.text;

  const content = (
    <>
      {icon ? <Feather name={icon} size={20} color={color} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={[typography.bodyStrong, { color }]} numberOfLines={1}>
          {label}
        </Text>
        {detail ? (
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>{detail}</Text>
        ) : null}
      </View>
      {value ? (
        <Text style={[typography.body, { color: colors.textSecondary }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {right ?? (onPress ? <Feather name="chevron-right" size={18} color={colors.textTertiary} /> : null)}
    </>
  );

  if (!onPress) {
    return (
      <View style={[styles.row, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md }]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          gap: spacing.md,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      {content}
    </Pressable>
  );
}

export function Divider({ inset = 56 }: { inset?: number }) {
  const { colors, spacing } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginStart: inset, marginVertical: spacing.xs }} />;
}

interface SwitchRowProps {
  label: string;
  detail?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function SwitchRow({ label, detail, value, onValueChange }: SwitchRowProps) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View
      style={[
        styles.row,
        { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[typography.bodyStrong, { color: colors.text }]}>{label}</Text>
        {detail ? (
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>{detail}</Text>
        ) : null}
      </View>
      <Switch
        accessibilityRole="switch"
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.surfaceSecondary, true: colors.accent }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 52,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
});
