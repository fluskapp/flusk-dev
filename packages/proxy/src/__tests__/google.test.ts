import { describe, it, expect } from 'vitest';
import { parseGoogleResponse } from '../providers/google.js';

describe('parseGoogleResponse', () => {
  it('parses valid response with usage metadata', () => {
    const body = {
      modelVersion: 'gemini-1.5-pro',
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 },
    };
    const result = parseGoogleResponse(body);
    expect(result).toEqual({
      model: 'gemini-1.5-pro',
      tokens: { input: 100, output: 50, total: 150 },
    });
  });

  it('returns null for null body', () => {
    expect(parseGoogleResponse(null)).toBeNull();
  });

  it('handles missing usage metadata', () => {
    const result = parseGoogleResponse({ modelVersion: 'gemini-2.0' });
    expect(result).toEqual({
      model: 'gemini-2.0',
      tokens: { input: 0, output: 0, total: 0 },
    });
  });
});
