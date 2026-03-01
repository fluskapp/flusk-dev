import { describe, it, expect } from 'vitest';
import type { AlertRule, AlertEvent } from './alert.types.js';

describe('alert types', () => {
  it('AlertRule shape is valid', () => {
    const rule: AlertRule = {
      id: 'r1',
      type: 'budget',
      name: 'Test',
      threshold: 10,
      channel: 'stdout',
      channelConfig: {},
      enabled: true,
    };
    expect(rule.id).toBe('r1');
    expect(rule.type).toBe('budget');
  });

  it('AlertEvent shape is valid', () => {
    const event: AlertEvent = {
      ruleId: 'r1',
      type: 'budget',
      severity: 'warning',
      message: 'Over budget',
      value: 15,
      threshold: 10,
      timestamp: '2026-01-01',
    };
    expect(event.severity).toBe('warning');
  });
});
