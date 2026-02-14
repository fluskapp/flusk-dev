import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

/**
 * Optimization type enum values
 */
export const OptimizationTypeEnum = Type.Union([
  Type.Literal('cache-config'),
  Type.Literal('model-swap'),
  Type.Literal('prompt-dedup'),
  Type.Literal('batch-merge'),
]);

/**
 * Optimization language enum values
 */
export const OptimizationLanguageEnum = Type.Union([
  Type.Literal('typescript'),
  Type.Literal('python'),
  Type.Literal('json'),
]);

/**
 * Optimization status enum values
 */
export const OptimizationStatusEnum = Type.Union([
  Type.Literal('suggested'),
  Type.Literal('applied'),
  Type.Literal('dismissed'),
]);

/**
 * Optimization entity schema
 */
export const OptimizationEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    organizationId: Type.String({ format: 'uuid' }),
    type: OptimizationTypeEnum,
    title: Type.String(),
    description: Type.String(),
    estimatedSavingsPerMonth: Type.Number({ minimum: 0 }),
    generatedCode: Type.String(),
    language: OptimizationLanguageEnum,
    status: OptimizationStatusEnum,
    sourcePatternId: Type.Union([
      Type.String({ format: 'uuid' }),
      Type.Null(),
    ]),
  })
]);

export type OptimizationEntity = Static<typeof OptimizationEntitySchema>;
