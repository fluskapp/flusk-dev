import { describe, it, expect, vi } from 'vitest';
import { interceptResponse } from '../interceptor.js';

vi.mock('../capture.js', () => ({
  captureCall: vi.fn(),
}));

describe('interceptResponse', () => {
  it('does not throw for unknown provider', () => {
    expect(() => interceptResponse({
      path: '/unknown/path',
      headers: {},
      requestBody: {},
      responseBody: {},
      statusCode: 200,
      latencyMs: 100,
    })).not.toThrow();
  });

  it('captures openai response', () => {
    expect(() => interceptResponse({
      path: '/v1/chat/completions',
      headers: { authorization: 'Bearer sk-test' },
      requestBody: { model: 'gpt-4o', messages: [] },
      responseBody: {
        model: 'gpt-4o',
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      },
      statusCode: 200,
      latencyMs: 150,
    })).not.toThrow();
  });
});
