/**
 * @generated from packages/schema/entities/optimization.entity.yaml
 * Hash: 0ba47a00ef41248312952eb9f4235c7d3787cc600783c1c6ff8f2ba04fdf3a0e
 * Generated: 2026-02-17T11:06:33.156Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [types] ---
/**
 * @generated from Optimization YAML schema
 * DO NOT EDIT — regenerate using: flusk generate entity --from <yaml>
 */

import { Type, Static } from '@sinclair/typebox';
import { OptimizationEntitySchema } from '@flusk/entities';

export type OptimizationEntity = Static<typeof OptimizationEntitySchema>;

export const OptimizationEntityJSONSchema = OptimizationEntitySchema;

export const OptimizationInsertSchema = Type.Omit(OptimizationEntitySchema, [
  'id', 'createdAt', 'updatedAt',
]);

export type OptimizationInsert = Static<typeof OptimizationInsertSchema>;

export const OptimizationUpdateSchema = Type.Composite([
  Type.Object({ id: Type.String({ format: 'uuid' }) }),
  Type.Partial(Type.Omit(OptimizationEntitySchema, ['id', 'createdAt', 'updatedAt'])),
]);

export type OptimizationUpdate = Static<typeof OptimizationUpdateSchema>;

export const OptimizationQuerySchema = Type.Partial(OptimizationEntitySchema);

export type OptimizationQuery = Static<typeof OptimizationQuerySchema>;

// --- END GENERATED ---