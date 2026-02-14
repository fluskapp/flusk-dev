/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { Pool } from 'pg';
import { ProfileSessionEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';
import { findById } from './find-by-id.js';

type UpdatableFields = Partial<Omit<ProfileSessionEntity, 'id' | 'createdAt' | 'updatedAt'>>;

const FIELD_MAP: Record<string, string> = {
  name: 'name',
  type: 'type',
  durationMs: 'duration_ms',
  totalSamples: 'total_samples',
  hotspots: 'hotspots',
  markdownRaw: 'markdown_raw',
  pprofPath: 'pprof_path',
  flamegraphPath: 'flamegraph_path',
  traceIds: 'trace_ids',
  organizationId: 'organization_id',
  startedAt: 'started_at',
};

/**
 * Update profile session by id
 */
export async function update(
  pool: Pool,
  id: string,
  data: UpdatableFields
): Promise<ProfileSessionEntity | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  for (const [key, col] of Object.entries(FIELD_MAP)) {
    const val = (data as Record<string, unknown>)[key];
    if (val !== undefined) {
      updates.push(`${col} = $${paramCount++}`);
      values.push(key === 'hotspots' ? JSON.stringify(val) : val);
    }
  }

  if (updates.length === 0) {
    return findById(pool, id);
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const query = `
    UPDATE profile_sessions
    SET ${updates.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  if (result.rows.length === 0) return null;
  return rowToEntity(result.rows[0]);
}
