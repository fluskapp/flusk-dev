import { describe, it, expect, vi } from 'vitest';

vi.mock('@flusk/resources', () => ({
  createSqliteStorage: () => ({
    llmCalls: {
      create: vi.fn(),
    },
  }),
}));

describe('captureCall', () => {
  it('does not throw on valid call', async () => {
    const { captureCall } = await import('../capture.js');
    expect(() => captureCall({
      provider: 'openai',
      model: 'gpt-4o',
      prompt: 'test prompt',
      promptHash: 'abc123',
      tokens: { input: 10, output: 20, total: 30 },
      costUsd: 0.001,
      response: 'test response',
      status: 'ok',
      latencyMs: 100,
      cached: false,
    })).not.toThrow();
  });
});
