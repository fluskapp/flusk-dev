/**
 * Model performance types — Upsert + Query variants
 * Note: Uses Upsert instead of Insert/Update because model_performance
 * has a UNIQUE(model, prompt_category) constraint with ON CONFLICT logic
 */

import { Type, Static } from '@sinclair/typebox';
import { ModelPerformanceEntitySchema } from '@flusk/entities';

export type ModelPerformanceEntity = Static<typeof ModelPerformanceEntitySchema>;

export const ModelPerformanceEntityJSONSchema = ModelPerformanceEntitySchema;

/**
 * Upsert variant — fields needed to insert or update performance metrics
 */
export const ModelPerformanceUpsertSchema = Type.Object({
  model: Type.String(),
  promptCategory: Type.String(),
  quality: Type.Number({ minimum: 0, maximum: 1 }),
  latencyMs: Type.Number({ minimum: 0 }),
  costPer1kTokens: Type.Number({ minimum: 0 }),
});
export type ModelPerformanceUpsert = Static<typeof ModelPerformanceUpsertSchema>;

/**
 * Query variant — filterable fields for lookups
 */
export const ModelPerformanceQuerySchema = Type.Partial(
  Type.Pick(ModelPerformanceEntitySchema, ['model', 'promptCategory'])
);
export type ModelPerformanceQuery = Static<typeof ModelPerformanceQuerySchema>;
