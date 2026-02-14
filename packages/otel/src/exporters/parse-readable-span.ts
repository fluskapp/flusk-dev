/**
 * Parse an OTel ReadableSpan into the shape for SQLite LLM call storage.
 * Returns null if the span is not a GenAI span.
 */
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { createHash } from 'node:crypto';
import { llmCall } from '@flusk/business-logic';

const { calculateCost } = llmCall;
const GENAI_PREFIX = 'gen_ai.';

function getAttr(span: ReadableSpan, key: string): string {
  const val = span.attributes[key];
  return typeof val === 'string' ? val : '';
}

function getNumAttr(span: ReadableSpan, key: string): number {
  const val = span.attributes[key];
  return typeof val === 'number' ? val : 0;
}

function isGenAiSpan(span: ReadableSpan): boolean {
  return Object.keys(span.attributes).some((k) => k.startsWith(GENAI_PREFIX));
}

function detectProvider(model: string, system: string): string {
  if (system === 'openai' || model.startsWith('gpt') || model.startsWith('o1')) return 'openai';
  if (system === 'anthropic' || model.startsWith('claude')) return 'anthropic';
  if (system === 'bedrock' || model.includes('amazon')) return 'bedrock';
  return 'other';
}

export function parseReadableSpan(span: ReadableSpan): Record<string, unknown> | null {
  if (!isGenAiSpan(span)) return null;

  const model = getAttr(span, 'gen_ai.response.model') || getAttr(span, 'gen_ai.request.model');
  const system = getAttr(span, 'gen_ai.system');
  const provider = detectProvider(model, system);
  const prompt = getAttr(span, 'gen_ai.prompt');
  const input = getNumAttr(span, 'gen_ai.usage.input_tokens');
  const output = getNumAttr(span, 'gen_ai.usage.output_tokens');
  const tokens = { input, output, total: input + output };
  const promptHash = createHash('sha256').update(prompt + model).digest('hex');
  const { costUsd } = calculateCost({ providerName: provider, modelName: model, tokenUsage: tokens });

  return {
    provider,
    model,
    prompt,
    promptHash,
    tokens,
    cost: costUsd,
    response: getAttr(span, 'gen_ai.completion'),
    cached: false,
    organizationId: process.env['FLUSK_AGENT'] || 'default',
    consentGiven: true,
    consentPurpose: 'optimization',
  };
}
