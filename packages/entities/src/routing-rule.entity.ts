import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

/**
 * RoutingRuleEntity schema - defines model routing rules per organization
 * Users set quality thresholds and Flusk routes to the cheapest qualifying model
 */
export const RoutingRuleEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    organizationId: Type.String({
      description: 'Organization that owns this routing rule',
      minLength: 1,
    }),
    name: Type.String({
      description: 'Human-readable name for this routing rule',
      minLength: 1,
    }),
    qualityThreshold: Type.Number({
      description: 'Minimum quality score (0-1) required for routed model',
      minimum: 0,
      maximum: 1,
    }),
    fallbackModel: Type.String({
      description: 'Model to use when no cheaper model meets threshold',
      minLength: 1,
    }),
    enabled: Type.Boolean({
      description: 'Whether this routing rule is active',
      default: false,
    }),
  }),
]);

export type RoutingRuleEntity = Static<typeof RoutingRuleEntitySchema>;
