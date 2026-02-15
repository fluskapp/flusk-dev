/**
 * @generated from Span YAML schema
 * DO NOT EDIT — regenerate using: flusk generate entity --from <yaml>
 */

// --- BEGIN GENERATED ---

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

// --- BEGIN CUSTOM ---
// --- END CUSTOM ---
