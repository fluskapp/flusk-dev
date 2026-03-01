import { describe, it, expect } from 'vitest';
import { detectNearDuplicates } from '../near-duplicate-detection.pipeline.js';
import type { LLMCallEntity } from '@flusk/entities';

function makeCall(prompt: string, cost = 0.01): LLMCallEntity {
  return {
    id: crypto.randomUUID(),
    provider: 'openai',
    model: 'gpt-4',
    prompt,
    promptHash: 'a'.repeat(64),
    tokens: { input: 100, output: 50, total: 150 },
    cost,
    response: '',
    cached: false,
    status: 'ok',
    consentGiven: true,
    consentPurpose: 'optimization',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as LLMCallEntity;
}

describe('detectNearDuplicates', () => {
  it('detects fuzzy duplicates with different numbers', () => {
    const calls = [
      makeCall('Summarize document 1 for the user'),
      makeCall('Summarize document 2 for the user'),
      makeCall('Summarize document 3 for the user'),
    ];
    const result = detectNearDuplicates(calls);
    expect(result.nearDuplicateCount).toBeGreaterThan(0);
  });

  it('returns empty for unique prompts', () => {
    const calls = [
      makeCall('What is machine learning?'),
      makeCall('Translate this to French please now'),
    ];
    const result = detectNearDuplicates(calls);
    expect(result.nearDuplicateCount).toBe(0);
  });

  it('handles empty input', () => {
    const result = detectNearDuplicates([]);
    expect(result.nearDuplicateCount).toBe(0);
    expect(result.estimatedWaste).toBe(0);
  });
});
