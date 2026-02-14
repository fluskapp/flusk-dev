import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/**/src/**/*.test.ts',
      'tests/integration/**/*.test.ts',
    ],
    exclude: [
      'packages/cli/**',
      '**/node_modules/**',
      'tests/integration/api.test.ts',
      'tests/integration/similarity.test.ts',
    ],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
