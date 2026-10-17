jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
}));

import { parseSettings } from '../src/services/storage/settingsStore';
import { DEFAULT_SETTINGS } from '../src/types/settings';

describe('parseSettings', () => {
  it('returns defaults for missing or corrupt data', () => {
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('not json object')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(42)).toEqual(DEFAULT_SETTINGS);
  });

  it('accepts valid settings', () => {
    const parsed = parseSettings({ theme: 'dark', script: 'Korean', keepOriginals: false });
    expect(parsed).toEqual({ theme: 'dark', script: 'Korean', keepOriginals: false });
  });

  it('coerces invalid individual values while keeping valid ones', () => {
    const parsed = parseSettings({
      theme: 'neon',
      script: 'Klingon',
      keepOriginals: 'yes',
      extra: 'ignored',
    });
    expect(parsed).toEqual(DEFAULT_SETTINGS);
  });

  it('fills defaults per-field', () => {
    const parsed = parseSettings({ theme: 'light' });
    expect(parsed).toEqual({
      theme: 'light',
      script: DEFAULT_SETTINGS.script,
      keepOriginals: DEFAULT_SETTINGS.keepOriginals,
    });
  });
});
