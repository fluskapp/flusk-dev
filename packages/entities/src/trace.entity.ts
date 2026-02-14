/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

export const TraceStatusSchema = Type.Union([
  Type.Literal('running'),
  Type.Literal('completed'),
  Type.Literal('failed'),
]);

export const TraceEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    organizationId: Type.String({ format: 'uuid', description: 'Organization ID' }),
    name: Type.String({ description: 'Trace name (e.g. agent workflow name)' }),
    totalCost: Type.Number({ description: 'Aggregated cost across all spans' }),
    totalTokens: Type.Number({ description: 'Aggregated token count' }),
    totalLatencyMs: Type.Number({ description: 'Total latency in milliseconds' }),
    callCount: Type.Number({ description: 'Number of LLM calls in this trace' }),
    status: TraceStatusSchema,
    startedAt: Type.String({ format: 'date-time', description: 'When the trace began' }),
    completedAt: Type.Optional(Type.Union([
      Type.String({ format: 'date-time' }),
      Type.Null(),
    ])),
  })
]);

export type TraceEntity = Static<typeof TraceEntitySchema>;
