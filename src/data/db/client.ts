import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseSync } from 'expo-sqlite';
import migrations from './migrations.generated';
import * as schema from './schema';
import type { AppDb } from './types';

let instance: AppDb | null = null;

/** Open the on-device database. Call `runMigrations` once at startup before using it. */
export function getDb(): AppDb {
  if (!instance) {
    const sqlite = openDatabaseSync('recipes.db');
    sqlite.execSync('PRAGMA journal_mode = WAL;');
    sqlite.execSync('PRAGMA foreign_keys = ON;');
    instance = drizzle(sqlite, { schema }) as unknown as AppDb;
  }
  return instance;
}

export async function runMigrations(): Promise<void> {
  await migrate(getDb() as any, migrations);
}
