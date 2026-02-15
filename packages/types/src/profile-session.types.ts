/**
 * @generated from ProfileSession YAML schema
 * DO NOT EDIT — regenerate using: flusk generate entity --from <yaml>
 */

// --- BEGIN GENERATED ---

import { Type, Static } from '@sinclair/typebox';
import { ProfileSessionEntitySchema } from '@flusk/entities';

export type ProfileSessionEntity = Static<typeof ProfileSessionEntitySchema>;

export const ProfileSessionEntityJSONSchema = ProfileSessionEntitySchema;

export const ProfileSessionInsertSchema = Type.Omit(ProfileSessionEntitySchema, [
  'id', 'createdAt', 'updatedAt',
]);

export type ProfileSessionInsert = Static<typeof ProfileSessionInsertSchema>;

export const ProfileSessionUpdateSchema = Type.Composite([
  Type.Object({ id: Type.String({ format: 'uuid' }) }),
  Type.Partial(Type.Omit(ProfileSessionEntitySchema, ['id', 'createdAt', 'updatedAt'])),
]);

export type ProfileSessionUpdate = Static<typeof ProfileSessionUpdateSchema>;

export const ProfileSessionQuerySchema = Type.Partial(ProfileSessionEntitySchema);

export type ProfileSessionQuery = Static<typeof ProfileSessionQuerySchema>;
// --- END GENERATED ---

// --- BEGIN CUSTOM ---
// --- END CUSTOM ---
