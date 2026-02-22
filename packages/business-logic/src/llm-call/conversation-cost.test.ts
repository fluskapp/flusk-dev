import { describe, it, expect } from 'vitest';
import { groupConversationCosts } from './conversation-cost.function.js';

const mkCall = (id: string, sessionId: string | undefined, cost: number) => ({
  id,
  sessionId,
  cost,
  tokens: { input: 100, output: 50, total: 150 },
  model: 'gpt-4',
  createdAt: '2026-01-15T10:00:00Z',
});

describe('groupConversationCosts', () => {
  it('groups calls by sessionId', () => {
    const result = groupConversationCosts([
      mkCall('1', 'sess-a', 0.05),
      mkCall('2', 'sess-a', 0.03),
      mkCall('3', 'sess-b', 0.10),
    ]);
    expect(result.conversations).toHaveLength(2);
    expect(result.conversations[0]!.sessionId).toBe('sess-b');
    expect(result.conversations[0]!.totalCost).toBe(0.10);
    expect(result.conversations[1]!.callCount).toBe(2);
  });

  it('counts ungrouped calls', () => {
    const result = groupConversationCosts([
      mkCall('1', undefined, 0.05),
      mkCall('2', 'sess-a', 0.03),
    ]);
    expect(result.ungroupedCount).toBe(1);
    expect(result.conversations).toHaveLength(1);
  });

  it('handles empty input', () => {
    const result = groupConversationCosts([]);
    expect(result.conversations).toHaveLength(0);
    expect(result.ungroupedCount).toBe(0);
  });
});
