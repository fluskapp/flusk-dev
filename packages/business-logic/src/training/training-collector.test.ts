import { describe, it, expect } from 'vitest';
import {
  collectFromCall,
  shouldCollectCall,
  getCollectionStats,
} from './training-collector.function.js';
import type { LLMCallInput, CollectorConfig } from './training-collector.function.js';

const config: CollectorConfig = {
  teacherModels: ['claude-sonnet-4-20250514', 'gpt-4o'],
};

const validCall: LLMCallInput = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  prompt: 'Explain quantum computing in simple terms',
  completion: 'Quantum computing uses quantum bits or qubits...',
  systemPrompt: 'You are a helpful assistant',
  inputTokens: 50,
  outputTokens: 120,
  status: 'ok',
  tenantId: 'tenant-1',
};

describe('shouldCollectCall', () => {
  it('returns true for teacher model ok calls', () => {
    expect(shouldCollectCall(validCall, config)).toBe(true);
  });

  it('returns false for non-teacher models', () => {
    const call = { ...validCall, model: 'gpt-3.5-turbo' };
    expect(shouldCollectCall(call, config)).toBe(false);
  });

  it('returns false for error calls', () => {
    const call = { ...validCall, status: 'error' };
    expect(shouldCollectCall(call, config)).toBe(false);
  });

  it('returns false for short prompts', () => {
    const call = { ...validCall, prompt: 'Hi' };
    expect(shouldCollectCall(call, config)).toBe(false);
  });
});

describe('collectFromCall', () => {
  it('extracts training pair from valid call', () => {
    const result = collectFromCall(validCall, config);
    expect(result).not.toBeNull();
    expect(result!.sourceModel).toBe('claude-sonnet-4-20250514');
    expect(result!.sourceProvider).toBe('anthropic');
    expect(result!.quality).toBe('unrated');
    expect(result!.tenantId).toBe('tenant-1');
  });

  it('returns null for non-collectible calls', () => {
    const call = { ...validCall, status: 'error' };
    expect(collectFromCall(call, config)).toBeNull();
  });

  it('normalizes providers correctly', () => {
    const call = { ...validCall, provider: 'Google AI' };
    const result = collectFromCall(call, config);
    expect(result!.sourceProvider).toBe('google');
  });
});

describe('getCollectionStats', () => {
  it('computes stats correctly', () => {
    const stats = getCollectionStats(
      500,
      [{ model: 'gpt-4o', count: 300 }, { model: 'claude', count: 200 }],
      [{ cluster: 'faq', count: 150 }, { cluster: 'code', count: 50 }],
      100,
    );
    expect(stats.totalPairs).toBe(500);
    expect(stats.byModel['gpt-4o']).toBe(300);
    expect(stats.readyForTraining).toBe(1);
  });
});
