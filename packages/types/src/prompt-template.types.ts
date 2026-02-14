/**
 * @generated from PromptTemplate YAML schema
 * DO NOT EDIT — regenerate using: flusk generate entity --from <yaml>
 */

import { Type, Static } from '@sinclair/typebox';
import { PromptTemplateEntitySchema } from '@flusk/entities';

export type PromptTemplateEntity = Static<typeof PromptTemplateEntitySchema>;

export const PromptTemplateEntityJSONSchema = PromptTemplateEntitySchema;

export const PromptTemplateInsertSchema = Type.Omit(PromptTemplateEntitySchema, [
  'id', 'createdAt', 'updatedAt',
]);

export type PromptTemplateInsert = Static<typeof PromptTemplateInsertSchema>;

export const PromptTemplateUpdateSchema = Type.Composite([
  Type.Object({ id: Type.String({ format: 'uuid' }) }),
  Type.Partial(Type.Omit(PromptTemplateEntitySchema, ['id', 'createdAt', 'updatedAt'])),
]);

export type PromptTemplateUpdate = Static<typeof PromptTemplateUpdateSchema>;

export const PromptTemplateQuerySchema = Type.Partial(PromptTemplateEntitySchema);

export type PromptTemplateQuery = Static<typeof PromptTemplateQuerySchema>;
