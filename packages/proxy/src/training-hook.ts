/**
 * Training data collection hook for the proxy.
 * After each proxied call, silently captures training pairs.
 */

import { createSqliteStorage } from '@flusk/resources';
import { collectFromCall } from '@flusk/business-logic';
import type { LLMCallInput, CollectorConfig } from '@flusk/business-logic';
import { createLogger } from '@flusk/logger';
import type { CapturedCall } from './capture.js';

const log = createLogger({ name: 'training-hook' });

// --- BEGIN CUSTOM ---
export interface TrainingHookConfig {
  enabled: boolean;
  teacherModels: string[];
}

const DEFAULT_CONFIG: TrainingHookConfig = {
  enabled: false,
  teacherModels: ['claude-sonnet-4-20250514', 'gpt-4o'],
};

let config: TrainingHookConfig = DEFAULT_CONFIG;
let storage: ReturnType<typeof createSqliteStorage> | null = null;

function getStorage(): ReturnType<typeof createSqliteStorage> {
  if (!storage) storage = createSqliteStorage();
  return storage;
}

export function configureTrainingHook(cfg: Partial<TrainingHookConfig>): void {
  config = { ...DEFAULT_CONFIG, ...cfg };
  log.info({ enabled: config.enabled, models: config.teacherModels }, 'Training hook configured');
}

/**
 * Called after each proxied call completes.
 * Fire-and-forget — never blocks the response.
 */
export function onCallComplete(call: CapturedCall, tenantId?: string): void {
  if (!config.enabled) return;

  try {
    const llmCall: LLMCallInput = {
      provider: call.provider,
      model: call.model,
      prompt: call.prompt,
      completion: call.response,
      inputTokens: call.tokens.input,
      outputTokens: call.tokens.output,
      status: call.status,
      tenantId,
    };

    const collectorConfig: CollectorConfig = {
      teacherModels: config.teacherModels,
    };

    const pair = collectFromCall(llmCall, collectorConfig);
    if (!pair) return;

    getStorage().trainingPairs.create(pair);
    log.debug({ model: call.model }, 'Training pair captured');
  } catch (err) {
    log.warn({ err }, 'Failed to capture training pair');
  }
}
// --- END CUSTOM ---
