/**
 * @generated from packages/schema/entities/prompt-template.entity.yaml
 * Hash: 08dcb2aa0bd0520d722f54f25c8de1de0feea40508a65a7a8e08c2de45a7da0a
 * Generated: 2026-02-17T11:06:33.185Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [typebox] ---
import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

/**
 * PromptTemplateEntity schema
 * @generated from PromptTemplate YAML definition
 */
export const PromptTemplateEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    organizationId: Type.String({ format: 'uuid', description: 'Organization ID' }),
    name: Type.String({ description: 'Template name' }),
    description: Type.String({ description: 'Template description' }),
    activeVersionId: Type.Optional(Type.String({ format: 'uuid', description: 'Currently active version ID' })),
    variables: Type.Unknown({ description: 'Template variable names e.g. ["user_query", "context"]', default: '[]' })
  })
]);

export type PromptTemplateEntity = Static<typeof PromptTemplateEntitySchema>;

// --- END GENERATED ---

// --- BEGIN CUSTOM [entity] ---

// --- END CUSTOM ---