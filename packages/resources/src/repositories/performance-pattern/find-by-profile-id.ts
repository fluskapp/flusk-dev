/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { Pool } from 'pg';
import { PerformancePatternEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find all performance patterns for a profile session
 */
export async function findByProfileId(
  pool: Pool,
  profileSessionId: string,
): Promise<PerformancePatternEntity[]> {
  const query = `
    SELECT * FROM performance_patterns
    WHERE profile_session_id = $1
    ORDER BY severity ASC, created_at DESC
  `;
  const result = await pool.query(query, [profileSessionId]);
  return result.rows.map(rowToEntity);
}
