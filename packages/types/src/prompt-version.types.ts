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
