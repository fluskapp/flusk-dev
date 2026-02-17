/**
 * @generated from packages/schema/entities/performance-pattern.entity.yaml
 * Hash: fbf8aa01e364b86d82790bbc742a3570ea74a42c0304190ffae3af990bc38d83
 * Generated: 2026-02-17T11:06:33.177Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [types] ---
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

// --- END GENERATED ---