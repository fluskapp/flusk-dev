import { describe, it, expect } from 'vitest';
import { parseGenericResponse } from '../providers/generic.js';

describe('parseGenericResponse', () => {
  it('extracts model and tokens from a generic response', () => {
    const result = parseGenericResponse({
      model: 'deepseek-v3',
      usage: { prompt_tokens: 50, completion_tokens: 100 },
    });
    expect(result).toEqual({
      model: 'deepseek-v3',
      tokens: { input: 50, output: 100, total: 150 },
    });
  });

  it('returns null for non-object input', () => {
    expect(parseGenericResponse(null)).toBeNull();
    expect(parseGenericResponse('string')).toBeNull();
  });

  it('returns null when model is missing', () => {
    expect(parseGenericResponse({ usage: { prompt_tokens: 10 } })).toBeNull();
  });

  it('returns null when usage is missing', () => {
    expect(parseGenericResponse({ model: 'test' })).toBeNull();
  });
});
