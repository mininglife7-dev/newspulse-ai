import { defineConfig, devices, chromium } from '@playwright/test';
import { existsSync } from 'node:fs';

/**
 * E2E test configuration.
 *
 * The app server is started WITHOUT integration credentials so that
 * error/degraded paths are deterministic and honestly exercised; happy
 * paths are covered by intercepting /api/* in the browser with fixtures
 * (see e2e/fixtures.ts). This means the suite needs no secrets anywhere.
 *
 * Visual checking is structural (no horizontal overflow, elements visible
 * at mobile + desktop viewports) rather than pixel-diff screenshots —
 * font rendering differs across environments and would make baselines
 * permanently flaky.
 */

const PORT = Number(process.env.E2E_PORT || 4320);

// Prefer the version-matched Playwright browser; fall back to the
// environment's preinstalled Chromium when downloads are disabled.
const FALLBACK_CHROMIUM = '/opt/pw-browsers/chromium';
let executablePath: string | undefined;
try {
  if (!existsSync(chromium.executablePath()) && existsSync(FALLBACK_CHROMIUM)) {
    executablePath = FALLBACK_CHROMIUM;
  }
} catch {
  if (existsSync(FALLBACK_CHROMIUM)) executablePath = FALLBACK_CHROMIUM;
}

const serverEnv: Record<string, string> = {};
for (const [k, v] of Object.entries(process.env)) {
  if (v !== undefined) serverEnv[k] = v;
}
for (const key of [
  'FIRECRAWL_API_KEY',
  'OPENAI_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]) {
  delete serverEnv[key];
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `sh -c '[ -f .next/BUILD_ID ] || npx next build; exec npx next start -p ${PORT}'`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: serverEnv,
  },
});
