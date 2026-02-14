/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { Pool } from 'pg';
import type { RoutingDecisionEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

export interface CreateDecisionInput {
  ruleId: string;
  llmCallId?: string;
  selectedModel: string;
  originalModel: string;
  reason: string;
  costSaved: number;
}

export async function create(
  pool: Pool,
  input: CreateDecisionInput
): Promise<RoutingDecisionEntity> {
  const query = `
    INSERT INTO routing_decisions (
      rule_id, llm_call_id, selected_model,
      original_model, reason, cost_saved
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const values = [
    input.ruleId, input.llmCallId ?? null, input.selectedModel,
    input.originalModel, input.reason, input.costSaved,
  ];
  const result = await pool.query(query, values);
  return rowToEntity(result.rows[0]);
}
