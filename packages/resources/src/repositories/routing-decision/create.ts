import type { RoutingDecisionEntity } from '@flusk/entities';
import { getPool } from './pool.js';
import { rowToEntity } from './row-to-entity.js';

export interface CreateDecisionInput {
  ruleId: string;
  llmCallId?: string;
  selectedModel: string;
  originalModel: string;
  reason: string;
  costSaved: number;
}

export async function create(input: CreateDecisionInput): Promise<RoutingDecisionEntity> {
  const db = getPool();
  const query = `
    INSERT INTO routing_decisions (rule_id, llm_call_id, selected_model, original_model, reason, cost_saved)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const values = [
    input.ruleId, input.llmCallId ?? null, input.selectedModel,
    input.originalModel, input.reason, input.costSaved,
  ];
  const result = await db.query(query, values);
  return rowToEntity(result.rows[0]);
}
