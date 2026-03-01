/**
 * Waste report — duplicate prompts, unused tokens, over-provisioned models.
 */

import { getLogger } from '@flusk/logger';
import type { LLMCallEntity } from '@flusk/entities';

const log = getLogger().child({ pipeline: 'wasteReport' });

export interface WasteReportInput {
  calls: LLMCallEntity[];
}

export interface DuplicateGroup {
  promptHash: string;
  count: number;
  wastedCost: number;
  model: string;
}

export interface OverProvisionedModel {
  model: string;
  avgOutputRatio: number;
  callCount: number;
  suggestion: string;
}

export interface WasteReportOutput {
  duplicatePrompts: DuplicateGroup[];
  duplicateCostTotal: number;
  overProvisioned: OverProvisionedModel[];
  totalWaste: number;
}

export function wasteReport(input: WasteReportInput): WasteReportOutput {
  log.debug('waste report start');

  const hashGroups = new Map<string, { count: number; cost: number; model: string }>();
  for (const call of input.calls) {
    const hash = call.promptHash ?? '';
    if (!hash) continue;
    const group = hashGroups.get(hash) ?? { count: 0, cost: 0, model: call.model };
    group.count++;
    group.cost += call.cost ?? 0;
    hashGroups.set(hash, group);
  }

  const duplicatePrompts: DuplicateGroup[] = [];
  let duplicateCostTotal = 0;
  for (const [promptHash, g] of hashGroups) {
    if (g.count > 1) {
      const wastedCost = g.cost * ((g.count - 1) / g.count);
      duplicatePrompts.push({ promptHash, count: g.count, wastedCost, model: g.model });
      duplicateCostTotal += wastedCost;
    }
  }

  const overProvisioned = detectOverProvisioned(input.calls);
  const totalWaste = duplicateCostTotal;

  return { duplicatePrompts, duplicateCostTotal, overProvisioned, totalWaste };
}

function detectOverProvisioned(calls: LLMCallEntity[]): OverProvisionedModel[] {
  const byModel = new Map<string, { totalIn: number; totalOut: number; count: number }>();
  for (const call of calls) {
    const m = byModel.get(call.model) ?? { totalIn: 0, totalOut: 0, count: 0 };
    const tokens = call.tokens as Record<string, number> | undefined;
    m.totalIn += tokens?.input ?? 0;
    m.totalOut += tokens?.output ?? 0;
    m.count++;
    byModel.set(call.model, m);
  }

  const result: OverProvisionedModel[] = [];
  for (const [model, stats] of byModel) {
    if (stats.count < 5) continue;
    const ratio = stats.totalOut / Math.max(stats.totalIn, 1);
    if (ratio < 0.1) {
      result.push({
        model,
        avgOutputRatio: ratio,
        callCount: stats.count,
        suggestion: 'Consider a smaller/cheaper model — output is very short relative to input',
      });
    }
  }
  return result;
}
