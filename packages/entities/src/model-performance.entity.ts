import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

/**
 * ModelPerformanceEntity schema
 * @generated from ModelPerformance YAML definition
 */
export const ModelPerformanceEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    model: Type.String({ description: 'Model identifier (e.g., gpt-4o-mini)', minLength: 1 }),
    promptCategory: Type.String({ description: 'Complexity category (simple, medium, complex)', minLength: 1 }),
    avgQuality: Type.Number({ description: 'Average quality score (0-1) for this model+category', minimum: 0, maximum: 1 }),
    avgLatencyMs: Type.Number({ description: 'Average latency in milliseconds', minimum: 0 }),
    avgCostPer1kTokens: Type.Number({ description: 'Average cost per 1k tokens in USD', minimum: 0 }),
    sampleCount: Type.Integer({ description: 'Number of samples used to compute averages', minimum: 0 })
  })
]);

export type ModelPerformanceEntity = Static<typeof ModelPerformanceEntitySchema>;
