import { Type } from '@sinclair/typebox';

/**
 * Response schema for pattern entity
 */
export const PatternResponseSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
  organizationId: Type.String({ format: 'uuid' }),
  promptHash: Type.String({ minLength: 64, maxLength: 64 }),
  occurrenceCount: Type.Integer({ minimum: 1 }),
  firstSeenAt: Type.String({ format: 'date-time' }),
  lastSeenAt: Type.String({ format: 'date-time' }),
  samplePrompts: Type.Array(Type.String(), { maxItems: 5 }),
  avgCost: Type.Number({ minimum: 0 }),
  totalCost: Type.Number({ minimum: 0 }),
  suggestedConversion: Type.Optional(Type.String())
});

/**
 * Query parameters for pattern list
 */
export const PatternQuerySchema = Type.Object({
  organizationId: Type.Optional(Type.String({ format: 'uuid' })),
  minOccurrences: Type.Optional(Type.Integer({ minimum: 1 })),
  minTotalCost: Type.Optional(Type.Number({ minimum: 0 })),
  sortBy: Type.Optional(Type.Union([
    Type.Literal('occurrences'),
    Type.Literal('totalCost'),
    Type.Literal('lastSeen')
  ])),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 1000 })),
  offset: Type.Optional(Type.Integer({ minimum: 0 }))
});
