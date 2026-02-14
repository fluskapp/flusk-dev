/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { DatabaseSync } from 'node:sqlite';
import type { AnalyzeSessionEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Insert a new analyze session record
 */
export function create(
  db: DatabaseSync,
  data: Omit<AnalyzeSessionEntity, 'id' | 'createdAt' | 'updatedAt'>,
): AnalyzeSessionEntity {
  const stmt = db.prepare(`
    INSERT INTO analyze_sessions (
      script, duration_ms, total_calls, total_cost,
      models_used, started_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `);

  const row = stmt.get(
    data.script,
    data.durationMs,
    data.totalCalls,
    data.totalCost,
    JSON.stringify(data.modelsUsed),
    data.startedAt,
    data.completedAt ?? null,
  ) as Record<string, unknown>;

  return rowToEntity(row);
}
