import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';

interface ScreenProps {
  children: React.ReactNode;
  style?: object;
  padded?: boolean;
}

export function Screen({ children, style, padded = true }: ScreenProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.background,
          paddingBottom: insets.bottom + spacing.lg,
          paddingHorizontal: padded ? spacing.lg : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

interface HeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function Header({ title, subtitle, right }: HeaderProps) {
  const { typography, spacing } = useTheme();
  return (
    <View style={[styles.header, { paddingTop: spacing.xl, marginBottom: spacing.xl, gap: right ? spacing.md : 0 }]}>
      <View style={{ flex: 1 }}>
        <Text style={[typography.display, styles.title]}>{title}</Text>
        {subtitle ? (
          <Text style={[typography.body, { marginTop: spacing.xs }]}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  title: {},
});
