import type { ThemePreference } from '../types/settings';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceSecondary: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  accent: string;
  accentPressed: string;
  accentSoft: string;
  onAccent: string;
  danger: string;
  dangerSoft: string;
  success: string;
  warning: string;
  overlay: string;
  shimmer: string;
}

export const lightColors: ThemeColors = {
  background: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceSecondary: '#EDF0F4',
  text: '#101828',
  textSecondary: '#5A6472',
  textTertiary: '#98A2B3',
  border: '#E4E8EE',
  accent: '#2563EB',
  accentPressed: '#1E51C0',
  accentSoft: '#E8EFFD',
  onAccent: '#FFFFFF',
  danger: '#D92D20',
  dangerSoft: '#FDECEC',
  success: '#039855',
  warning: '#B54708',
  overlay: 'rgba(16,24,40,0.45)',
  shimmer: '#E4E8EE',
};

export const darkColors: ThemeColors = {
  background: '#0B0E13',
  surface: '#151A21',
  surfaceSecondary: '#1D242D',
  text: '#F0F3F7',
  textSecondary: '#A6AFBD',
  textTertiary: '#66707F',
  border: '#27303B',
  accent: '#4C86F8',
  accentPressed: '#3B6FD6',
  accentSoft: '#1B2A45',
  onAccent: '#FFFFFF',
  danger: '#F4695E',
  dangerSoft: '#3A1D1D',
  success: '#43C38A',
  warning: '#F0B35C',
  overlay: 'rgba(0,0,0,0.62)',
  shimmer: '#27303B',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radii = { sm: 10, md: 14, lg: 20, xl: 28, full: 999 } as const;

export const typography = {
  display: { fontSize: 30, lineHeight: 38, fontWeight: '700' as const },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
  heading: { fontSize: 17, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  micro: { fontSize: 11, lineHeight: 15, fontWeight: '600' as const },
} as const;

export interface Theme {
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  isDark: boolean;
}

export function resolveScheme(
  preference: ThemePreference,
  systemScheme: 'light' | 'dark' | null | 'unspecified' | undefined
): 'light' | 'dark' {
  if (preference === 'system') return systemScheme === 'dark' ? 'dark' : 'light';
  return preference;
}

export function buildTheme(scheme: 'light' | 'dark'): Theme {
  return {
    colors: scheme === 'dark' ? darkColors : lightColors,
    spacing,
    radii,
    typography,
    isDark: scheme === 'dark',
  };
}
