import type { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL_DIR = join(__dirname, 'sql');

/**
 * Run all pending SQLite migrations in order.
 * Tracks applied migrations in a `_migrations` table.
 */
export function runMigrations(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const applied = getAppliedMigrations(db);
  const files = getSqlFiles();

  for (const file of files) {
    if (!applied.has(file)) {
      const sql = readFileSync(join(SQL_DIR, file), 'utf-8');
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
    }
  }
}

function getAppliedMigrations(db: DatabaseSync): Set<string> {
  const stmt = db.prepare('SELECT name FROM _migrations');
  const rows = stmt.all() as Array<{ name: string }>;
  return new Set(rows.map((r) => r.name));
}

function getSqlFiles(): string[] {
  try {
    return readdirSync(SQL_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();
  } catch {
    return [];
  }
}
