/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { DatabaseSync } from 'node:sqlite';
import type { AnalyzeSessionEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Update an analyze session (e.g., set completedAt)
 */
export function update(
  db: DatabaseSync,
  id: string,
  data: Partial<Pick<AnalyzeSessionEntity, 'completedAt' | 'totalCalls' | 'totalCost' | 'modelsUsed'>>,
): AnalyzeSessionEntity | null {
  const sets: string[] = [];
  const values: unknown[] = [];

  if (data.completedAt !== undefined) {
    sets.push('completed_at = ?');
    values.push(data.completedAt);
  }
  if (data.totalCalls !== undefined) {
    sets.push('total_calls = ?');
    values.push(data.totalCalls);
  }
  if (data.totalCost !== undefined) {
    sets.push('total_cost = ?');
    values.push(data.totalCost);
  }
  if (data.modelsUsed !== undefined) {
    sets.push('models_used = ?');
    values.push(JSON.stringify(data.modelsUsed));
  }

  if (sets.length === 0) return null;

  values.push(id);
  const stmt = db.prepare(
    `UPDATE analyze_sessions SET ${sets.join(', ')} WHERE id = ? RETURNING *`,
  );
  const row = stmt.get(...values) as Record<string, unknown> | undefined;
  return row ? rowToEntity(row) : null;
}
