import { describe, it, expect } from 'vitest';
import { conversationCostGrouping } from '../conversation-cost.pipeline.js';
import type { LLMCallEntity } from '@flusk/entities';

function makeCall(conversationId: string | undefined, cost: number): LLMCallEntity {
  return {
    id: crypto.randomUUID(),
    provider: 'openai',
    model: 'gpt-4',
    prompt: 'test',
    promptHash: 'a'.repeat(64),
    tokens: { input: 100, output: 50, total: 150 },
    cost,
    response: '',
    cached: false,
    status: 'ok',
    consentGiven: true,
    consentPurpose: 'optimization',
    conversationId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as LLMCallEntity;
}

describe('conversationCostGrouping', () => {
  it('groups calls by conversationId', () => {
    const calls = [
      makeCall('conv-1', 0.01),
      makeCall('conv-1', 0.02),
      makeCall('conv-2', 0.05),
    ];
    const report = conversationCostGrouping(calls);
    expect(report.totalConversations).toBe(2);
    const c1 = report.conversations.find(c => c.conversationId === 'conv-1');
    expect(c1!.callCount).toBe(2);
    expect(c1!.totalCost).toBeCloseTo(0.03);
  });

  it('excludes ungrouped calls', () => {
    const calls = [makeCall(undefined, 0.01)];
    const report = conversationCostGrouping(calls);
    expect(report.totalConversations).toBe(0);
  });

  it('identifies max cost conversation', () => {
    const calls = [
      makeCall('cheap', 0.01),
      makeCall('expensive', 0.50),
    ];
    const report = conversationCostGrouping(calls);
    expect(report.maxCostConversation!.conversationId).toBe('expensive');
  });
});
