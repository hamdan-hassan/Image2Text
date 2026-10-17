import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

interface EmptyStateProps {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  message: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = 'inbox', title, message, action }: EmptyStateProps) {
  const { colors, typography, spacing, radii } = useTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.full }]}>
        <Feather name={icon} size={26} color={colors.textTertiary} />
      </View>
      <Text style={[typography.heading, { color: colors.text, marginTop: spacing.lg, textAlign: 'center' }]}>
        {title}
      </Text>
      <Text
        style={[
          typography.body,
          { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center', maxWidth: 280 },
        ]}
      >
        {message}
      </Text>
      {action ? <View style={{ marginTop: spacing.xl }}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  iconWrap: {
    alignItems: 'center',
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
});
