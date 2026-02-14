import { describe, it, expect } from 'vitest';
import { budget } from '@flusk/business-logic';
import type { BudgetLimits, UsageData } from '@flusk/types';

describe('Budget alerts (no Docker)', () => {
  const limits: BudgetLimits = {
    daily: 10.0,
    monthly: 200.0,
    duplicateRatio: 0.2,
  };

  it('returns no alerts when usage is within limits', () => {
    const usage: UsageData = {
      dailyCost: 2.0,
      monthlyCost: 50.0,
      totalCalls: 100,
      duplicateCalls: 5,
    };
    const status = budget.checkBudget(limits, usage);
    expect(status.alerts).toHaveLength(0);
    expect(status.daily.exceeded).toBe(false);
    expect(status.monthly.exceeded).toBe(false);
  });

  it('triggers daily budget exceeded alert', () => {
    const usage: UsageData = {
      dailyCost: 12.0,
      monthlyCost: 50.0,
      totalCalls: 100,
      duplicateCalls: 5,
    };
    const status = budget.checkBudget(limits, usage);
    expect(status.daily.exceeded).toBe(true);
    expect(status.alerts.some((a) => a.includes('Daily budget exceeded'))).toBe(true);
  });

  it('triggers monthly budget exceeded alert', () => {
    const usage: UsageData = {
      dailyCost: 5.0,
      monthlyCost: 250.0,
      totalCalls: 100,
      duplicateCalls: 5,
    };
    const status = budget.checkBudget(limits, usage);
    expect(status.monthly.exceeded).toBe(true);
    expect(status.alerts.some((a) => a.includes('Monthly budget exceeded'))).toBe(true);
  });

  it('triggers warning at 80% daily usage', () => {
    const usage: UsageData = {
      dailyCost: 8.5,
      monthlyCost: 50.0,
      totalCalls: 100,
      duplicateCalls: 5,
    };
    const status = budget.checkBudget(limits, usage);
    expect(status.daily.exceeded).toBe(false);
    expect(status.daily.percentage).toBeGreaterThanOrEqual(80);
    expect(status.alerts.some((a) => a.includes('Daily budget at'))).toBe(true);
  });

  it('triggers duplicate ratio alert', () => {
    const usage: UsageData = {
      dailyCost: 2.0,
      monthlyCost: 50.0,
      totalCalls: 100,
      duplicateCalls: 30,
    };
    const status = budget.checkBudget(limits, usage);
    expect(status.alerts.some((a) => a.includes('duplicate ratio'))).toBe(true);
  });

  it('handles no limits gracefully', () => {
    const usage: UsageData = {
      dailyCost: 999.0,
      monthlyCost: 9999.0,
      totalCalls: 100,
      duplicateCalls: 50,
    };
    const status = budget.checkBudget(undefined, usage);
    expect(status.alerts).toHaveLength(0);
    expect(status.daily.exceeded).toBe(false);
    expect(status.monthly.exceeded).toBe(false);
  });

  it('calculates percentage correctly', () => {
    const usage: UsageData = {
      dailyCost: 5.0,
      monthlyCost: 100.0,
      totalCalls: 10,
      duplicateCalls: 0,
    };
    const status = budget.checkBudget(limits, usage);
    expect(status.daily.percentage).toBe(50);
    expect(status.monthly.percentage).toBe(50);
    expect(status.daily.remaining).toBe(5.0);
    expect(status.monthly.remaining).toBe(100.0);
  });
});
