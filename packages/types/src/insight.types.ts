/**
 * @generated from packages/schema/entities/insight.entity.yaml
 * Generated: 2026-02-18T12:47:00.000Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [types] ---
import { Type, Static } from '@sinclair/typebox';
import { InsightEntitySchema } from '@flusk/entities';

export type InsightEntity = Static<typeof InsightEntitySchema>;

export const InsightEntityJSONSchema = InsightEntitySchema;

export const InsightInsertSchema = Type.Omit(InsightEntitySchema, [
  'id', 'createdAt', 'updatedAt',
]);

export type InsightInsert = Static<typeof InsightInsertSchema>;

export const InsightUpdateSchema = Type.Composite([
  Type.Object({ id: Type.String({ format: 'uuid' }) }),
  Type.Partial(Type.Omit(InsightEntitySchema, ['id', 'createdAt', 'updatedAt'])),
]);

export type InsightUpdate = Static<typeof InsightUpdateSchema>;

export const InsightQuerySchema = Type.Partial(InsightEntitySchema);

export type InsightQuery = Static<typeof InsightQuerySchema>;

// --- END GENERATED ---
