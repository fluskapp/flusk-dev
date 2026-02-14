import { describe, it, expect } from 'vitest';
import { checkBudget } from './check-budget.function.js';

describe('checkBudget', () => {
  it('returns no alerts when under budget', () => {
    const result = checkBudget(
      { daily: 10, monthly: 500 },
      { dailyCost: 2, monthlyCost: 50, totalCalls: 10, duplicateCalls: 0 },
    );
    expect(result.daily.exceeded).toBe(false);
    expect(result.monthly.exceeded).toBe(false);
    expect(result.alerts).toHaveLength(0);
  });

  it('alerts when daily budget at 80%+', () => {
    const result = checkBudget(
      { daily: 10 },
      { dailyCost: 8.5, monthlyCost: 100, totalCalls: 10, duplicateCalls: 0 },
    );
    expect(result.daily.percentage).toBeCloseTo(85);
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0]).toContain('Daily budget at 85%');
  });

  it('alerts when budget exceeded', () => {
    const result = checkBudget(
      { daily: 10, monthly: 100 },
      { dailyCost: 12, monthlyCost: 110, totalCalls: 10, duplicateCalls: 0 },
    );
    expect(result.daily.exceeded).toBe(true);
    expect(result.monthly.exceeded).toBe(true);
    expect(result.alerts).toHaveLength(2);
  });

  it('alerts on duplicate ratio', () => {
    const result = checkBudget(
      { duplicateRatio: 0.1 },
      { dailyCost: 0, monthlyCost: 0, totalCalls: 100, duplicateCalls: 20 },
    );
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0]).toContain('20% duplicate ratio');
  });

  it('handles undefined limits gracefully', () => {
    const result = checkBudget(undefined, {
      dailyCost: 100, monthlyCost: 1000, totalCalls: 0, duplicateCalls: 0,
    });
    expect(result.daily.limit).toBe(Infinity);
    expect(result.alerts).toHaveLength(0);
  });
});
