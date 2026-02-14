import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

/**
 * PerformancePatternEntity schema
 * @generated from PerformancePattern YAML definition
 */
export const PerformancePatternEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    profileSessionId: Type.String({ format: 'uuid', description: 'FK to profile_sessions' }),
    pattern: Type.String({ description: 'Pattern type name' }),
    severity: Type.Union([Type.Literal('critical'), Type.Literal('high'), Type.Literal('medium'), Type.Literal('low')]),
    description: Type.String({ description: 'Human-readable description' }),
    suggestion: Type.String({ description: 'Actionable suggestion for the developer' }),
    metadata: Type.Unknown({ description: 'Extra context (hotspot data, llm call ids)', default: '{}' }),
    organizationId: Type.Optional(Type.String({ description: 'Organization ID for multi-tenant', minLength: 1 }))
  })
]);

export type PerformancePatternEntity = Static<typeof PerformancePatternEntitySchema>;
