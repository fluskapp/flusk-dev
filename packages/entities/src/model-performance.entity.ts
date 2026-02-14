/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import { Type, Static } from '@sinclair/typebox';

/**
 * ModelPerformanceEntity schema - tracks model quality/cost per prompt category
 * Self-improving routing table: updated after every tracked LLM call
 */
export const ModelPerformanceEntitySchema = Type.Object({
  id: Type.String({ format: 'uuid', description: 'Unique identifier' }),
  model: Type.String({
    description: 'Model identifier (e.g., gpt-4o-mini)',
    minLength: 1,
  }),
  promptCategory: Type.String({
    description: 'Complexity category: simple, medium, complex',
    minLength: 1,
  }),
  avgQuality: Type.Number({
    description: 'Average quality score (0-1) for this model+category',
    minimum: 0,
    maximum: 1,
  }),
  avgLatencyMs: Type.Number({
    description: 'Average latency in milliseconds',
    minimum: 0,
  }),
  avgCostPer1kTokens: Type.Number({
    description: 'Average cost per 1k tokens in USD',
    minimum: 0,
  }),
  sampleCount: Type.Integer({
    description: 'Number of samples used to compute averages',
    minimum: 0,
  }),
  updatedAt: Type.String({
    format: 'date-time',
    description: 'Last time metrics were updated',
  }),
});

export type ModelPerformanceEntity = Static<typeof ModelPerformanceEntitySchema>;
