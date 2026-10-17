import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface LoadingViewProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingView({ message = 'Loading…', fullScreen }: LoadingViewProps) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]} accessibilityRole="progressbar" accessibilityLabel={message}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.md }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  fullScreen: {
    flex: 1,
  },
});
