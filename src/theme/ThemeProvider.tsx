import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import type { ThemePreference } from '../types/settings';
import { buildTheme, resolveScheme, type Theme } from './tokens';

interface ThemeContextValue extends Theme {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  /** Controlled by app settings; 'system' follows the OS appearance. */
  preference: ThemePreference;
  onPreferenceChange?: (preference: ThemePreference) => void;
  children: React.ReactNode;
}

export function ThemeProvider({ preference, onPreferenceChange, children }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const scheme = resolveScheme(preference, systemScheme);

  const value = useMemo<ThemeContextValue>(
    () => ({
      ...buildTheme(scheme),
      preference,
      setPreference: (next) => onPreferenceChange?.(next),
    }),
    [scheme, preference, onPreferenceChange]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme & { preference: ThemePreference; setPreference: (p: ThemePreference) => void } {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
