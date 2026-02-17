/**
 * @generated from packages/schema/entities/trace.entity.yaml
 * Hash: 5a83b15898453b0db68e839b0be2387736e00bfa748d24a8b1fc755f781e2010
 * Generated: 2026-02-17T11:06:33.220Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [typebox] ---
import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

/**
 * TraceEntity schema
 * @generated from Trace YAML definition
 */
export const TraceEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    organizationId: Type.String({ format: 'uuid', description: 'Organization ID' }),
    name: Type.String({ description: 'Trace name (e.g. agent workflow name)' }),
    totalCost: Type.Number({ description: 'Aggregated cost across all spans' }),
    totalTokens: Type.Number({ description: 'Aggregated token count' }),
    totalLatencyMs: Type.Number({ description: 'Total latency in milliseconds' }),
    callCount: Type.Number({ description: 'Number of LLM calls in this trace' }),
    status: Type.Union([Type.Literal('running'), Type.Literal('completed'), Type.Literal('failed')]),
    startedAt: Type.String({ format: 'date-time', description: 'When the trace began' }),
    completedAt: Type.Optional(Type.String({ format: 'date-time', description: 'When the trace completed' }))
  })
]);

export type TraceEntity = Static<typeof TraceEntitySchema>;

// --- END GENERATED ---

// --- BEGIN CUSTOM [entity] ---

// --- END CUSTOM ---