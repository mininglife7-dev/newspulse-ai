#!/usr/bin/env node
// EXP-20260722-002 — Stage 2 Simulation: Almgren-Chriss optimal execution vs TWAP.
// Cycle GOV-EVO-2026-07-D03-001.
//
// Validates the CORE MECHANICS of the execution hypothesis in isolation: does an
// Almgren-Chriss (2000) risk-averse liquidation schedule reduce execution TIMING RISK
// (variance of implementation shortfall) versus a naive uniform (TWAP) schedule, and
// does it lower the mean-variance execution objective E[C] + lambda*Var[C]?
//
// Closed-form and deterministic (no RNG). Parameters are the canonical Almgren-Chriss
// (2000) worked example (search-verified P1 this cycle):
//   X=1e6 shares, sigma=0.95 $/share/day^0.5, gamma=2.5e-7, eta=2.5e-6, epsilon=0.0625,
//   tau=1 day, N=5 intervals (T=5 days).
// Run: node scripts/governor/execution-simulation.mjs

const X = 1_000_000; // shares to liquidate
const SIGMA = 0.95; // volatility, $/share/day^0.5
const GAMMA = 2.5e-7; // permanent impact (linear) -- path-independent for full liquidation
const ETA = 2.5e-6; // temporary impact (linear)
const EPSILON = 0.0625; // fixed cost / half-spread, $/share
const TAU = 1; // interval length (days)
const N = 5; // number of intervals
const T = N * TAU; // horizon
const LAMBDA = 2e-6; // risk aversion (mean-variance trade-off)

const etaTilde = ETA - 0.5 * GAMMA * TAU; // adjusted temporary impact (AC eq.)

// Almgren-Chriss optimal trajectory: solve kappa from cosh(kappa*tau) = 1 + 0.5*kappaTilde^2*tau^2
function acHoldings() {
  const kappaTildeSq = (LAMBDA * SIGMA * SIGMA) / etaTilde;
  const coshArg = 1 + 0.5 * kappaTildeSq * TAU * TAU;
  const kappa = Math.acosh(coshArg) / TAU;
  const x = [];
  for (let j = 0; j <= N; j++) {
    const tj = j * TAU;
    x[j] = (X * Math.sinh(kappa * (T - tj))) / Math.sinh(kappa * T);
  }
  x[N] = 0; // exact terminal condition
  return { x, kappa };
}

// TWAP: uniform liquidation
function twapHoldings() {
  const x = [];
  for (let j = 0; j <= N; j++) x[j] = X * (1 - j / N);
  x[N] = 0;
  return { x };
}

// trades n_j = x_{j-1} - x_j
function trades(x) {
  const n = [];
  for (let j = 1; j <= N; j++) n[j - 1] = x[j - 1] - x[j];
  return n;
}

// Expected implementation shortfall (cost), $:
//   E = 0.5*gamma*X^2 (permanent, path-independent) + sum[ epsilon*|n| + (etaTilde/tau)*n^2 ]
function expectedCost(x) {
  const n = trades(x);
  let temp = 0;
  for (const nk of n) temp += EPSILON * Math.abs(nk) + (etaTilde / TAU) * nk * nk;
  const perm = 0.5 * GAMMA * X * X;
  return { total: perm + temp, permanent: perm, temporary: temp };
}

// Variance of shortfall (timing risk), $^2:  V = sigma^2 * tau * sum_{j=1..N} x_j^2
function variance(x) {
  let v = 0;
  for (let j = 1; j <= N; j++) v += x[j] * x[j];
  return SIGMA * SIGMA * TAU * v;
}

function analyze(name, x, extra = {}) {
  const E = expectedCost(x);
  const V = variance(x);
  const U = E.total + LAMBDA * V;
  return { name, x, E, V, timingRisk: Math.sqrt(V), U, ...extra };
}

const ac = acHoldings();
const twap = twapHoldings();
const A = analyze('Almgren-Chriss (risk-averse)', ac.x, { kappa: ac.kappa });
const B = analyze('TWAP (uniform)', twap.x);

const fmt$ = (v) => '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 });
const bps = (cost) => ((cost / (X * 50)) * 10000).toFixed(1); // vs notional at S=$50

console.log('='.repeat(66));
console.log('EXP-20260722-002 Stage 2 — Almgren-Chriss vs TWAP (execution)');
console.log(`X=${X.toLocaleString()} sh  sigma=${SIGMA}  eta=${ETA}  gamma=${GAMMA}  lambda=${LAMBDA}`);
console.log(`N=${N} intervals, tau=${TAU}d, T=${T}d, kappa=${A.kappa.toFixed(4)}`);
console.log('='.repeat(66));
for (const r of [A, B]) {
  console.log(`\n${r.name}`);
  console.log(`  Holdings path     : ${r.x.map((v) => Math.round(v / 1000) + 'k').join(' -> ')}`);
  console.log(`  E[cost]           : ${fmt$(r.E.total)}  (~${bps(r.E.total)} bps of notional)`);
  console.log(`    - temporary     : ${fmt$(r.E.temporary)}`);
  console.log(`  Timing risk sqrt(V): ${fmt$(r.timingRisk)}`);
  console.log(`  Objective E+lV    : ${fmt$(r.U)}`);
}

const varReduction = (B.V - A.V) / B.V;
const timingRiskReduction = (B.timingRisk - A.timingRisk) / B.timingRisk;
const costIncrease = A.E.total - B.E.total; // AC costs more in expectation (front-loading)
const objReduction = (B.U - A.U) / B.U;

const pct = (x) => (x * 100).toFixed(2) + '%';
console.log('\n' + '-'.repeat(66));
console.log('COMPARISON (Almgren-Chriss vs TWAP)');
console.log(`  Timing-risk (std) reduction : ${pct(timingRiskReduction)}`);
console.log(`  Variance reduction          : ${pct(varReduction)}`);
console.log(`  Expected-cost increase      : ${fmt$(costIncrease)} (honest trade-off, not hidden)`);
console.log(`  Mean-variance obj reduction : ${pct(objReduction)}`);

// Hypothesis gates (a-priori): AC must reduce timing risk (variance) AND lower the
// risk-averse objective E+lambda*V. Expected-cost rises (front-loading) — that is the
// documented trade-off, reported not hidden.
const gates = {
  timingRiskReduced: timingRiskReduction > 0,
  objectiveReduced: objReduction >= 0.01, // >=1% improvement on the mean-variance objective
};
const pass = gates.timingRiskReduced && gates.objectiveReduced;
console.log('\n' + '-'.repeat(66));
console.log('HYPOTHESIS GATES');
console.log(`  timing risk reduced        : ${gates.timingRiskReduced ? 'PASS' : 'FAIL'}`);
console.log(`  mean-var objective ->= 1%  : ${gates.objectiveReduced ? 'PASS' : 'FAIL'} (${pct(objReduction)})`);
console.log(`\nSTAGE 2 VERDICT: ${pass ? 'MECHANISM VALIDATED — advance to Backtest' : 'NOT VALIDATED'}`);
console.log('  Note: TWAP minimizes E[cost]; AC accepts a MATERIAL expected-cost increase');
console.log('  (front-loading -> more temporary impact) to cut timing risk. Net risk-adjusted');
console.log('  objective favors AC only for lambda>0; a cost-minimizing desk would pick TWAP.');
console.log('  Real per-share return impact on VAJRA deferred to Backtest on actual fills.');
console.log('='.repeat(66));

process.exit(pass ? 0 : 1);
