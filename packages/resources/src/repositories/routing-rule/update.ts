import type { RoutingRuleEntity } from '@flusk/entities';
import { getPool } from './pool.js';
import { rowToEntity } from './row-to-entity.js';

export async function update(
  id: string,
  fields: Partial<Pick<RoutingRuleEntity, 'name' | 'qualityThreshold' | 'fallbackModel' | 'enabled'>>
): Promise<RoutingRuleEntity | null> {
  const db = getPool();
  const sets: string[] = ['updated_at = now()'];
  const values: unknown[] = [];
  let idx = 1;

  if (fields.name !== undefined) { sets.push(`name = $${idx++}`); values.push(fields.name); }
  if (fields.qualityThreshold !== undefined) { sets.push(`quality_threshold = $${idx++}`); values.push(fields.qualityThreshold); }
  if (fields.fallbackModel !== undefined) { sets.push(`fallback_model = $${idx++}`); values.push(fields.fallbackModel); }
  if (fields.enabled !== undefined) { sets.push(`enabled = $${idx++}`); values.push(fields.enabled); }

  values.push(id);
  const query = `UPDATE routing_rules SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`;
  const result = await db.query(query, values);
  return result.rows[0] ? rowToEntity(result.rows[0]) : null;
}
