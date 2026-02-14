/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { RoutingDecisionEntity } from '@flusk/entities';

export function rowToEntity(row: Record<string, unknown>): RoutingDecisionEntity {
  return {
    id: row.id as string,
    ruleId: row.rule_id as string,
    llmCallId: (row.llm_call_id as string) || undefined,
    selectedModel: row.selected_model as string,
    originalModel: row.original_model as string,
    reason: row.reason as string,
    costSaved: Number(row.cost_saved),
    createdAt: (row.created_at as Date).toISOString(),
  };
}
