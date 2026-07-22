#!/usr/bin/env node
// GOV-EVO-2026-07-D02-001 — Provenance-verification metric.
// Computes the unverified-provenance rate (lower is better) for a defined reference set,
// comparing Day 1 (all asserted) vs Day 2 (some search-verified against real retrievals).
// Deterministic: reads scripts/governor/provenance-ledger.json; no network, no external deps.
// Run: node scripts/governor/verify-provenance.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ledger = JSON.parse(readFileSync(join(here, 'provenance-ledger.json'), 'utf8'));

// A reference counts as "verified provenance" at tier P1 or P2.
const VERIFIED = new Set(['P1', 'P2']);

// Headline metric set: EXP-20260722-001 core references (bounded, well-defined).
const target = ledger.references.filter((r) => r.cited_in.includes('EXP-20260722-001'));
const n = target.length;
const day1Verified = target.filter((r) => VERIFIED.has(r.day1_tier)).length;
const day2Verified = target.filter((r) => VERIFIED.has(r.day2_tier)).length;

const day1Unverified = (n - day1Verified) / n; // fraction unverified (lower is better)
const day2Unverified = (n - day2Verified) / n;

// lower-is-better improvement: reduction in unverified rate relative to baseline
const improvementPct =
  day1Unverified === 0 ? 0 : ((day1Unverified - day2Unverified) / day1Unverified) * 100;

const pct = (x) => (x * 100).toFixed(2) + '%';

console.log('='.repeat(64));
console.log('GOV-EVO-2026-07-D02-001 — Provenance Verification Metric');
console.log('Metric: unverified-provenance rate (lower is better)');
console.log(`Reference set: ${ledger.metric_set} (n=${n})`);
console.log('='.repeat(64));
for (const r of target) {
  const mark = VERIFIED.has(r.day2_tier) ? '✓' : '·';
  console.log(`  [${r.day1_tier}->${r.day2_tier}] ${mark} ${r.id}`);
}
console.log('-'.repeat(64));
console.log(`  Day 1 unverified rate : ${pct(day1Unverified)}  (${n - day1Verified}/${n} asserted)`);
console.log(`  Day 2 unverified rate : ${pct(day2Unverified)}  (${n - day2Verified}/${n} asserted)`);
console.log(`  Improvement (reduction): ${improvementPct.toFixed(2)}%`);
console.log('-'.repeat(64));

// Capability boundary (honest — no assumed autonomy)
console.log('Research capability (tested this cycle):');
console.log(`  WebSearch : ${ledger.capability_boundary.WebSearch}`);
console.log(`  WebFetch  : ${ledger.capability_boundary.WebFetch}`);

const GATE = 1.0; // require at least 1% improvement
const pass = improvementPct >= GATE;
console.log('-'.repeat(64));
console.log(`GATE (>= ${GATE}% improvement): ${pass ? 'PASS' : 'FAIL'} (${improvementPct.toFixed(2)}%)`);
console.log('='.repeat(64));

process.exit(pass ? 0 : 1);
