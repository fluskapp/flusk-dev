/**
 * @generated from packages/schema/entities/llm-call.entity.yaml
 * Hash: 9077ad9201a1976687249820d2cdd48e60fbf3053ce4cab90034778c2f5966ab
 * Generated: 2026-02-17T11:06:33.145Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [typebox] ---
import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

/**
 * LLMCallEntity schema
 * @generated from LLMCall YAML definition
 */
export const LLMCallEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    provider: Type.String({ description: 'LLM provider name (e.g., openai, anthropic, cohere)', minLength: 1 }),
    model: Type.String({ description: 'Model identifier (e.g., gpt-4, claude-3-opus)', minLength: 1 }),
    prompt: Type.String({ description: 'Full prompt text sent to the LLM' }),
    promptHash: Type.String({ description: 'SHA-256 hash of the prompt for deduplication', minLength: 64, maxLength: 64 }),
    tokens: Type.Unknown({ description: 'Token usage object (input, output, total)', default: '{}' }),
    cost: Type.Number({ description: 'Calculated cost in USD for this API call', minimum: 0, default: 0 }),
    response: Type.String({ description: 'Full response text from the LLM', default: '' }),
    cached: Type.Boolean({ description: 'Whether this response was served from cache', default: false }),
    agentLabel: Type.Optional(Type.String({ description: 'Agent label for multi-agent tracking' })),
    organizationId: Type.Optional(Type.String({ description: 'Organization ID for GDPR data portability and deletion', minLength: 1 })),
    consentGiven: Type.Boolean({ description: 'GDPR consent flag', default: true }),
    consentPurpose: Type.String({ description: 'Purpose of data processing (optimization, analytics, training)', default: 'optimization' }),
    sessionId: Type.Optional(Type.String({ description: 'Analysis session ID for filtering results by run' }))
  })
]);

export type LLMCallEntity = Static<typeof LLMCallEntitySchema>;

// --- END GENERATED ---

// --- BEGIN CUSTOM [entity] ---

// --- END CUSTOM ---