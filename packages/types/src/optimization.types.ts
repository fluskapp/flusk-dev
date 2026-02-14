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
