import type { RecognitionScript } from './ocr';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface AppSettings {
  theme: ThemePreference;
  script: RecognitionScript;
  keepOriginals: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  script: 'Latin',
  keepOriginals: true,
};
