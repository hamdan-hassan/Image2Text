import type { RecognitionScript } from '../../types/ocr';
import type { ScanRecord } from '../../types/scan';
import { AppError } from '../../types/errors';
import type { DatabasePort } from './schema';
import { buildSearchFilter } from './searchQuery';

interface ScanRow {
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

export interface NewScanInput {
  id?: string;
  title: string;
  originalImagePath?: string | null;
  processedImagePath?: string | null;
  thumbnailPath?: string | null;
  extractedText: string;
  editedText?: string | null;
  script: RecognitionScript;
  wordCount: number;
  charCount: number;
  createdAt?: number;
}

function rowToRecord(row: ScanRow): ScanRecord {
  return {
    id: row.id,
    title: row.title,
    originalImagePath: row.original_image_path,
    processedImagePath: row.processed_image_path,
    thumbnailPath: row.thumbnail_path,
    extractedText: row.extracted_text,
    editedText: row.edited_text,
    script: row.script as RecognitionScript,
    wordCount: row.word_count,
    charCount: row.char_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const COLUMNS = `id, title, original_image_path, processed_image_path, thumbnail_path,
  extracted_text, edited_text, script, word_count, char_count, created_at, updated_at`;

export interface ScansRepository {
  create(input: NewScanInput): Promise<ScanRecord>;
  get(id: string): Promise<ScanRecord | null>;
  list(): Promise<ScanRecord[]>;
  recent(limit: number): Promise<ScanRecord[]>;
  search(query: string): Promise<ScanRecord[]>;
  updateEditedText(id: string, editedText: string | null, wordCount: number, charCount: number): Promise<void>;
  rename(id: string, title: string): Promise<void>;
  remove(id: string): Promise<ScanRecord | null>;
  removeMany(ids: string[]): Promise<ScanRecord[]>;
  clear(): Promise<ScanRecord[]>;
}

export function createScansRepository(db: DatabasePort): ScansRepository {
  async function mapAll(sql: string, params?: ReadonlyArray<string | number | null>): Promise<ScanRecord[]> {
    try {
      const rows = await db.getAllAsync<ScanRow>(sql, params);
      return rows.map(rowToRecord);
    } catch (error) {
      throw new AppError('DB_ERROR', undefined, error);
    }
  }

  const repository: ScansRepository = {
    async create(input) {
      const now = Date.now();
      const record: ScanRecord = {
        id: input.id ?? cryptoRandomId(),
        title: input.title.trim() || 'Untitled scan',
        originalImagePath: input.originalImagePath ?? null,
        processedImagePath: input.processedImagePath ?? null,
        thumbnailPath: input.thumbnailPath ?? null,
        extractedText: input.extractedText,
        editedText: input.editedText ?? null,
        script: input.script,
        wordCount: input.wordCount,
        charCount: input.charCount,
        createdAt: input.createdAt ?? now,
        updatedAt: now,
      };
      try {
        await db.runAsync(
          `INSERT INTO scans (id, title, original_image_path, processed_image_path, thumbnail_path,
             extracted_text, edited_text, script, word_count, char_count, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            record.id,
            record.title,
            record.originalImagePath,
            record.processedImagePath,
            record.thumbnailPath,
            record.extractedText,
            record.editedText,
            record.script,
            record.wordCount,
            record.charCount,
            record.createdAt,
            record.updatedAt,
          ]
        );
      } catch (error) {
        throw new AppError('DB_ERROR', undefined, error);
      }
      return record;
    },

    async get(id) {
      const rows = await mapAll(`SELECT ${COLUMNS} FROM scans WHERE id = ?`, [id]);
      return rows[0] ?? null;
    },

    list() {
      return mapAll(`SELECT ${COLUMNS} FROM scans ORDER BY updated_at DESC`);
    },

    recent(limit) {
      return mapAll(`SELECT ${COLUMNS} FROM scans ORDER BY updated_at DESC LIMIT ?`, [limit]);
    },

    async search(query) {
      const filter = buildSearchFilter(query);
      if (!filter) return this.list();
      return mapAll(
        `SELECT ${COLUMNS} FROM scans WHERE 1=1 ${filter.sql} ORDER BY updated_at DESC`,
        filter.params
      );
    },

    async updateEditedText(id, editedText, wordCount, charCount) {
      try {
        await db.runAsync(
          'UPDATE scans SET edited_text = ?, word_count = ?, char_count = ?, updated_at = ? WHERE id = ?',
          [editedText, wordCount, charCount, Date.now(), id]
        );
      } catch (error) {
        throw new AppError('DB_ERROR', undefined, error);
      }
    },

    async rename(id, title) {
      try {
        await db.runAsync('UPDATE scans SET title = ?, updated_at = ? WHERE id = ?', [
          title.trim() || 'Untitled scan',
          Date.now(),
          id,
        ]);
      } catch (error) {
        throw new AppError('DB_ERROR', undefined, error);
      }
    },

    async remove(id) {
      const existing = await this.get(id);
      if (!existing) return null;
      try {
        await db.runAsync('DELETE FROM scans WHERE id = ?', [id]);
      } catch (error) {
        throw new AppError('DB_ERROR', undefined, error);
      }
      return existing;
    },

    async removeMany(ids) {
      const records: ScanRecord[] = [];
      for (const id of ids) {
        const removed = await this.remove(id);
        if (removed) records.push(removed);
      }
      return records;
    },

    async clear() {
      const all = await this.list();
      try {
        await db.runAsync('DELETE FROM scans');
      } catch (error) {
        throw new AppError('DB_ERROR', undefined, error);
      }
      return all;
    },
  };

  return repository;
}

function cryptoRandomId(): string {
  const bytes = new Uint8Array(16);
  (globalThis as { crypto?: Crypto }).crypto?.getRandomValues?.(bytes);
  if (!bytes.some((b) => b !== 0)) {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
