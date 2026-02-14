import type { DatabaseSync } from 'node:sqlite';
import type { BudgetAlertEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find Budget alert by id
 */
export function findById(
  db: DatabaseSync,
  id: string,
): BudgetAlertEntity | null {
  const stmt = db.prepare('SELECT * FROM budget_alerts WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  return row ? rowToEntity(row) : null;
}
