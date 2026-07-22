#!/usr/bin/env node
// VAJRA Returns Analyzer — turns a contract-valid returns payload into the risk-adjusted
// metrics that actually answer "how far is VAJRA from sustainable 1%/day, and at what risk?"
//
// This is the analysis capability directly behind the data bottleneck: validator (exists)
// -> ANALYZER (this) -> North-Star verdict. Data-independent, deterministic, zero deps.
// Integrates the data contract (validates before analyzing).
//
// Usage:
//   node scripts/governor/analyze-returns.mjs <payload.json>   # analyze a real VAJRA payload
//   node scripts/governor/analyze-returns.mjs                  # self-test on a SYNTHETIC fixture
//
// NOTE: with no argument it runs on a clearly-labelled SYNTHETIC fixture to prove the engine
// works. That fixture is NOT VAJRA data and its numbers describe nothing real.

import { readFileSync } from 'node:fs';
import { validatePayload } from './vajra-data-contract.mjs';

const ANNUAL = 252;
const TARGET_DAILY = 0.01; // North Star: 1% net/day

function analyzeReturns(returns) {
  const r = returns.map((x) => x.net_return);
  const n = r.length;
  const mean = r.reduce((a, b) => a + b, 0) / n;
  const variance = r.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
  const sd = Math.sqrt(variance);
  const downside = Math.sqrt(r.reduce((a, b) => a + Math.min(b, 0) ** 2, 0) / n);

  // equity curve + max drawdown
  const equity = [1];
  for (const x of r) equity.push(equity[equity.length - 1] * (1 + x));
  let peak = equity[0];
  let maxDD = 0;
  for (const v of equity) {
    if (v > peak) peak = v;
    const dd = (peak - v) / peak;
    if (dd > maxDD) maxDD = dd;
  }

  const totalReturn = equity[equity.length - 1] - 1;
  const annReturn = Math.pow(equity[equity.length - 1], ANNUAL / n) - 1;
  const annVol = sd * Math.sqrt(ANNUAL);
  const sharpe = sd < 1e-12 ? 0 : (mean / sd) * Math.sqrt(ANNUAL);
  const sortino = downside < 1e-12 ? 0 : (mean / downside) * Math.sqrt(ANNUAL);
  const calmar = maxDD < 1e-12 ? Infinity : annReturn / maxDD;

  const posDays = r.filter((x) => x > 0).length;
  const daysGE1 = r.filter((x) => x >= TARGET_DAILY).length;
  const best = Math.max(...r);
  const worst = Math.min(...r);

  // North-Star gap
  const meanGap = TARGET_DAILY - mean; // how far mean daily is from 1%
  const impliedSharpeFor1pct = sd < 1e-12 ? Infinity : (TARGET_DAILY / sd) * Math.sqrt(ANNUAL);

  return {
    n, mean, sd, downside, totalReturn, annReturn, annVol, sharpe, sortino, maxDD, calmar,
    posDays, daysGE1, best, worst, meanGap, impliedSharpeFor1pct,
  };
}

function pct(x) {
  return (x * 100).toFixed(3) + '%';
}
function report(m, label) {
  console.log('='.repeat(66));
  console.log(`VAJRA Returns Analysis — ${label}`);
  console.log('='.repeat(66));
  console.log(`  Days                : ${m.n}`);
  console.log(`  Cumulative return   : ${pct(m.totalReturn)}`);
  console.log(`  Annualized return   : ${pct(m.annReturn)}`);
  console.log(`  Mean daily net      : ${pct(m.mean)}   (target 1.000%)`);
  console.log(`  Daily volatility    : ${pct(m.sd)}   (annualized ${pct(m.annVol)})`);
  console.log(`  Sharpe (ann, rf=0)  : ${m.sharpe.toFixed(3)}`);
  console.log(`  Sortino (ann)       : ${m.sortino.toFixed(3)}`);
  console.log(`  Max drawdown        : ${pct(m.maxDD)}`);
  console.log(`  Calmar              : ${m.calmar === Infinity ? 'inf' : m.calmar.toFixed(3)}`);
  console.log(`  Positive days       : ${((m.posDays / m.n) * 100).toFixed(1)}%`);
  console.log(`  Days >= 1%          : ${((m.daysGE1 / m.n) * 100).toFixed(1)}%`);
  console.log(`  Best / worst day    : ${pct(m.best)} / ${pct(m.worst)}`);
  console.log('-'.repeat(66));
  console.log('NORTH-STAR ASSESSMENT (probability of sustainable 1%/day)');
  const riseStr =
    m.mean <= 0
      ? 'mean is <= 0 — this return process LOSES money; 1%/day is not on the table'
      : `mean must rise ~${(TARGET_DAILY / m.mean).toFixed(1)}x`;
  console.log(`  Mean-daily gap to 1%: ${pct(m.meanGap)} (${riseStr})`);
  console.log(`  Sharpe implied by a sustained 1%/day at THIS vol: ${m.impliedSharpeFor1pct.toFixed(1)}`);
  console.log(`  Reality check: a sustained annualized Sharpe > ~3-4 net of costs is`);
  console.log(`  essentially unseen at scale; ${m.impliedSharpeFor1pct.toFixed(0)} is a red flag that 1%/day`);
  console.log(`  as a SUSTAINABLE AVERAGE is likely infeasible for this return process.`);
  console.log('='.repeat(66));
}

// --- deterministic synthetic fixture (SELF-TEST ONLY; NOT VAJRA) ---
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeFixture() {
  const rand = mulberry32(4242);
  const randn = () => {
    let u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const returns = [];
  // a "good but realistic" strategy: ~0.05%/day mean, ~1% daily vol, one drawdown episode
  for (let i = 0; i < 300; i++) {
    let x = 0.001 + 0.01 * randn(); // ~0.1%/day drift: excellent, yet 10x below 1%/day
    if (i >= 120 && i < 140) x -= 0.003; // a losing streak -> real drawdown
    const day = String(i + 1).padStart(3, '0');
    returns.push({ date: `2025-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`, net_return: x, _seq: day });
  }
  return { meta: { source: 'SYNTHETIC-FIXTURE', repo: 'n/a', extracted_at_utc: '2026-07-22T00:00:00Z', governor: 'Cloud' }, returns };
}

// --- entry ---
// CSV adapter: accept the simplest artifact a desk already has — a 2+ column CSV with a
// header containing `date` and `net_return` (order-independent; extra columns ignored).
function csvToPayload(text, sourceLabel) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) throw new Error('CSV has no data rows');
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const di = header.indexOf('date');
  const ri = header.findIndex((h) => h === 'net_return' || h === 'return' || h === 'net');
  if (di === -1 || ri === -1) {
    throw new Error('CSV header must include "date" and "net_return" (or "return"/"net")');
  }
  const returns = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',');
    const date = (cells[di] || '').trim();
    const nr = Number((cells[ri] || '').trim());
    if (!Number.isFinite(nr)) continue; // skip unparseable rows
    returns.push({ date, net_return: nr });
  }
  return {
    meta: { source: sourceLabel, repo: 'csv', extracted_at_utc: '1970-01-01T00:00:00Z', governor: 'Cloud' },
    returns,
  };
}

const arg = process.argv[2];
let payload;
let label;
if (arg && arg.toLowerCase().endsWith('.csv')) {
  payload = csvToPayload(readFileSync(arg, 'utf8'), arg);
  label = `${arg} (CSV)`;
} else if (arg) {
  payload = JSON.parse(readFileSync(arg, 'utf8'));
  label = arg;
} else {
  payload = makeFixture();
  label = 'SYNTHETIC FIXTURE (self-test — NOT VAJRA data)';
}

const v = validatePayload(payload);
if (!v.ok) {
  console.error('Payload failed the VAJRA data contract; refusing to analyze:');
  for (const e of v.errors) console.error(`  - ${e}`);
  process.exit(1);
}
if (!Array.isArray(payload.returns) || payload.returns.length < 2) {
  console.error('No usable returns series to analyze (need >= 2 records).');
  process.exit(1);
}
report(analyzeReturns(payload.returns), label);
process.exit(0);
