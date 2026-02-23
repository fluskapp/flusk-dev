/**
 * @generated from LLMCall YAML schema
 * DO NOT EDIT — regenerate using: flusk generate entity --from <yaml>
 */

import { Type, Static } from '@sinclair/typebox';
import { LLMCallEntitySchema } from '@flusk/entities';

export type LLMCallEntity = Static<typeof LLMCallEntitySchema>;

export const LLMCallEntityJSONSchema = LLMCallEntitySchema;

export const LLMCallInsertSchema = Type.Omit(LLMCallEntitySchema, [
  'id', 'createdAt', 'updatedAt',
]);

export type LLMCallInsert = Static<typeof LLMCallInsertSchema>;

export const LLMCallUpdateSchema = Type.Composite([
  Type.Object({ id: Type.String({ format: 'uuid' }) }),
  Type.Partial(Type.Omit(LLMCallEntitySchema, ['id', 'createdAt', 'updatedAt'])),
]);

export type LLMCallUpdate = Static<typeof LLMCallUpdateSchema>;

export const LLMCallQuerySchema = Type.Partial(LLMCallEntitySchema);

export type LLMCallQuery = Static<typeof LLMCallQuerySchema>;
