import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['flows/**/*.test.ts'],
    testTimeout: 5000,
    pool: 'forks',
  },
});
