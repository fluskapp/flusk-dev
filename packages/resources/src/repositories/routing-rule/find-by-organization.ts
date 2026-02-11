import type { RoutingRuleEntity } from '@flusk/entities';
import { getPool } from './pool.js';
import { rowToEntity } from './row-to-entity.js';

export async function findByOrganization(
  organizationId: string
): Promise<RoutingRuleEntity[]> {
  const db = getPool();
  const result = await db.query(
    'SELECT * FROM routing_rules WHERE organization_id = $1 ORDER BY created_at DESC',
    [organizationId]
  );
  return result.rows.map(rowToEntity);
}
