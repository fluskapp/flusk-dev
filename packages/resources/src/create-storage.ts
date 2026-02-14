import type { StorageAdapter } from './storage.js';
import { createSqliteStorage } from './sqlite-storage.js';

/**
 * Factory: create the appropriate storage adapter based on mode.
 * Defaults to SQLite for CLI, Postgres for server mode.
 */
export function createStorage(
  mode?: 'sqlite' | 'postgres',
): StorageAdapter {
  const resolved = mode
    || (process.env.FLUSK_MODE === 'server' ? 'postgres' : 'sqlite');

  if (resolved === 'sqlite') {
    return createSqliteStorage();
  }

  // Postgres adapter is a future exercise — throw for now
  throw new Error(
    'Postgres storage adapter not yet implemented in unified interface. Use FLUSK_MODE=sqlite or individual pg repositories.',
  );
}
