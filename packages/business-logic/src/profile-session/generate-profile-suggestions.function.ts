/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { CorrelationResult } from './correlate-with-traces.function.js';
import type { ProfileSessionEntity } from '@flusk/entities';

export type ProfileSuggestion = {
  severity: 'info' | 'warning' | 'critical';
  message: string;
};

/**
 * Generate actionable suggestions from profile-to-trace correlations.
 * Pure function — no DB access.
 */
export function generateProfileSuggestions(
  session: ProfileSessionEntity,
  correlations: CorrelationResult[]
): ProfileSuggestion[] {
  const suggestions: ProfileSuggestion[] = [];

  for (const { llmCall, relatedHotspots } of correlations) {
    for (const hotspot of relatedHotspots) {
      if (hotspot.cpuPercent >= 20) {
        suggestions.push({
          severity: 'critical',
          message: `Function ${hotspot.functionName} at ${hotspot.filePath} uses ${hotspot.cpuPercent}% CPU during trace ${llmCall.id} which includes a $${llmCall.cost.toFixed(2)} ${llmCall.model} call — consider caching the serialized output`,
        });
      } else if (hotspot.cpuPercent >= 10) {
        suggestions.push({
          severity: 'warning',
          message: `Function ${hotspot.functionName} at ${hotspot.filePath} uses ${hotspot.cpuPercent}% CPU during ${llmCall.model} call — review for optimization`,
        });
      }
    }
  }

  if (session.type === 'heap' && session.totalSamples > 1000) {
    suggestions.push({
      severity: 'warning',
      message: `High memory allocation in ${session.name} — profile shows ${session.totalSamples} samples during ${session.durationMs}ms window`,
    });
  }

  return suggestions;
}
