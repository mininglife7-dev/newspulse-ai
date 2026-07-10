#!/usr/bin/env node
/**
 * NewsPulse AI — end-to-end smoke test.
 *
 * Boots the production build (`next start`) with NO external credentials and
 * probes every route. Two kinds of invariants are checked:
 *
 *   1. Liveness — every page renders, every API route responds, nav links
 *      and interactive endpoints exist. No dead routes.
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
  'FIRECRAWL_API_KEY',
  'OPENAI_API_KEY',
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

  // ----- Pages -----
  await check('page', 'GET / renders search dashboard', async () => {
    const res = await get('/');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const html = await res.text();
    assert(html.includes('NewsPulse'), 'brand missing from page');
    assert(html.includes('href="/history"'), 'nav link to /history missing');
    assert(html.includes('Search'), 'search UI missing');
  });

  await check('page', 'GET /history renders history dashboard', async () => {
    const res = await get('/history');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const html = await res.text();
    assert(html.includes('href="/"'), 'nav link home missing');
  });

  await check(
    'page',
    'GET /history/<id> fails honestly without DB',
    async () => {
      // No Supabase credentials → the page must surface the error boundary,
      // never fabricated saved-search content or a fake "not found".
      // (Next streams server-component errors with HTTP 200 + an error digest.)
      const res = await get('/history/00000000-0000-4000-8000-000000000000');
      const html = await res.text();
      // 'Re-run this search' only renders with a real entry.
      assert(
        !html.includes('Re-run this search'),
        'page rendered saved-search content it could not have loaded'
      );
      assert(
        res.status >= 500 || html.includes('digest'),
        `expected 5xx or streamed error digest, got ${res.status} with neither`
      );
    }
  );

  await check('page', 'GET /nonexistent returns 404 page', async () => {
    const res = await get('/this-page-does-not-exist');
    assert(res.status === 404, `expected 404, got ${res.status}`);
    const html = await res.text();
    assert(html.includes('404'), '404 page content missing');
  });

  // ----- Health -----
  await check('api', '/api/health reports degraded truthfully', async () => {
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
    const keys = ['firecrawl', 'openai', 'supabase_url', 'supabase_service'];
    for (const k of keys) {
      assert(typeof json.checks?.[k] === 'boolean', `checks.${k} missing`);
    }
    assert(
      typeof json.optional?.supabase_anon === 'boolean',
      'optional.supabase_anon missing'
    );
    // With credentials stripped it must NOT claim to be healthy.
    assert(res.status === 503, `expected 503 without creds, got ${res.status}`);
    assert(json.status === 'degraded', 'must report degraded without creds');
    return `status=${json.status}`;
  });

  // ----- Search API -----
  await check('api', 'GET /api/search returns 405', async () => {
    const res = await get('/api/search');
    assert(res.status === 405, `expected 405, got ${res.status}`);
    const json = await res.json();
    assert(json.ok === false, 'ok must be false on 405');
  });

  await check(
    'api',
    'POST /api/search rejects invalid JSON with 400',
    async () => {
      const res = await get('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json',
      });
      assert(res.status === 400, `expected 400, got ${res.status}`);
    }
  );

  await check(
    'api',
    'POST /api/search rejects missing keyword with 400',
    async () => {
      const res = await get('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      assert(res.status === 400, `expected 400, got ${res.status}`);
      const json = await res.json();
      assert(json.ok === false && json.error, 'error payload missing');
    }
  );

  await check(
    'api',
    'POST /api/search rejects non-string keyword with 400',
    async () => {
      const res = await get('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: 12345 }),
      });
      assert(res.status === 400, `expected 400, got ${res.status}`);
      const json = await res.json();
      assert(json.ok === false && json.error, 'error payload missing');
    }
  );

  await check(
    'api',
    'POST /api/search rejects oversized keyword with 400',
    async () => {
      const res = await get('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: 'x'.repeat(500) }),
      });
      assert(res.status === 400, `expected 400, got ${res.status}`);
      const json = await res.json();
      assert(/too long/i.test(json.error || ''), 'error should mention length');
    }
  );

  await check(
    'api',
    'POST /api/search fails honestly when unconfigured',
    async () => {
      const res = await get('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: 'smoke test' }),
      });
      assert(
        res.status === 500,
        `expected 500 without API key, got ${res.status}`
      );
      const json = await res.json();
      assert(
        json.ok === false && json.error,
        'must return an error, not results'
      );
    }
  );

  await check(
    'api',
    '/api/search responses carry rate-limit headers',
    async () => {
      const res = await get('/api/search');
      assert(
        res.headers.get('x-ratelimit-limit') !== null,
        'X-RateLimit-Limit header missing'
      );
      assert(
        res.headers.get('x-ratelimit-remaining') !== null,
        'X-RateLimit-Remaining header missing'
      );
    }
  );

  await check(
    'api',
    '/api/search rate limit returns 429 after 30 req/min',
    async () => {
      // Earlier checks consumed part of this window; hammer until the limiter
      // trips. It must trip within the configured 30-requests-per-minute cap.
      let tripped = null;
      for (let i = 0; i < 35; i++) {
        const res = await get('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}), // cheap 400s — still count against the limit
        });
        if (res.status === 429) {
          tripped = res;
          break;
        }
      }
      assert(tripped, 'rate limiter never returned 429 within 35 requests');
      const json = await tripped.json();
      assert(
        json.ok === false && /rate limit/i.test(json.error || ''),
        '429 body should explain the rate limit'
      );
      assert(
        tripped.headers.get('x-ratelimit-remaining') === '0',
        'X-RateLimit-Remaining should be 0 when limited'
      );
    }
  );

  // ----- History API -----
  await check('api', 'GET /api/history fails honestly without DB', async () => {
    const res = await get('/api/history');
    const json = await res.json();
    assert(
      json.ok === (res.status === 200),
      `ok flag (${json.ok}) contradicts HTTP status (${res.status})`
    );
    // Without credentials this must be an error — never a fake empty list.
    assert(res.status === 500, `expected 500 without creds, got ${res.status}`);
    assert(json.error, 'error message missing');
  });

  await check(
    'api',
    'GET /api/history/<id> fails honestly without DB',
    async () => {
      const res = await get(
        '/api/history/00000000-0000-4000-8000-000000000000'
      );
      const json = await res.json();
      assert(
        res.status === 500,
        `expected 500 without creds, got ${res.status}`
      );
      assert(json.ok === false && json.error, 'error payload missing');
    }
  );

  await check(
    'api',
    'DELETE /api/history fails honestly without DB',
    async () => {
      const res = await get('/api/history', { method: 'DELETE' });
      const json = await res.json();
      assert(
        res.status === 500,
        `expected 500 without creds, got ${res.status}`
      );
      assert(json.ok === false && json.error, 'error payload missing');
    }
  );

  await check(
    'page',
    'security headers are served on every response',
    async () => {
      const res = await get('/');
      assert(
        res.headers.get('x-content-type-options') === 'nosniff',
        'X-Content-Type-Options missing'
      );
      assert(
        res.headers.get('x-frame-options') === 'DENY',
        'X-Frame-Options missing'
      );
      assert(
        res.headers.get('referrer-policy') ===
          'strict-origin-when-cross-origin',
        'Referrer-Policy missing'
      );
      const api = await get('/api/health');
      assert(
        api.headers.get('x-content-type-options') === 'nosniff',
        'security headers missing on API routes'
      );
    }
  );

  await check(
    'page',
    'Content-Security-Policy served on documents',
    async () => {
      const res = await get('/');
      const csp = res.headers.get('content-security-policy') || '';
      assert(csp.includes("default-src 'self'"), 'default-src missing');
      assert(csp.includes("frame-ancestors 'none'"), 'frame-ancestors missing');
      assert(csp.includes("object-src 'none'"), 'object-src missing');
      assert(csp.includes("connect-src 'self'"), 'connect-src missing');
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
