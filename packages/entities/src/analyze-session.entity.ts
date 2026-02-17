/**
 * @generated from packages/schema/entities/analyze-session.entity.yaml
 * Hash: f58dfc2cb015a3164855f7575041cf69c220f34fb186e08c303618b49d505514
 * Generated: 2026-02-17T11:06:33.124Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [typebox] ---
import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

/**
 * AnalyzeSessionEntity schema
 * @generated from AnalyzeSession YAML definition
 */
export const AnalyzeSessionEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    script: Type.String({ description: 'Script path that was analyzed', minLength: 1 }),
    durationMs: Type.Integer({ description: 'Total analysis duration in milliseconds', minimum: 0 }),
    totalCalls: Type.Integer({ description: 'Total LLM calls captured', minimum: 0, default: 0 }),
    totalCost: Type.Number({ description: 'Total cost in USD', minimum: 0, default: 0 }),
    modelsUsed: Type.Unknown({ description: 'List of model identifiers used (JSON array)', default: '[]' }),
    startedAt: Type.String({ format: 'date-time', description: 'ISO datetime when analysis started' }),
    completedAt: Type.Optional(Type.String({ format: 'date-time', description: 'ISO datetime when analysis completed' }))
  })
]);

export type AnalyzeSessionEntity = Static<typeof AnalyzeSessionEntitySchema>;

// --- END GENERATED ---

// --- BEGIN CUSTOM [entity] ---

// --- END CUSTOM ---