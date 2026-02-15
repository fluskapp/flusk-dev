/**
 * @generated from Trace YAML schema
 * DO NOT EDIT — regenerate using: flusk generate entity --from <yaml>
 */

// --- BEGIN GENERATED ---

import { Type, Static } from '@sinclair/typebox';
import { TraceEntitySchema } from '@flusk/entities';

export type TraceEntity = Static<typeof TraceEntitySchema>;

export const TraceEntityJSONSchema = TraceEntitySchema;

export const TraceInsertSchema = Type.Omit(TraceEntitySchema, [
  'id', 'createdAt', 'updatedAt',
]);

export type TraceInsert = Static<typeof TraceInsertSchema>;

export const TraceUpdateSchema = Type.Composite([
  Type.Object({ id: Type.String({ format: 'uuid' }) }),
  Type.Partial(Type.Omit(TraceEntitySchema, ['id', 'createdAt', 'updatedAt'])),
]);

export type TraceUpdate = Static<typeof TraceUpdateSchema>;

export const TraceQuerySchema = Type.Partial(TraceEntitySchema);

export type TraceQuery = Static<typeof TraceQuerySchema>;
// --- END GENERATED ---

// --- BEGIN CUSTOM ---
// --- END CUSTOM ---
