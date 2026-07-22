#!/usr/bin/env node
// VAJRA Real-Data Ingestion Contract + Validator.
// Cycle GOV-EVO-2026-07-D06-001 (Real-Data Pipeline Preparation).
//
// Founder directive (2026-07-22): synthetic alpha research is FROZEN and COMPLETE.
// Every experiment henceforth is evaluated against REAL VAJRA data. This module is the
// Cloud-side entry point for that pipeline: it defines the exact schema the Windows
// Governor must deliver (Tasks VAJ-001 / GIT-001 / SCI-001) and validates a delivered
// payload BEFORE any backtest consumes it. No alpha discovery here — this is the gate
// that lets real-data alpha research begin.
//
// Usage:
//   node scripts/governor/vajra-data-contract.mjs               # run validator self-tests
//   node scripts/governor/vajra-data-contract.mjs <payload.json> # validate a delivered file
//
// Deterministic, no external deps, no network.

import { readFileSync } from 'node:fs';

// ---------------------------------------------------------------------------
// THE CONTRACT — what Windows Governor must deliver for real-data research.
// Four data classes; each row/record is validated field-by-field.
// ---------------------------------------------------------------------------
export const CONTRACT = {
  meta: {
    required: ['source', 'repo', 'extracted_at_utc', 'governor'],
    note: 'Provenance of the extraction itself (who/where/when). extracted_at_utc ISO-8601.',
  },
  // 1) Daily net return series — the core input for the 1%/day objective.
  returns: {
    required: ['date', 'net_return'],
    optional: ['gross_return', 'equity', 'symbol', 'costs'],
    rules: {
      date: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v),
      net_return: (v) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 1,
    },
    note: 'net_return is a decimal fraction per trading day (0.01 = 1%). |r| < 1 sanity bound.',
  },
  // 2) Backtest results — for Stage 3 validation of paused/validated experiments.
  backtests: {
    required: ['id', 'period_start', 'period_end', 'sharpe', 'max_drawdown'],
    optional: ['sortino', 'calmar', 'profit_factor', 'expectancy', 'turnover', 'notes'],
    rules: {
      period_start: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v),
      period_end: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v),
      sharpe: (v) => typeof v === 'number' && Number.isFinite(v),
      max_drawdown: (v) => typeof v === 'number' && v >= 0 && v <= 1,
    },
    note: 'max_drawdown as a positive fraction (0.12 = 12%).',
  },
  // 3) Execution logs — for EXP-002 (Almgren-Chriss) real-fill validation.
  execution_logs: {
    required: ['ts_utc', 'symbol', 'side', 'qty', 'arrival_price', 'fill_price'],
    optional: ['venue', 'order_type', 'slippage_bps'],
    rules: {
      side: (v) => v === 'buy' || v === 'sell',
      qty: (v) => typeof v === 'number' && v > 0,
      arrival_price: (v) => typeof v === 'number' && v > 0,
      fill_price: (v) => typeof v === 'number' && v > 0,
    },
    note: 'Enables real implementation-shortfall measurement vs the synthetic EXP-002 result.',
  },
  // 4) Scientific evidence — recovered experiments/decisions (Phase 0.5 consolidation).
  scientific_evidence: {
    required: ['id', 'type', 'summary'],
    optional: ['commit', 'date', 'metrics', 'outcome'],
    rules: {
      type: (v) => ['experiment', 'decision', 'backtest', 'recovery', 'lesson'].includes(v),
    },
    note: 'Feeds GOVERNOR_KNOWLEDGE_REGISTER classification (Task CONS-001).',
  },
};

function validateRecord(record, spec, path, errors) {
  for (const field of spec.required) {
    if (!(field in record)) {
      errors.push(`${path}: missing required field "${field}"`);
      continue;
    }
    const rule = spec.rules && spec.rules[field];
    if (rule && !rule(record[field])) {
      errors.push(`${path}: field "${field}" failed validation (value: ${JSON.stringify(record[field])})`);
    }
  }
}

export function validatePayload(payload) {
  const errors = [];
  if (typeof payload !== 'object' || payload === null) {
    return { ok: false, errors: ['payload is not an object'] };
  }
  // meta is always required
  if (!payload.meta) errors.push('missing "meta" block');
  else validateRecord(payload.meta, CONTRACT.meta, 'meta', errors);

  // at least one data class must be present and non-empty
  const dataClasses = ['returns', 'backtests', 'execution_logs', 'scientific_evidence'];
  const present = dataClasses.filter((c) => Array.isArray(payload[c]) && payload[c].length > 0);
  if (present.length === 0) {
    errors.push('no data classes present (need at least one of: ' + dataClasses.join(', ') + ')');
  }
  for (const cls of present) {
    payload[cls].forEach((rec, i) => validateRecord(rec, CONTRACT[cls], `${cls}[${i}]`, errors));
  }
  return { ok: errors.length === 0, errors, dataClassesPresent: present };
}

// --- fixtures (SUPPORT TOOL ONLY — proves the validator is correct; not alpha research) ---
const VALID_FIXTURE = {
  meta: { source: 'VAJRA', repo: 'C:\\VAJRA', extracted_at_utc: '2026-07-22T18:00:00Z', governor: 'Windows' },
  returns: [
    { date: '2026-07-20', net_return: 0.008 },
    { date: '2026-07-21', net_return: -0.003, equity: 1.005 },
  ],
  backtests: [{ id: 'BT-1', period_start: '2020-01-01', period_end: '2025-12-31', sharpe: 1.4, max_drawdown: 0.11 }],
};
const INVALID_FIXTURE = {
  meta: { source: 'VAJRA' }, // missing required fields
  returns: [{ date: '20-07-2026', net_return: 5 }], // bad date, |r|>=1
};

function runSelfTests() {
  const good = validatePayload(VALID_FIXTURE);
  const bad = validatePayload(INVALID_FIXTURE);
  console.log('='.repeat(64));
  console.log('VAJRA Data Contract — validator self-tests');
  console.log('='.repeat(64));
  console.log(`  valid fixture   -> ok=${good.ok} (expected true), classes: ${good.dataClassesPresent.join(', ')}`);
  console.log(`  invalid fixture -> ok=${bad.ok} (expected false), ${bad.errors.length} errors:`);
  for (const e of bad.errors) console.log(`      - ${e}`);
  const pass = good.ok === true && bad.ok === false;
  console.log('-'.repeat(64));
  console.log(`SELF-TEST: ${pass ? 'PASS — validator ready for real VAJRA delivery' : 'FAIL'}`);
  console.log('='.repeat(64));
  return pass;
}

// --- entry point (only when run directly, not when imported) ---
import { pathToFileURL } from 'node:url';
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
const arg = process.argv[2];
if (isMain && arg) {
  let payload;
  try {
    payload = JSON.parse(readFileSync(arg, 'utf8'));
  } catch (e) {
    console.error(`Cannot read/parse ${arg}: ${e.message}`);
    process.exit(2);
  }
  const res = validatePayload(payload);
  if (res.ok) {
    console.log(`VALID — ${arg} conforms to the VAJRA data contract. Classes: ${res.dataClassesPresent.join(', ')}`);
    process.exit(0);
  }
  console.error(`INVALID — ${arg} failed the VAJRA data contract:`);
  for (const e of res.errors) console.error(`  - ${e}`);
  process.exit(1);
} else if (isMain) {
  process.exit(runSelfTests() ? 0 : 1);
}
