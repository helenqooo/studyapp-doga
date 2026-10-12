import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { SERVER_ROOT } from '../env';
import * as schema from './schema';

export type Db = ReturnType<typeof openDb>;

export function openDb(dbFile: string) {
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  const sqlite = new Database(dbFile);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(SERVER_ROOT, 'drizzle') });
  db.insert(schema.profile).values({ id: 1 }).onConflictDoNothing().run();
  return db;
}
