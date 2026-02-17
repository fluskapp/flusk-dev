/**
 * @generated from packages/schema/entities/routing-decision.entity.yaml
 * Hash: 37adb813a69b1bd8dd46d2aef5b36aa3cc858f3f9698453130c46842b4313322
 * Generated: 2026-02-17T11:06:33.202Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [typebox] ---
import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

/**
 * RoutingDecisionEntity schema
 * @generated from RoutingDecision YAML definition
 */
export const RoutingDecisionEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    ruleId: Type.String({ format: 'uuid', description: 'Routing rule that triggered this decision' }),
    llmCallId: Type.Optional(Type.String({ format: 'uuid', description: 'Associated LLM call (if tracked)' })),
    selectedModel: Type.String({ description: 'Model chosen by the router', minLength: 1 }),
    originalModel: Type.String({ description: 'Model originally requested by the user', minLength: 1 }),
    reason: Type.String({ description: 'Why this model was selected (e.g., cheapest-qualifying, fallback, ab-test)' }),
    costSaved: Type.Number({ description: 'Estimated cost savings in USD (can be negative if A/B test)' })
  })
]);

export type RoutingDecisionEntity = Static<typeof RoutingDecisionEntitySchema>;

// --- END GENERATED ---

// --- BEGIN CUSTOM [entity] ---

// --- END CUSTOM ---