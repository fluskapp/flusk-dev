import { describe, it, expect } from 'vitest';
import { parseSSEChunks } from '../stream-collector.js';

describe('parseSSEChunks', () => {
  it('extracts model and content from SSE chunks', () => {
    const chunks = [
      'data: {"model":"gpt-4o","choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"model":"gpt-4o","choices":[{"delta":{"content":" world"}}]}\n\n',
      'data: [DONE]\n\n',
    ];
    const result = parseSSEChunks(chunks);
    expect(result.model).toBe('gpt-4o');
    expect(result.content).toBe('Hello world');
  });

  it('extracts usage from final chunk', () => {
    const chunks = [
      'data: {"model":"gpt-4o","choices":[{"delta":{"content":"Hi"}}]}\n\n',
      'data: {"model":"gpt-4o","usage":{"prompt_tokens":10,"completion_tokens":5,"total_tokens":15}}\n\n',
      'data: [DONE]\n\n',
    ];
    const result = parseSSEChunks(chunks);
    expect(result.tokens).toEqual({ input: 10, output: 5, total: 15 });
  });

  it('handles empty chunks', () => {
    const result = parseSSEChunks([]);
    expect(result.model).toBe('unknown');
    expect(result.content).toBe('');
    expect(result.tokens.total).toBe(0);
  });
});
