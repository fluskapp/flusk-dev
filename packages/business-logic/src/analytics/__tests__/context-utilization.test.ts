import { describe, it, expect } from 'vitest';
import { contextUtilization } from '../context-utilization.pipeline.js';
import type { LLMCallEntity } from '@flusk/entities';

function makeCall(model: string, input: number, output: number): LLMCallEntity {
  return {
    id: crypto.randomUUID(),
    provider: 'openai',
    model,
    prompt: 'test',
    promptHash: 'a'.repeat(64),
    tokens: { input, output, total: input + output },
    cost: 0.01,
    response: '',
    cached: false,
    status: 'ok',
    consentGiven: true,
    consentPurpose: 'optimization',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as LLMCallEntity;
}

describe('contextUtilization', () => {
  it('flags underutilized calls (<10%)', () => {
    const calls = [makeCall('gpt-4', 50, 10)]; // 60/8192 < 10%
    const report = contextUtilization(calls);
    expect(report.underutilizedCount).toBe(1);
    expect(report.optimizationOpportunities).toHaveLength(1);
  });

  it('does not flag well-utilized calls', () => {
    const calls = [makeCall('gpt-4', 4000, 1000)]; // 5000/8192 > 10%
    const report = contextUtilization(calls);
    expect(report.underutilizedCount).toBe(0);
  });

  it('calculates average utilization', () => {
    const calls = [
      makeCall('gpt-4', 4096, 0),    // 50%
      makeCall('gpt-4', 8192, 0),    // 100%
    ];
    const report = contextUtilization(calls);
    expect(report.avgUtilization).toBeCloseTo(0.75);
  });
});
