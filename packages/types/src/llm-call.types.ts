/**
 * @generated from packages/schema/entities/llm-call.entity.yaml
 * Hash: 4237c1e6c23f3f216db72182e62a84ee90153fcd732d8aaad01fadd4f8d27280
 * Generated: 2026-03-01T18:57:16.433Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) ---

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
// --- END GENERATED ---

// --- END GENERATED ---