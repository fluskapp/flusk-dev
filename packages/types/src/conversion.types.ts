/**
 * @generated from Conversion YAML schema
 * DO NOT EDIT — regenerate using: flusk generate entity --from <yaml>
 */

// --- BEGIN GENERATED ---

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

// --- BEGIN CUSTOM ---
// --- END CUSTOM ---
