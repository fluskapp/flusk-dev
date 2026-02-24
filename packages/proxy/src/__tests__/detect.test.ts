import { describe, it, expect } from 'vitest';
import { detectProvider } from '../providers/detect.js';

describe('detectProvider', () => {
  it('detects OpenAI chat completions', () => {
    const result = detectProvider('/v1/chat/completions', {});
    expect(result).toEqual({ provider: 'openai', endpoint: 'chat' });
  });

  it('detects OpenAI embeddings', () => {
    const result = detectProvider('/v1/embeddings', {});
    expect(result).toEqual({ provider: 'openai', endpoint: 'embeddings' });
  });

  it('detects Anthropic messages', () => {
    const result = detectProvider('/v1/messages', {});
    expect(result).toEqual({ provider: 'anthropic', endpoint: 'messages' });
  });

  it('detects Anthropic by headers', () => {
    const result = detectProvider('/custom/path', {
      'x-api-key': 'sk-ant-xxx',
      'anthropic-version': '2023-06-01',
    });
    expect(result).toEqual({ provider: 'anthropic', endpoint: 'unknown' });
  });

  it('returns unknown for unrecognized paths', () => {
    const result = detectProvider('/foo/bar', {});
    expect(result).toEqual({ provider: 'unknown', endpoint: 'unknown' });
  });
});
