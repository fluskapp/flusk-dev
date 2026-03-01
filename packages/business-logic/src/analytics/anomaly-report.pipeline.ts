/**
 * Anomaly detection — cost spikes and drops vs rolling average.
 */

import { getLogger } from '@flusk/logger';
import type { LLMCallEntity } from '@flusk/entities';

const log = getLogger().child({ pipeline: 'anomalyReport' });

export interface AnomalyReportInput {
  calls: LLMCallEntity[];
  windowSize?: number;
  threshold?: number;
}

export interface Anomaly {
  type: 'spike' | 'drop';
  model: string;
  currentCost: number;
  averageCost: number;
  deviation: number;
}

export interface AnomalyReportOutput {
  anomalies: Anomaly[];
  totalModelsAnalyzed: number;
}

export function anomalyReport(input: AnomalyReportInput): AnomalyReportOutput {
  log.debug('anomaly report start');
  const threshold = input.threshold ?? 2.0;

  const byModel = new Map<string, number[]>();
  for (const call of input.calls) {
    const costs = byModel.get(call.model) ?? [];
    costs.push(call.cost ?? 0);
    byModel.set(call.model, costs);
  }

  const anomalies: Anomaly[] = [];
  for (const [model, costs] of byModel) {
    if (costs.length < 3) continue;
    const avg = costs.reduce((a, b) => a + b, 0) / costs.length;
    if (avg === 0) continue;
    const latest = costs[costs.length - 1];
    const deviation = (latest - avg) / avg;

    if (deviation > threshold) {
      anomalies.push({ type: 'spike', model, currentCost: latest, averageCost: avg, deviation });
    } else if (deviation < -threshold) {
      anomalies.push({ type: 'drop', model, currentCost: latest, averageCost: avg, deviation });
    }
  }

  return { anomalies, totalModelsAnalyzed: byModel.size };
}
