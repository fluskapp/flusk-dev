/**
 * @generated from packages/schema/entities/optimization.entity.yaml
 * Hash: 0ba47a00ef41248312952eb9f4235c7d3787cc600783c1c6ff8f2ba04fdf3a0e
 * Generated: 2026-02-17T11:06:33.156Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [typebox] ---
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

// --- END GENERATED ---

// --- BEGIN CUSTOM [entity] ---

// --- END CUSTOM ---