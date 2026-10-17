import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';

type ToastTone = 'info' | 'success' | 'error';

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 2000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<ToastTone>('info');
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (nextMessage: string, nextTone: ToastTone = 'info') => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setMessage(nextMessage);
      setTone(nextTone);
      AccessibilityInfo.announceForAccessibility(nextMessage);
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() =>
          setMessage(null)
        );
      }, AUTO_DISMISS_MS);
    },
    [opacity]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      <View style={styles.flex}>
        {children}
        <ToastSurface message={message} tone={tone} opacity={opacity} />
      </View>
    </ToastContext.Provider>
  );
}

function ToastSurface({
  message,
  tone,
  opacity,
}: {
  message: string | null;
  tone: ToastTone;
  opacity: Animated.Value;
}) {
  const { colors, typography, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  if (!message) return null;

  const dotColor = tone === 'success' ? colors.success : tone === 'error' ? colors.danger : colors.accent;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        {
          backgroundColor: colors.text,
          borderRadius: radii.full,
          bottom: Math.max(insets.bottom, spacing.lg) + 64,
          opacity,
          paddingHorizontal: spacing.lg,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={[typography.caption, { color: colors.background }]} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  toast: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 10,
    maxWidth: '86%',
    paddingVertical: 12,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  dot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
});
