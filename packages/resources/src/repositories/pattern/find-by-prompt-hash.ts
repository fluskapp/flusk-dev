/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { Pool } from 'pg';
import { PatternEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find pattern by organization and prompt hash
 * @param pool - PostgreSQL connection pool
 * @param organizationId - UUID of the organization
 * @param promptHash - SHA-256 hash of the prompt
 */
export async function findByPromptHash(
  pool: Pool,
  organizationId: string,
  promptHash: string
): Promise<PatternEntity | null> {
  const query = `
    SELECT * FROM patterns
    WHERE organization_id = $1 AND prompt_hash = $2
  `;

  const result = await pool.query(query, [organizationId, promptHash]);

  if (result.rows.length === 0) {
    return null;
  }

  return rowToEntity(result.rows[0]);
}
