/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { Pool } from 'pg';
import { ConversionEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find suggested conversions for an organization (pending review)
 * @param pool - PostgreSQL connection pool
 * @param organizationId - UUID of the organization
 */
export async function findSuggested(
  pool: Pool,
  organizationId: string
): Promise<ConversionEntity[]> {
  const query = `
    SELECT * FROM conversions
    WHERE organization_id = $1 AND status = 'suggested'
    ORDER BY estimated_savings DESC, created_at DESC
  `;

  const result = await pool.query(query, [organizationId]);
  return result.rows.map(rowToEntity);
}
