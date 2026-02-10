import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/**/src/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    exclude: ['packages/cli/**', '**/node_modules/**'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
