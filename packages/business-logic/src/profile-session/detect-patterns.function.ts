import type { ProfileSessionEntity, Severity } from '@flusk/entities';
import type { CorrelationResult } from './correlate-with-traces.function.js';
import { detectHotPathCalls } from './detect-hot-path-calls.function.js';
import { detectSerializationWaste } from './detect-serialization-waste.function.js';
import { detectMemoryChurn } from './detect-memory-churn.function.js';
import { detectColdStart } from './detect-cold-start.function.js';

export type DetectedPattern = {
  pattern: string;
  severity: Severity;
  description: string;
  suggestion: string;
  metadata: Record<string, unknown>;
};

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Orchestrator: runs all pattern detectors, deduplicates, sorts
 * by severity. Returns DetectedPattern[].
 */
export function detectPatterns(
  session: ProfileSessionEntity,
  correlations: CorrelationResult[],
  previousSessions: ProfileSessionEntity[] = [],
): DetectedPattern[] {
  const all = [
    ...detectHotPathCalls(correlations),
    ...detectSerializationWaste(correlations),
    ...detectMemoryChurn(session, correlations),
    ...detectColdStart(session, previousSessions),
  ];

  const seen = new Set<string>();
  const deduped = all.filter((p) => {
    const key = `${p.pattern}:${p.description}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );
}
