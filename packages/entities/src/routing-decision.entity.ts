import { Type, Static } from '@sinclair/typebox';

/**
 * RoutingDecisionEntity schema - records each routing decision and savings
 * Used for analytics, A/B test tracking, and cost savings reports
 */
export const RoutingDecisionEntitySchema = Type.Object({
  id: Type.String({ format: 'uuid', description: 'Unique identifier' }),
  ruleId: Type.String({
    format: 'uuid',
    description: 'Routing rule that triggered this decision',
  }),
  llmCallId: Type.Optional(Type.String({
    format: 'uuid',
    description: 'Associated LLM call (if tracked)',
  })),
  selectedModel: Type.String({
    description: 'Model chosen by the router',
    minLength: 1,
  }),
  originalModel: Type.String({
    description: 'Model originally requested by the user',
    minLength: 1,
  }),
  reason: Type.String({
    description: 'Why this model was selected (e.g., cheapest-qualifying, fallback, ab-test)',
  }),
  costSaved: Type.Number({
    description: 'Estimated cost savings in USD (can be negative if A/B test)',
  }),
  createdAt: Type.String({
    format: 'date-time',
    description: 'When the routing decision was made',
  }),
});

export type RoutingDecisionEntity = Static<typeof RoutingDecisionEntitySchema>;
