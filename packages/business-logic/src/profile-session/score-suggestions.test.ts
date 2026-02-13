import { describe, it, expect } from 'vitest';
import { scoreSuggestions } from './score-suggestions.function.js';
import type { ProfileSuggestion } from './generate-profile-suggestions.function.js';
import type { DetectedPattern } from './detect-patterns.function.js';

describe('scoreSuggestions', () => {
  it('scores and sorts suggestions by score descending', () => {
    const suggestions: ProfileSuggestion[] = [
      { severity: 'info', message: 'Low impact note' },
      { severity: 'critical', message: 'fn uses 30% CPU during $0.50 gpt-4 call' },
    ];
    const patterns: DetectedPattern[] = [];

    const scored = scoreSuggestions(suggestions, patterns);
    expect(scored).toHaveLength(2);
    expect(scored[0].score).toBeGreaterThan(scored[1].score);
    expect(scored[0].source).toBe('profile');
  });

  it('includes pattern-based suggestions', () => {
    const patterns: DetectedPattern[] = [
      {
        pattern: 'hot-path-llm-call',
        severity: 'high',
        description: 'handleReq uses 25% CPU',
        suggestion: 'Cache results',
        metadata: {
          hotspot: { cpuPercent: 25, functionName: 'handleReq', filePath: 'x.ts', samples: 500 },
        },
      },
    ];

    const scored = scoreSuggestions([], patterns);
    expect(scored).toHaveLength(1);
    expect(scored[0].source).toBe('pattern');
    expect(scored[0].score).toBeGreaterThan(80);
  });

  it('returns empty for no input', () => {
    expect(scoreSuggestions([], [])).toHaveLength(0);
  });
});
