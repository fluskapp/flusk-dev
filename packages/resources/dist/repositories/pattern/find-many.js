import { getPool } from './pool.js';
import { rowToEntity } from './row-to-entity.js';
/**
 * Find all patterns (with optional pagination)
 * @param limit - Maximum number of results (default: 100)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of pattern entities
 */
export async function findMany(limit = 100, offset = 0) {
    const db = getPool();
    const query = `
    SELECT * FROM patterns
    ORDER BY total_cost DESC, occurrence_count DESC
    LIMIT $1 OFFSET $2
  `;
    const result = await db.query(query, [limit, offset]);
    return result.rows.map(rowToEntity);
}
//# sourceMappingURL=find-many.js.map