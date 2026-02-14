/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

/**
 * PatternEntity schema - captures detected repetitive prompt patterns
 * Identifies optimization opportunities by grouping duplicate API calls
 */
export const PatternEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    organizationId: Type.String({
      format: 'uuid',
      description: 'Organization that owns this pattern'
    }),
    promptHash: Type.String({
      description: 'SHA-256 hash identifying the repeated prompt',
      minLength: 64,
      maxLength: 64
    }),
    occurrenceCount: Type.Integer({
      description: 'Number of times this pattern has been observed',
      minimum: 1,
      default: 1
    }),
    firstSeenAt: Type.String({
      format: 'date-time',
      description: 'Timestamp of first occurrence'
    }),
    lastSeenAt: Type.String({
      format: 'date-time',
      description: 'Timestamp of most recent occurrence'
    }),
    samplePrompts: Type.Array(Type.String(), {
      description: 'Sample prompt texts (up to 5) for review',
      maxItems: 5,
      default: []
    }),
    avgCost: Type.Number({
      description: 'Average cost per occurrence in USD',
      minimum: 0
    }),
    totalCost: Type.Number({
      description: 'Total accumulated cost for all occurrences in USD',
      minimum: 0
    }),
    suggestedConversion: Type.Optional(
      Type.String({
        description: 'Suggested automation approach (caching, function, etc.)'
      })
    )
  })
]);

export type PatternEntity = Static<typeof PatternEntitySchema>;
