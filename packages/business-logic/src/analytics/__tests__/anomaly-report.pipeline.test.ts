import { describe, it, expect } from 'vitest';
import { anomalyReport } from '../anomaly-report.pipeline.js';

describe('anomalyReport', () => {
  it('returns no anomalies for empty calls', () => {
    const r = anomalyReport({ calls: [] as never[] });
    expect(r.anomalies).toEqual([]);
    expect(r.totalModelsAnalyzed).toBe(0);
  });

  it('detects cost spike', () => {
    const calls = [
      { model: 'gpt-4o', cost: 0.01 },
      { model: 'gpt-4o', cost: 0.01 },
      { model: 'gpt-4o', cost: 0.01 },
      { model: 'gpt-4o', cost: 0.50 }, // spike
    ];
    const r = anomalyReport({ calls: calls as never[], threshold: 2.0 });
    expect(r.anomalies.length).toBeGreaterThan(0);
    expect(r.anomalies[0].type).toBe('spike');
  });

  it('skips models with fewer than 3 calls', () => {
    const calls = [
      { model: 'gpt-4o', cost: 0.01 },
      { model: 'gpt-4o', cost: 100 },
    ];
    const r = anomalyReport({ calls: calls as never[] });
    expect(r.anomalies).toEqual([]);
  });
});
