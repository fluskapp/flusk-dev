import type { Pool } from 'pg';
import { ConversionEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find accepted conversions for an organization
 * @param pool - PostgreSQL connection pool
 * @param organizationId - UUID of the organization
 */
export async function findAccepted(
  pool: Pool,
  organizationId: string
): Promise<ConversionEntity[]> {
  const query = `
    SELECT * FROM conversions
    WHERE organization_id = $1 AND status = 'accepted'
    ORDER BY created_at DESC
  `;

  const result = await pool.query(query, [organizationId]);
  return result.rows.map(rowToEntity);
}
