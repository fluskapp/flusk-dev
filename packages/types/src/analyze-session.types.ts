/**
 * @generated from packages/schema/entities/analyze-session.entity.yaml
 * Hash: f58dfc2cb015a3164855f7575041cf69c220f34fb186e08c303618b49d505514
 * Generated: 2026-02-17T11:06:33.124Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [types] ---
/**
 * @generated from AnalyzeSession YAML schema
 * DO NOT EDIT — regenerate using: flusk generate entity --from <yaml>
 */

import { Type, Static } from '@sinclair/typebox';
import { AnalyzeSessionEntitySchema } from '@flusk/entities';

export type AnalyzeSessionEntity = Static<typeof AnalyzeSessionEntitySchema>;

export const AnalyzeSessionEntityJSONSchema = AnalyzeSessionEntitySchema;

export const AnalyzeSessionInsertSchema = Type.Omit(AnalyzeSessionEntitySchema, [
  'id', 'createdAt', 'updatedAt',
]);

export type AnalyzeSessionInsert = Static<typeof AnalyzeSessionInsertSchema>;

export const AnalyzeSessionUpdateSchema = Type.Composite([
  Type.Object({ id: Type.String({ format: 'uuid' }) }),
  Type.Partial(Type.Omit(AnalyzeSessionEntitySchema, ['id', 'createdAt', 'updatedAt'])),
]);

export type AnalyzeSessionUpdate = Static<typeof AnalyzeSessionUpdateSchema>;

export const AnalyzeSessionQuerySchema = Type.Partial(AnalyzeSessionEntitySchema);

export type AnalyzeSessionQuery = Static<typeof AnalyzeSessionQuerySchema>;

// --- END GENERATED ---