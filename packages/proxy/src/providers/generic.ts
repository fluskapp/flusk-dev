/**
 * Generic LLM API detection — fallback parser for unknown providers.
 */

import type { TokenUsage } from '../cost-calculator.js';

/** Try to extract model and tokens from a generic JSON response. */
export function parseGenericResponse(body: unknown): {
  model: string;
  tokens: TokenUsage;
} | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;

  const model = typeof b.model === 'string' ? b.model : null;
  if (!model) return null;

  const usage = b.usage as Record<string, unknown> | undefined;
  if (!usage) return null;

  const input = toNum(usage.prompt_tokens ?? usage.input_tokens);
  const output = toNum(usage.completion_tokens ?? usage.output_tokens);

  return {
    model,
    tokens: { input, output, total: input + output },
  };
}

function toNum(val: unknown): number {
  return typeof val === 'number' ? val : 0;
}
