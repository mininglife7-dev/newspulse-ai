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
    env: {
      STRIPE_SECRET_KEY: 'sk_test_123456789',
      STRIPE_WEBHOOK_SECRET: 'whsec_test_123456789',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test_anon_key',
      SUPABASE_SERVICE_ROLE_KEY: 'test_service_role_key',
    },
    // Env-dependent code paths are exercised explicitly per test;
    // start every test file with a clean slate.
    unstubEnvs: true,
  },
});
