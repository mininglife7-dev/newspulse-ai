#!/usr/bin/env node
/**
 * Reproducible README screenshots.
 *
 * Boots the production build with no credentials, intercepts the API with
 * the same fixtures the e2e suite uses, and captures the two hero shots
 * into docs/screenshots/ (kept out of public/ so they are not shipped
 * with the app).
 *
 * Usage: npm run screenshots   (requires a prior `npm run build`)
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { SEARCH_OK, HISTORY_OK } from '../e2e/fixtures.mjs';

const PORT = Number(process.env.SHOT_PORT || 4330);
const BASE = `http://127.0.0.1:${PORT}`;
const OUT_DIR = new URL('../docs/screenshots/', import.meta.url).pathname;

const serverEnv = { ...process.env, NODE_ENV: 'production' };
for (const key of [
  'FIRECRAWL_API_KEY',
  'OPENAI_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]) {
  delete serverEnv[key];
}

if (!existsSync(new URL('../.next/BUILD_ID', import.meta.url))) {
  console.log('No production build found — running `next build` first…');
  const build = spawnSync('npx', ['next', 'build'], {
    stdio: 'inherit',
    env: serverEnv,
  });
  if (build.status !== 0) process.exit(1);
}

const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
  env: serverEnv,
  stdio: 'ignore',
  detached: true,
});

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      await fetch(`${BASE}/`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error('server did not start');
}

let exitCode = 0;
let browser;
try {
  await waitForServer();
  mkdirSync(OUT_DIR, { recursive: true });

  // Fall back to the environment's preinstalled Chromium when the
  // version-matched browser is not downloaded.
  const FALLBACK = '/opt/pw-browsers/chromium';
  let executablePath;
  try {
    if (!existsSync(chromium.executablePath()) && existsSync(FALLBACK)) {
      executablePath = FALLBACK;
    }
  } catch {
    if (existsSync(FALLBACK)) executablePath = FALLBACK;
  }

  browser = await chromium.launch({ executablePath });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });

  await page.route('**/api/search', (route) =>
    route.fulfill({ json: SEARCH_OK })
  );
  await page.route('**/api/history?*', (route) =>
    route.fulfill({ json: HISTORY_OK })
  );

  // Search page with results
  await page.goto(`${BASE}/?q=artificial+intelligence`);
  await page.getByText('2 results for').waitFor();
  await page.waitForTimeout(800); // let fade-in animations settle
  await page.screenshot({ path: `${OUT_DIR}search.png`, fullPage: false });
  console.log('✓ docs/screenshots/search.png');

  // History page with rows (first row expanded)
  await page.goto(`${BASE}/history`);
  await page
    .getByRole('button', {
      name: 'Expand results for "artificial intelligence"',
    })
    .click();
  await page
    .getByRole('link', { name: 'AI regulation moves forward in the EU' })
    .waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT_DIR}history.png`, fullPage: false });
  console.log('✓ docs/screenshots/history.png');
} catch (err) {
  console.error('✗ screenshot capture failed:', err?.message || err);
  exitCode = 1;
} finally {
  await browser?.close();
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    server.kill('SIGTERM');
  }
}
process.exit(exitCode);
