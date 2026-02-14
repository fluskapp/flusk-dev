/** @generated —
 * Routing decision types — Insert + Query variants
 * Note: No Update variant — routing decisions are immutable once recorded
 */

import { Type, Static } from '@sinclair/typebox';
import { RoutingDecisionEntitySchema } from '@flusk/entities';

export type RoutingDecisionEntity = Static<typeof RoutingDecisionEntitySchema>;

export const RoutingDecisionEntityJSONSchema = RoutingDecisionEntitySchema;

/**
 * Insert variant — excludes auto-generated fields (id, createdAt)
 */
export const RoutingDecisionInsertSchema = Type.Omit(
  RoutingDecisionEntitySchema,
  ['id', 'createdAt']
);
export type RoutingDecisionInsert = Static<typeof RoutingDecisionInsertSchema>;

/**
 * Query variant — filterable fields for lookups
 */
export const RoutingDecisionQuerySchema = Type.Partial(
  Type.Pick(RoutingDecisionEntitySchema, ['ruleId', 'llmCallId', 'selectedModel'])
);
export type RoutingDecisionQuery = Static<typeof RoutingDecisionQuerySchema>;
