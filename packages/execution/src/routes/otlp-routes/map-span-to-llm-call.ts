/**
 * Map a parsed OTLP LLM span to the shape expected by LLMCallRepository.create
 */
import { createHash } from 'node:crypto';
import { llmCall } from '@flusk/business-logic';
import type { ParsedLlmCall } from './types.js';

const { calculateCost } = llmCall;

export function mapSpanToLlmCall(parsed: ParsedLlmCall) {
  const promptHash = createHash('sha256')
    .update(parsed.prompt + parsed.model)
    .digest('hex');

  const tokens = {
    input: parsed.promptTokens,
    output: parsed.completionTokens,
    total: parsed.totalTokens,
  };

  const { costUsd } = calculateCost({
    providerName: parsed.provider,
    modelName: parsed.model,
    tokenUsage: tokens,
  });

  return {
    provider: parsed.provider,
    model: parsed.model,
    prompt: parsed.prompt,
    promptHash,
    tokens,
    cost: costUsd,
    response: parsed.response,
    cached: false,
    organizationId: 'default',
    consentGiven: true,
    consentPurpose: 'optimization',
  };
}
