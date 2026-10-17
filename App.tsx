import React, { useCallback, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SettingsProvider, useSettings } from './src/providers/SettingsProvider';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { ToastProvider } from './src/components/Toast';
import { clearStaleTempFiles } from './src/services/storage/fileStorage';
import { preloadAds } from './src/services/ads/adService';

function AppShell() {
  const { settings, ready, update } = useSettings();

  useEffect(() => {
    clearStaleTempFiles();
    preloadAds();
  }, []);

  const handlePreferenceChange = useCallback(
    (theme: typeof settings.theme) => update({ theme }),
    [update]
  );

  if (!ready) return null;

  return (
    <ThemeProvider preference={settings.theme} onPreferenceChange={handlePreferenceChange}>
      <ToastProvider>
        <StatusBar style={settings.theme === 'dark' ? 'light' : settings.theme === 'light' ? 'dark' : 'auto'} />
        <RootNavigator />
      </ToastProvider>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <AppShell />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
