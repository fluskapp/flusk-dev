import { describe, it, expect } from 'vitest';
import { detectDrift } from '../detect-drift.function.js';
import type { LLMCallEntity } from '@flusk/entities';

function makeCall(hoursAgo: number, cost: number): LLMCallEntity {
  const d = new Date(Date.now() - hoursAgo * 3600_000);
  return {
    id: crypto.randomUUID(),
    provider: 'openai',
    model: 'gpt-4',
    prompt: 'test',
    promptHash: 'abc'.repeat(22).slice(0, 64),
    tokens: { input: 100, output: 50, total: 150 },
    cost,
    response: '',
    cached: false,
    status: 'ok',
    consentGiven: true,
    consentPurpose: 'optimization',
    createdAt: d.toISOString(),
    updatedAt: d.toISOString(),
  } as unknown as LLMCallEntity;
}

describe('detectDrift', () => {
  it('returns no drift for stable costs', () => {
    const calls = [
      makeCall(36, 0.01), makeCall(30, 0.01),
      makeCall(12, 0.01), makeCall(6, 0.01),
    ];
    const report = detectDrift(calls, 24);
    expect(report.hasDrift).toBe(false);
    expect(report.alerts).toHaveLength(0);
  });

  it('detects cost spike >2x', () => {
    const calls = [
      makeCall(36, 0.01), makeCall(30, 0.01),
      makeCall(12, 0.10), makeCall(6, 0.10),
    ];
    const report = detectDrift(calls, 24);
    expect(report.hasDrift).toBe(true);
    const spike = report.alerts.find(a => a.type === 'cost-spike');
    expect(spike).toBeDefined();
    expect(spike!.ratio).toBeGreaterThan(2);
  });

  it('handles empty calls', () => {
    const report = detectDrift([], 24);
    expect(report.hasDrift).toBe(false);
  });
});
