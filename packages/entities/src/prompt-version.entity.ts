/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import { Type, Static } from '@sinclair/typebox';

/**
 * Metrics tracked per prompt version
 */
export const PromptVersionMetricsSchema = Type.Object({
  avgQuality: Type.Number({ description: 'Average quality score 0-1' }),
  avgLatencyMs: Type.Number({ description: 'Average latency in ms' }),
  avgCost: Type.Number({ description: 'Average cost per call' }),
  sampleCount: Type.Number({ description: 'Number of samples collected' }),
});

export type PromptVersionMetrics = Static<typeof PromptVersionMetricsSchema>;

/**
 * PromptVersion entity schema
 * Immutable prompt versions with metrics tracking for A/B testing
 */
export const PromptVersionEntitySchema = Type.Object({
  id: Type.String({ format: 'uuid', description: 'Unique identifier' }),
  templateId: Type.String({ format: 'uuid', description: 'Parent template ID' }),
  version: Type.Number({ description: 'Auto-increment version number per template' }),
  content: Type.String({ description: 'Prompt text with {{variable}} placeholders' }),
  metrics: PromptVersionMetricsSchema,
  status: Type.Union([
    Type.Literal('draft'),
    Type.Literal('active'),
    Type.Literal('archived'),
    Type.Literal('rolled-back'),
  ], { description: 'Version lifecycle status' }),
  createdAt: Type.String({ format: 'date-time', description: 'Creation timestamp' }),
});

export type PromptVersionEntity = Static<typeof PromptVersionEntitySchema>;
