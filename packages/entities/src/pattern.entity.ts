/**
 * @generated from packages/schema/entities/pattern.entity.yaml
 * Hash: fe9e5cf155222f1b19a751849333104c804ee2e6fc54911539193c29c631809d
 * Generated: 2026-02-17T11:06:33.174Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [typebox] ---
import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

/**
 * PatternEntity schema
 * @generated from Pattern YAML definition
 */
export const PatternEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    organizationId: Type.String({ format: 'uuid', description: 'Organization that owns this pattern' }),
    promptHash: Type.String({ description: 'SHA-256 hash identifying the repeated prompt', minLength: 64, maxLength: 64 }),
    occurrenceCount: Type.Integer({ description: 'Number of times this pattern has been observed', minimum: 1, default: 1 }),
    firstSeenAt: Type.String({ format: 'date-time', description: 'Timestamp of first occurrence' }),
    lastSeenAt: Type.String({ format: 'date-time', description: 'Timestamp of most recent occurrence' }),
    samplePrompts: Type.Unknown({ description: 'Sample prompt texts (up to 5) for review', default: '[]' }),
    avgCost: Type.Number({ description: 'Average cost per occurrence in USD', minimum: 0 }),
    totalCost: Type.Number({ description: 'Total accumulated cost for all occurrences in USD', minimum: 0 }),
    suggestedConversion: Type.Optional(Type.String({ description: 'Suggested automation approach (caching, function, etc.)' }))
  })
]);

export type PatternEntity = Static<typeof PatternEntitySchema>;

// --- END GENERATED ---

// --- BEGIN CUSTOM [entity] ---

// --- END CUSTOM ---