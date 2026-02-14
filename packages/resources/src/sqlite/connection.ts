import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';

const FLUSK_DIR = join(homedir(), '.flusk');
const DB_PATH = join(FLUSK_DIR, 'data.db');

let _db: DatabaseSync | null = null;

/**
 * Get or create the SQLite database connection singleton.
 * Pass ':memory:' for in-memory testing.
 */
export function getDb(path?: string): DatabaseSync {
  if (!_db) {
    const dbPath = path || DB_PATH;
    if (dbPath !== ':memory:') {
      mkdirSync(FLUSK_DIR, { recursive: true });
    }
    _db = new DatabaseSync(dbPath);
    _db.exec('PRAGMA journal_mode=WAL');
    _db.exec('PRAGMA foreign_keys=ON');
  }
  return _db;
}

/**
 * Close the database connection and reset the singleton.
 */
export function closeDb(): void {
  _db?.close();
  _db = null;
}
