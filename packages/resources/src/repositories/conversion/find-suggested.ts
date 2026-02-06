import { ConversionEntity } from '@flusk/entities';
import { getPool } from './pool.js';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find suggested conversions for an organization (pending user review)
 * @param organizationId - UUID of the organization
 * @returns Array of suggested conversion entities
 */
export async function findSuggested(organizationId: string): Promise<ConversionEntity[]> {
  const db = getPool();

  const query = `
    SELECT * FROM conversions
    WHERE organization_id = $1 AND status = 'suggested'
    ORDER BY estimated_savings DESC, created_at DESC
  `;

  const result = await db.query(query, [organizationId]);
  return result.rows.map(rowToEntity);
}
