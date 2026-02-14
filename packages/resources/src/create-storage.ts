/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { StorageAdapter } from './storage.js';
import { createSqliteStorage } from './sqlite-storage.js';

/**
 * Factory: create the appropriate storage adapter.
 * Currently only SQLite is supported (CLI-first architecture).
 */
export function createStorage(): StorageAdapter {
  return createSqliteStorage();
}
