import { defineConfig } from 'vitest/config';

/**
 * Vitest does NOT load `.env` into `process.env`, so the env vars that
 * `src/config/env.ts` validates at import time must be supplied here.
 *
 * DATABASE_URL deliberately defaults to a LOCAL database. The test suite
 * issues `DELETE FROM` against every table, so it must never point at a
 * remote/production instance. Override with TEST_DATABASE_URL only — and
 * only ever with a throwaway database. `src/__tests__/setup.ts` enforces
 * this at runtime as a second line of defence.
 */
const LOCAL_DEFAULT = 'postgresql://postgres:postgres@localhost:5432/chatflow_test';

/** True only for a localhost host whose database name contains "test". */
function isSafeTestDatabase(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const { hostname, pathname } = new URL(url);
    return (
      ['localhost', '127.0.0.1', '::1', 'postgres'].includes(hostname) &&
      /test/i.test(pathname)
    );
  } catch {
    return false;
  }
}

/**
 * Precedence: an explicit TEST_DATABASE_URL, then an inherited DATABASE_URL
 * that is already provably a local test database (this is the CI case — the
 * workflow exports one, and honouring it means CI credentials stay in the
 * workflow rather than being shadowed by the default below), then localhost.
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL
  ?? (isSafeTestDatabase(process.env.DATABASE_URL) ? process.env.DATABASE_URL : LOCAL_DEFAULT);

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
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: 'vitest-local-secret-must-be-at-least-32-characters',
      CORS_ORIGINS: 'http://localhost:5173',
    },
  },
});
