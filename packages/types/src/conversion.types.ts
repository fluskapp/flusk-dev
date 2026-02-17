/**
 * @generated from packages/schema/entities/conversion.entity.yaml
 * Hash: cf2da9cd12469b01b53e59d1f0606559287530637fdb3638addabab3c72ca2e3
 * Generated: 2026-02-17T11:06:33.138Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [types] ---
/**
 * @generated from Conversion YAML schema
 * DO NOT EDIT — regenerate using: flusk generate entity --from <yaml>
 */

import { Type, Static } from '@sinclair/typebox';
import { ConversionEntitySchema } from '@flusk/entities';

export type ConversionEntity = Static<typeof ConversionEntitySchema>;

export const ConversionEntityJSONSchema = ConversionEntitySchema;

export const ConversionInsertSchema = Type.Omit(ConversionEntitySchema, [
  'id', 'createdAt', 'updatedAt',
]);

export type ConversionInsert = Static<typeof ConversionInsertSchema>;

export const ConversionUpdateSchema = Type.Composite([
  Type.Object({ id: Type.String({ format: 'uuid' }) }),
  Type.Partial(Type.Omit(ConversionEntitySchema, ['id', 'createdAt', 'updatedAt'])),
]);

export type ConversionUpdate = Static<typeof ConversionUpdateSchema>;

export const ConversionQuerySchema = Type.Partial(ConversionEntitySchema);

export type ConversionQuery = Static<typeof ConversionQuerySchema>;

// --- END GENERATED ---