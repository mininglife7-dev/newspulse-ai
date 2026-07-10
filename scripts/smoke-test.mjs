#!/usr/bin/env node
/**
 * EURO AI — end-to-end smoke test.
 *
 * Boots the production build (`next start`) with NO external credentials and
 * probes every route. Two kinds of invariants are checked:
 *
 *   1. Liveness — every public page renders, every API route responds, nav links exist.
 *   2. Truthfulness — when a dependency is unavailable, the app must say so
 *      (503 / 5xx / error payload), never fabricate a healthy answer.
 *      The `ok` flag in every JSON response must agree with the HTTP status.
 *
 * Usage:  npm run test:smoke        (builds first if .next is missing)
 * Exit:   0 = all checks pass, 1 = at least one FAIL.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const PORT = Number(process.env.SMOKE_PORT || 4310);
const BASE = `http://127.0.0.1:${PORT}`;
const START_TIMEOUT_MS = 60_000;

// Strip integration credentials so degraded-mode behaviour is deterministic:
// the app must fail *honestly* without them.
const serverEnv = { ...process.env };
for (const key of [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]) {
  delete serverEnv[key];
}
serverEnv.NODE_ENV = 'production';

const results = [];
function record(category, name, status, detail = '') {
  results.push({ category, name, status, detail });
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '·';
  console.log(
    `  ${icon} [${status}] ${category} — ${name}${detail ? `  (${detail})` : ''}`
  );
}

async function check(category, name, fn) {
  try {
    const detail = await fn();
    record(category, name, 'PASS', typeof detail === 'string' ? detail : '');
  } catch (err) {
    record(category, name, 'FAIL', err?.message || String(err));
  }
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function get(path, init) {
  return fetch(`${BASE}${path}`, { redirect: 'manual', ...init });
}

// ---------------------------------------------------------------------------
// Build (if needed) + boot
// ---------------------------------------------------------------------------

if (!existsSync(new URL('../.next/BUILD_ID', import.meta.url))) {
  console.log('No production build found — running `next build` first…');
  const build = spawnSync('npx', ['next', 'build'], {
    stdio: 'inherit',
    env: serverEnv,
  });
  if (build.status !== 0) {
    console.error('✗ Build failed — cannot smoke test.');
    process.exit(1);
  }
}

// Refuse to run against a stale server — results would test the wrong build.
try {
  await fetch(`${BASE}/api/health`);
  console.error(
    `✗ Something is already listening on :${PORT}. Stop it first (or set SMOKE_PORT).`
  );
  process.exit(1);
} catch {
  // port free — good
}

console.log(`\nStarting production server on :${PORT} (no credentials)…`);
// detached → own process group, so we can kill next-server itself, not just
// the npx wrapper (which would orphan the real server and poison later runs).
const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
  env: serverEnv,
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
});
let serverOutput = '';
server.stdout.on('data', (d) => (serverOutput += d));
server.stderr.on('data', (d) => (serverOutput += d));

async function waitForServer() {
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      await fetch(`${BASE}/api/health`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(
    `Server did not start within ${START_TIMEOUT_MS}ms.\n${serverOutput}`
  );
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

async function run() {
  await waitForServer();
  console.log('Server is up. Running checks:\n');

  // ----- Public Pages -----
  await check('page', 'GET / renders landing page', async () => {
    const res = await get('/');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const html = await res.text();
    assert(html.includes('EURO AI'), 'EURO AI brand missing from page');
    assert(html.includes('Sign In'), 'sign in nav link missing');
    assert(html.includes('Start Free'), 'signup CTA missing');
  });

  await check('page', 'GET /auth/signin renders signin page', async () => {
    const res = await get('/auth/signin');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const html = await res.text();
    assert(html.includes('Sign In'), 'signin heading missing');
  });

  await check('page', 'GET /auth/signup renders signup page', async () => {
    const res = await get('/auth/signup');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const html = await res.text();
    assert(html.includes('Create your account'), 'signup heading missing');
  });

  await check('page', 'GET /nonexistent returns 404 page', async () => {
    const res = await get('/this-page-does-not-exist');
    assert(res.status === 404, `expected 404, got ${res.status}`);
    const html = await res.text();
    assert(html.includes('404'), '404 page content missing');
  });

  // ----- Protected Routes -----
  // Unauthenticated (no Supabase session in smoke env), so the auth middleware
  // must redirect these to sign-in rather than render them. Asserting the guard
  // is a stronger check than the old "renders 200" (which only held before auth
  // existed, and silently regressed after the EURO AI pivot).
  await check(
    'page',
    'GET /dashboard redirects unauthenticated to sign-in',
    async () => {
      const res = await get('/dashboard');
      assert(
        [302, 303, 307].includes(res.status),
        `expected redirect, got ${res.status}`
      );
      const location = res.headers.get('location') || '';
      assert(
        location.includes('/auth/signin'),
        `expected redirect to /auth/signin, got "${location}"`
      );
    }
  );

  await check(
    'page',
    'GET /workspace/setup redirects unauthenticated to sign-in',
    async () => {
      const res = await get('/workspace/setup');
      assert(
        [302, 303, 307].includes(res.status),
        `expected redirect, got ${res.status}`
      );
      const location = res.headers.get('location') || '';
      assert(
        location.includes('/auth/signin'),
        `expected redirect to /auth/signin, got "${location}"`
      );
    }
  );

  // ----- Health -----
  await check(
    'api',
    '/api/health reports degraded without Supabase',
    async () => {
      const res = await get('/api/health');
      const json = await res.json();
      assert(
        json.ok === (res.status === 200),
        `ok flag (${json.ok}) contradicts HTTP status (${res.status})`
      );
      assert(
        ['healthy', 'degraded'].includes(json.status),
        `unexpected status "${json.status}"`
      );
      assert(
        typeof json.checks?.supabase_url === 'boolean',
        'checks.supabase_url missing'
      );
      assert(
        typeof json.checks?.supabase_anon === 'boolean',
        'checks.supabase_anon missing'
      );
      assert(
        typeof json.checks?.supabase_service === 'boolean',
        'checks.supabase_service missing'
      );
      // With credentials stripped it must NOT claim to be healthy.
      assert(
        res.status === 503,
        `expected 503 without creds, got ${res.status}`
      );
      assert(json.status === 'degraded', 'must report degraded without creds');
      return `status=${json.status}`;
    }
  );

  // ----- SEO / meta routes -----
  await check('meta', 'GET /robots.txt responds', async () => {
    const res = await get('/robots.txt');
    assert(res.status === 200, `expected 200, got ${res.status}`);
  });

  await check('meta', 'GET /sitemap.xml responds', async () => {
    const res = await get('/sitemap.xml');
    assert(res.status === 200, `expected 200, got ${res.status}`);
  });

  await check('meta', 'GET /icon responds', async () => {
    const res = await get('/icon');
    assert(res.status === 200, `expected 200, got ${res.status}`);
  });
}

// ---------------------------------------------------------------------------
// Report + exit
// ---------------------------------------------------------------------------

let exitCode = 0;
try {
  await run();
} catch (err) {
  console.error('\n✗ Smoke run aborted:', err?.message || err);
  exitCode = 1;
} finally {
  try {
    process.kill(-server.pid, 'SIGTERM'); // whole process group
  } catch {
    server.kill('SIGTERM');
  }
}

const pass = results.filter((r) => r.status === 'PASS').length;
const fail = results.filter((r) => r.status === 'FAIL').length;
const total = results.length;
const score = total === 0 ? 0 : Math.round((pass / total) * 100);

console.log('\n────────────────────────────────────────');
console.log(`Smoke result: ${pass}/${total} passed, ${fail} failed`);
console.log(`Integrity score: ${score}/100`);
console.log('────────────────────────────────────────');

if (fail > 0) exitCode = 1;
process.exit(exitCode);
