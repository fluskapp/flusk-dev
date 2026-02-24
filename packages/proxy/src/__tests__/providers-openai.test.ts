import { describe, it, expect } from 'vitest';
import { parseOpenAIRequest, parseOpenAIResponse } from '../providers/openai.js';

describe('OpenAI provider parser', () => {
  it('parses a chat completion request', () => {
    const result = parseOpenAIRequest({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
      stream: false,
    });
    expect(result.model).toBe('gpt-4o');
    expect(result.messages).toHaveLength(1);
    expect(result.stream).toBe(false);
  });

  it('handles missing fields gracefully', () => {
    const result = parseOpenAIRequest({});
    expect(result.model).toBeUndefined();
    expect(result.messages).toBeUndefined();
    expect(result.stream).toBe(false);
  });

  it('parses a chat completion response with usage', () => {
    const result = parseOpenAIResponse({
      model: 'gpt-4o-2024-08-06',
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    });
    expect(result.model).toBe('gpt-4o-2024-08-06');
    expect(result.tokens).toEqual({ input: 10, output: 20, total: 30 });
  });

  it('defaults to zero tokens when usage is missing', () => {
    const result = parseOpenAIResponse({ model: 'gpt-4o' });
    expect(result.tokens).toEqual({ input: 0, output: 0, total: 0 });
  });
});
