import { File, Directory, Paths } from 'expo-file-system';
import { AppError } from '../../types/errors';
import { MIN_FREE_DISK_BYTES } from '../../constants/config';
import { logger } from '../../utils/logger';

const IMAGES_DIR = 'images';
const ORIGINALS_DIR = 'originals';
const PROCESSED_DIR = 'processed';
const THUMBS_DIR = 'thumbs';
const TEMP_DIR = 'img2text-tmp';

function ensureDirectory(path: string): Directory {
  const directory = new Directory(Paths.document, path);
  if (!directory.exists) directory.create({ intermediates: true, idempotent: true });
  return directory;
}

export function originalsDir(): Directory {
  return ensureDirectory(`${IMAGES_DIR}/${ORIGINALS_DIR}`);
}

export function processedDir(): Directory {
  return ensureDirectory(`${IMAGES_DIR}/${PROCESSED_DIR}`);
}

export function thumbsDir(): Directory {
  return ensureDirectory(`${IMAGES_DIR}/${THUMBS_DIR}`);
}

export function tempDir(): Directory {
  const directory = new Directory(Paths.cache, TEMP_DIR);
  if (!directory.exists) directory.create({ intermediates: true, idempotent: true });
  return directory;
}

/** Removes stale working files left by a previous session (safe to call at startup). */
export function clearStaleTempFiles(): void {
  try {
    const directory = new Directory(Paths.cache, TEMP_DIR);
    if (directory.exists) directory.delete();
  } catch (error) {
    logger.warn('FILE_ERROR', `temp cleanup failed: ${String(error)}`);
  }
}

export function assertDiskSpace(): void {
  const available = Paths.availableDiskSpace;
  if (typeof available === 'number' && available < MIN_FREE_DISK_BYTES) {
    throw new AppError('STORAGE_FULL');
  }
}

/**
 * Copies a picked/captured image into the app's private storage.
 * Returns the persistent file:// URI.
 */
export async function importIntoOriginals(sourceUri: string, scanId: string): Promise<string> {
  assertDiskSpace();
  try {
    const destination = new File(originalsDir(), `${scanId}.jpg`);
    if (destination.exists) destination.delete();
    const source = new File(sourceUri);
    await source.copy(destination);
    return destination.uri;
  } catch (error) {
    throw new AppError('FILE_ERROR', undefined, error);
  }
}

export async function persistProcessedImage(tempUri: string, scanId: string): Promise<string> {
  return moveTempFile(tempUri, new File(processedDir(), `${scanId}.jpg`));
}

export async function persistThumbnail(tempUri: string, scanId: string): Promise<string> {
  return moveTempFile(tempUri, new File(thumbsDir(), `${scanId}.jpg`));
}

async function moveTempFile(tempUri: string, destination: File): Promise<string> {
  assertDiskSpace();
  try {
    const source = new File(tempUri);
    if (destination.exists) destination.delete();
    await source.move(destination);
    return destination.uri;
  } catch (error) {
    throw new AppError('FILE_ERROR', undefined, error);
  }
}

export function deleteQuietly(uri: string | null | undefined): void {
  if (!uri || !uri.startsWith('file://')) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (error) {
    logger.warn('FILE_ERROR', `delete failed: ${String(error)}`);
  }
}

export function deleteScanFiles(scan: { originalImagePath: string | null; processedImagePath: string | null; thumbnailPath: string | null }): void {
  deleteQuietly(scan.originalImagePath);
  deleteQuietly(scan.processedImagePath);
  deleteQuietly(scan.thumbnailPath);
}
