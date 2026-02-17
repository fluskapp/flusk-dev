/**
 * @generated from packages/schema/entities/prompt-version.entity.yaml
 * Hash: 7a3f844c268eac93e0ab2d32975b9679d716b083900e4cfc02fa9959156d6667
 * Generated: 2026-02-17T11:06:33.199Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [types] ---
/**
 * @generated from PromptVersion YAML schema
 * DO NOT EDIT — regenerate using: flusk generate entity --from <yaml>
 */

import { Type, Static } from '@sinclair/typebox';
import { PromptVersionEntitySchema } from '@flusk/entities';

export type PromptVersionEntity = Static<typeof PromptVersionEntitySchema>;

export const PromptVersionEntityJSONSchema = PromptVersionEntitySchema;

export const PromptVersionInsertSchema = Type.Omit(PromptVersionEntitySchema, [
  'id', 'createdAt', 'updatedAt',
]);

export type PromptVersionInsert = Static<typeof PromptVersionInsertSchema>;

export const PromptVersionUpdateSchema = Type.Composite([
  Type.Object({ id: Type.String({ format: 'uuid' }) }),
  Type.Partial(Type.Omit(PromptVersionEntitySchema, ['id', 'createdAt', 'updatedAt'])),
]);

export type PromptVersionUpdate = Static<typeof PromptVersionUpdateSchema>;

export const PromptVersionQuerySchema = Type.Partial(PromptVersionEntitySchema);

export type PromptVersionQuery = Static<typeof PromptVersionQuerySchema>;

// --- END GENERATED ---