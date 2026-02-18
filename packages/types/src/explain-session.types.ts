/**
 * @generated from packages/schema/entities/explain-session.entity.yaml
 * Generated: 2026-02-18T12:47:00.000Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [types] ---
import { Type, Static } from '@sinclair/typebox';
import { ExplainSessionEntitySchema } from '@flusk/entities';

export type ExplainSessionEntity = Static<typeof ExplainSessionEntitySchema>;

export const ExplainSessionEntityJSONSchema = ExplainSessionEntitySchema;

export const ExplainSessionInsertSchema = Type.Omit(ExplainSessionEntitySchema, [
  'id', 'createdAt', 'updatedAt',
]);

export type ExplainSessionInsert = Static<typeof ExplainSessionInsertSchema>;

export const ExplainSessionUpdateSchema = Type.Composite([
  Type.Object({ id: Type.String({ format: 'uuid' }) }),
  Type.Partial(Type.Omit(ExplainSessionEntitySchema, ['id', 'createdAt', 'updatedAt'])),
]);

export type ExplainSessionUpdate = Static<typeof ExplainSessionUpdateSchema>;

export const ExplainSessionQuerySchema = Type.Partial(ExplainSessionEntitySchema);

export type ExplainSessionQuery = Static<typeof ExplainSessionQuerySchema>;

// --- END GENERATED ---
