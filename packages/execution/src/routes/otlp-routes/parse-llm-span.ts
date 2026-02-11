/**
 * Parse an OTel span with GenAI semantic conventions into a Flusk LLM call
 */
import type { OtlpSpan, ParsedLlmCall } from './types.js';
import { getStringAttr, getNumAttr } from './parse-attributes.js';

const GENAI_PREFIX = 'gen_ai.';

export function isGenAiSpan(span: OtlpSpan): boolean {
  return span.attributes.some((a) => a.key.startsWith(GENAI_PREFIX));
}

function detectProvider(model: string, attrs: OtlpSpan['attributes']): 'openai' | 'anthropic' | 'other' {
  const system = getStringAttr(attrs, 'gen_ai.system');
  if (system === 'openai' || model.startsWith('gpt') || model.startsWith('o1')) return 'openai';
  if (system === 'anthropic' || model.startsWith('claude')) return 'anthropic';
  return 'other';
}

function calcLatencyMs(span: OtlpSpan): number {
  const start = BigInt(span.startTimeUnixNano);
  const end = BigInt(span.endTimeUnixNano);
  return Number((end - start) / BigInt(1_000_000));
}

export function parseLlmSpan(span: OtlpSpan): ParsedLlmCall {
  const attrs = span.attributes;
  const model = getStringAttr(attrs, 'gen_ai.response.model')
    || getStringAttr(attrs, 'gen_ai.request.model');
  const promptTokens = getNumAttr(attrs, 'gen_ai.usage.input_tokens');
  const completionTokens = getNumAttr(attrs, 'gen_ai.usage.output_tokens');
  const prompt = getStringAttr(attrs, 'gen_ai.prompt');
  const response = getStringAttr(attrs, 'gen_ai.completion');

  return {
    provider: detectProvider(model, attrs),
    model,
    prompt,
    response,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    latencyMs: calcLatencyMs(span),
    metadata: {
      traceId: span.traceId,
      spanId: span.spanId,
      finishReason: getStringAttr(attrs, 'gen_ai.response.finish_reasons'),
    },
  };
}
