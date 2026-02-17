/**
 * @generated from packages/schema/entities/profile-session.entity.yaml
 * Hash: 3212410d3d2fa49f76e2bf4552bf66ae5a32ce8ce60ebb946f8ccb8a9af652e7
 * Generated: 2026-02-17T11:06:33.181Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [types] ---
/**
 * @generated from ProfileSession YAML schema
 * DO NOT EDIT — regenerate using: flusk generate entity --from <yaml>
 */

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