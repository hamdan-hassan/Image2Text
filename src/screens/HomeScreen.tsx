import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton } from '../components/AppButton';
import { AdBanner } from '../components/AdBanner';
import { Card, SectionHeader } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ScanCard } from '../components/ScanCard';
import { Screen } from '../components/Screen';
import { RECENT_SCANS_LIMIT } from '../constants/config';
import { friendlyError } from '../types/errors';
import { useTheme } from '../theme/ThemeProvider';
import { useScans } from '../hooks/useScans';
import type { ScanRecord } from '../types/scan';
import type { RootStackParamList } from '../navigation/types';
import { openSystemSettings, pickImageFromLibrary, requestLibraryPermission } from '../features/importImage';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<Navigation>();
  const { colors, typography, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { scans, loading, failed } = useScans();
  const [picking, setPicking] = useState(false);

  const recent = scans.slice(0, RECENT_SCANS_LIMIT);

  const handleTakePhoto = useCallback(() => {
    navigation.navigate('Scanner');
  }, [navigation]);

  const handleSelectImage = useCallback(async () => {
    if (picking) return;
    try {
      setPicking(true);
      const granted = await requestLibraryPermission();
      if (!granted) {
        Alert.alert(
          'Permission needed',
          'Image2Text needs photo access so you can select images for text extraction.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => void openSystemSettings() },
          ]
        );
        return;
      }
      const picked = await pickImageFromLibrary();
      if (!picked) return;
      navigation.navigate('Editor', {
        sourceUri: picked.uri,
        exifOrientation: picked.exifOrientation,
      });
    } catch (error) {
      const friendly = friendlyError(error);
      Alert.alert(friendly.title, friendly.hint);
    } finally {
      setPicking(false);
    }
  }, [navigation, picking]);

  const openScan = useCallback(
    (scan: ScanRecord) => {
      navigation.navigate('Result', { scanId: scan.id, source: 'history' });
    },
    [navigation]
  );

  return (
    <Screen style={styles.screen} padded={false}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: Math.max(insets.top, spacing.sm) }}>
        <AdBanner placement="homeTopBanner" />
      </View>

      <View style={[styles.centerZone, { paddingHorizontal: spacing.lg }]}>
        <View style={styles.actions}>
          <AppButton label="Take Photo" icon="camera" size="lg" onPress={handleTakePhoto} />
          <View style={{ height: spacing.md }} />
          <AppButton
            label="Select Image"
            icon="image"
            size="lg"
            variant="secondary"
            onPress={() => void handleSelectImage()}
            loading={picking}
          />
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.accent} />
        ) : failed ? (
          <EmptyState
            icon="alert-circle"
            title="History unavailable"
            message="Your saved scans could not be loaded. Please restart the app."
          />
        ) : recent.length === 0 ? (
          <EmptyState
            icon="file-text"
            title="No scans yet"
            message="Take a photo or select an image to extract text."
          />
        ) : null}
      </View>

      {recent.length > 0 && !loading && !failed ? (
        <FlatList
          data={recent}
          keyExtractor={(item) => item.id}
          style={styles.recentList}
          contentContainerStyle={{
            paddingTop: spacing.sm,
            gap: spacing.md,
            paddingBottom: spacing.lg,
            paddingHorizontal: spacing.lg,
          }}
          ListHeaderComponent={
            <SectionHeader
              title="Recent scans"
              action={
                <Text
                  accessibilityRole="button"
                  accessibilityLabel="See all scans"
                  onPress={() => navigation.navigate('Tabs', { screen: 'History' })}
                  style={[typography.caption, { color: colors.accent }]}
                >
                  See all
                </Text>
              }
            />
          }
          renderItem={({ item }) => (
            <Card>
              <ScanCard scan={item} onPress={() => openScan(item)} />
            </Card>
          )}
        />
      ) : null}

      <AdBanner placement="homeBottomBanner" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centerZone: {
    flex: 1,
    justifyContent: 'center',
  },
  actions: {
    gap: 0,
  },
  recentList: {
    flexGrow: 0,
    maxHeight: '45%',
  },
});
