import { createScanFlow, type ScanFlowDeps, type ScanStoragePort } from '../src/services/ocr/scanFlow';
import type { ImagingService } from '../src/services/imaging/imagingService';
import type { TextRecognizer } from '../src/services/ocr/recognizerPort';
import { createOcrService } from '../src/services/ocr/ocrService';
import { createScansRepository } from '../src/services/database/scansRepository';
import type { DatabasePort } from '../src/services/database/schema';
import { AppError } from '../src/types/errors';
import type { ScanRecord } from '../src/types/scan';

function makeImaging(overrides: Partial<ImagingService> = {}): ImagingService {
  const base: ImagingService = {
    getDimensions: async () => ({ width: 1000, height: 1000 }),
    prepareForOcr: async (uri: string) => ({ uri: `cache://processed-${uri}`, width: 800, height: 800 }),
    makeThumbnail: async (uri: string) => ({ uri: `cache://thumb-${uri}`, width: 96, height: 96 }),
    rotateQuarterTurn: async (uri: string) => ({ uri: `cache://rotated-${uri}`, width: 800, height: 800 }),
  };
  return { ...base, ...overrides };
}

function makeRecognizer(result?: { text?: string; blocks?: [] }): TextRecognizer {
  return {
    recognize: jest.fn(async () => ({ text: result?.text ?? 'Hello world', blocks: result?.blocks ?? [] })),
  };
}

function makeStorage() {
  const deleted: Array<string | null | undefined> = [];
  const storage: ScanStoragePort & { deleted: typeof deleted } = {
    importOriginal: jest.fn(async (sourceUri: string) => `docs://originals/${sourceUri}`),
    persistProcessed: jest.fn(async () => 'docs://processed/x.jpg'),
    persistThumbnail: jest.fn(async () => 'docs://thumbs/x.jpg'),
    deleteQuietly: (uri) => deleted.push(uri),
    deleted,
  };
  return storage;
}

function makeDb(options?: { failOnCreate?: boolean }) {
  const records = new Map<string, ScanRecord>();
  const db = {
    execAsync: jest.fn(async () => undefined),
    runAsync: jest.fn(async (sql: string, params?: ReadonlyArray<string | number | null>) => {
      if (sql.startsWith('INSERT INTO scans')) {
        if (options?.failOnCreate) throw new Error('disk on fire');
        const p = params as unknown[];
        records.set(String(p[0]), {
          id: String(p[0]),
          title: String(p[1]),
          originalImagePath: (p[2] as string | null) ?? null,
          processedImagePath: (p[3] as string | null) ?? null,
          thumbnailPath: (p[4] as string | null) ?? null,
          extractedText: String(p[5]),
          editedText: (p[6] as string | null) ?? null,
          script: String(p[7]) as ScanRecord['script'],
          wordCount: Number(p[8]),
          charCount: Number(p[9]),
          createdAt: Number(p[10]),
          updatedAt: Number(p[11]),
        });
      } else if (sql.startsWith('DELETE FROM scans WHERE id')) {
        records.delete(String((params as unknown[])[0]));
      }
      return { changes: 1, lastInsertRowId: 1 };
    }),
    getAllAsync: jest.fn(async () =>
      Array.from(records.values()).map((r) => ({
        id: r.id,
        title: r.title,
        original_image_path: r.originalImagePath,
        processed_image_path: r.processedImagePath,
        thumbnail_path: r.thumbnailPath,
        extracted_text: r.extractedText,
        edited_text: r.editedText,
        script: r.script,
        word_count: r.wordCount,
        char_count: r.charCount,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
      }))
    ),
    getFirstAsync: jest.fn(async () => null),
    withTransactionAsync: jest.fn(async (task: () => Promise<void>) => task()),
  };
  return db;
}

function makeDeps(options?: {
  recognizerResult?: { text?: string; blocks?: [] };
  prepareError?: AppError;
  failOnCreate?: boolean;
}) {
  const storage = makeStorage();
  const imaging = makeImaging(
    options?.prepareError
      ? {
          prepareForOcr: async () => {
            throw options.prepareError;
          },
        }
      : undefined
  );
  const repository = createScansRepository(makeDb({ failOnCreate: options?.failOnCreate }) as unknown as DatabasePort);
  let counter = 0;
  const deps: ScanFlowDeps & { storage: typeof storage; repositoryRef: typeof repository } = {
    ocrService: createOcrService({ recognizer: makeRecognizer(options?.recognizerResult) }),
    imaging,
    repository: async () => repository,
    storage,
    generateId: () => `id-${++counter}`,
    now: () => 1700000000000,
    repositoryRef: repository,
  };
  return deps;
}

const baseInput = { sourceUri: 'file://cache/raw.jpg', script: 'Latin' as const, keepOriginals: true };

describe('createScanFlow', () => {
  it('persists a scan and returns its id on success', async () => {
    const deps = makeDeps();
    const runFlow = createScanFlow(deps);
    const outcome = await runFlow(baseInput);
    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') return;
    const record = await deps.repositoryRef.get(outcome.scanId);
    expect(record).not.toBeNull();
    expect(record!.extractedText.length).toBeGreaterThan(0);
    expect(record!.wordCount).toBe(2);
    expect(record!.processedImagePath).toBe('docs://processed/x.jpg');
    expect(record!.thumbnailPath).toBe('docs://thumbs/x.jpg');
    expect(record!.originalImagePath).toContain('originals');
  });

  it('reports empty without creating a record when no text was found', async () => {
    const deps = makeDeps({ recognizerResult: { text: '', blocks: [] } });
    const runFlow = createScanFlow(deps);
    const outcome = await runFlow(baseInput);
    expect(outcome.status).toBe('empty');
    expect(await deps.repositoryRef.list()).toHaveLength(0);
  });

  it('deletes the original image when keepOriginals is false', async () => {
    const deps = makeDeps();
    const runFlow = createScanFlow(deps);
    const outcome = await runFlow({ ...baseInput, keepOriginals: false });
    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') return;
    const record = await deps.repositoryRef.get(outcome.scanId);
    expect(record!.originalImagePath).toBeNull();
    expect(deps.storage.deleted.some((uri) => uri?.includes('originals'))).toBe(true);
  });

  it('returns cancelled and rolls back when cancelled mid-run', async () => {
    const deps = makeDeps();
    const runFlow = createScanFlow(deps);
    let calls = 0;
    const isCancelled = () => {
      calls += 1;
      return calls >= 3; // cancel after import + preprocess
    };
    const outcome = await runFlow(baseInput, isCancelled);
    expect(outcome.status).toBe('cancelled');
    expect(await deps.repositoryRef.list()).toHaveLength(0);
  });

  it('maps unreadable images to IMAGE_UNREADABLE and cleans up the imported original', async () => {
    const deps = makeDeps({ prepareError: new AppError('IMAGE_UNREADABLE') });
    const runFlow = createScanFlow(deps);
    await expect(runFlow(baseInput)).rejects.toMatchObject({ code: 'IMAGE_UNREADABLE' });
    expect(await deps.repositoryRef.list()).toHaveLength(0);
    expect(deps.storage.deleted.some((uri) => uri?.includes('originals'))).toBe(true);
  });

  it('rolls back when the database write fails', async () => {
    const deps = makeDeps({ failOnCreate: true });
    const runFlow = createScanFlow(deps);
    await expect(runFlow(baseInput)).rejects.toBeInstanceOf(AppError);
    expect(await deps.repositoryRef.list()).toHaveLength(0);
  });
});

