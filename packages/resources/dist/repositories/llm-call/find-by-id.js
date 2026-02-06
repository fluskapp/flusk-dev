import { getPool } from './pool.js';
import { rowToEntity } from './row-to-entity.js';
/**
 * Find LLM call by UUID
 * @param id - UUID of the LLM call
 * @returns LLM call entity or null if not found
 */
export async function findById(id) {
    const db = getPool();
    const query = 'SELECT * FROM llm_calls WHERE id = $1';
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
        return null;
    }
    return rowToEntity(result.rows[0]);
}
//# sourceMappingURL=find-by-id.js.map