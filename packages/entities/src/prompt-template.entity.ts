import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

/**
 * PromptTemplate entity schema
 * Tracks prompt templates with variable placeholders for A/B testing
 */
export const PromptTemplateEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    organizationId: Type.String({ format: 'uuid', description: 'Organization ID' }),
    name: Type.String({ description: 'Template name' }),
    description: Type.String({ description: 'Template description' }),
    activeVersionId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()], {
      description: 'Currently active version ID',
    }),
    variables: Type.Array(Type.String(), {
      description: 'Template variable names e.g. ["user_query", "context"]',
    }),
  })
]);

export type PromptTemplateEntity = Static<typeof PromptTemplateEntitySchema>;
