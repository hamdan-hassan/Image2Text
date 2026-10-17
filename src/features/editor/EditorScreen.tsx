import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton } from '../../components/AppButton';
import { IconButton } from '../../components/IconButton';
import { LoadingView } from '../../components/LoadingView';
import { Screen } from '../../components/Screen';
import {
  exifOrientationToRotation,
  exifOrientationIsMirrored,
  fitImageInContainer,
  normalizedToPixelCrop,
  type NormalizedRect,
} from '../../services/imaging/cropMath';
import { nativeImaging, type PreparedImage } from '../../services/imaging/imagingService';
import { friendlyError } from '../../types/errors';
import { useTheme } from '../../theme/ThemeProvider';
import type { RootStackParamList } from '../../navigation/types';
import { CropOverlay } from './CropOverlay';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

const DEFAULT_RECT: NormalizedRect = { x: 0.06, y: 0.06, width: 0.88, height: 0.88 };

export function EditorScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<RouteProp<RootStackParamList, 'Editor'>>();
  const { sourceUri, exifOrientation } = route.params;
  const { colors, typography, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const [base, setBase] = useState<PreparedImage | null>(null);
  const [initialUri, setInitialUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [cropMode, setCropMode] = useState(false);
  const [cropRect, setCropRect] = useState<NormalizedRect>(DEFAULT_RECT);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        let workingUri = sourceUri;
        if (exifOrientationToRotation(exifOrientation) !== 0 || exifOrientationIsMirrored(exifOrientation)) {
          const rotation = exifOrientationToRotation(exifOrientation) as 90 | -90 | 180 | 270;
          const rotated = await nativeImaging.rotateQuarterTurn(workingUri, rotation);
          workingUri = rotated.uri;
        }
        const dims = await nativeImaging.getDimensions(workingUri);
        if (!mounted) return;
        const prepared = { uri: workingUri, ...dims };
        setInitialUri(workingUri);
        setBase(prepared);
      } catch (error) {
        const friendly = friendlyError(error);
        Alert.alert(friendly.title, friendly.hint, [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } finally {
        if (mounted) setBusy(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [exifOrientation, navigation, sourceUri]);

  const fitted = useMemo(
    () =>
      base
        ? fitImageInContainer(base.width, base.height, containerSize.width, containerSize.height)
        : { width: 0, height: 0, offsetX: 0, offsetY: 0 },
    [base, containerSize]
  );

  const handleRotate = useCallback(
    async (degrees: 90 | -90) => {
      if (!base || busy) return;
      try {
        setBusy(true);
        const rotated = await nativeImaging.rotateQuarterTurn(base.uri, degrees);
        setBase(rotated);
        setCropRect(DEFAULT_RECT);
      } catch (error) {
        const friendly = friendlyError(error);
        Alert.alert(friendly.title, friendly.hint);
      } finally {
        setBusy(false);
      }
    },
    [base, busy]
  );

  const applyCrop = useCallback(async (): Promise<PreparedImage | null> => {
    if (!base) return null;
    const pixelCrop = normalizedToPixelCrop(cropRect, base.width, base.height);
    const full = pixelCrop.width >= base.width - 2 && pixelCrop.height >= base.height - 2;
    if (full) return base;
    return nativeImaging.prepareForOcr(base.uri, { crop: pixelCrop, rotationDegrees: 0 });
  }, [base, cropRect]);

  const handleApplyCrop = useCallback(async () => {
    if (!base || busy) return;
    try {
      setBusy(true);
      const cropped = await applyCrop();
      if (cropped) {
        setBase({ uri: cropped.uri, width: cropped.width, height: cropped.height });
      }
      setCropMode(false);
      setCropRect(DEFAULT_RECT);
    } catch (error) {
      const friendly = friendlyError(error);
      Alert.alert(friendly.title, friendly.hint);
    } finally {
      setBusy(false);
    }
  }, [applyCrop, base, busy]);

  const handleReset = useCallback(() => {
    if (!initialUri || !base) return;
    setCropMode(false);
    setCropRect(DEFAULT_RECT);
    if (base.uri !== initialUri) {
      void (async () => {
        try {
          setBusy(true);
          const dims = await nativeImaging.getDimensions(initialUri);
          setBase({ uri: initialUri, ...dims });
        } catch {
          // keep current image; reset is best-effort
        } finally {
          setBusy(false);
        }
      })();
    }
  }, [base, initialUri]);

  const handleExtract = useCallback(async () => {
    if (!base || extracting) return;
    try {
      setExtracting(true);
      let finalImage = base;
      if (cropMode) {
        const cropped = await applyCrop();
        if (cropped) finalImage = { uri: cropped.uri, width: cropped.width, height: cropped.height };
      }
      navigation.replace('Processing', { sourceUri: finalImage.uri, edits: {} });
    } catch (error) {
      const friendly = friendlyError(error);
      Alert.alert(friendly.title, friendly.hint);
      setExtracting(false);
    }
  }, [applyCrop, base, cropMode, extracting, navigation]);

  return (
    <Screen padded={false} style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, spacing.md), paddingHorizontal: spacing.lg }]}>
        <IconButton icon="x" label="Close editor" onPress={() => navigation.goBack()} />
        <Text style={[typography.heading, { color: colors.text }]}>Prepare image</Text>
        <IconButton icon="rotate-ccw" label="Reset all edits" onPress={handleReset} disabled={!base} />
      </View>

      {!base ? (
        <LoadingView fullScreen message="Preparing image…" />
      ) : (
        <>
          <View
            style={styles.canvas}
            onLayout={(event) =>
              setContainerSize({
                width: event.nativeEvent.layout.width,
                height: event.nativeEvent.layout.height,
              })
            }
          >
            <Image
              source={{ uri: base.uri }}
              resizeMode="contain"
              style={[
                styles.image,
                {
                  left: fitted.offsetX,
                  top: fitted.offsetY,
                  width: fitted.width,
                  height: fitted.height,
                },
              ]}
              accessibilityLabel="Selected image preview"
            />
            {cropMode && fitted.width > 0 ? (
              <View
                pointerEvents="box-none"
                style={{
                  position: 'absolute',
                  left: fitted.offsetX,
                  top: fitted.offsetY,
                  width: fitted.width,
                  height: fitted.height,
                }}
              >
                <CropOverlay
                  rect={cropRect}
                  onChange={setCropRect}
                  displayWidth={fitted.width}
                  displayHeight={fitted.height}
                />
              </View>
            ) : null}
          </View>

          <View
            style={[
              styles.toolbar,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
                paddingBottom: Math.max(insets.bottom, spacing.lg),
                paddingHorizontal: spacing.xl,
                gap: spacing.sm,
              },
            ]}
          >
            <View style={styles.toolRow}>
              <IconButton icon="rotate-ccw" label="Rotate left" onPress={() => void handleRotate(-90)} disabled={busy} />
              <IconButton icon="rotate-cw" label="Rotate right" onPress={() => void handleRotate(90)} disabled={busy} />
              <IconButton
                icon="crop"
                label="Crop"
                active={cropMode}
                onPress={() => {
                  setCropMode((value) => !value);
                  setCropRect(DEFAULT_RECT);
                }}
                disabled={busy}
              />
              {cropMode ? (
                <>
                  <IconButton icon="check" label="Apply crop" onPress={() => void handleApplyCrop()} disabled={busy} />
                  <IconButton
                    icon="x"
                    label="Cancel crop"
                    onPress={() => {
                      setCropMode(false);
                      setCropRect(DEFAULT_RECT);
                    }}
                  />
                </>
              ) : null}
            </View>
            <AppButton
              label="Extract Text"
              icon="zap"
              size="lg"
              loading={extracting || busy}
              onPress={() => void handleExtract()}
              accessibilityLabel="Extract text from this image"
            />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  canvas: {
    flex: 1,
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
  },
  toolbar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  toolRow: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
