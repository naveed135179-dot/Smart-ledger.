import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite';
import { defineCustomElements } from 'jeep-sqlite/loader';

const sqlite = new SQLiteConnection(CapacitorSQLite);
let database: SQLiteDBConnection | null = null;

export async function initDatabase(): Promise<void> {
  if (database) return;

  if (Capacitor.getPlatform() === 'web') {
    defineCustomElements(window);
    await customElements.whenDefined('jeep-sqlite');

    if (!document.querySelector('jeep-sqlite')) {
      document.body.appendChild(document.createElement('jeep-sqlite'));
    }

    await sqlite.initWebStore();
  }

  database = await sqlite.createConnection(
    'smartledger',
    false,
    'no-encryption',
    1,
    false
  );

  await database.open();

  await database.execute(`
    CREATE TABLE IF NOT EXISTS app_records (
      record_key TEXT PRIMARY KEY NOT NULL,
      record_value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      meta_key TEXT PRIMARY KEY NOT NULL,
      meta_value TEXT NOT NULL
    );
  `);

  await migrateLocalStorage();
}

async function migrateLocalStorage(): Promise<void> {
  if (!database) throw new Error('Database is not initialized');

  const marker = await database.query(
    "SELECT meta_value FROM app_meta WHERE meta_key = 'legacy_migration_v1'"
  );

  if (marker.values?.length) return;

  const keys = Object.keys(localStorage).filter((key) =>
    key.startsWith('smartledger-')
  );

  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value === null) continue;

    await database.run(
      'INSERT OR IGNORE INTO app_records (record_key, record_value) VALUES (?, ?)',
      [key, value]
    );
  }

  const copied = await database.query('SELECT COUNT(*) AS total FROM app_records');
  const count = Number(copied.values?.[0]?.total ?? 0);

  await database.run(
    'INSERT OR REPLACE INTO app_meta (meta_key, meta_value) VALUES (?, ?)',
    ['legacy_migration_v1', String(count)]
  );
}

export async function verifyDatabaseMigration(): Promise<{
  localRecords: number;
  databaseRecords: number;
  matchingRecords: number;
}> {
  if (!database) throw new Error('Database is not initialized');

  const keys = Object.keys(localStorage).filter((key) =>
    key.startsWith('smartledger-')
  );

  let matchingRecords = 0;

  for (const key of keys) {
    const original = localStorage.getItem(key);
    const result = await database.query(
      'SELECT record_value FROM app_records WHERE record_key = ?',
      [key]
    );

    if (original !== null && result.values?.[0]?.record_value === original) {
      matchingRecords++;
    }
  }

  const result = await database.query(
    'SELECT COUNT(*) AS total FROM app_records'
  );

  return {
    localRecords: keys.length,
    databaseRecords: Number(result.values?.[0]?.total ?? 0),
    matchingRecords,
  };
}
