/**
 * @generated from packages/schema/entities/explain-session.entity.yaml
 * Generated: 2026-02-18T12:47:00.000Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [typebox] ---
import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

/**
 * ExplainSessionEntity schema
 * @generated from ExplainSession YAML definition
 */
export const ExplainSessionEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    analyzeSessionId: Type.String({ description: 'ID of the analyze session that was explained' }),
    llmProvider: Type.String({ description: 'LLM provider used for the explain call' }),
    llmModel: Type.String({ description: 'LLM model used for the explain call' }),
    promptTokens: Type.Integer({ description: 'Number of prompt tokens used', minimum: 0, default: 0 }),
    completionTokens: Type.Integer({ description: 'Number of completion tokens used', minimum: 0, default: 0 }),
    explainCost: Type.Number({ description: 'Cost of the explain LLM call in USD', minimum: 0, default: 0 }),
    insightsCount: Type.Integer({ description: 'Number of insights generated', minimum: 0, default: 0 }),
    totalSavings: Type.Number({ description: 'Total projected savings across all insights in USD', minimum: 0, default: 0 }),
  }),
]);

export type ExplainSessionEntity = Static<typeof ExplainSessionEntitySchema>;

// --- END GENERATED ---

// --- BEGIN CUSTOM [entity] ---

// --- END CUSTOM ---
