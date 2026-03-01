/**
 * Daily cost digest — per model, per provider, total.
 */

import { getLogger } from '@flusk/logger';
import type { LLMCallEntity } from '@flusk/entities';

const log = getLogger().child({ pipeline: 'dailyReport' });

export interface DailyReportInput {
  calls: LLMCallEntity[];
  date: string;
}

export interface ModelCost {
  model: string;
  provider: string;
  count: number;
  cost: number;
  inputTokens: number;
  outputTokens: number;
}

export interface DailyReportOutput {
  date: string;
  totalCost: number;
  totalCalls: number;
  byModel: ModelCost[];
  byProvider: Record<string, { count: number; cost: number }>;
}

export function dailyReport(input: DailyReportInput): DailyReportOutput {
  log.debug({ date: input.date }, 'daily report start');

  const byModel = new Map<string, ModelCost>();
  const byProvider: Record<string, { count: number; cost: number }> = {};
  let totalCost = 0;

  for (const call of input.calls) {
    totalCost += call.cost ?? 0;
    const key = `${call.provider}/${call.model}`;

    if (!byModel.has(key)) {
      byModel.set(key, {
        model: call.model, provider: call.provider,
        count: 0, cost: 0, inputTokens: 0, outputTokens: 0,
      });
    }
    const entry = byModel.get(key)!;
    entry.count++;
    entry.cost += call.cost ?? 0;
    const tokens = call.tokens as Record<string, number> | undefined;
    entry.inputTokens += tokens?.input ?? 0;
    entry.outputTokens += tokens?.output ?? 0;

    if (!byProvider[call.provider]) {
      byProvider[call.provider] = { count: 0, cost: 0 };
    }
    byProvider[call.provider].count++;
    byProvider[call.provider].cost += call.cost ?? 0;
  }

  return {
    date: input.date,
    totalCost,
    totalCalls: input.calls.length,
    byModel: [...byModel.values()].sort((a, b) => b.cost - a.cost),
    byProvider,
  };
}
