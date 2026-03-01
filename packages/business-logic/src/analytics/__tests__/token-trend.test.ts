import { describe, it, expect } from 'vitest';
import { tokenTrendAnalysis } from '../token-trend.pipeline.js';
import type { LLMCallEntity } from '@flusk/entities';

function makeCall(daysAgo: number, tokens: number): LLMCallEntity {
  const d = new Date(Date.now() - daysAgo * 86400_000);
  return {
    id: crypto.randomUUID(),
    provider: 'openai',
    model: 'gpt-4',
    prompt: 'test',
    promptHash: 'a'.repeat(64),
    tokens: { input: tokens, output: tokens / 2, total: tokens * 1.5 },
    cost: 0.01,
    response: '',
    cached: false,
    status: 'ok',
    consentGiven: true,
    consentPurpose: 'optimization',
    createdAt: d.toISOString(),
    updatedAt: d.toISOString(),
  } as unknown as LLMCallEntity;
}

describe('tokenTrendAnalysis', () => {
  it('detects increasing trend', () => {
    const calls = [
      makeCall(4, 100), makeCall(3, 100),
      makeCall(2, 500), makeCall(1, 500),
    ];
    const report = tokenTrendAnalysis(calls, 'daily');
    expect(report.trend).toBe('increasing');
  });

  it('detects stable trend', () => {
    const calls = [
      makeCall(4, 100), makeCall(3, 100),
      makeCall(2, 100), makeCall(1, 100),
    ];
    const report = tokenTrendAnalysis(calls, 'daily');
    expect(report.trend).toBe('stable');
  });

  it('returns correct bucket count', () => {
    const calls = [
      makeCall(2, 100), makeCall(2, 100),
      makeCall(1, 200),
    ];
    const report = tokenTrendAnalysis(calls, 'daily');
    expect(report.buckets).toHaveLength(2);
  });

  it('handles empty calls', () => {
    const report = tokenTrendAnalysis([], 'daily');
    expect(report.buckets).toHaveLength(0);
    expect(report.trend).toBe('stable');
  });
});
