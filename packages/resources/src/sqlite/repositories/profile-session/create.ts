import type { DatabaseSync } from 'node:sqlite';
import type { ProfileSessionEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Insert a new profile session record
 */
export function create(
  db: DatabaseSync,
  data: Omit<ProfileSessionEntity, 'id' | 'createdAt' | 'updatedAt'>,
): ProfileSessionEntity {
  const stmt = db.prepare(`
    INSERT INTO profile_sessions (
      name, type, duration_ms, total_samples, hotspots,
      markdown_raw, pprof_path, flamegraph_path, trace_ids,
      organization_id, started_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `);

  const row = stmt.get(
    data.name,
    data.type,
    data.durationMs,
    data.totalSamples,
    JSON.stringify(data.hotspots),
    data.markdownRaw,
    data.pprofPath,
    data.flamegraphPath,
    JSON.stringify(data.traceIds),
    data.organizationId ?? null,
    data.startedAt,
  ) as Record<string, unknown>;

  return rowToEntity(row);
}
