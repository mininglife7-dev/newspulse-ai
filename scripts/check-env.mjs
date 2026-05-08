#!/usr/bin/env node
/**
 * Verifies that all required environment variables are present
 * and that the Supabase URL is reachable. Never logs secret values.
 *
 * Usage:
 *   node --env-file=.env.local scripts/check-env.mjs
 *
 * Exit code 0 = all good, 1 = something missing or broken.
 */

const REQUIRED = [
  { name: 'FIRECRAWL_API_KEY',           prefix: 'fc-' },
  { name: 'OPENAI_API_KEY',              prefix: 'sk-' },
  { name: 'NEXT_PUBLIC_SUPABASE_URL',    prefix: 'https://' },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', prefix: 'sb_publishable_' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY',   prefix: 'sb_secret_' },
];

const OPTIONAL = ['NEXT_PUBLIC_SITE_URL'];

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

function mask(value) {
  if (!value) return '<empty>';
  if (value.length <= 8) return '*'.repeat(value.length);
  return value.slice(0, 4) + '*'.repeat(Math.min(8, value.length - 8)) + value.slice(-4);
}

let failures = 0;

console.log('\n🔎 NewsPulse AI — environment check\n');

// Required vars
for (const { name, prefix } of REQUIRED) {
  const v = process.env[name];
  if (!v) {
    console.log(`${RED}✗${RESET} ${name.padEnd(34)} ${DIM}(missing)${RESET}`);
    failures++;
    continue;
  }
  if (v.includes('<') || v.includes('>')) {
    console.log(`${RED}✗${RESET} ${name.padEnd(34)} ${DIM}contains placeholder brackets: ${mask(v)}${RESET}`);
    failures++;
    continue;
  }
  if (prefix && !v.startsWith(prefix)) {
    console.log(`${YELLOW}!${RESET} ${name.padEnd(34)} ${DIM}set, but doesn't start with "${prefix}" — got ${mask(v)}${RESET}`);
    // warning, not a failure — Supabase might still emit JWT-style anon keys for some projects
    continue;
  }
  console.log(`${GREEN}✓${RESET} ${name.padEnd(34)} ${DIM}${mask(v)}${RESET}`);
}

// Optional vars
for (const name of OPTIONAL) {
  const v = process.env[name];
  if (v) {
    console.log(`${GREEN}✓${RESET} ${name.padEnd(34)} ${DIM}${mask(v)} (optional)${RESET}`);
  } else {
    console.log(`${DIM}·${RESET} ${name.padEnd(34)} ${DIM}(optional, not set)${RESET}`);
  }
}

// Reachability check for Supabase URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl && !supabaseUrl.includes('<')) {
  process.stdout.write(`\n🌐 Pinging Supabase URL ... `);
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/health`, {
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (r.ok || r.status === 404 || r.status === 401) {
      // 404/401 still means the host exists and Supabase is responding.
      console.log(`${GREEN}reachable${RESET} ${DIM}(HTTP ${r.status})${RESET}`);
    } else {
      console.log(`${YELLOW}HTTP ${r.status}${RESET}`);
    }
  } catch (err) {
    console.log(`${RED}unreachable${RESET} ${DIM}(${err.message})${RESET}`);
    failures++;
  }
}

console.log('');
if (failures > 0) {
  console.log(`${RED}✗ ${failures} problem${failures === 1 ? '' : 's'} — fix the lines above and re-run.${RESET}\n`);
  process.exit(1);
} else {
  console.log(`${GREEN}✓ All required env vars look good.${RESET}\n`);
  process.exit(0);
}
