import { describe, it, expect } from 'vitest';
import { detectSimilarGroups, SimilarCallInput } from './detect-similar-groups.function.js';

/** Create a unit vector in a given direction (for testing) */
function makeEmbedding(angle: number, dims = 4): number[] {
  const vec = new Array(dims).fill(0);
  vec[0] = Math.cos(angle);
  vec[1] = Math.sin(angle);
  return vec;
}

function makeCall(id: string, embedding: number[]): SimilarCallInput {
  return {
    id,
    prompt: `prompt-${id}`,
    model: 'gpt-4',
    cost: 0.01,
    createdAt: new Date().toISOString(),
    embedding,
  };
}

describe('detectSimilarGroups', () => {
  it('returns empty array when no calls', () => {
    expect(detectSimilarGroups([])).toEqual([]);
  });

  it('returns empty array when all calls are dissimilar', () => {
    const calls = [
      makeCall('a', makeEmbedding(0)),
      makeCall('b', makeEmbedding(Math.PI / 2)), // 90° apart
    ];
    const groups = detectSimilarGroups(calls, 0.95);
    expect(groups).toHaveLength(0);
  });

  it('groups nearly identical embeddings together', () => {
    const calls = [
      makeCall('a', makeEmbedding(0)),
      makeCall('b', makeEmbedding(0.01)), // very close
      makeCall('c', makeEmbedding(0.02)), // very close
    ];
    const groups = detectSimilarGroups(calls, 0.95);
    expect(groups).toHaveLength(1);
    expect(groups[0].calls).toHaveLength(3);
    expect(groups[0].centroidId).toBe('a');
  });

  it('creates separate groups for distinct clusters', () => {
    const calls = [
      makeCall('a1', makeEmbedding(0)),
      makeCall('a2', makeEmbedding(0.01)),
      makeCall('b1', makeEmbedding(Math.PI)),
      makeCall('b2', makeEmbedding(Math.PI + 0.01)),
    ];
    const groups = detectSimilarGroups(calls, 0.95);
    expect(groups).toHaveLength(2);
  });

  it('calculates totalCost correctly', () => {
    const e = makeEmbedding(0);
    const calls = [
      { ...makeCall('a', e), cost: 0.05 },
      { ...makeCall('b', e), cost: 0.10 },
    ];
    const groups = detectSimilarGroups(calls, 0.95);
    expect(groups[0].totalCost).toBeCloseTo(0.15);
  });

  it('does not group singletons', () => {
    const calls = [makeCall('a', makeEmbedding(0))];
    expect(detectSimilarGroups(calls, 0.95)).toHaveLength(0);
  });

  it('sorts groups by totalCost descending', () => {
    const calls = [
      { ...makeCall('a1', makeEmbedding(0)), cost: 0.01 },
      { ...makeCall('a2', makeEmbedding(0.01)), cost: 0.01 },
      { ...makeCall('b1', makeEmbedding(Math.PI)), cost: 1.0 },
      { ...makeCall('b2', makeEmbedding(Math.PI + 0.01)), cost: 1.0 },
    ];
    const groups = detectSimilarGroups(calls, 0.95);
    expect(groups[0].totalCost).toBeGreaterThan(groups[1].totalCost);
  });
});
