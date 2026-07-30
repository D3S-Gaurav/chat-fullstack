import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    setupFiles: ['src/__tests__/setup.ts'],
    /* Run test files sequentially — rate limiters and DB state
       make parallel execution non-deterministic. */
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
