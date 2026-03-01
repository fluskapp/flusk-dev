import { describe, it, expect } from 'vitest';
import { formatInsights } from './format-insights.function.js';

describe('formatInsights', () => {
  it('is a function', () => {
    expect(typeof formatInsights).toBe('function');
  });
});
