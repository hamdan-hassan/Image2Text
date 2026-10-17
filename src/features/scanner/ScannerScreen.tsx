import React, { useCallback, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { CameraCapturedPicture } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { AppButton } from '../../components/AppButton';
import { Pressable } from 'react-native';
import { CAMERA_CAPTURE_QUALITY } from '../../constants/config';
import { useTheme } from '../../theme/ThemeProvider';
import type { RootStackParamList } from '../../navigation/types';
import { extractExifOrientation, openSystemSettings } from '../importImage';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function ScannerScreen() {
  const navigation = useNavigation<Navigation>();
  const { colors, typography, spacing, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<InstanceType<typeof CameraView> | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState(false);

  const handleCancel = useCallback(() => navigation.goBack(), [navigation]);

  const handleCapture = useCallback(async () => {
    if (capturing) return;
    try {
      setCapturing(true);
      const picture: CameraCapturedPicture | undefined = await cameraRef.current?.takePictureAsync({
        quality: CAMERA_CAPTURE_QUALITY,
        exif: true,
        skipProcessing: false,
      });
      if (!picture?.uri) return;
      const orientation = extractExifOrientation(picture.exif as Record<string, unknown> | null);
      navigation.replace('Editor', { sourceUri: picture.uri, exifOrientation: orientation });
    } catch {
      setCaptureError(true);
    } finally {
      setCapturing(false);
    }
  }, [capturing, navigation]);

  if (!permission) {
    return <PermissionGate message="Checking camera…" />;
  }

  if (!permission.granted) {
    return (
      <PermissionGate
        title={permission.canAskAgain ? 'Camera permission' : 'Camera access turned off'}
        message={
          permission.canAskAgain
            ? 'Image2Text needs camera access so you can photograph documents and extract their text.'
            : 'Camera access was denied. Enable it in Settings to photograph documents.'
        }
      >
        <AppButton
          label={permission.canAskAgain ? 'Allow Camera Access' : 'Open Settings'}
          onPress={() => (permission.canAskAgain ? void requestPermission() : void openSystemSettings())}
        />
        <AppButton label="Not now" variant="ghost" onPress={handleCancel} />
      </PermissionGate>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: '#000' }]}>
      <CameraView
        ref={cameraRef}
        style={styles.flex}
        facing="back"
        enableTorch={torchOn}
        accessibilityLabel="Camera viewfinder"
      />
      <View
        pointerEvents="box-none"
        style={[styles.overlay, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl }]}
      >
          <View style={styles.topBar}>
            <CircleButton icon="x" label="Close camera" onPress={handleCancel} />
            <Text style={[typography.caption, styles.hint]}>
              Point at the text you want to extract
            </Text>
            <CircleButton
              icon="zap"
              label={torchOn ? 'Turn flash off' : 'Turn flash on'}
              active={torchOn}
              onPress={() => setTorchOn((value) => !value)}
            />
          </View>

          <View style={styles.frame}>
            <View style={[styles.corner, styles.topLeft, { borderColor: colors.onAccent, borderRadius: radii.sm }]} />
            <View style={[styles.corner, styles.topRight, { borderColor: colors.onAccent, borderRadius: radii.sm }]} />
            <View style={[styles.corner, styles.bottomLeft, { borderColor: colors.onAccent, borderRadius: radii.sm }]} />
            <View style={[styles.corner, styles.bottomRight, { borderColor: colors.onAccent, borderRadius: radii.sm }]} />
          </View>

          <View style={{ alignItems: 'center', gap: spacing.md }}>
            {captureError ? (
              <Text style={[typography.caption, { color: colors.onAccent }]}>
                The camera could not take a picture. Please try again.
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Take photo"
              accessibilityState={{ busy: capturing }}
              disabled={capturing}
              onPress={() => void handleCapture()}
              style={({ pressed }) => [
                styles.shutter,
                {
                  backgroundColor: pressed || capturing ? colors.accentPressed : colors.onAccent,
                  opacity: capturing ? 0.6 : 1,
                },
              ]}
            />
            <Text style={[typography.micro, { color: colors.onAccent, opacity: 0.8 }]}>Extract text from a photo</Text>
          </View>
      </View>
    </View>
  );
}

function PermissionGate({
  title = 'Camera',
  message,
  children,
}: {
  title?: string;
  message: string;
  children?: React.ReactNode;
}) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View style={[styles.gate, { backgroundColor: colors.background, gap: spacing.lg, padding: spacing.xl }]}>
      <Feather name="camera" size={40} color={colors.textTertiary} />
      <Text style={[typography.heading, { color: colors.text, textAlign: 'center' }]}>{title}</Text>
      <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>{message}</Text>
      {children ?? (
        <AppButton label="Open Settings" onPress={() => void Linking.openSettings()} />
      )}
    </View>
  );
}

function CircleButton({
  icon,
  label,
  onPress,
  active,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  const { radii } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.circleButton,
        { opacity: pressed ? 0.7 : active ? 1 : 0.9 },
        { borderRadius: radii.full, backgroundColor: active ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.35)' },
      ]}
    >
      <Feather name={icon} size={22} color="#FFFFFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlay: {
    bottom: 0,
    justifyContent: 'space-between',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  hint: {
    color: '#FFFFFF',
    flex: 1,
    opacity: 0.9,
    textAlign: 'center',
  },
  frame: {
    alignSelf: 'center',
    borderColor: 'transparent',
    height: 320,
    position: 'relative',
    width: '82%',
  },
  corner: {
    borderWidth: 3,
    height: 36,
    position: 'absolute',
    width: 36,
  },
  topLeft: { left: 0, top: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { right: 0, top: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { left: 0, bottom: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { right: 0, bottom: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  shutter: {
    borderColor: 'rgba(255,255,255,0.85)',
    borderWidth: 5,
    height: 78,
    width: 78,
    borderRadius: 39,
  },
  circleButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  gate: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
