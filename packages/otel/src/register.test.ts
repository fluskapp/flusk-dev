import { describe, it, expect } from 'vitest';

describe('register module', () => {
  it('can be imported without error', async () => {
    await expect(import('./register.js')).resolves.toBeDefined();
  });
});
