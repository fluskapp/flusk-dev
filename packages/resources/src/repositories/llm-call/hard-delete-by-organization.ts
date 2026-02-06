import { getPool } from './pool.js';

/**
 * Hard delete all LLM calls for an organization (GDPR compliance)
 * @param organizationId - Organization ID
 * @returns Number of records deleted
 */
export async function hardDeleteByOrganization(organizationId: string): Promise<number> {
  const db = getPool();

  const query = 'DELETE FROM llm_calls WHERE organization_id = $1';
  const result = await db.query(query, [organizationId]);

  return result.rowCount || 0;
}
