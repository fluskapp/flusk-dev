import { describe, it, expect } from 'vitest';
import { evaluateRules } from './evaluate.js';
import type { AlertRule, MetricSnapshot } from './index.js';

const makeRule = (overrides: Partial<AlertRule> = {}): AlertRule => ({
  id: 'r1',
  type: 'budget',
  name: 'Daily budget',
  threshold: 10,
  channel: 'stdout',
  channelConfig: {},
  enabled: true,
  ...overrides,
});

const baseMetrics: MetricSnapshot = {
  totalCostToday: 5,
  avgLatencyMs: 200,
  errorRate: 0.01,
};

describe('evaluateRules', () => {
  it('returns empty when no rules trigger', () => {
    const events = evaluateRules([makeRule()], baseMetrics);
    expect(events).toEqual([]);
  });

  it('fires budget alert when over threshold', () => {
    const events = evaluateRules(
      [makeRule({ threshold: 3 })],
      baseMetrics,
    );
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('budget');
  });

  it('fires latency alert', () => {
    const events = evaluateRules(
      [makeRule({ type: 'latency', threshold: 100 })],
      baseMetrics,
    );
    expect(events.length).toBe(1);
  });

  it('fires error-rate alert', () => {
    const events = evaluateRules(
      [makeRule({ type: 'error-rate', threshold: 0.005 })],
      baseMetrics,
    );
    expect(events.length).toBe(1);
  });

  it('skips disabled rules', () => {
    const events = evaluateRules(
      [makeRule({ threshold: 1, enabled: false })],
      baseMetrics,
    );
    expect(events).toEqual([]);
  });

  it('severity is critical when 2x threshold', () => {
    const events = evaluateRules(
      [makeRule({ threshold: 2 })],
      { ...baseMetrics, totalCostToday: 5 },
    );
    expect(events[0].severity).toBe('critical');
  });
});
