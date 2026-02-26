import { describe, it, expect } from 'vitest';
import {
  clusterPairs,
  identifyTopPatterns,
} from './pattern-clusterer.function.js';
import type { ClusterableItem } from './pattern-clusterer.function.js';

describe('clusterPairs', () => {
  it('returns empty for empty input', () => {
    expect(clusterPairs([])).toEqual([]);
  });

  it('clusters similar prompts together', () => {
    const items: ClusterableItem[] = [
      { id: '1', prompt: 'How do I reset my password for my account', inputTokens: 20, outputTokens: 50 },
      { id: '2', prompt: 'How do I reset my password for the app', inputTokens: 18, outputTokens: 45 },
      { id: '3', prompt: 'What is the weather today in New York', inputTokens: 15, outputTokens: 30 },
    ];
    const clusters = clusterPairs(items);
    expect(clusters.length).toBeLessThanOrEqual(3);
    // First two should cluster together
    const passwordCluster = clusters.find(c => c.items.includes('1'));
    expect(passwordCluster?.items).toContain('2');
  });

  it('puts dissimilar prompts in separate clusters', () => {
    const items: ClusterableItem[] = [
      { id: '1', prompt: 'Explain quantum physics in detail please', inputTokens: 20, outputTokens: 50 },
      { id: '2', prompt: 'What is the best pizza recipe for dinner', inputTokens: 18, outputTokens: 45 },
    ];
    const clusters = clusterPairs(items);
    expect(clusters.length).toBe(2);
  });

  it('computes average tokens', () => {
    const items: ClusterableItem[] = [
      { id: '1', prompt: 'How do I reset my password for account', inputTokens: 20, outputTokens: 50 },
      { id: '2', prompt: 'How do I reset my password for the app', inputTokens: 30, outputTokens: 70 },
    ];
    const clusters = clusterPairs(items);
    const cluster = clusters.find(c => c.items.length === 2);
    if (cluster) {
      expect(cluster.avgInputTokens).toBe(25);
      expect(cluster.avgOutputTokens).toBe(60);
    }
  });
});

describe('identifyTopPatterns', () => {
  it('filters clusters above min count', () => {
    const counts = [
      { cluster: 'faq', count: 150 },
      { cluster: 'code', count: 50 },
      { cluster: 'support', count: 200 },
    ];
    const top = identifyTopPatterns(counts, 100);
    expect(top.length).toBe(2);
    expect(top[0].cluster).toBe('support');
    expect(top[1].cluster).toBe('faq');
  });

  it('returns empty if no clusters meet threshold', () => {
    const counts = [{ cluster: 'tiny', count: 5 }];
    expect(identifyTopPatterns(counts, 100)).toEqual([]);
  });
});
