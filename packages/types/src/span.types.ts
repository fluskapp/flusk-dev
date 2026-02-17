/**
 * @generated from packages/schema/entities/span.entity.yaml
 * Hash: a509a370bda7a65c5e9bebb1cf2c2a6133ad2a3e28a495b58e2e7efe92400672
 * Generated: 2026-02-17T11:06:33.217Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [types] ---
/**
 * @generated from Span YAML schema
 * DO NOT EDIT — regenerate using: flusk generate entity --from <yaml>
 */

import { Type, Static } from '@sinclair/typebox';
import { SpanEntitySchema } from '@flusk/entities';

export type SpanEntity = Static<typeof SpanEntitySchema>;

export const SpanEntityJSONSchema = SpanEntitySchema;

export const SpanInsertSchema = Type.Omit(SpanEntitySchema, [
  'id', 'createdAt', 'updatedAt',
]);

export type SpanInsert = Static<typeof SpanInsertSchema>;

export const SpanUpdateSchema = Type.Composite([
  Type.Object({ id: Type.String({ format: 'uuid' }) }),
  Type.Partial(Type.Omit(SpanEntitySchema, ['id', 'createdAt', 'updatedAt'])),
]);

export type SpanUpdate = Static<typeof SpanUpdateSchema>;

export const SpanQuerySchema = Type.Partial(SpanEntitySchema);

export type SpanQuery = Static<typeof SpanQuerySchema>;

// --- END GENERATED ---