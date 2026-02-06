import { getPool } from './pool.js';
import { rowToEntity } from './row-to-entity.js';
/**
 * Find accepted conversions for an organization (active automation rules)
 * @param organizationId - UUID of the organization
 * @returns Array of accepted conversion entities
 */
export async function findAccepted(organizationId) {
    const db = getPool();
    const query = `
    SELECT * FROM conversions
    WHERE organization_id = $1 AND status = 'accepted'
    ORDER BY created_at DESC
  `;
    const result = await db.query(query, [organizationId]);
    return result.rows.map(rowToEntity);
}
//# sourceMappingURL=find-accepted.js.map