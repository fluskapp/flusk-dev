import { describe, it, expect } from 'vitest';
import { wasteReport } from '../waste-report.pipeline.js';

describe('wasteReport', () => {
  it('returns empty for no calls', () => {
    const r = wasteReport({ calls: [] as never[] });
    expect(r.duplicatePrompts).toEqual([]);
    expect(r.duplicateCostTotal).toBe(0);
    expect(r.overProvisioned).toEqual([]);
  });

  it('detects duplicate prompts', () => {
    const calls = [
      { model: 'gpt-4o', promptHash: 'abc', cost: 0.10 },
      { model: 'gpt-4o', promptHash: 'abc', cost: 0.10 },
      { model: 'gpt-4o', promptHash: 'abc', cost: 0.10 },
      { model: 'gpt-4o', promptHash: 'def', cost: 0.05 },
    ];
    const r = wasteReport({ calls: calls as never[] });
    expect(r.duplicatePrompts.length).toBe(1);
    expect(r.duplicatePrompts[0].count).toBe(3);
    expect(r.duplicateCostTotal).toBeGreaterThan(0);
  });

  it('detects over-provisioned models', () => {
    const calls = Array.from({ length: 10 }, () => ({
      model: 'gpt-4', promptHash: 'x',
      cost: 0.10,
      tokens: { input: 5000, output: 10, total: 5010 },
    }));
    const r = wasteReport({ calls: calls as never[] });
    expect(r.overProvisioned.length).toBe(1);
    expect(r.overProvisioned[0].model).toBe('gpt-4');
  });
});
