/**
 * @generated from packages/schema/entities/pattern.entity.yaml
 * Hash: fe9e5cf155222f1b19a751849333104c804ee2e6fc54911539193c29c631809d
 * Generated: 2026-02-17T11:06:33.174Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [types] ---
/**
 * @generated from Pattern YAML schema
 * DO NOT EDIT — regenerate using: flusk generate entity --from <yaml>
 */

import { Type, Static } from '@sinclair/typebox';
import { PatternEntitySchema } from '@flusk/entities';

export type PatternEntity = Static<typeof PatternEntitySchema>;

export const PatternEntityJSONSchema = PatternEntitySchema;

export const PatternInsertSchema = Type.Omit(PatternEntitySchema, [
  'id', 'createdAt', 'updatedAt',
]);

export type PatternInsert = Static<typeof PatternInsertSchema>;

export const PatternUpdateSchema = Type.Composite([
  Type.Object({ id: Type.String({ format: 'uuid' }) }),
  Type.Partial(Type.Omit(PatternEntitySchema, ['id', 'createdAt', 'updatedAt'])),
]);

export type PatternUpdate = Static<typeof PatternUpdateSchema>;

export const PatternQuerySchema = Type.Partial(PatternEntitySchema);

export type PatternQuery = Static<typeof PatternQuerySchema>;

// --- END GENERATED ---