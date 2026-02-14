import type { Pool } from 'pg';
import type { RoutingDecisionEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

export async function findByRule(
  pool: Pool,
  ruleId: string,
  limit = 100
): Promise<RoutingDecisionEntity[]> {
  const result = await pool.query(
    'SELECT * FROM routing_decisions WHERE rule_id = $1 ORDER BY created_at DESC LIMIT $2',
    [ruleId, limit]
  );
  return result.rows.map(rowToEntity);
}
