import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Exclude integration and E2E tests from standard run
    // (integration tests require dev server or mocked API; E2E tests run via Playwright)
    exclude: process.env.INCLUDE_INTEGRATION_TESTS
      ? ['tests/e2e/**/*.test.ts']
      : ['tests/**/*.integration.test.ts', 'tests/e2e/**/*.test.ts'],
    // Env-dependent code paths are exercised explicitly per test;
    // start every test file with a clean slate.
    unstubEnvs: true,
  },
});
