#!/usr/bin/env node
// EXP-20260722-003 — Stage 2 Simulation: Recurrent Reinforcement Learning (RRL) trader.
// Cycle GOV-EVO-2026-07-D05-001.
//
// Faithful-in-spirit implementation of Moody & Saffell (2001) "Learning to Trade via
// Direct Reinforcement" (P1-verified): a policy F_t = tanh(w . [lagged returns, F_{t-1}, 1])
// in [-1,1] trained by gradient ascent to MAXIMIZE the Sharpe ratio of net trading returns
// (transaction costs in the objective), not raw profit.
//
// This is a MECHANICS test in isolation on synthetic data. It checks the a-priori claims:
//   (1) On a signal WITH structure (AR(1) momentum), RRL learns a positive out-of-sample
//       risk-adjusted edge vs buy-and-hold.
//   (2) A cost-BLIND variant over-trades and underperforms NET of costs (Moody & Saffell).
//   (3) The edge is STABLE across random seeds (>= 5) — the primary DRL failure mode.
//   (4) On a signal with NO structure (pure noise), RRL does NOT manufacture an edge
//       (negative control against overfitting).
//
// Deterministic: seeded PRNG; finite-difference gradient. No external deps.
// Run: node scripts/governor/rrl-simulation.mjs

const M = 3; // number of lagged-return features
const N_TRAIN = 1500;
const N_TEST = 1500;
const COST = 0.0005; // 5 bps per unit change in position
const EPOCHS = 250;
const LR = 0.3;
const SEEDS = [11, 22, 33, 44, 55]; // >=5 seeds for stability

// --- deterministic PRNG (mulberry32) + normal ---
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeRandn(seed) {
  const r = mulberry32(seed);
  return () => {
    let u = 0;
    let v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}

// AR(1) returns: r_t = phi*r_{t-1} + sigma*eps.  phi>0 => momentum (learnable).
function genReturns(n, phi, sigma, randn) {
  const r = new Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    prev = phi * prev + sigma * randn();
    r[i] = prev;
  }
  return r;
}

// Forward pass: given weights and returns, produce net trading returns series.
// Features at t: [r_{t-1}, ..., r_{t-M}, F_{t-1}, bias]. Recurrent via F_{t-1}.
function forward(w, r) {
  const n = r.length;
  const rets = [];
  let Fprev = 0;
  for (let t = M; t < n; t++) {
    const x = [];
    for (let k = 1; k <= M; k++) x.push(r[t - k]);
    x.push(Fprev);
    x.push(1); // bias
    let z = 0;
    for (let j = 0; j < w.length; j++) z += w[j] * x[j];
    const F = Math.tanh(z);
    // net trading return realized at t: position from previous step earns r[t], pay cost on change
    const ret = Fprev * r[t] - COST * Math.abs(F - Fprev);
    rets.push(ret);
    Fprev = F;
  }
  return rets;
}

function sharpe(rets) {
  const n = rets.length;
  if (n < 2) return 0;
  const mean = rets.reduce((a, b) => a + b, 0) / n;
  const varr = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const sd = Math.sqrt(varr);
  return sd < 1e-12 ? 0 : (mean / sd) * Math.sqrt(252);
}
function turnover(w, r) {
  const n = r.length;
  let Fprev = 0;
  let to = 0;
  let cnt = 0;
  for (let t = M; t < n; t++) {
    const x = [];
    for (let k = 1; k <= M; k++) x.push(r[t - k]);
    x.push(Fprev);
    x.push(1);
    let z = 0;
    for (let j = 0; j < w.length; j++) z += w[j] * x[j];
    const F = Math.tanh(z);
    to += Math.abs(F - Fprev);
    Fprev = F;
    cnt++;
  }
  return to / cnt; // avg per-step position change
}

// objective for training: Sharpe on training returns. If costAware=false, train ignoring
// costs (COST forced 0 in the objective) but we STILL evaluate net with real cost later.
function trainSharpe(w, r, costAware) {
  if (costAware) return sharpe(forward(w, r));
  // cost-blind: recompute forward with zero cost for the objective only
  const n = r.length;
  const rets = [];
  let Fprev = 0;
  for (let t = M; t < n; t++) {
    const x = [];
    for (let k = 1; k <= M; k++) x.push(r[t - k]);
    x.push(Fprev);
    x.push(1);
    let z = 0;
    for (let j = 0; j < w.length; j++) z += w[j] * x[j];
    const F = Math.tanh(z);
    rets.push(Fprev * r[t]); // no cost term
    Fprev = F;
  }
  return sharpe(rets);
}

// finite-difference gradient ascent on training Sharpe
function train(rTrain, costAware, randn) {
  const dim = M + 2;
  let w = Array.from({ length: dim }, () => 0.01 * randn());
  const eps = 1e-4;
  for (let e = 0; e < EPOCHS; e++) {
    const base = trainSharpe(w, rTrain, costAware);
    const grad = new Array(dim).fill(0);
    for (let j = 0; j < dim; j++) {
      const wj = w[j];
      w[j] = wj + eps;
      const up = trainSharpe(w, rTrain, costAware);
      w[j] = wj - eps;
      const dn = trainSharpe(w, rTrain, costAware);
      w[j] = wj;
      grad[j] = (up - dn) / (2 * eps);
    }
    let norm = Math.sqrt(grad.reduce((a, b) => a + b * b, 0)) || 1;
    for (let j = 0; j < dim; j++) w[j] += (LR * grad[j]) / norm;
    if (base === 0 && e > 20) break;
  }
  return w;
}

function runCondition(phi, label) {
  const results = [];
  for (const seed of SEEDS) {
    const randnTrain = makeRandn(seed);
    const randnTest = makeRandn(seed + 1000);
    const rTrain = genReturns(N_TRAIN, phi, 0.01, randnTrain);
    const rTest = genReturns(N_TEST, phi, 0.01, randnTest);

    const wCostAware = train(rTrain, true, makeRandn(seed + 7));
    const wCostBlind = train(rTrain, false, makeRandn(seed + 7));

    const testAware = sharpe(forward(wCostAware, rTest)); // net of cost
    const testBlind = sharpe(forward(wCostBlind, rTest)); // net of cost
    // buy-and-hold on the same test series
    const bh = sharpe(rTest.slice(M).map((x) => x));

    results.push({
      seed,
      testAware,
      testBlind,
      bh,
      toAware: turnover(wCostAware, rTest),
      toBlind: turnover(wCostBlind, rTest),
    });
  }
  const mean = (f) => results.reduce((a, r) => a + f(r), 0) / results.length;
  const std = (f) => {
    const m = mean(f);
    return Math.sqrt(results.reduce((a, r) => a + (f(r) - m) ** 2, 0) / results.length);
  };
  return {
    label,
    phi,
    awareMean: mean((r) => r.testAware),
    awareStd: std((r) => r.testAware),
    blindMean: mean((r) => r.testBlind),
    bhMean: mean((r) => r.bh),
    toAwareMean: mean((r) => r.toAware),
    toBlindMean: mean((r) => r.toBlind),
    results,
  };
}

const f = (x) => x.toFixed(3);
console.log('='.repeat(70));
console.log('EXP-20260722-003 Stage 2 — RRL trader (Moody & Saffell direct reinforcement)');
console.log(`M=${M} lags, train=${N_TRAIN}, test=${N_TEST}, cost=${COST}, seeds=${SEEDS.length}`);
console.log('='.repeat(70));

// Positive control: signal WITH structure (momentum). Negative control: pure noise.
const structured = runCondition(0.15, 'AR(1) momentum (phi=0.15)');
const noise = runCondition(0.0, 'pure noise (phi=0.0) [negative control]');

for (const c of [structured, noise]) {
  console.log(`\n${c.label}`);
  console.log(`  RRL cost-aware  test Sharpe: mean ${f(c.awareMean)}  std ${f(c.awareStd)}  turnover ${f(c.toAwareMean)}`);
  console.log(`  RRL cost-blind  test Sharpe: mean ${f(c.blindMean)} (net)  turnover ${f(c.toBlindMean)}`);
  console.log(`  Buy-and-hold    test Sharpe: mean ${f(c.bhMean)}`);
}

// Gates (a-priori):
//  (1) structured: cost-aware out-of-sample Sharpe beats buy-and-hold
//  (2) cost-aware beats cost-blind NET of costs (over-trading penalty)
//  (3) seed-stability: edge (aware - bh) exceeds its own cross-seed std
//  (4) negative control: on pure noise, no meaningful positive edge (<= 0.5 Sharpe)
const edge = structured.awareMean - structured.bhMean;
const gates = {
  beatsBuyHold: structured.awareMean > structured.bhMean,
  costAwareBeatsBlind: structured.awareMean > structured.blindMean,
  seedStable: edge > structured.awareStd,
  noiseControl: noise.awareMean <= 0.5,
};
const pass = gates.beatsBuyHold && gates.costAwareBeatsBlind && gates.seedStable && gates.noiseControl;

console.log('\n' + '-'.repeat(70));
console.log('HYPOTHESIS GATES');
console.log(`  (1) beats buy-and-hold (structured) : ${gates.beatsBuyHold ? 'PASS' : 'FAIL'}`);
console.log(`  (2) cost-aware beats cost-blind net : ${gates.costAwareBeatsBlind ? 'PASS' : 'FAIL'}`);
console.log(`  (3) edge > cross-seed std (stable)  : ${gates.seedStable ? 'PASS' : 'FAIL'} (edge ${f(edge)} vs std ${f(structured.awareStd)})`);
console.log(`  (4) no edge on pure noise (control) : ${gates.noiseControl ? 'PASS' : 'FAIL'} (noise Sharpe ${f(noise.awareMean)})`);
console.log(`\nSTAGE 2 VERDICT: ${pass ? 'MECHANISM VALIDATED — advance to Backtest' : 'NOT VALIDATED — revise before Backtest'}`);
console.log('  Scope: synthetic isolation only. Real per-share return / 1%-day impact on VAJRA');
console.log('  is NOT established here — deferred to Backtest on real fills + walk-forward.');
console.log('='.repeat(70));

process.exit(pass ? 0 : 1);
