import { Type } from '@sinclair/typebox';
import { TokenUsageSchema } from '@flusk/entities';

/**
 * Request schema for creating a new LLM call
 * Excludes auto-generated fields (id, timestamps, hash, cost)
 */
export const CreateLLMCallSchema = Type.Object({
  provider: Type.String({ minLength: 1, description: 'LLM provider (e.g., openai, anthropic)' }),
  model: Type.String({ minLength: 1, description: 'Model identifier (e.g., gpt-4, claude-3-opus)' }),
  prompt: Type.String({ description: 'Full prompt text sent to the LLM' }),
  tokens: TokenUsageSchema,
  response: Type.String({ description: 'Full response text from the LLM' })
});

/**
 * Response schema for successful LLM call creation
 */
export const LLMCallResponseSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  provider: Type.String(),
  model: Type.String(),
  prompt: Type.String(),
  promptHash: Type.String({ minLength: 64, maxLength: 64 }),
  tokens: TokenUsageSchema,
  cost: Type.Number({ minimum: 0 }),
  response: Type.String(),
  cached: Type.Boolean(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' })
});

/**
 * Response schema for cached responses
 */
export const CachedResponseSchema = Type.Object({
  cached: Type.Literal(true),
  response: Type.String(),
  promptHash: Type.String(),
  id: Type.Optional(Type.String({ format: 'uuid' }))
});
