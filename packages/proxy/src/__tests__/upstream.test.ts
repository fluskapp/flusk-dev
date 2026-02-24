import { describe, it, expect } from 'vitest';
import { resolveUpstream } from '../upstream.js';

describe('resolveUpstream', () => {
  it('resolves openai to api.openai.com', () => {
    expect(resolveUpstream('openai')).toBe('https://api.openai.com');
  });

  it('resolves anthropic to api.anthropic.com', () => {
    expect(resolveUpstream('anthropic')).toBe('https://api.anthropic.com');
  });

  it('returns null for unknown provider', () => {
    expect(resolveUpstream('unknown')).toBeNull();
  });

  it('uses explicit upstream over provider detection', () => {
    expect(resolveUpstream('unknown', 'openai')).toBe('https://api.openai.com');
  });

  it('uses raw URL when explicit is not a known provider', () => {
    expect(resolveUpstream('unknown', 'http://localhost:3000')).toBe('http://localhost:3000');
  });
});
