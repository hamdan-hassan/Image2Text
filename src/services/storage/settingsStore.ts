import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RecognitionScript } from '../../types/ocr';
import { DEFAULT_SETTINGS, type AppSettings, type ThemePreference } from '../../types/settings';

const SETTINGS_KEY = 'i2t.settings.v1';

const SCRIPTS: RecognitionScript[] = ['Latin', 'Chinese', 'Devanagari', 'Japanese', 'Korean'];
const THEMES: ThemePreference[] = ['system', 'light', 'dark'];

function pick<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return typeof value === 'string' && (allowed as string[]).includes(value) ? (value as T) : fallback;
}

/** Pure normalizer: coerces untrusted stored JSON into valid settings. */
export function parseSettings(raw: unknown): AppSettings {
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_SETTINGS };
  const obj = raw as Record<string, unknown>;
  return {
    theme: pick(obj.theme, THEMES, DEFAULT_SETTINGS.theme),
    script: pick(obj.script, SCRIPTS, DEFAULT_SETTINGS.script),
    keepOriginals: typeof obj.keepOriginals === 'boolean' ? obj.keepOriginals : DEFAULT_SETTINGS.keepOriginals,
  };
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw === null) return { ...DEFAULT_SETTINGS };
    return parseSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
