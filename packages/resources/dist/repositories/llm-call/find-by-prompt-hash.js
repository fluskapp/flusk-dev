import { getPool } from './pool.js';
import { rowToEntity } from './row-to-entity.js';
/**
 * Find LLM call by prompt hash (for cache lookups)
 * @param hash - SHA-256 hash of the prompt
 * @returns Most recent LLM call with this hash or null if not found
 */
export async function findByPromptHash(hash) {
    const db = getPool();
    const query = `
    SELECT * FROM llm_calls
    WHERE prompt_hash = $1
    ORDER BY created_at DESC
    LIMIT 1
  `;
    const result = await db.query(query, [hash]);
    if (result.rows.length === 0) {
        return null;
    }
    return rowToEntity(result.rows[0]);
}
//# sourceMappingURL=find-by-prompt-hash.js.map