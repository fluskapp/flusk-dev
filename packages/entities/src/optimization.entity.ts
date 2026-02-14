import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

/**
 * OptimizationEntity schema
 * @generated from Optimization YAML definition
 */
export const OptimizationEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    organizationId: Type.String({ format: 'uuid', description: 'Organization that owns this optimization' }),
    optimizationType: Type.Union([Type.Literal('cache-config'), Type.Literal('model-swap'), Type.Literal('prompt-dedup'), Type.Literal('batch-merge')]),
    title: Type.String({ description: 'Human-readable title' }),
    description: Type.String({ description: 'Detailed description of the optimization' }),
    estimatedSavingsPerMonth: Type.Number({ description: 'Estimated monthly savings in USD', minimum: 0 }),
    generatedCode: Type.String({ description: 'Generated code snippet implementing the optimization' }),
    language: Type.Union([Type.Literal('typescript'), Type.Literal('python'), Type.Literal('json')]),
    status: Type.Union([Type.Literal('suggested'), Type.Literal('applied'), Type.Literal('dismissed')]),
    sourcePatternId: Type.Optional(Type.String({ format: 'uuid', description: 'Pattern that triggered this optimization (nullable)' }))
  })
]);

export type OptimizationEntity = Static<typeof OptimizationEntitySchema>;
