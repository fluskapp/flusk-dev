/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

export const SeveritySchema = Type.Union([
  Type.Literal('critical'),
  Type.Literal('high'),
  Type.Literal('medium'),
  Type.Literal('low'),
]);

export type Severity = Static<typeof SeveritySchema>;

/**
 * PerformancePattern entity — detected performance patterns
 * from profiling data combined with LLM call analysis.
 */
export const PerformancePatternEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    profileSessionId: Type.String({
      format: 'uuid',
      description: 'FK to profile_sessions',
    }),
    pattern: Type.String({ description: 'Pattern type name' }),
    severity: SeveritySchema,
    description: Type.String({ description: 'Human-readable description' }),
    suggestion: Type.String({ description: 'Actionable suggestion' }),
    metadata: Type.Record(Type.String(), Type.Unknown(), {
      description: 'Extra context (hotspot data, llm call ids)',
    }),
    organizationId: Type.Optional(Type.String({
      description: 'Organization ID for multi-tenant',
      minLength: 1,
    })),
  }),
]);

export type PerformancePatternEntity = Static<
  typeof PerformancePatternEntitySchema
>;
