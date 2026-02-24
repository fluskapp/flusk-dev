/**
 * Collect SSE stream chunks and extract final usage from streaming responses.
 */

import type { TokenUsage } from './cost-calculator.js';

/** Accumulate SSE data chunks and extract usage from the final chunk. */
export function parseSSEChunks(chunks: string[]): {
  model: string;
  tokens: TokenUsage;
  content: string;
} {
  let model = 'unknown';
  let content = '';
  let tokens: TokenUsage = { input: 0, output: 0, total: 0 };

  for (const chunk of chunks) {
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data) as Record<string, unknown>;
        if (typeof parsed.model === 'string') model = parsed.model;

        // Extract content delta
        const choices = parsed.choices as Array<Record<string, unknown>> | undefined;
        const delta = choices?.[0]?.delta as Record<string, unknown> | undefined;
        if (typeof delta?.content === 'string') content += delta.content;

        // Final chunk often has usage
        const usage = parsed.usage as Record<string, number> | undefined;
        if (usage) {
          tokens = {
            input: usage.prompt_tokens ?? usage.input_tokens ?? 0,
            output: usage.completion_tokens ?? usage.output_tokens ?? 0,
            total: usage.total_tokens ?? 0,
          };
        }
      } catch { /* skip non-JSON lines */ }
    }
  }

  if (tokens.total === 0) tokens.total = tokens.input + tokens.output;
  return { model, tokens, content };
}
