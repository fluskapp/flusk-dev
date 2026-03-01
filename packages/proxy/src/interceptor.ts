/**
 * Request/response interceptor — extracts LLM call data from proxied traffic.
 */

import { createHash } from 'node:crypto';
import { createLogger } from '@flusk/logger';
import { detectProvider } from './providers/detect.js';
import { parseOpenAIResponse } from './providers/openai.js';
import { parseAnthropicResponse } from './providers/anthropic.js';
import { parseGenericResponse } from './providers/generic.js';
import { parseGoogleResponse } from './providers/google.js';
import { calculateCost } from './cost-calculator.js';
import { captureCall } from './capture.js';
import type { CapturedCall } from './capture.js';

const log = createLogger({ name: 'proxy-interceptor' });

/** Build a prompt hash from the request body. */
function hashPrompt(body: unknown, model: string): string {
  const text = JSON.stringify(body);
  return createHash('sha256').update(`${model}:${text}`, 'utf8').digest('hex');
}

/** Intercept a completed request/response pair and capture it. */
export function interceptResponse(opts: {
  path: string;
  headers: Record<string, string | undefined>;
  requestBody: unknown;
  responseBody: unknown;
  statusCode: number;
  latencyMs: number;
}): void {
  try {
    const info = detectProvider(opts.path, opts.headers);
    if (info.provider === 'unknown') return;

    const parsed = parseResponseByProvider(info.provider, opts);
    if (!parsed) return;

    const cost = calculateCost(parsed.model, parsed.tokens);
    const call: CapturedCall = {
      provider: info.provider,
      model: parsed.model,
      prompt: JSON.stringify(opts.requestBody).slice(0, 10_000),
      promptHash: hashPrompt(opts.requestBody, parsed.model),
      tokens: parsed.tokens,
      costUsd: cost.costUsd,
      response: JSON.stringify(opts.responseBody).slice(0, 10_000),
      status: opts.statusCode < 400 ? 'ok' : 'error',
      latencyMs: opts.latencyMs,
      cached: false,
    };

    captureCall(call);
    log.debug({ model: call.model, cost: call.costUsd }, 'Captured LLM call');
  } catch (err) {
    log.error({ err }, 'Intercept failed');
  }
}

function parseResponseByProvider(
  provider: string,
  opts: { requestBody: unknown; responseBody: unknown },
) {
  if (provider === 'openai') return parseOpenAIResponse(opts.responseBody);
  if (provider === 'anthropic') return parseAnthropicResponse(opts.responseBody);
  if (provider === 'google') return parseGoogleResponse(opts.responseBody);
  return parseGenericResponse(opts.responseBody);
}
