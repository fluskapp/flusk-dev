/**
 * Evaluate alert rules against current metrics.
 */

import { getLogger } from '@flusk/logger';
import type { AlertRule, AlertEvent, AlertSeverity } from './alert.types.js';

const log = getLogger().child({ module: 'alert-evaluate' });

export interface MetricSnapshot {
  totalCostToday: number;
  avgLatencyMs: number;
  errorRate: number;
}

/** Evaluate all rules against a metric snapshot. */
export function evaluateRules(
  rules: AlertRule[],
  metrics: MetricSnapshot,
): AlertEvent[] {
  const events: AlertEvent[] = [];
  const now = new Date().toISOString();

  for (const rule of rules) {
    if (!rule.enabled) continue;
    const value = getMetricValue(rule.type, metrics);
    if (value === null) continue;

    if (value >= rule.threshold) {
      const severity = getSeverity(value, rule.threshold);
      events.push({
        ruleId: rule.id,
        type: rule.type,
        severity,
        message: formatMessage(rule, value),
        value,
        threshold: rule.threshold,
        timestamp: now,
      });
      log.warn({ rule: rule.name, value, threshold: rule.threshold }, 'Alert triggered');
    }
  }

  return events;
}

function getMetricValue(type: string, m: MetricSnapshot): number | null {
  if (type === 'budget') return m.totalCostToday;
  if (type === 'latency') return m.avgLatencyMs;
  if (type === 'error-rate') return m.errorRate;
  return null;
}

function getSeverity(value: number, threshold: number): AlertSeverity {
  const ratio = value / threshold;
  if (ratio >= 2.0) return 'critical';
  if (ratio >= 1.5) return 'warning';
  return 'info';
}

function formatMessage(rule: AlertRule, value: number): string {
  return `${rule.name}: ${value.toFixed(2)} exceeds threshold ${rule.threshold}`;
}
