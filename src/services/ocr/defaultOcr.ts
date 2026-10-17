import { createOcrService } from './ocrService';
import { createScanFlow, type ScanStoragePort } from './scanFlow';
import { mlKitRecognizer } from './mlKitRecognizer';
import { nativeImaging } from '../imaging/imagingService';
import {
  assertDiskSpace,
  deleteQuietly,
  importIntoOriginals,
  persistProcessedImage,
  persistThumbnail,
} from '../storage/fileStorage';
import { getScansRepository } from '../database/repositoryProvider';

const nativeScanStorage: ScanStoragePort = {
  importOriginal: async (sourceUri, scanId) => {
    assertDiskSpace();
    return importIntoOriginals(sourceUri, scanId);
  },
  persistProcessed: async (tempUri, scanId) => {
    assertDiskSpace();
    return persistProcessedImage(tempUri, scanId);
  },
  persistThumbnail: async (tempUri, scanId) => {
    assertDiskSpace();
    return persistThumbnail(tempUri, scanId);
  },
  deleteQuietly,
};

/** Default production wiring: ML Kit engine + native imaging + SQLite + app-private files. */
export function buildDefaultScanFlow() {
  return createScanFlow({
    ocrService: createOcrService({ recognizer: mlKitRecognizer }),
    imaging: nativeImaging,
    repository: getScansRepository,
    storage: nativeScanStorage,
  });
}

export const ocrService = createOcrService({ recognizer: mlKitRecognizer });
