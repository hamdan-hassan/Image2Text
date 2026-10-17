import * as SQLite from 'expo-sqlite';
import type { DatabasePort } from './schema';
import { MIGRATIONS } from './schema';
import { logger } from '../../utils/logger';
import { AppError } from '../../types/errors';

let dbPromise: Promise<DatabasePort> | null = null;

function adapt(db: SQLite.SQLiteDatabase): DatabasePort {
  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: (sql, params) => db.runAsync(sql, params ? [...params] : []),
    getAllAsync: <T>(sql: string, params?: ReadonlyArray<string | number | null>) =>
      db.getAllAsync<T>(sql, params ? [...params] : []),
    getFirstAsync: async <T>(sql: string, params?: ReadonlyArray<string | number | null>) => {
      const row = await db.getFirstAsync<T>(sql, params ? [...params] : []);
      return row ?? null;
    },
    withTransactionAsync: (task) => db.withTransactionAsync(task),
  };
}

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = versionRow?.user_version ?? 0;
  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) continue;
    await db.withTransactionAsync(async () => {
      for (const statement of migration.statements) {
        await db.execAsync(statement);
      }
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
    logger.info('LOG', `database migrated to v${migration.version}`);
  }
}

export function openAppDatabase(): Promise<DatabasePort> {
  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        const db = await SQLite.openDatabaseAsync('image2text.db');
        await db.execAsync('PRAGMA journal_mode = WAL');
        await runMigrations(db);
        return adapt(db);
      } catch (error) {
        dbPromise = null;
        throw new AppError('DB_ERROR', undefined, error);
      }
    })();
  }
  return dbPromise;
}
