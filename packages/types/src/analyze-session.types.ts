/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import { Type, Static } from '@sinclair/typebox';
import { AnalyzeSessionEntitySchema } from '@flusk/entities';

export type AnalyzeSessionEntity = Static<typeof AnalyzeSessionEntitySchema>;

export const AnalyzeSessionEntityJSONSchema = AnalyzeSessionEntitySchema;

export const AnalyzeSessionInsertSchema = Type.Omit(
  AnalyzeSessionEntitySchema,
  ['id', 'createdAt', 'updatedAt'],
);

export type AnalyzeSessionInsert = Static<typeof AnalyzeSessionInsertSchema>;

export const AnalyzeSessionUpdateSchema = Type.Composite([
  Type.Object({ id: Type.String({ format: 'uuid' }) }),
  Type.Partial(
    Type.Omit(AnalyzeSessionEntitySchema, ['id', 'createdAt', 'updatedAt']),
  ),
]);

export type AnalyzeSessionUpdate = Static<typeof AnalyzeSessionUpdateSchema>;

export const AnalyzeSessionQuerySchema = Type.Partial(
  AnalyzeSessionEntitySchema,
);

export type AnalyzeSessionQuery = Static<typeof AnalyzeSessionQuerySchema>;
