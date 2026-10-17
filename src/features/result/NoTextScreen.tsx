import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../components/AppButton';
import { Screen } from '../../components/Screen';
import { useTheme } from '../../theme/ThemeProvider';
import type { RootStackParamList } from '../../navigation/types';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function NoTextScreen() {
  const navigation = useNavigation<Navigation>();
  const { colors, typography, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Screen style={styles.screen}>
      <View style={{ paddingTop: Math.max(insets.top, spacing.md) }}>
        <AppButton label="Close" variant="ghost" icon="x" onPress={() => navigation.popToTop()} />
      </View>
      <View style={[styles.content, { gap: spacing.lg }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.surfaceSecondary }]}>
          <Feather name="search" size={30} color={colors.textTertiary} />
        </View>
        <Text style={[typography.title, styles.centered, { color: colors.text }]}>No text detected</Text>
        <Text style={[typography.body, styles.centered, { color: colors.textSecondary }]}>
          We couldn't find readable text in this image.
        </Text>
        <Text style={[typography.caption, styles.centered, styles.tips, { color: colors.textTertiary }]}>
          Tips: hold the camera steady, fill the frame with the text, and shoot in good light. Printed text
          works best — handwriting is not supported yet.
        </Text>
      </View>
      <View style={{ paddingBottom: Math.max(insets.bottom, spacing.lg), gap: spacing.sm }}>
        <AppButton label="Take Another Photo" icon="camera" onPress={() => navigation.replace('Scanner')} />
        <AppButton
          label="Try Another Image"
          icon="image"
          variant="secondary"
          onPress={() => navigation.replace('Tabs', { screen: 'Home' })}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  centered: {
    textAlign: 'center',
  },
  tips: {
    lineHeight: 19,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 56,
    height: 88,
    justifyContent: 'center',
    width: 88,
  },
});
