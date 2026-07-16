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
    // Exclude integration tests from standard run unless explicitly requested
    // (integration tests require dev server or mocked API to run)
    exclude: process.env.INCLUDE_INTEGRATION_TESTS
      ? []
      : ['tests/**/*.integration.test.ts'],
    // Env-dependent code paths are exercised explicitly per test;
    // start every test file with a clean slate.
    unstubEnvs: true,
  },
});
