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
