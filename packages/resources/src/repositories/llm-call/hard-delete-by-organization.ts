/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { Pool } from 'pg';

/**
 * Hard delete all LLM calls for an organization (GDPR compliance)
 * @param pool - PostgreSQL connection pool
 * @param organizationId - Organization ID
 * @returns Number of records deleted
 */
export async function hardDeleteByOrganization(
  pool: Pool,
  organizationId: string
): Promise<number> {
  const query = 'DELETE FROM llm_calls WHERE organization_id = $1';
  const result = await pool.query(query, [organizationId]);

  return result.rowCount || 0;
}
