import { defineConfig } from 'vitest/config';

export default defineConfig({
  coverage: {
    provider: 'v8',
    include: [
      'packages/*/src/**/*.ts',
    ],
    exclude: [
      'packages/forge/**',
      'packages/schema/**',
      'packages/cli/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/*.test.ts',
      '**/*.d.ts',
      '**/index.ts',
    ],
    reporter: ['text', 'text-summary', 'lcov'],
    reportsDirectory: './coverage',
  },
  test: {
    include: [
      'packages/**/src/**/*.test.ts',
      'tests/integration/**/*.test.ts',
    ],
    exclude: [
      'packages/cli/**',
      'packages/forge/**',
      '**/node_modules/**',
      'tests/integration/api.test.ts',
      'tests/integration/similarity.test.ts',
    ],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
