/**
 * @generated from packages/schema/entities/trace.entity.yaml
 * Hash: 5a83b15898453b0db68e839b0be2387736e00bfa748d24a8b1fc755f781e2010
 * Generated: 2026-02-17T11:06:33.220Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [types] ---
/**
 * @generated from Trace YAML schema
 * DO NOT EDIT — regenerate using: flusk generate entity --from <yaml>
 */

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