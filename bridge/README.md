# Governor Bridge — Windows ↔ Cloud handshake (Operation HANDSHAKE)

**Transport:** this Git repository (the only real, authorized channel). File-based, auditable,
append-only. No secrets, no live-trading data.

## File layout

```
bridge/
  windows/heartbeat.json        Windows publishes: identity, versions, repo state + checksum
  cloud/ack-0001.json           Cloud replies: verification + ONE read-only task
  windows/result-T-0001.json    Windows publishes: task evidence + checksum
```

## Round-trip sequence (the mission is complete only when all four legs are proven)

1. **Windows → Cloud.** Run `scripts/governor/bridge-windows-heartbeat.ps1` → writes
   `bridge/windows/heartbeat.json`; commit + push.
2. **Cloud verifies + replies.** `node scripts/governor/bridge-cloud.mjs verify-heartbeat bridge/windows/heartbeat.json`
   → verifies schema + checksum + version + sender, writes `bridge/cloud/ack-0001.json` with
   one **read-only** task (T-0001); commit + push.
3. **Windows executes the task.** Run T-0001 (report branch, commit count, test/backtest
   commands for `C:\VAJRA` — read-only), write `bridge/windows/result-T-0001.json` with a
   matching checksum; commit + push.
4. **Cloud verifies completion.** `node scripts/governor/bridge-cloud.mjs verify-result bridge/windows/result-T-0001.json`
   → prints **HANDSHAKE COMPLETE**.

## Checksum (identical on both sides)

`sha256( UTF8( <ordered field values> joined by U+001F ) )`, lowercase hex, prefixed `sha256:`.

- **heartbeat fields:** schema_version, type, sender, machine_id, governor_version,
  git_version, python_version, working_dir, repo_state.branch, repo_state.commit, health, ts_utc
- **result fields:** schema_version, type, sender, task_id, evidence.branch,
  evidence.commit_count, ts_utc

The Cloud verifier recomputes and rejects any mismatch (tamper detection is self-tested:
`node scripts/governor/bridge-cloud.mjs selftest`).

## Status (truthful)

- **Cloud half:** built and self-tested (verify + tamper-detect + ack + result-verify all PASS).
- **Windows half:** publisher script authored (`bridge-windows-heartbeat.ps1`), **not executed
  on Windows** — no Windows Governor has published a heartbeat yet.
- **Handshake:** **PENDING** — `verify-heartbeat` reports PENDING because
  `bridge/windows/heartbeat.json` does not exist. No connection is claimed without round-trip
  evidence.

## Rules

Read-only heartbeats and task results only. No secrets/credentials/account data. No live
trading. No modification of VAJRA production. Everything auditable in Git history.
