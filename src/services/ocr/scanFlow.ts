import type { ImageEdits } from '../imaging/imagingService';
import { formatAutoTitle } from '../../utils/datetime';
import { countCharacters, countWords } from '../../utils/textStats';
import { isOcrResultEmpty, type RecognitionScript } from '../../types/ocr';
import type { OCRService } from './ocrService';
import type { ScansRepository } from '../database/scansRepository';

export interface ScanFlowInput {
  /** Raw captured/picked image (still in cache). Copied into app storage by the flow. */
  sourceUri: string;
  edits?: ImageEdits;
  script: RecognitionScript;
  keepOriginals: boolean;
}

export type ScanFlowOutcome =
  | { status: 'ok'; scanId: string }
  | { status: 'empty' }
  | { status: 'cancelled' };

/** Filesystem operations the flow needs; isolated so the pipeline is unit-testable. */
export interface ScanStoragePort {
  /** Copies the raw capture into permanent app storage; returns the new URI. */
  importOriginal(sourceUri: string, scanId: string): Promise<string>;
  persistProcessed(tempUri: string, scanId: string): Promise<string>;
  persistThumbnail(tempUri: string, scanId: string): Promise<string>;
  deleteQuietly(uri: string | null | undefined): void;
}

export interface ScanFlowDeps {
  ocrService: OCRService;
  imaging: Pick<import('../imaging/imagingService').ImagingService, 'prepareForOcr' | 'makeThumbnail'>;
  repository: () => Promise<ScansRepository>;
  storage: ScanStoragePort;
  generateId?: () => string;
  now?: () => number;
}

/**
 * End-to-end offline pipeline:
 * persist original → preprocess → recognize → normalize → thumbnail → store.
 * Every stage is cancellation-aware and cleans up partial artifacts on failure.
 * Nothing here touches the network.
 */
export function createScanFlow({ ocrService, imaging, repository, storage, generateId, now = Date.now }: ScanFlowDeps) {
  return async function runScanFlow(
    input: ScanFlowInput,
    isCancelled: () => boolean = () => false
  ): Promise<ScanFlowOutcome> {
    const scanId = generateId ? generateId() : defaultId();
    let originalPath: string | null = null;
    let processedTempUri: string | null = null;
    let thumbTempUri: string | null = null;

    try {
      originalPath = await storage.importOriginal(input.sourceUri, scanId);
      if (isCancelled()) return await abort();

      const prepared = await imaging.prepareForOcr(originalPath, input.edits);
      processedTempUri = prepared.uri;
      if (isCancelled()) return await abort();

      const result = await ocrService.recognize(prepared.uri, { script: input.script });
      if (isCancelled()) return await abort();

      if (isOcrResultEmpty(result)) {
        cleanupTemps();
        storage.deleteQuietly(originalPath);
        return { status: 'empty' };
      }

      const thumbnail = await imaging.makeThumbnail(prepared.uri);
      thumbTempUri = thumbnail.uri;
      if (isCancelled()) return await abort();

      const storedProcessed = await storage.persistProcessed(processedTempUri, scanId);
      const storedThumbnail = await storage.persistThumbnail(thumbTempUri, scanId);

      const repo = await repository();
      const record = await repo.create({
        id: scanId,
        title: formatAutoTitle(now()),
        originalImagePath: input.keepOriginals ? originalPath : null,
        processedImagePath: storedProcessed,
        thumbnailPath: storedThumbnail,
        extractedText: result.text,
        script: result.script,
        wordCount: countWords(result.text),
        charCount: countCharacters(result.text),
      });

      if (!input.keepOriginals) storage.deleteQuietly(originalPath);

      if (isCancelled()) {
        await repo.remove(scanId);
        storage.deleteQuietly(storedProcessed);
        storage.deleteQuietly(storedThumbnail);
        storage.deleteQuietly(originalPath);
        return { status: 'cancelled' };
      }

      return { status: 'ok', scanId: record.id };
    } catch (error) {
      cleanupTemps();
      try {
        const repo = await repository();
        await repo.remove(scanId);
      } catch {
        // best-effort rollback; the original error is reported to the user
      }
      if (originalPath) storage.deleteQuietly(originalPath);
      throw error;
    }

    function cleanupTemps(): void {
      if (processedTempUri) storage.deleteQuietly(processedTempUri);
      if (thumbTempUri) storage.deleteQuietly(thumbTempUri);
    }

    async function abort(): Promise<ScanFlowOutcome> {
      cleanupTemps();
      if (originalPath) storage.deleteQuietly(originalPath);
      try {
        const repo = await repository();
        await repo.remove(scanId);
      } catch {
        // ignore rollback failures on cancel
      }
      return { status: 'cancelled' };
    }
  };
}

function defaultId(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  if (!bytes.some((b) => b !== 0)) {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
