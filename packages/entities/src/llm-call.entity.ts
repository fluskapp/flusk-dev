import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

/**
 * @generated from LLMCall YAML definition
 */

/* BEGIN CUSTOM: token-usage-schema */
export const TokenUsageSchema = Type.Object({
  input: Type.Integer({ minimum: 0, description: 'Number of input tokens consumed' }),
  output: Type.Integer({ minimum: 0, description: 'Number of output tokens generated' }),
  total: Type.Integer({ minimum: 0, description: 'Total tokens (input + output)' }),
});

export type TokenUsage = Static<typeof TokenUsageSchema>;
/* END CUSTOM: token-usage-schema */

export const LLMCallEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    provider: Type.String({ description: 'LLM provider name (e.g., openai, anthropic, cohere)', minLength: 1 }),
    model: Type.String({ description: 'Model identifier (e.g., gpt-4, claude-3-opus)', minLength: 1 }),
    prompt: Type.String({ description: 'Full prompt text sent to the LLM' }),
    promptHash: Type.String({ description: 'SHA-256 hash of the prompt for deduplication', minLength: 64, maxLength: 64 }),
    tokens: TokenUsageSchema,
    cost: Type.Number({ description: 'Calculated cost in USD for this API call', minimum: 0 }),
    response: Type.String({ description: 'Full response text from the LLM' }),
    cached: Type.Boolean({ description: 'Whether this response was served from cache', default: false }),
    organizationId: Type.Optional(Type.String({ description: 'Organization ID for GDPR data portability and deletion', minLength: 1 })),
    consentGiven: Type.Boolean({ description: 'GDPR consent flag', default: true }),
    consentPurpose: Type.String({ description: 'Purpose of data processing (optimization, analytics, training)', default: 'optimization' }),
  }),
]);

export type LLMCallEntity = Static<typeof LLMCallEntitySchema>;
