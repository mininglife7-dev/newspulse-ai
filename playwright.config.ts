import { defineConfig } from '@playwright/test';

const MOCK_PORT = 4545;
const APP_PORT = 3100;

/**
 * E2E smoke suite. External services (Firecrawl, OpenAI, Supabase) are
 * replaced by tests/e2e/mock-services.mjs, so no secrets are needed.
 *
 * PW_CHROMIUM_PATH: optional path to a pre-installed Chromium (used in
 * sandboxes where `playwright install` is unavailable). CI installs the
 * matching browser instead.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  timeout: 60_000,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${APP_PORT}`,
    viewport: { width: 1280, height: 800 },
    ...(process.env.PW_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } }
      : {}),
  },
  webServer: [
    {
      command: 'node tests/e2e/mock-services.mjs',
      url: `http://127.0.0.1:${MOCK_PORT}/health`,
      reuseExistingServer: false,
      env: { MOCK_PORT: String(MOCK_PORT) },
    },
    {
      command: `npx next dev -p ${APP_PORT}`,
      url: `http://127.0.0.1:${APP_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        FIRECRAWL_API_KEY: 'fc-e2e-test',
        FIRECRAWL_BASE_URL: `http://127.0.0.1:${MOCK_PORT}/firecrawl`,
        OPENAI_API_KEY: 'sk-e2e-test',
        OPENAI_BASE_URL: `http://127.0.0.1:${MOCK_PORT}/openai/v1`,
        NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${MOCK_PORT}/supabase`,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_e2e',
        SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_e2e',
      },
    },
  ],
});
