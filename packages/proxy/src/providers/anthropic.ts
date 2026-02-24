/**
 * Parse Anthropic request/response to extract model and token usage.
 */

import type { TokenUsage } from '../cost-calculator.js';

export interface AnthropicRequest {
  model?: string;
  messages?: Array<{ role: string; content: string }>;
  stream?: boolean;
}

export interface AnthropicResponse {
  model?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}

/** Extract model from Anthropic request body. */
export function parseAnthropicRequest(body: unknown): AnthropicRequest {
  const b = body as Record<string, unknown>;
  return {
    model: typeof b.model === 'string' ? b.model : undefined,
    messages: Array.isArray(b.messages) ? b.messages as AnthropicRequest['messages'] : undefined,
    stream: typeof b.stream === 'boolean' ? b.stream : false,
  };
}

/** Extract token usage from Anthropic response body. */
export function parseAnthropicResponse(body: unknown): { model: string; tokens: TokenUsage } {
  const b = body as AnthropicResponse;
  const usage = b.usage;
  const input = usage?.input_tokens ?? 0;
  const output = usage?.output_tokens ?? 0;
  return {
    model: b.model ?? 'unknown',
    tokens: { input, output, total: input + output },
  };
}
