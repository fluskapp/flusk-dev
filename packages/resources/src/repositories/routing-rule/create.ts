/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { Pool } from 'pg';
import type { RoutingRuleEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

export async function create(
  pool: Pool,
  rule: Omit<RoutingRuleEntity, 'id' | 'createdAt' | 'updatedAt'>
): Promise<RoutingRuleEntity> {
  const query = `
    INSERT INTO routing_rules (
      organization_id, name, quality_threshold,
      fallback_model, enabled
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const values = [
    rule.organizationId, rule.name, rule.qualityThreshold,
    rule.fallbackModel, rule.enabled,
  ];
  const result = await pool.query(query, values);
  return rowToEntity(result.rows[0]);
}
