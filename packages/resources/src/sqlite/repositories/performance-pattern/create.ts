import type { DatabaseSync } from 'node:sqlite';
import type { PerformancePatternEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Insert a new Performance pattern record into SQLite
 */
export function create(
  db: DatabaseSync,
  data: Omit<PerformancePatternEntity, 'id' | 'createdAt' | 'updatedAt'>,
): PerformancePatternEntity {
  const stmt = db.prepare(`
    INSERT INTO performance_patterns (
      profile_session_id, pattern, severity, description, suggestion,
      metadata, organization_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `);

  const row = stmt.get(
    data.profileSessionId,
    data.pattern,
    data.severity,
    data.description,
    data.suggestion,
    JSON.stringify(data.metadata),
    data.organizationId ?? null,
  ) as Record<string, unknown>;

  return rowToEntity(row);
}
