import { describe, it, expect } from 'vitest';
import { validateLLMCall } from './validate-llm-call.function.js';

describe('validateLLMCall', () => {
  it('returns valid for partial entity', () => {
    const result = validateLLMCall({ model: 'gpt-4o' });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('returns valid for empty entity', () => {
    const result = validateLLMCall({});
    expect(result.valid).toBe(true);
  });
});
