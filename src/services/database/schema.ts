export interface DbRunResult {
  changes: number;
  lastInsertRowId: number | number[];
}

/**
 * Minimal persistence port satisfied by expo-sqlite's SQLiteDatabase.
 * Keeping the repository behind this interface makes the data layer unit-testable
 * without a native database.
 */
export interface DatabasePort {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: ReadonlyArray<string | number | null>): Promise<DbRunResult>;
  getAllAsync<T>(sql: string, params?: ReadonlyArray<string | number | null>): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: ReadonlyArray<string | number | null>): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

/** Monotonic schema versions; each entry must leave the DB valid for the next. */
export const MIGRATIONS: Array<{ version: number; statements: string[] }> = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS scans (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        original_image_path TEXT,
        processed_image_path TEXT,
        thumbnail_path TEXT,
        extracted_text TEXT NOT NULL DEFAULT '',
        edited_text TEXT,
        script TEXT NOT NULL DEFAULT 'Latin',
        word_count INTEGER NOT NULL DEFAULT 0,
        char_count INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      'CREATE INDEX IF NOT EXISTS idx_scans_updated_at ON scans (updated_at DESC)',
    ],
  },
];
