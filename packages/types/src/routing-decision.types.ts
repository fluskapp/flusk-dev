import { Type, Static } from '@sinclair/typebox';
import { RoutingDecisionEntitySchema } from '@flusk/entities';

export type RoutingDecisionEntity = Static<typeof RoutingDecisionEntitySchema>;

export const RoutingDecisionEntityJSONSchema = RoutingDecisionEntitySchema;

export const RoutingDecisionInsertSchema = Type.Omit(
  RoutingDecisionEntitySchema,
  ['id', 'createdAt']
);
export type RoutingDecisionInsert = Static<typeof RoutingDecisionInsertSchema>;

export const RoutingDecisionQuerySchema = Type.Partial(
  Type.Pick(RoutingDecisionEntitySchema, ['ruleId', 'llmCallId', 'selectedModel'])
);
export type RoutingDecisionQuery = Static<typeof RoutingDecisionQuerySchema>;
