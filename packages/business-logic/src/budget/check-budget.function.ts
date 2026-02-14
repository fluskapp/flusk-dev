/** @generated —
 * Check budget status against limits and usage
 */
import type { BudgetLimits, BudgetPeriod, BudgetStatus, UsageData } from './budget.types.js';

export function checkBudget(
  limits: BudgetLimits | undefined,
  usage: UsageData,
): BudgetStatus {
  const daily = buildPeriod(limits?.daily, usage.dailyCost);
  const monthly = buildPeriod(limits?.monthly, usage.monthlyCost);
  const alerts = buildAlerts(daily, monthly, limits, usage);

  return { daily, monthly, alerts };
}

function buildPeriod(limit: number | undefined, used: number): BudgetPeriod {
  const resolvedLimit = limit ?? Infinity;
  const remaining = Math.max(0, resolvedLimit - used);
  const percentage = resolvedLimit === Infinity
    ? 0
    : Math.min(100, (used / resolvedLimit) * 100);

  return {
    limit: resolvedLimit,
    used,
    remaining,
    exceeded: used > resolvedLimit,
    percentage,
  };
}

function buildAlerts(
  daily: BudgetPeriod,
  monthly: BudgetPeriod,
  limits: BudgetLimits | undefined,
  usage: UsageData,
): string[] {
  const alerts: string[] = [];

  if (daily.limit !== Infinity) {
    if (daily.exceeded) {
      alerts.push(`Daily budget exceeded — $${daily.used.toFixed(2)} / $${daily.limit.toFixed(2)}`);
    } else if (daily.percentage >= 80) {
      alerts.push(`Daily budget at ${daily.percentage.toFixed(0)}% — $${daily.remaining.toFixed(2)} remaining`);
    }
  }

  if (monthly.limit !== Infinity) {
    if (monthly.exceeded) {
      alerts.push(`Monthly budget exceeded — $${monthly.used.toFixed(2)} / $${monthly.limit.toFixed(2)}`);
    } else if (monthly.percentage >= 80) {
      alerts.push(`Monthly budget at ${monthly.percentage.toFixed(0)}% — $${monthly.remaining.toFixed(2)} remaining`);
    }
  }

  if (limits?.duplicateRatio != null && usage.totalCalls > 0) {
    const ratio = usage.duplicateCalls / usage.totalCalls;
    if (ratio > limits.duplicateRatio) {
      const pct = (ratio * 100).toFixed(0);
      const thresh = (limits.duplicateRatio * 100).toFixed(0);
      alerts.push(`${pct}% duplicate ratio exceeds ${thresh}% threshold`);
    }
  }

  return alerts;
}
