import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

interface BaseProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
}

interface PrimaryButtonProps extends BaseProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: keyof typeof Feather.glyphMap;
  size?: 'md' | 'lg';
}

const MIN_HEIGHT = 52;

export function AppButton({
  label,
  onPress,
  disabled,
  loading,
  icon,
  variant = 'primary',
  size = 'md',
  accessibilityLabel,
}: PrimaryButtonProps) {
  const { colors, radii, typography } = useTheme();
  const minHeight = size === 'lg' ? 56 : MIN_HEIGHT;

  const backgroundColor =
    variant === 'primary'
      ? colors.accent
      : variant === 'danger'
        ? colors.dangerSoft
        : variant === 'ghost'
          ? 'transparent'
          : colors.surfaceSecondary;
  const textColor =
    variant === 'primary' ? colors.onAccent : variant === 'danger' ? colors.danger : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor:
            pressed && variant === 'primary' ? colors.accentPressed : backgroundColor,
          borderRadius: radii.md,
          minHeight,
          opacity: disabled ? 0.45 : pressed && variant !== 'primary' ? 0.75 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.onAccent : colors.accent} />
      ) : (
        <View style={styles.contentRow}>
          {icon ? <Feather name={icon} size={20} color={textColor} /> : null}
          <Text style={[typography.bodyStrong, styles.label, { color: textColor }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  contentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  label: {
    flexShrink: 1,
  },
});
