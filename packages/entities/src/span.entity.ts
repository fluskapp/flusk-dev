/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

export const SpanTypeSchema = Type.Union([
  Type.Literal('llm'),
  Type.Literal('tool'),
  Type.Literal('retrieval'),
  Type.Literal('chain'),
]);

export const SpanStatusSchema = Type.Union([
  Type.Literal('running'),
  Type.Literal('completed'),
  Type.Literal('failed'),
]);

export const SpanEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    traceId: Type.String({ format: 'uuid', description: 'Parent trace ID' }),
    parentSpanId: Type.Optional(Type.Union([
      Type.String({ format: 'uuid' }),
      Type.Null(),
    ])),
    type: SpanTypeSchema,
    name: Type.String({ description: 'Span name (e.g. step name)' }),
    input: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    output: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    cost: Type.Number({ description: 'Cost for this span' }),
    tokens: Type.Number({ description: 'Token count for this span' }),
    latencyMs: Type.Number({ description: 'Latency in milliseconds' }),
    status: SpanStatusSchema,
    startedAt: Type.String({ format: 'date-time' }),
    completedAt: Type.Optional(Type.Union([
      Type.String({ format: 'date-time' }),
      Type.Null(),
    ])),
  })
]);

export type SpanEntity = Static<typeof SpanEntitySchema>;
