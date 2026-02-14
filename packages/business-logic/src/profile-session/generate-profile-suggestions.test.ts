import { describe, it, expect } from 'vitest';
import { generateProfileSuggestions } from './generate-profile-suggestions.function.js';
import { ProfileSessionEntity, LLMCallEntity } from '@flusk/entities';
import type { CorrelationResult } from './correlate-with-traces.function.js';

const MOCK_SESSION: ProfileSessionEntity = {
  id: 'sess-1',
  createdAt: '2026-02-13T18:00:00Z',
  updatedAt: '2026-02-13T18:00:00Z',
  name: 'cpu-profile',
  profileType: 'cpu',
  durationMs: 30000,
  totalSamples: 5000,
  hotspots: [],
  markdownRaw: '',
  pprofPath: '',
  flamegraphPath: '',
  traceIds: [],
  startedAt: '2026-02-13T18:00:00Z',
};

const MOCK_LLM_CALL: LLMCallEntity = {
  id: 'call-1',
  createdAt: '2026-02-13T18:00:05Z',
  updatedAt: '2026-02-13T18:00:05Z',
  provider: 'openai',
  model: 'gpt-4',
  prompt: 'test',
  promptHash: 'a'.repeat(64),
  tokens: { input: 10, output: 20, total: 30 },
  cost: 0.12,
  response: 'resp',
  cached: false,
  consentGiven: true,
  consentPurpose: 'optimization',
};

describe('generateProfileSuggestions', () => {
  it('should generate critical suggestion for high CPU hotspot', () => {
    const correlations: CorrelationResult[] = [{
      llmCall: MOCK_LLM_CALL,
      relatedHotspots: [
        { functionName: 'JSON.stringify', filePath: 'mw.ts:42', cpuPercent: 30, samples: 1500 },
      ],
    }];
    const suggestions = generateProfileSuggestions(MOCK_SESSION, correlations);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].severity).toBe('critical');
    expect(suggestions[0].message).toContain('JSON.stringify');
  });

  it('should generate heap warning for high sample count', () => {
    const heapSession = { ...MOCK_SESSION, profileType: 'heap' as const, totalSamples: 2000 };
    const suggestions = generateProfileSuggestions(heapSession, []);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].severity).toBe('warning');
  });

  it('should return empty for no correlations and low samples', () => {
    const suggestions = generateProfileSuggestions(MOCK_SESSION, []);
    expect(suggestions).toHaveLength(0);
  });
});
