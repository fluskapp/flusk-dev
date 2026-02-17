/**
 * @generated from packages/schema/entities/routing-rule.entity.yaml
 * Hash: 94a48e390eaeccd07dd1c7507f29087d88cbf6395055664162e8314ad0141ca6
 * Generated: 2026-02-17T11:06:33.203Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [typebox] ---
import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

/**
 * RoutingRuleEntity schema
 * @generated from RoutingRule YAML definition
 */
export const RoutingRuleEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    organizationId: Type.String({ description: 'Organization that owns this routing rule', minLength: 1 }),
    name: Type.String({ description: 'Human-readable name for this routing rule', minLength: 1 }),
    qualityThreshold: Type.Number({ description: 'Minimum quality score (0-1) required for routed model', minimum: 0, maximum: 1 }),
    fallbackModel: Type.String({ description: 'Model to use when no cheaper model meets threshold', minLength: 1 }),
    enabled: Type.Boolean({ description: 'Whether this routing rule is active', default: false })
  })
]);

export type RoutingRuleEntity = Static<typeof RoutingRuleEntitySchema>;

// --- END GENERATED ---

// --- BEGIN CUSTOM [entity] ---

// --- END CUSTOM ---