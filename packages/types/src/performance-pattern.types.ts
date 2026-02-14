/**
 * @generated from PerformancePattern YAML schema
 * DO NOT EDIT — regenerate using: flusk generate entity --from <yaml>
 */

import { Type, Static } from '@sinclair/typebox';
import { PerformancePatternEntitySchema } from '@flusk/entities';

export type PerformancePatternEntity = Static<typeof PerformancePatternEntitySchema>;

export const PerformancePatternEntityJSONSchema = PerformancePatternEntitySchema;

export const PerformancePatternInsertSchema = Type.Omit(PerformancePatternEntitySchema, [
  'id', 'createdAt', 'updatedAt',
]);

export type PerformancePatternInsert = Static<typeof PerformancePatternInsertSchema>;

export const PerformancePatternUpdateSchema = Type.Composite([
  Type.Object({ id: Type.String({ format: 'uuid' }) }),
  Type.Partial(Type.Omit(PerformancePatternEntitySchema, ['id', 'createdAt', 'updatedAt'])),
]);

export type PerformancePatternUpdate = Static<typeof PerformancePatternUpdateSchema>;

export const PerformancePatternQuerySchema = Type.Partial(PerformancePatternEntitySchema);

export type PerformancePatternQuery = Static<typeof PerformancePatternQuerySchema>;
