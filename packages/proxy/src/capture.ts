/**
 * Store captured LLM call data to SQLite via @flusk/resources.
 */

import { createSqliteStorage } from '@flusk/resources';
import { createLogger } from '@flusk/logger';
import type { TokenUsage } from './cost-calculator.js';

const log = createLogger({ name: 'proxy-capture' });

export interface CapturedCall {
  provider: string;
  model: string;
  prompt: string;
  promptHash: string;
  tokens: TokenUsage;
  costUsd: number | null;
  response: string;
  status: 'ok' | 'error';
  errorMessage?: string;
  latencyMs: number;
  cached: boolean;
}

let storage: ReturnType<typeof createSqliteStorage> | null = null;

function getStorage(): ReturnType<typeof createSqliteStorage> {
  if (!storage) storage = createSqliteStorage();
  return storage;
}

/** Store a captured call async — fire-and-forget for zero latency. */
export function captureCall(call: CapturedCall): void {
  try {
    getStorage().llmCalls.create({
      provider: call.provider,
      model: call.model,
      prompt: call.prompt,
      promptHash: call.promptHash,
      tokens: call.tokens,
      cost: call.costUsd ?? 0,
      response: call.response,
      cached: call.cached,
      status: call.status,
      errorMessage: call.errorMessage,
      consentGiven: true,
      consentPurpose: 'optimization',
    });
  } catch (err) {
    log.error({ err }, 'Failed to capture LLM call');
  }
}
