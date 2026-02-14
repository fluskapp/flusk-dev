import type { Pool } from 'pg';
import { PatternEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';
import { PatternFilters } from './types.js';

/**
 * Find patterns for an organization with filters
 * @param pool - PostgreSQL connection pool
 * @param organizationId - UUID of the organization
 * @param filters - Optional filtering and sorting options
 */
export async function findByOrganization(
  pool: Pool,
  organizationId: string,
  filters: PatternFilters = {}
): Promise<PatternEntity[]> {
  const {
    minOccurrences = 1,
    minTotalCost = 0,
    sortBy = 'totalCost',
    limit = 100,
    offset = 0
  } = filters;

  const sortColumn = {
    occurrences: 'occurrence_count',
    totalCost: 'total_cost',
    lastSeen: 'last_seen_at'
  }[sortBy];

  const query = `
    SELECT * FROM patterns
    WHERE organization_id = $1
      AND occurrence_count >= $2
      AND total_cost >= $3
    ORDER BY ${sortColumn} DESC
    LIMIT $4 OFFSET $5
  `;

  const result = await pool.query(query, [
    organizationId,
    minOccurrences,
    minTotalCost,
    limit,
    offset
  ]);

  return result.rows.map(rowToEntity);
}
