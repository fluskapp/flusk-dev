/**
 * @generated from packages/schema/entities/prompt-template.entity.yaml
 * Hash: 08dcb2aa0bd0520d722f54f25c8de1de0feea40508a65a7a8e08c2de45a7da0a
 * Generated: 2026-02-17T11:06:33.185Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [types] ---
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

// --- END GENERATED ---