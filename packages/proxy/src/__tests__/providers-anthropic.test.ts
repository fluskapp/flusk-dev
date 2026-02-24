import { describe, it, expect } from 'vitest';
import { parseAnthropicRequest, parseAnthropicResponse } from '../providers/anthropic.js';

describe('Anthropic provider parser', () => {
  it('parses a messages request', () => {
    const result = parseAnthropicRequest({
      model: 'claude-3.5-sonnet',
      messages: [{ role: 'user', content: 'Hi' }],
      stream: true,
    });
    expect(result.model).toBe('claude-3.5-sonnet');
    expect(result.stream).toBe(true);
  });

  it('handles missing fields', () => {
    const result = parseAnthropicRequest({});
    expect(result.model).toBeUndefined();
    expect(result.stream).toBe(false);
  });

  it('parses a messages response', () => {
    const result = parseAnthropicResponse({
      model: 'claude-3.5-sonnet',
      usage: { input_tokens: 100, output_tokens: 200 },
    });
    expect(result.model).toBe('claude-3.5-sonnet');
    expect(result.tokens).toEqual({ input: 100, output: 200, total: 300 });
  });

  it('defaults tokens to zero when missing', () => {
    const result = parseAnthropicResponse({ model: 'claude-3-haiku' });
    expect(result.tokens).toEqual({ input: 0, output: 0, total: 0 });
  });
});
