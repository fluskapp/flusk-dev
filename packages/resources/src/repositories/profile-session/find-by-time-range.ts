/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { Pool } from 'pg';
import { ProfileSessionEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find profile sessions within a time range
 */
export async function findByTimeRange(
  pool: Pool,
  startTime: string,
  endTime: string
): Promise<ProfileSessionEntity[]> {
  const query = `
    SELECT * FROM profile_sessions
    WHERE started_at BETWEEN $1 AND $2
    ORDER BY started_at DESC
  `;
  const result = await pool.query(query, [startTime, endTime]);
  return result.rows.map(rowToEntity);
}
