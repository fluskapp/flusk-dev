/**
 * Harden file-system permissions for SQLite database files.
 * Sets directory to 0o700 and files to 0o600 to prevent
 * world-readable access (fixes #64).
 */
import { chmodSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

export function hardenPermissions(dbPath: string): void {
  if (dbPath === ':memory:') return;
  if (process.platform === 'win32') return;

  const dir = dirname(dbPath);
  try {
    if (existsSync(dir)) chmodSync(dir, 0o700);
    if (existsSync(dbPath)) chmodSync(dbPath, 0o600);
    // WAL and SHM files
    const wal = `${dbPath}-wal`;
    const shm = `${dbPath}-shm`;
    if (existsSync(wal)) chmodSync(wal, 0o600);
    if (existsSync(shm)) chmodSync(shm, 0o600);
  } catch {
    // Best-effort — may fail in some environments
  }
}
