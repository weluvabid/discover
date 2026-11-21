import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import schema from './schema.sql?raw';

export function openDatabase(
  path = process.env.DATABASE_PATH ?? resolve(process.cwd(), 'data/roblox-games.db'),
): DatabaseSync {
  mkdirSync(dirname(path), { recursive: true });

  const db = new DatabaseSync(path, { enableForeignKeyConstraints: true });

  db.exec(schema);

  return db;
}


/**
 * Opens an existing catalog without creating directories, applying schema, or
 * acquiring a write-capable connection. Intended for diagnostics/benchmarks.
 */
export function openDatabaseReadOnly(
  path = process.env.DATABASE_PATH ?? resolve(process.cwd(), 'data/roblox-games.db'),
): DatabaseSync {
  return new DatabaseSync(path, {
    readOnly: true,
    enableForeignKeyConstraints: true,
  });
}
