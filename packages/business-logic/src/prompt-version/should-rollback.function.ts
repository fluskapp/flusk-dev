/**
 * Determine if the active version should be rolled back
 * to the previous version based on quality degradation
 */

import type { VersionMetrics } from './compare-versions.function.js';

export interface RollbackDecision {
  shouldRollback: boolean;
  reason: string;
  qualityDrop: number;
}

const DEFAULT_QUALITY_THRESHOLD = 0.1; // 10% quality drop triggers rollback
const MIN_SAMPLE_COUNT = 10;

/**
 * Check if current active version should roll back to previous
 */
export function shouldRollback(
  current: VersionMetrics,
  previous: VersionMetrics,
  qualityThreshold: number = DEFAULT_QUALITY_THRESHOLD
): RollbackDecision {
  if (current.sampleCount < MIN_SAMPLE_COUNT) {
    return {
      shouldRollback: false,
      reason: `Insufficient samples: ${current.sampleCount}/${MIN_SAMPLE_COUNT}`,
      qualityDrop: 0,
    };
  }

  const qualityDrop = previous.avgQuality > 0
    ? (previous.avgQuality - current.avgQuality) / previous.avgQuality
    : 0;

  if (qualityDrop > qualityThreshold) {
    return {
      shouldRollback: true,
      reason: `Quality dropped ${(qualityDrop * 100).toFixed(1)}% (threshold: ${(qualityThreshold * 100).toFixed(1)}%)`,
      qualityDrop,
    };
  }

  return {
    shouldRollback: false,
    reason: 'Quality within acceptable range',
    qualityDrop,
  };
}
