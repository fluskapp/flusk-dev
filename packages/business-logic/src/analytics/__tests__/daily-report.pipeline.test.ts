import { describe, it, expect } from 'vitest';
import { dailyReport } from '../daily-report.pipeline.js';

const makeCalls = (overrides: Record<string, unknown>[] = []) =>
  overrides.map((o, i) => ({
    id: `call-${i}`, model: 'gpt-4o', provider: 'openai',
    cost: 0.01, tokens: { input: 100, output: 50, total: 150 },
    promptHash: `hash-${i}`, ...o,
  }));

describe('dailyReport', () => {
  it('returns zero for empty calls', () => {
    const r = dailyReport({ calls: [] as never[], date: '2026-03-01' });
    expect(r.totalCost).toBe(0);
    expect(r.totalCalls).toBe(0);
    expect(r.byModel).toEqual([]);
  });

  it('aggregates by model and provider', () => {
    const calls = makeCalls([
      { model: 'gpt-4o', provider: 'openai', cost: 0.05 },
      { model: 'gpt-4o', provider: 'openai', cost: 0.03 },
      { model: 'claude-3-sonnet', provider: 'anthropic', cost: 0.02 },
    ]);
    const r = dailyReport({ calls: calls as never[], date: '2026-03-01' });
    expect(r.totalCalls).toBe(3);
    expect(r.byModel.length).toBe(2);
    expect(r.byProvider['openai'].count).toBe(2);
    expect(r.byProvider['anthropic'].count).toBe(1);
  });
});
