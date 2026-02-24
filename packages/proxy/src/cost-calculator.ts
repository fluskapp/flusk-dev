/**
 * Calculate cost from token usage and model pricing.
 */

import { PRICING } from './pricing.js';

export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

export interface CostResult {
  costUsd: number | null;
  model: string;
}

/** Strip date suffixes like -2024-08-06 from model names */
function normalizeModel(model: string): string {
  const stripped = model.replace(/-\d{8}$/, '');
  if (PRICING[stripped]) return stripped;
  // claude-sonnet-4 → claude-4-sonnet
  const m = stripped.match(/^claude-(\w+)-(\d+(?:\.\d+)?)$/);
  if (m) {
    const flipped = `claude-${m[2]}-${m[1]}`;
    if (PRICING[flipped]) return flipped;
  }
  return model;
}

/** Calculate cost in USD. Returns null for unknown models. */
export function calculateCost(
  model: string,
  tokens: TokenUsage,
): CostResult {
  const normalized = normalizeModel(model);
  const pricing = PRICING[normalized];
  if (!pricing) return { costUsd: null, model };

  const inputCost = (tokens.input / 1_000_000) * pricing.input;
  const outputCost = (tokens.output / 1_000_000) * pricing.output;
  return { costUsd: inputCost + outputCost, model };
}
