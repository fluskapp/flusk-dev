import { getPool } from './pool.js';
/**
 * Hard delete LLM call record (GDPR compliance)
 * @param id - UUID of the LLM call to delete
 * @returns true if deleted, false if not found
 */
export async function hardDelete(id) {
    const db = getPool();
    const query = 'DELETE FROM llm_calls WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0;
}
//# sourceMappingURL=hard-delete.js.map