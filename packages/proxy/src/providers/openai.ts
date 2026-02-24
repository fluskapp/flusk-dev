/**
 * Parse OpenAI request/response to extract model and token usage.
 */

import type { TokenUsage } from '../cost-calculator.js';

export interface OpenAIRequest {
  model?: string;
  messages?: Array<{ role: string; content: string }>;
  stream?: boolean;
}

export interface OpenAIResponse {
  model?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

/** Extract model from OpenAI request body. */
export function parseOpenAIRequest(body: unknown): OpenAIRequest {
  const b = body as Record<string, unknown>;
  return {
    model: typeof b.model === 'string' ? b.model : undefined,
    messages: Array.isArray(b.messages) ? b.messages as OpenAIRequest['messages'] : undefined,
    stream: typeof b.stream === 'boolean' ? b.stream : false,
  };
}

/** Extract token usage from OpenAI response body. */
export function parseOpenAIResponse(body: unknown): { model: string; tokens: TokenUsage } {
  const b = body as OpenAIResponse;
  const usage = b.usage;
  return {
    model: b.model ?? 'unknown',
    tokens: {
      input: usage?.prompt_tokens ?? 0,
      output: usage?.completion_tokens ?? 0,
      total: usage?.total_tokens ?? 0,
    },
  };
}
