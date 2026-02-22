/**
 * Helper functions for analyze report generation
 */
import type { LLMCallEntity } from '@flusk/entities';

export interface ModelSummary {
  model: string;
  calls: number;
  tokens: number;
  cost: number;
}

export function groupByModel(calls: LLMCallEntity[]): ModelSummary[] {
  const map = new Map<string, ModelSummary>();
  for (const c of calls) {
    const existing = map.get(c.model) ?? { model: c.model, calls: 0, tokens: 0, cost: 0 };
    existing.calls++;
    existing.tokens += ((c.tokens as { total?: number })?.total ?? 0);
    existing.cost += c.cost;
    map.set(c.model, existing);
  }
  return [...map.values()].sort((a, b) => b.cost - a.cost);
}

export function findDuplicates(calls: LLMCallEntity[]) {
  const hashMap = new Map<string, LLMCallEntity[]>();
  for (const c of calls) {
    const group = hashMap.get(c.promptHash) ?? [];
    group.push(c);
    hashMap.set(c.promptHash, group);
  }
  return [...hashMap.entries()]
    .filter(([, v]) => v.length > 1)
    .sort((a, b) => b[1].length - a[1].length);
}

export function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

export function usd(n: number): string {
  return n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`;
}

export function truncate(s: string, max = 50): string {
  return s.length > max ? s.slice(0, max) + '...' : s;
}

export function formatDuration(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${Math.round(ms / 1000)}s`;
}
