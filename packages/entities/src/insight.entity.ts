/**
 * @generated from packages/schema/entities/insight.entity.yaml
 * Generated: 2026-02-18T12:47:00.000Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [typebox] ---
import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

/**
 * InsightEntity schema
 * @generated from Insight YAML definition
 */
export const InsightEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    sessionId: Type.String({ description: 'Explain session ID this insight belongs to' }),
    category: Type.Union([
      Type.Literal('cost-hotspot'),
      Type.Literal('duplicate-calls'),
      Type.Literal('token-waste'),
      Type.Literal('model-downgrade'),
      Type.Literal('caching-opportunity'),
      Type.Literal('error-rate'),
    ], { description: 'Insight category' }),
    severity: Type.Union([
      Type.Literal('critical'),
      Type.Literal('high'),
      Type.Literal('medium'),
      Type.Literal('low'),
    ], { description: 'Severity level' }),
    title: Type.String({ description: 'Short title of the insight', minLength: 1 }),
    description: Type.String({ description: 'Detailed explanation of the insight' }),
    currentCost: Type.Number({ description: 'Current cost in USD', minimum: 0, default: 0 }),
    projectedCost: Type.Number({ description: 'Projected cost after optimization in USD', minimum: 0, default: 0 }),
    savingsPercent: Type.Number({ description: 'Estimated savings percentage', minimum: 0, default: 0 }),
    codeSuggestion: Type.Optional(Type.String({ description: 'Optional code suggestion for the optimization' })),
    provider: Type.String({ description: 'LLM provider related to this insight' }),
    model: Type.String({ description: 'LLM model related to this insight' }),
  }),
]);

export type InsightEntity = Static<typeof InsightEntitySchema>;

// --- END GENERATED ---

// --- BEGIN CUSTOM [entity] ---

// --- END CUSTOM ---
