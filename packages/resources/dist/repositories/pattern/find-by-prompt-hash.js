import { getPool } from './pool.js';
import { rowToEntity } from './row-to-entity.js';
/**
 * Find pattern by organization and prompt hash
 * Used for checking if pattern already exists before creating
 * @param organizationId - UUID of the organization
 * @param promptHash - SHA-256 hash of the prompt
 * @returns Pattern entity or null if not found
 */
export async function findByPromptHash(organizationId, promptHash) {
    const db = getPool();
    const query = `
    SELECT * FROM patterns
    WHERE organization_id = $1 AND prompt_hash = $2
  `;
    const result = await db.query(query, [organizationId, promptHash]);
    if (result.rows.length === 0) {
        return null;
    }
    return rowToEntity(result.rows[0]);
}
//# sourceMappingURL=find-by-prompt-hash.js.map