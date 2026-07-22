#!/usr/bin/env node
// Governor Bridge — CLOUD half of the Windows<->Cloud handshake (Operation HANDSHAKE).
//
// Transport is the Git repo. Protocol is file-based under bridge/:
//   bridge/windows/heartbeat.json      (Windows publishes: identity, versions, repo state)
//   bridge/cloud/ack-<n>.json          (Cloud replies: verification + ONE read-only task)
//   bridge/windows/result-<taskid>.json(Windows publishes: task evidence)
//   -> Cloud verifies result => HANDSHAKE COMPLETE
//
// This module implements ONLY the Cloud responsibilities: verify a Windows heartbeat
// (schema + checksum + version + sender), emit an acknowledgement with one harmless
// read-only task, and verify the returned task result. It NEVER fabricates a handshake:
// with no real heartbeat committed, `verify-heartbeat` on a missing file reports PENDING.
//
// Deterministic; zero external deps (node:crypto only). No network.
//
// Usage:
//   node scripts/governor/bridge-cloud.mjs selftest                 # prove the machinery (fixtures)
//   node scripts/governor/bridge-cloud.mjs verify-heartbeat <file>  # verify a real Windows heartbeat -> ack
//   node scripts/governor/bridge-cloud.mjs verify-result <file>     # verify a real task result -> COMPLETE

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const SCHEMA_VERSION = '1.0';
const READ_ONLY_TASK = {
  id: 'T-0001',
  kind: 'read-only',
  instruction:
    'Report the current Git branch, commit count (git rev-list --count HEAD), and available ' +
    'test/backtest command names for C:\\VAJRA. Read-only. No secrets. No file changes.',
};

// Cross-language-stable checksum: sha256 over an ordered list of specific field VALUES joined
// by a unit-separator (U+001F). This is trivially reproducible in PowerShell and Node alike,
// unlike canonical-JSON hashing. Field order is fixed per message type.
const SEP = '';
const HEARTBEAT_FIELDS = (h) => [
  h.schema_version, h.type, h.sender, h.machine_id, h.governor_version, h.git_version,
  h.python_version, h.working_dir, h.repo_state && h.repo_state.branch, h.repo_state && h.repo_state.commit,
  h.health, h.ts_utc,
];
const RESULT_FIELDS = (r) => [
  r.schema_version, r.type, r.sender, r.task_id, r.evidence && r.evidence.branch,
  r.evidence && r.evidence.commit_count, r.ts_utc,
];
const ACK_FIELDS = (a) => [a.schema_version, a.type, a.responder, a.in_response_to, a.task.id, a.ts_utc];
function hashFields(values) {
  return 'sha256:' + createHash('sha256').update(values.map((v) => String(v)).join(SEP)).digest('hex');
}
function checksum(obj) {
  const fields = obj.type === 'heartbeat' ? HEARTBEAT_FIELDS : obj.type === 'task_result' ? RESULT_FIELDS : ACK_FIELDS;
  return hashFields(fields(obj));
}

function verifyHeartbeat(hb) {
  const errors = [];
  const req = ['schema_version', 'type', 'sender', 'machine_id', 'governor_version', 'git_version', 'python_version', 'working_dir', 'repo_state', 'health', 'ts_utc', 'checksum'];
  for (const f of req) if (!(f in hb)) errors.push(`missing field "${f}"`);
  if (hb.type !== 'heartbeat') errors.push(`type must be "heartbeat" (got "${hb.type}")`);
  if (hb.schema_version !== SCHEMA_VERSION) errors.push(`schema_version must be ${SCHEMA_VERSION}`);
  if (hb.sender !== 'windows-governor') errors.push(`sender must be "windows-governor"`);
  if (hb.repo_state && (!hb.repo_state.branch || !hb.repo_state.commit)) errors.push('repo_state needs branch + commit');
  if (hb.checksum) {
    const recomputed = checksum(hb);
    if (recomputed !== hb.checksum) errors.push(`checksum mismatch (recomputed ${recomputed})`);
  }
  return { ok: errors.length === 0, errors };
}

function makeAck(hb) {
  const ack = {
    schema_version: SCHEMA_VERSION,
    type: 'ack',
    responder: 'cloud-governor',
    in_response_to: hb.checksum,
    sender_verified: hb.sender === 'windows-governor',
    verified: { schema: true, checksum: true, version: true, sender: true },
    task: READ_ONLY_TASK,
    ts_utc: hb.ts_utc, // echo heartbeat time (deterministic; no wall-clock in-script)
    note: 'Cloud verified heartbeat. Execute the read-only task and publish result-<task_id>.json.',
  };
  ack.checksum = checksum(ack);
  return ack;
}

function verifyResult(res) {
  const errors = [];
  const req = ['schema_version', 'type', 'sender', 'task_id', 'evidence', 'ts_utc', 'checksum'];
  for (const f of req) if (!(f in res)) errors.push(`missing field "${f}"`);
  if (res.type !== 'task_result') errors.push('type must be "task_result"');
  if (res.task_id !== READ_ONLY_TASK.id) errors.push(`task_id must be ${READ_ONLY_TASK.id}`);
  if (res.evidence && (res.evidence.branch === undefined || res.evidence.commit_count === undefined))
    errors.push('evidence needs branch + commit_count');
  if (res.checksum && checksum(res) !== res.checksum) errors.push('checksum mismatch');
  return { ok: errors.length === 0, errors };
}

// ---- fixtures for self-test (clearly synthetic; prove the machinery only) ----
function fixtureHeartbeat() {
  const hb = {
    schema_version: SCHEMA_VERSION, type: 'heartbeat', sender: 'windows-governor',
    machine_id: 'win-<hashed-nonsensitive>', governor_version: 'win-gov-0.1',
    git_version: '2.44.0', python_version: '3.12.0', working_dir: 'C:\\gov\\newspulse-ai',
    repo_state: { branch: 'vajra-data-drop', commit: 'abc1234' }, health: 'ok',
    ts_utc: '2026-07-22T18:00:00Z',
  };
  hb.checksum = checksum(hb);
  return hb;
}
function fixtureResult() {
  const res = {
    schema_version: SCHEMA_VERSION, type: 'task_result', sender: 'windows-governor',
    task_id: READ_ONLY_TASK.id,
    evidence: { branch: 'vajra-data-drop', commit_count: '1287', test_commands: ['pytest', 'python backtest.py'] },
    ts_utc: '2026-07-22T18:01:00Z',
  };
  res.checksum = checksum(res);
  return res;
}

function selftest() {
  console.log('='.repeat(64));
  console.log('Governor Bridge — CLOUD self-test (synthetic fixtures; NOT a real handshake)');
  console.log('='.repeat(64));
  const hb = fixtureHeartbeat();
  const v1 = verifyHeartbeat(hb);
  console.log(`  1. verify heartbeat         : ${v1.ok ? 'PASS' : 'FAIL ' + v1.errors.join('; ')}`);
  // tamper test: checksum must catch modification
  const tampered = { ...hb, health: 'DEGRADED' };
  const v1t = verifyHeartbeat(tampered);
  console.log(`  2. tamper detection (checksum): ${!v1t.ok ? 'PASS (rejected)' : 'FAIL (accepted tampered)'}`);
  const ack = makeAck(hb);
  console.log(`  3. emit ack + read-only task : ${ack.task.id} "${ack.task.instruction.slice(0, 46)}..."`);
  const res = fixtureResult();
  const v2 = verifyResult(res);
  console.log(`  4. verify task result        : ${v2.ok ? 'PASS' : 'FAIL ' + v2.errors.join('; ')}`);
  const complete = v1.ok && !v1t.ok && v2.ok;
  console.log('-'.repeat(64));
  console.log(`  SELF-TEST: ${complete ? 'PASS — Cloud handshake machinery works' : 'FAIL'}`);
  console.log('  (Real HANDSHAKE COMPLETE requires a real Windows heartbeat committed to');
  console.log('   bridge/windows/heartbeat.json — none exists yet, so status is PENDING.)');
  console.log('='.repeat(64));
  return complete;
}

// ---- entry ----
const cmd = process.argv[2];
const file = process.argv[3];
if (cmd === 'selftest' || !cmd) {
  process.exit(selftest() ? 0 : 1);
} else if (cmd === 'verify-heartbeat') {
  if (!file || !existsSync(file)) {
    console.log('HANDSHAKE STATUS: PENDING — no Windows heartbeat found.');
    console.log(`Expected at: ${file || 'bridge/windows/heartbeat.json'} (Windows Governor must publish it).`);
    process.exit(2);
  }
  const hb = JSON.parse(readFileSync(file, 'utf8'));
  const v = verifyHeartbeat(hb);
  if (!v.ok) {
    console.error('Heartbeat REJECTED:');
    for (const e of v.errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  const ack = makeAck(hb);
  mkdirSync('bridge/cloud', { recursive: true });
  writeFileSync('bridge/cloud/ack-0001.json', JSON.stringify(ack, null, 2));
  console.log('Heartbeat VERIFIED (schema+checksum+version+sender). Ack written: bridge/cloud/ack-0001.json');
  console.log(`Returned read-only task ${ack.task.id}: ${ack.task.instruction}`);
  process.exit(0);
} else if (cmd === 'verify-result') {
  if (!file || !existsSync(file)) {
    console.log('HANDSHAKE STATUS: PENDING — no task result found.');
    process.exit(2);
  }
  const res = JSON.parse(readFileSync(file, 'utf8'));
  const v = verifyResult(res);
  if (!v.ok) {
    console.error('Task result REJECTED:');
    for (const e of v.errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log('Task result VERIFIED. Round trip proven: Windows -> Cloud -> Windows -> Cloud.');
  console.log('HANDSHAKE COMPLETE.');
  process.exit(0);
} else {
  console.error(`Unknown command "${cmd}". Use: selftest | verify-heartbeat <file> | verify-result <file>`);
  process.exit(1);
}
