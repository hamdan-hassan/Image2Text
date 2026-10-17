import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton } from '../../components/AppButton';
import { Screen } from '../../components/Screen';
import { buildDefaultScanFlow } from '../../services/ocr/defaultOcr';
import { preloadAds } from '../../services/ads/adService';
import { friendlyError } from '../../types/errors';
import { useSettings } from '../../providers/SettingsProvider';
import { useTheme } from '../../theme/ThemeProvider';
import type { RootStackParamList } from '../../navigation/types';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

const STAGE_MESSAGES: Record<'preparing' | 'recognizing' | 'finalizing', string> = {
  preparing: 'Preparing image…',
  recognizing: 'Extracting text…',
  finalizing: 'Saving…',
};

export function ProcessingScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<RouteProp<RootStackParamList, 'Processing'>>();
  const { sourceUri, edits } = route.params;
  const { colors, typography, spacing, radii } = useTheme();
  const { settings } = useSettings();

  const [stage, setStage] = useState<'preparing' | 'recognizing' | 'finalizing'>('recognizing');
  const [error, setError] = useState<{ title: string; hint: string } | null>(null);
  const cancelledRef = useRef(false);
  const flowRef = useRef(buildDefaultScanFlow());

  useEffect(() => {
    preloadAds();
    const run = async () => {
      try {
        setStage('preparing');
        // Small yield so the spinner paints before the native pipeline starts.
        await new Promise((resolve) => setTimeout(resolve, 30));
        if (cancelledRef.current) return;
        setStage('recognizing');
        const outcome = await flowRef.current(
          { sourceUri, edits, script: settings.script, keepOriginals: settings.keepOriginals },
          () => cancelledRef.current
        );
        if (cancelledRef.current) return;
        if (outcome.status === 'ok') {
          navigation.replace('Result', { scanId: outcome.scanId });
          return;
        }
        if (outcome.status === 'empty') {
          navigation.replace('NoText');
          return;
        }
      } catch (err) {
        if (cancelledRef.current) return;
        setError(friendlyError(err));
      }
    };
    void run();
  }, [edits, navigation, settings.keepOriginals, settings.script, sourceUri]);

  const handleCancel = () => {
    cancelledRef.current = true;
    navigation.popToTop();
  };

  return (
    <Screen style={styles.screen}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        {!error ? (
          <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel="Extracting text">
            <View style={[styles.ring, { borderColor: colors.accentSoft }]}>
              <View style={[styles.ringInner, { backgroundColor: colors.accentSoft }]} />
              <Text style={[typography.title, { color: colors.accent }]}>Aa</Text>
            </View>
            <Text style={[typography.heading, styles.message, { color: colors.text, marginTop: spacing.xl }]}>
              {STAGE_MESSAGES[stage]}
            </Text>
          </View>
        ) : (
          <View style={styles.center}>
            <Text style={[typography.heading, styles.message, { color: colors.danger }]}>{error.title}</Text>
            <Text
              style={[
                typography.body,
                styles.message,
                { color: colors.textSecondary, marginTop: spacing.sm },
              ]}
            >
              {error.hint}
            </Text>
            <View style={[{ marginTop: spacing.xl, alignSelf: 'stretch' }, styles.actionsGap]}>
              <AppButton label="Try again" onPress={() => navigation.replace('Processing', route.params)} />
              <AppButton label="Cancel" variant="ghost" onPress={handleCancel} />
            </View>
          </View>
        )}
      </View>

      {!error ? (
        <View style={{ paddingBottom: spacing.xl }}>
          <AppButton label="Cancel" variant="ghost" onPress={handleCancel} />
        </View>
      ) : null}

      <View style={[styles.footerCard, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.lg }]}>
        <Text style={[typography.caption, { color: colors.textTertiary, textAlign: 'center' }]}>
          Large or detailed pages can take a few seconds.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  ring: {
    alignItems: 'center',
    borderRadius: 64,
    borderWidth: 2,
    height: 128,
    justifyContent: 'center',
    width: 128,
  },
  ringInner: {
    alignItems: 'center',
    borderRadius: 56,
    bottom: -18,
    height: 112,
    justifyContent: 'center',
    position: 'absolute',
    width: 112,
  },
  message: {
    textAlign: 'center',
  },
  actionsGap: {
    gap: 12,
  },
  footerCard: {
    marginBottom: 8,
    padding: 14,
  },
});
