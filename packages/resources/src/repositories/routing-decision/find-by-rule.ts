import type { RoutingDecisionEntity } from '@flusk/entities';
import { getPool } from './pool.js';
import { rowToEntity } from './row-to-entity.js';

export async function findByRule(
  ruleId: string,
  limit = 100
): Promise<RoutingDecisionEntity[]> {
  const db = getPool();
  const result = await db.query(
    'SELECT * FROM routing_decisions WHERE rule_id = $1 ORDER BY created_at DESC LIMIT $2',
    [ruleId, limit]
  );
  return result.rows.map(rowToEntity);
}
