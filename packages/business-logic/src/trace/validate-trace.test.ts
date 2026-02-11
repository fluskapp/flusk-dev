import { describe, it, expect } from 'vitest';
import { validateTrace } from './validate-trace.function.js';

describe('validateTrace', () => {
  it('returns valid for a well-formed entity', () => {
    const result = validateTrace({
      organizationId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'my-agent',
      status: 'running',
      startedAt: new Date().toISOString(),
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns errors for an empty entity', () => {
    const result = validateTrace({});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('organizationId is required');
    expect(result.errors).toContain('name is required');
    expect(result.errors).toContain('status is required');
    expect(result.errors).toContain('startedAt is required');
  });

  it('rejects invalid status', () => {
    const result = validateTrace({
      organizationId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'test', status: 'invalid' as any, startedAt: new Date().toISOString(),
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('status must be running, completed, or failed');
  });
});
