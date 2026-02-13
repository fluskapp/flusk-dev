import { describe, it, expect } from 'vitest';
import { correlateWithTraces } from './correlate-with-traces.function.js';
import { ProfileSessionEntity } from '@flusk/entities';

function createMockPool(rows: any[]) {
  return { query: async () => ({ rows }) } as any;
}

const MOCK_SESSION: ProfileSessionEntity = {
  id: 'a1b2c3d4-0000-0000-0000-000000000001',
  createdAt: '2026-02-13T18:00:00.000Z',
  updatedAt: '2026-02-13T18:00:00.000Z',
  name: 'test-profile',
  type: 'cpu',
  durationMs: 30000,
  totalSamples: 5000,
  hotspots: [
    { functionName: 'JSON.stringify', filePath: 'mw.ts:42', cpuPercent: 30, samples: 1500 },
  ],
  markdownRaw: '',
  pprofPath: '/tmp/test.pb',
  flamegraphPath: '/tmp/test.html',
  traceIds: [],
  startedAt: '2026-02-13T18:00:00.000Z',
};

describe('correlateWithTraces', () => {
  it('should return correlated LLM calls', async () => {
    const mockRow = {
      id: 'call-1',
      created_at: new Date('2026-02-13T18:00:05Z'),
      updated_at: new Date('2026-02-13T18:00:05Z'),
      provider: 'openai',
      model: 'gpt-4',
      prompt: 'test',
      prompt_hash: 'a'.repeat(64),
      tokens: { input: 10, output: 20, total: 30 },
      cost: '0.12',
      response: 'resp',
      cached: false,
      organization_id: null,
      consent_given: true,
      consent_purpose: 'optimization',
    };

    const pool = createMockPool([mockRow]);
    const results = await correlateWithTraces(pool, MOCK_SESSION);

    expect(results).toHaveLength(1);
    expect(results[0].llmCall.provider).toBe('openai');
    expect(results[0].relatedHotspots).toHaveLength(1);
  });

  it('should return empty array when no matching calls', async () => {
    const pool = createMockPool([]);
    const results = await correlateWithTraces(pool, MOCK_SESSION);
    expect(results).toHaveLength(0);
  });
});
