/**
 * @generated from packages/schema/entities/span.entity.yaml
 * Hash: a509a370bda7a65c5e9bebb1cf2c2a6133ad2a3e28a495b58e2e7efe92400672
 * Generated: 2026-02-17T11:06:33.217Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [typebox] ---
import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

/**
 * SpanEntity schema
 * @generated from Span YAML definition
 */
export const SpanEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    traceId: Type.String({ format: 'uuid', description: 'Parent trace ID' }),
    parentSpanId: Type.Optional(Type.String({ format: 'uuid', description: 'Parent span ID for nested spans' })),
    spanType: Type.Union([Type.Literal('llm'), Type.Literal('tool'), Type.Literal('retrieval'), Type.Literal('chain')]),
    name: Type.String({ description: 'Span name (e.g. step name)' }),
    input: Type.Optional(Type.String({ description: 'Input data' })),
    output: Type.Optional(Type.String({ description: 'Output data' })),
    cost: Type.Number({ description: 'Cost for this span' }),
    tokens: Type.Number({ description: 'Token count for this span' }),
    latencyMs: Type.Number({ description: 'Latency in milliseconds' }),
    status: Type.Union([Type.Literal('running'), Type.Literal('completed'), Type.Literal('failed')]),
    startedAt: Type.String({ format: 'date-time', description: 'When the span started' }),
    completedAt: Type.Optional(Type.String({ format: 'date-time', description: 'When the span completed' }))
  })
]);

export type SpanEntity = Static<typeof SpanEntitySchema>;

// --- END GENERATED ---

// --- BEGIN CUSTOM [entity] ---

// --- END CUSTOM ---