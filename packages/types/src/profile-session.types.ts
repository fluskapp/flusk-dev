import { Type, Static } from '@sinclair/typebox';
import {
  ProfileSessionEntitySchema,
  HotspotEntrySchema,
  type HotspotEntry
} from '@flusk/entities';

/**
 * TypeScript type for ProfileSessionEntity
 */
export type ProfileSessionEntity = Static<typeof ProfileSessionEntitySchema>;

/**
 * JSON Schema for ProfileSessionEntity
 */
export const ProfileSessionEntityJSONSchema = ProfileSessionEntitySchema;

/**
 * Insert variant - excludes auto-generated fields
 */
export const ProfileSessionInsertSchema = Type.Omit(ProfileSessionEntitySchema, [
  'id',
  'createdAt',
  'updatedAt',
]);

export type ProfileSessionInsert = Static<typeof ProfileSessionInsertSchema>;

/**
 * Update variant - all fields optional except id
 */
export const ProfileSessionUpdateSchema = Type.Composite([
  Type.Object({ id: Type.String({ format: 'uuid' }) }),
  Type.Partial(Type.Omit(ProfileSessionEntitySchema, ['id', 'createdAt', 'updatedAt'])),
]);

export type ProfileSessionUpdate = Static<typeof ProfileSessionUpdateSchema>;

/**
 * Query variant - all fields optional for flexible filtering
 */
export const ProfileSessionQuerySchema = Type.Partial(ProfileSessionEntitySchema);

export type ProfileSessionQuery = Static<typeof ProfileSessionQuerySchema>;

/**
 * Re-export HotspotEntry types from entities
 */
export { type HotspotEntry };
export const HotspotEntryJSONSchema = HotspotEntrySchema;
