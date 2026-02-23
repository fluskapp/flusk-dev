/**
 * @generated from packages/schema/entities/llm-call.entity.yaml
 * Hash: 246a8a696c52e028c91354ebc15896a2f70e96542315a70258b1339b8d3b515c
 * Generated: 2026-02-23T08:08:01.286Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [types] ---
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

// --- END GENERATED ---