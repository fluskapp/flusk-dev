import type { RoutingRuleEntity } from '@flusk/entities';
import { getPool } from './pool.js';
import { rowToEntity } from './row-to-entity.js';

export async function findById(id: string): Promise<RoutingRuleEntity | null> {
  const db = getPool();
  const result = await db.query('SELECT * FROM routing_rules WHERE id = $1', [id]);
  return result.rows[0] ? rowToEntity(result.rows[0]) : null;
}
