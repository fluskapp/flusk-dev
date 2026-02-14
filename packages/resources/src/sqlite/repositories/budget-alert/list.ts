import type { DatabaseSync } from 'node:sqlite';
import type { BudgetAlertEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * List Budget alerts with pagination
 */
export function list(
  db: DatabaseSync,
  limit = 50,
  offset = 0,
): BudgetAlertEntity[] {
  const stmt = db.prepare(
    'SELECT * FROM budget_alerts ORDER BY created_at DESC LIMIT ? OFFSET ?',
  );
  const rows = stmt.all(limit, offset) as Record<string, unknown>[];
  return rows.map(rowToEntity);
}
