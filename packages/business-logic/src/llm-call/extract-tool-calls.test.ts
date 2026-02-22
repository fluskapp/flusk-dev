import { describe, it, expect } from 'vitest';
import { extractToolCalls } from './extract-tool-calls.function.js';

describe('extractToolCalls', () => {
  it('extracts OpenAI tool calls', () => {
    const result = extractToolCalls({
      responseBody: {
        choices: [{
          message: {
            tool_calls: [{
              id: 'call_1',
              type: 'function',
              function: { name: 'get_weather', arguments: '{"city":"NYC"}' },
            }],
          },
        }],
      },
    });
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]!.name).toBe('get_weather');
  });

  it('extracts Anthropic tool_use blocks', () => {
    const result = extractToolCalls({
      responseBody: {
        content: [
          { type: 'text', text: 'Let me check...' },
          { type: 'tool_use', id: 'tu_1', name: 'search', input: { q: 'test' } },
        ],
      },
    });
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]!.name).toBe('search');
  });

  it('extracts embedding dimensions', () => {
    const result = extractToolCalls({
      responseBody: {
        model: 'text-embedding-3-small',
        data: [{ embedding: new Array(1536).fill(0) }],
      },
    });
    expect(result.embedding!.dimensions).toBe(1536);
  });

  it('returns empty for plain response', () => {
    const result = extractToolCalls({
      responseBody: { choices: [{ message: { content: 'Hello' } }] },
    });
    expect(result.toolCalls).toHaveLength(0);
    expect(result.embedding).toBeNull();
  });
});
