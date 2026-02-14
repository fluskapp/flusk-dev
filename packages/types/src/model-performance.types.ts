/**
 * @generated from ModelPerformance YAML schema
 * DO NOT EDIT — regenerate using: flusk generate entity --from <yaml>
 */

import { Type, Static } from '@sinclair/typebox';
import { ModelPerformanceEntitySchema } from '@flusk/entities';

export type ModelPerformanceEntity = Static<typeof ModelPerformanceEntitySchema>;

export const ModelPerformanceEntityJSONSchema = ModelPerformanceEntitySchema;

export const ModelPerformanceInsertSchema = Type.Omit(ModelPerformanceEntitySchema, [
  'id', 'createdAt', 'updatedAt',
]);

export type ModelPerformanceInsert = Static<typeof ModelPerformanceInsertSchema>;

export const ModelPerformanceUpdateSchema = Type.Composite([
  Type.Object({ id: Type.String({ format: 'uuid' }) }),
  Type.Partial(Type.Omit(ModelPerformanceEntitySchema, ['id', 'createdAt', 'updatedAt'])),
]);

export type ModelPerformanceUpdate = Static<typeof ModelPerformanceUpdateSchema>;

export const ModelPerformanceQuerySchema = Type.Partial(ModelPerformanceEntitySchema);

export type ModelPerformanceQuery = Static<typeof ModelPerformanceQuerySchema>;
