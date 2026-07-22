# Operation VAJRA Bridge — Minimal Runbook

**Status:** Cloud-side READY · Windows-side AWAITING FOUNDER
**Transport:** this Git repository (the only real channel between the two Governors)
**Principle:** smallest reliable bridge first. Prove ONE real file round-trips before
building anything "continuous," "bidirectional," or "secure-daemon." (Bottleneck Law +
Engineering Law: simple, observable, reproducible.)

---

## Why this is the whole bridge (for now)

- **[Verified]** Cloud Governor runs in an isolated Linux container with NO access to the
  Windows filesystem, `C:\VAJRA`, or any live socket. A real-time daemon is impossible from
  the cloud side.
- **[Verified]** Both Governors can read/write this GitHub repo. Git commits are therefore
  the bridge: append-only, timestamped, diffable, and history-preserving — which satisfies
  "never overwrite validated evidence; always preserve history."

A heavier bridge (live sync, bidirectional, secrets, streaming) is **premature** until a
single real payload has been validated. Do not build it first.

---

## Direction 1 (the only one that matters now): Windows → Cloud

### Windows Governor steps (Founder runs on the Windows machine)

1. Extract from `C:\VAJRA` / `C:\VAJRA Gold` a payload conforming to the contract in
   `scripts/governor/vajra-data-contract.mjs`. Start with the **lowest-sensitivity,
   highest-value** slice:
   - `meta`: `{ source, repo, extracted_at_utc, governor:"Windows" }`
   - `returns`: array of `{ date:"YYYY-MM-DD", net_return: <decimal, e.g. 0.008> }` for the
     full live history. This one array is enough to begin real work.
   - (Add `backtests`, `execution_logs`, `scientific_evidence` later, once returns validate.)
2. Save as `data/vajra/payload-<YYYYMMDD>.json` on a branch, e.g. `vajra-data-drop`.
3. **Validate BEFORE committing:**
   `node scripts/governor/vajra-data-contract.mjs data/vajra/payload-<YYYYMMDD>.json`
   Must print `VALID`. If `INVALID`, fix and re-run — do not transfer invalid data.
4. Commit + push the branch. Open a PR (or ping Cloud Governor with the branch name).

### Cloud Governor steps (on receipt)

1. Pull the branch; re-run the validator (trust nothing unvalidated).
2. Run Task **CONS-001**: classify the data, populate `GOVERNOR_KNOWLEDGE_REGISTER.md`,
   and record provenance (this is REAL data → tier above P0/P1; it is primary evidence).
3. Only now do real-data experiments begin (EXP-001 vol-target first, on real returns).

---

## Guardrails (Capital Preservation + No-Secret-Exposure laws)

- **NO secrets, API keys, broker credentials, or account numbers** in any committed file.
  If any appear, the drop is rejected on sight.
- **Sensitivity tiering:** a `returns` series (`date`, `net_return`) is low-sensitivity and
  sufficient to start. **Raw positions, order-level execution logs, and live account P&L are
  SENSITIVE** — do not commit them to the repo without an explicit Founder decision on a
  private data channel. Aggregate first; share raw only when necessary and authorized.
- **Size:** keep payloads lean (aggregated daily series, not tick data). Large datasets need
  a separate channel, not Git.
- **Never modify production VAJRA** during extraction (read-only), per ARCH-D002.

---

## Definition of Done for "the bridge works"

ONE `payload-*.json` with a real VAJRA `returns` series passes the validator on the Cloud
side and is ingested via CONS-001. That is the milestone. Everything about "continuous
autonomous ecosystem" is deferred until after this single round-trip proves the channel and,
more importantly, lets us finally measure VAJRA's real risk-adjusted performance.

---

**Cloud-side readiness:** `scripts/governor/vajra-data-contract.mjs` (validator, self-tests
PASS). **Blocking dependency:** Windows Governor extraction (VAJ-001 → GIT-001 → SCI-001),
Founder-only. No production trading; no capital deployment.
