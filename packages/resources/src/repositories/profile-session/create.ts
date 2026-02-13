import type { Pool } from 'pg';
import { ProfileSessionEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Create a new profile session record
 */
export async function create(
  pool: Pool,
  data: Omit<ProfileSessionEntity, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ProfileSessionEntity> {
  const query = `
    INSERT INTO profile_sessions (
      name, type, duration_ms, total_samples, hotspots,
      markdown_raw, pprof_path, flamegraph_path, trace_ids,
      organization_id, started_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;

  const values = [
    data.name,
    data.type,
    data.durationMs,
    data.totalSamples,
    JSON.stringify(data.hotspots),
    data.markdownRaw,
    data.pprofPath,
    data.flamegraphPath,
    data.traceIds,
    data.organizationId ?? null,
    data.startedAt,
  ];

  const result = await pool.query(query, values);
  return rowToEntity(result.rows[0]);
}
