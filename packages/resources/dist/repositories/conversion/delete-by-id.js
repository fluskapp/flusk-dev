import { getPool } from './pool.js';
/**
 * Delete conversion by ID
 * @param id - UUID of the conversion to delete
 * @returns True if deleted, false if not found
 */
export async function deleteById(id) {
    const db = getPool();
    const query = 'DELETE FROM conversions WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0;
}
//# sourceMappingURL=delete-by-id.js.map