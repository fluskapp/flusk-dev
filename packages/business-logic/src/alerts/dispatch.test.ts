import { describe, it, expect, vi } from 'vitest';
import { dispatchAlert } from './dispatch.js';
import type { AlertEvent, AlertRule } from './alert.types.js';

const baseEvent: AlertEvent = {
  ruleId: 'r1',
  type: 'budget',
  severity: 'warning',
  message: 'Budget exceeded',
  value: 15,
  threshold: 10,
  timestamp: '2026-03-01T00:00:00Z',
};

describe('dispatchAlert', () => {
  it('dispatches to stdout', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const rule: AlertRule = {
      id: 'r1', type: 'budget', name: 'Test', threshold: 10,
      channel: 'stdout', channelConfig: {}, enabled: true,
    };
    const ok = await dispatchAlert(baseEvent, rule);
    expect(ok).toBe(true);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
