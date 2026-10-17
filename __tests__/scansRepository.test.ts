import { createScansRepository } from '../src/services/database/scansRepository';
import { buildSearchFilter } from '../src/services/database/searchQuery';
import { AppError } from '../src/types/errors';
import type { DatabasePort } from '../src/services/database/schema';

interface Row {
  id: string;
  title: string;
  original_image_path: string | null;
  processed_image_path: string | null;
  thumbnail_path: string | null;
  extracted_text: string;
  edited_text: string | null;
  script: string;
  word_count: number;
  char_count: number;
  created_at: number;
  updated_at: number;
}

function makeDb() {
  const rows = new Map<string, Row>();
  const selectAll = () =>
    Array.from(rows.values()).sort((a, b) => b.updated_at - a.updated_at);

  const db = {
    rows,
    execAsync: jest.fn(async () => undefined),
    runAsync: jest.fn(async (sql: string, params?: ReadonlyArray<string | number | null>) => {
      if (sql.startsWith('INSERT INTO scans')) {
        const p = params as unknown[];
        const id = String(p[0]);
        rows.set(id, {
          id,
          title: String(p[1]),
          original_image_path: (p[2] as string | null) ?? null,
          processed_image_path: (p[3] as string | null) ?? null,
          thumbnail_path: (p[4] as string | null) ?? null,
          extracted_text: String(p[5]),
          edited_text: (p[6] as string | null) ?? null,
          script: String(p[7]),
          word_count: Number(p[8]),
          char_count: Number(p[9]),
          created_at: Number(p[10]),
          updated_at: Number(p[11]),
        });
      } else if (sql.startsWith('UPDATE scans SET edited_text')) {
        const p = params as unknown[];
        const row = rows.get(String(p[4]));
        if (!row) throw new Error('not found');
        row.edited_text = (p[0] as string | null) ?? null;
        row.word_count = Number(p[1]);
        row.char_count = Number(p[2]);
        row.updated_at = Number(p[4]);
      } else if (sql.startsWith('UPDATE scans SET title')) {
        const p = params as unknown[];
        const row = rows.get(String(p[2]));
        if (!row) throw new Error('not found');
        row.title = String(p[0]);
        row.updated_at = Number(p[1]);
      } else if (sql.startsWith('DELETE FROM scans WHERE id')) {
        rows.delete(String((params as unknown[])[0]));
      } else if (sql === 'DELETE FROM scans') {
        rows.clear();
      }
      return { changes: rows.size, lastInsertRowId: 1 };
    }),
    getAllAsync: jest.fn(async <T>(sql: string, params?: ReadonlyArray<string | number | null>): Promise<T[]> => {
      let result: Row[];
      const p = (params ?? []) as unknown[];
      if (sql.includes('WHERE 1=1')) {
        // searchScans: first LIKE parameter drives filtering
        const like = String(p[0]).replace(/%/g, '').replace(/\\(.)/g, '$1').toLowerCase();
        result = selectAll().filter(
          (r) =>
            r.title.toLowerCase().includes(like) ||
            r.extracted_text.toLowerCase().includes(like) ||
            (r.edited_text ?? '').toLowerCase().includes(like)
        );
      } else if (sql.includes('WHERE id = ?')) {
        result = rows.has(String(p[0])) ? [rows.get(String(p[0]))!] : [];
      } else {
        result = selectAll();
      }
      if (sql.includes('LIMIT')) {
        const limit = Number(p[p.length - 1]);
        if (!Number.isNaN(limit)) result = result.slice(0, limit);
      }
      return result as unknown as T[];
    }),
    getFirstAsync: jest.fn(async <T>(): Promise<T | null> => null),
    withTransactionAsync: jest.fn(async (task: () => Promise<void>) => task()),
  };
  return db as unknown as DatabasePort & { rows: typeof rows };
}

const sampleInput = {
  title: 'Receipt scan',
  originalImagePath: 'file://docs/originals/1.jpg',
  processedImagePath: 'file://docs/processed/1.jpg',
  thumbnailPath: 'file://docs/thumbs/1.jpg',
  extractedText: 'Total: GHS 450\nThanks for shopping',
  script: 'Latin' as const,
  wordCount: 7,
  charCount: 33,
};

describe('createScansRepository', () => {
  it('creates and reads back a scan with all fields mapped', async () => {
    const repo = createScansRepository(makeDb());
    const record = await repo.create(sampleInput);
    expect(record.title).toBe('Receipt scan');
    expect(record.script).toBe('Latin');
    const loaded = await repo.get(record.id);
    expect(loaded).toEqual(record);
  });

  it('defaults blank titles and rejects empty ids gracefully', async () => {
    const repo = createScansRepository(makeDb());
    const record = await repo.create({ ...sampleInput, title: '   ' });
    expect(record.title).toBe('Untitled scan');
  });

  it('lists newest first', async () => {
    const repo = createScansRepository(makeDb());
    const first = await repo.create({ ...sampleInput, createdAt: 1000 });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await repo.create({ ...sampleInput, title: 'Newer' });
    const list = await repo.list();
    expect(list[0].id).toBe(second.id);
    expect(list[list.length - 1].id).toBe(first.id);
  });

  it('recent returns at most N items', async () => {
    const repo = createScansRepository(makeDb());
    for (let i = 0; i < 4; i += 1) {
      await repo.create(sampleInput);
    }
    expect(await repo.recent(2)).toHaveLength(2);
  });

  it('updates edited text with recomputed stats semantics left to the caller', async () => {
    const repo = createScansRepository(makeDb());
    const record = await repo.create(sampleInput);
    await repo.updateEditedText(record.id, 'Edited text', 2, 11);
    const updated = await repo.get(record.id);
    expect(updated!.editedText).toBe('Edited text');
    expect(updated!.wordCount).toBe(2);
    expect(updated!.extractedText).toBe(sampleInput.extractedText);
  });

  it('renames a scan', async () => {
    const repo = createScansRepository(makeDb());
    const record = await repo.create(sampleInput);
    await repo.rename(record.id, 'Invoice');
    expect((await repo.get(record.id))!.title).toBe('Invoice');
  });

  it('remove deletes the record and returns it for file cleanup', async () => {
    const repo = createScansRepository(makeDb());
    const record = await repo.create(sampleInput);
    const removed = await repo.remove(record.id);
    expect(removed!.id).toBe(record.id);
    expect(await repo.get(record.id)).toBeNull();
    expect(await repo.remove('missing')).toBeNull();
  });

  it('clear removes everything', async () => {
    const repo = createScansRepository(makeDb());
    await repo.create(sampleInput);
    await repo.create(sampleInput);
    const all = await repo.clear();
    expect(all).toHaveLength(2);
    expect(await repo.list()).toHaveLength(0);
  });

  it('wraps driver failures in DB_ERROR AppErrors', async () => {
    const failingDb: DatabasePort = {
      execAsync: async () => undefined,
      runAsync: async () => {
        throw new Error('boom');
      },
      getAllAsync: async () => {
        throw new Error('boom');
      },
      getFirstAsync: async () => null,
      withTransactionAsync: async (task) => task(),
    };
    const repo = createScansRepository(failingDb);
    await expect(repo.create(sampleInput)).rejects.toMatchObject({ code: 'DB_ERROR' });
    await expect(repo.list()).rejects.toBeInstanceOf(AppError);
  });
});

describe('buildSearchFilter', () => {
  it('returns null for empty queries', () => {
    expect(buildSearchFilter('')).toBeNull();
    expect(buildSearchFilter('   ')).toBeNull();
  });

  it('lowercases and wraps the query in LIKE wildcards', () => {
    const filter = buildSearchFilter('Invoice');
    expect(filter!.params.every((param) => param === '%invoice%')).toBe(true);
  });

  it('escapes LIKE wildcard characters so users can search literal % or _', () => {
    const filter = buildSearchFilter('50%_off');
    expect(filter!.params[0]).toBe('%50\\%\\_off%');
  });
});

