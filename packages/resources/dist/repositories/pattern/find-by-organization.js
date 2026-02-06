import { getPool } from './pool.js';
import { rowToEntity } from './row-to-entity.js';
/**
 * Find patterns for a specific organization with filters
 * @param organizationId - UUID of the organization
 * @param filters - Optional filtering and sorting options
 * @returns Array of pattern entities matching the criteria
 */
export async function findByOrganization(organizationId, filters = {}) {
    const db = getPool();
    const { minOccurrences = 1, minTotalCost = 0, sortBy = 'totalCost', limit = 100, offset = 0 } = filters;
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
    const result = await db.query(query, [
        organizationId,
        minOccurrences,
        minTotalCost,
        limit,
        offset
    ]);
    return result.rows.map(rowToEntity);
}
//# sourceMappingURL=find-by-organization.js.map