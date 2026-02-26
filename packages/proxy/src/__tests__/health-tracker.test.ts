import { describe, it, expect, vi } from 'vitest';
import { HealthTracker } from '../health-tracker.js';

describe('HealthTracker', () => {
  it('new providers are healthy', () => {
    const ht = new HealthTracker();
    expect(ht.isHealthy('openai', 'gpt-4o')).toBe(true);
  });

  it('tracks success rate', () => {
    const ht = new HealthTracker();
    ht.report('openai', 'gpt-4o', 100, true, 200);
    ht.report('openai', 'gpt-4o', 100, false, 500);
    expect(ht.successRate('openai', 'gpt-4o')).toBe(0.5);
  });

  it('tracks average latency', () => {
    const ht = new HealthTracker();
    ht.report('openai', 'gpt-4o', 100, true, 200);
    ht.report('openai', 'gpt-4o', 200, true, 200);
    expect(ht.avgLatency('openai', 'gpt-4o')).toBe(150);
  });

  it('marks rate-limited as unhealthy', () => {
    const ht = new HealthTracker(5000);
    ht.report('openai', 'gpt-4o', 100, false, 429);
    expect(ht.isHealthy('openai', 'gpt-4o')).toBe(false);
  });

  it('disables after high failure rate', () => {
    const ht = new HealthTracker();
    for (let i = 0; i < 6; i++) {
      ht.report('openai', 'gpt-4o', 100, false, 500);
    }
    expect(ht.isHealthy('openai', 'gpt-4o')).toBe(false);
  });

  it('returns default rates for unknown providers', () => {
    const ht = new HealthTracker();
    expect(ht.successRate('unknown', 'x')).toBe(1);
    expect(ht.avgLatency('unknown', 'x')).toBe(0);
  });

  it('re-enables after cooldown', () => {
    vi.useFakeTimers();
    const ht = new HealthTracker(1000);
    ht.report('openai', 'gpt-4o', 100, false, 429);
    expect(ht.isHealthy('openai', 'gpt-4o')).toBe(false);
    vi.advanceTimersByTime(1500);
    expect(ht.isHealthy('openai', 'gpt-4o')).toBe(true);
    vi.useRealTimers();
  });
});
