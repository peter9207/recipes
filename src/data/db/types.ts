import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type * as schema from './schema';

/** Works for both expo-sqlite (app) and better-sqlite3 (tests): both are synchronous drivers. */
export type AppDb = BaseSQLiteDatabase<'sync', any, typeof schema>;
