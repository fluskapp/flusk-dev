import { Type, Static } from '@sinclair/typebox';
import { ModelPerformanceEntitySchema } from '@flusk/entities';

export type ModelPerformanceEntity = Static<typeof ModelPerformanceEntitySchema>;

export const ModelPerformanceEntityJSONSchema = ModelPerformanceEntitySchema;

export const ModelPerformanceUpsertSchema = Type.Object({
  model: Type.String(),
  promptCategory: Type.String(),
  quality: Type.Number({ minimum: 0, maximum: 1 }),
  latencyMs: Type.Number({ minimum: 0 }),
  costPer1kTokens: Type.Number({ minimum: 0 }),
});
export type ModelPerformanceUpsert = Static<typeof ModelPerformanceUpsertSchema>;

export const ModelPerformanceQuerySchema = Type.Partial(
  Type.Pick(ModelPerformanceEntitySchema, ['model', 'promptCategory'])
);
export type ModelPerformanceQuery = Static<typeof ModelPerformanceQuerySchema>;
