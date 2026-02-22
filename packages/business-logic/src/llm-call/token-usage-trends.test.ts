import { describe, it, expect } from 'vitest';
import { aggregateTokenTrends } from './token-usage-trends.function.js';

const mkCall = (hour: number, input: number, output: number) => ({
  createdAt: `2026-01-15T${String(hour).padStart(2, '0')}:30:00Z`,
  tokens: { input, output, total: input + output },
  cost: 0.01,
});

describe('aggregateTokenTrends', () => {
  it('groups by hourly buckets', () => {
    const result = aggregateTokenTrends({
      calls: [mkCall(10, 100, 50), mkCall(10, 200, 100), mkCall(11, 50, 25)],
      period: 'hourly',
    });
    expect(result.buckets).toHaveLength(2);
    expect(result.buckets[0]!.period).toBe('2026-01-15T10:00Z');
    expect(result.buckets[0]!.callCount).toBe(2);
    expect(result.buckets[0]!.totalInputTokens).toBe(300);
    expect(result.totalCalls).toBe(3);
  });

  it('groups by daily buckets', () => {
    const result = aggregateTokenTrends({
      calls: [mkCall(10, 100, 50), mkCall(14, 200, 100)],
      period: 'daily',
    });
    expect(result.buckets).toHaveLength(1);
    expect(result.buckets[0]!.period).toBe('2026-01-15');
    expect(result.buckets[0]!.callCount).toBe(2);
  });

  it('returns empty for no calls', () => {
    const result = aggregateTokenTrends({ calls: [], period: 'daily' });
    expect(result.buckets).toHaveLength(0);
    expect(result.totalCalls).toBe(0);
  });
});
