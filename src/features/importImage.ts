import * as ImagePicker from 'expo-image-picker';
import { Linking, Platform } from 'react-native';
import { AppError } from '../types/errors';
import { PICKER_JPEG_QUALITY } from '../constants/config';
import { logger } from '../utils/logger';

export interface PickedImage {
  uri: string;
  width: number;
  height: number;
  exifOrientation: number | null;
}

/** Reads the orientation tag from platform-specific EXIF payloads. */
export function extractExifOrientation(exif: Record<string, unknown> | null | undefined): number | null {
  if (!exif) return null;
  const direct = exif.Orientation ?? exif.orientation;
  if (typeof direct === 'number') return direct;
  const iosNested = (exif as { '{Exif}'?: { Orientation?: unknown } })['{Exif}']?.Orientation;
  return typeof iosNested === 'number' ? iosNested : null;
}

export async function requestLibraryPermission(): Promise<boolean> {
  const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return result.granted;
}

export async function openSystemSettings(): Promise<void> {
  await Linking.openSettings();
}

/**
 * Launches the photo library picker. Resolves null when the user cancels.
 * Quality < 1 forces a JPEG re-encode, which also converts HEIC transparently.
 */
export async function pickImageFromLibrary(): Promise<PickedImage | null> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      selectionLimit: 1,
      quality: PICKER_JPEG_QUALITY,
      exif: true,
    });
    if (result.canceled || result.assets.length === 0) return null;
    const asset = result.assets[0];
    if (!asset.uri) throw new AppError('IMAGE_UNREADABLE');
    return {
      uri: asset.uri,
      width: asset.width ?? 0,
      height: asset.height ?? 0,
      exifOrientation: extractExifOrientation(asset.exif as Record<string, unknown> | null),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error(error, 'image pick failed');
    throw new AppError('IMAGE_UNREADABLE', undefined, error);
  }
}

export function isSupportedImageExtension(uri: string): boolean {
  const match = /\.([a-z0-9]+)(\?|$)/i.exec(uri);
  if (!match) return Platform.OS === 'ios';
  const extension = match[1].toLowerCase();
  return ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'].includes(extension);
}
