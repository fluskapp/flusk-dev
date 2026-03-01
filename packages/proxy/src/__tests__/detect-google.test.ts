import { describe, it, expect } from 'vitest';
import { detectProvider } from '../providers/detect.js';

describe('detectProvider - Google', () => {
  it('detects Google generateContent endpoint', () => {
    const result = detectProvider(
      '/v1/models/gemini-1.5-pro:generateContent',
      {},
    );
    expect(result.provider).toBe('google');
    expect(result.endpoint).toBe('generate');
  });

  it('detects Google streamGenerateContent', () => {
    const result = detectProvider(
      '/v1beta/models/gemini-2.0:streamGenerateContent',
      {},
    );
    expect(result.provider).toBe('google');
    expect(result.endpoint).toBe('generate');
  });

  it('does not match non-Google paths', () => {
    const result = detectProvider('/v1/chat/completions', {});
    expect(result.provider).toBe('openai');
  });
});
