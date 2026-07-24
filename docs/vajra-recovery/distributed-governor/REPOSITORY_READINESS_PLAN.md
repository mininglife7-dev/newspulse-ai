# Repository Readiness Plan — VAJRA Onboarding (deterministic, no execution)

**Status:** planning only. **No repository analysis is attempted** — this
executes the moment `vajra_repository` transitions to AVAILABLE (Capability
Register). Each step is deterministic, read-only until Phase E, and writes to
the append-only ledgers. If any step's evidence is insufficient → STOP, record,
escalate.

## Gate (must pass before Phase A)

`discover_runtime.py` shows `vajra_repository: READ_WRITE` or `READ_ONLY` with
verified paths `C:\VAJRA` and `C:\vajra_gold_20260503`. Otherwise: do not start.

## Phase A — Repository scan sequence (read-only)
1. Record git identity of both dirs: remote(s), branch, HEAD, dirty state.
2. Enumerate tracked vs untracked files; flag runtime artifacts & logs in Git.
3. Secret scan (report by **type/count only**, never values).
4. Reconcile `C:\VAJRA` vs `C:\vajra_gold_20260503` — determine each dir's role
   from evidence (active / archive / variant), never assume.
5. Output: a Repository Health Audit record → Evidence Ledger.

## Phase B — Module classification sequence (review only, no rewrite)
For each module, classify **with evidence**: Healthy / Needs Verification /
Needs Refactoring / Deprecated / Unknown. Default is **Unknown** until evidence
justifies otherwise. No file is modified.

## Phase C — Metric verification sequence
1. Locate VAJRA's metric computations and its reported numbers.
2. For each of Sharpe/Sortino/Profit Factor/Drawdown/Expectancy/Kelly/Win
   Rate/CAGR: recompute with the **oracle** (`learning/metrics.py`) on the same
   inputs; run `verify_metric(reported, recomputed)`.
3. **Reconcile conventions first** (SD-01 Kelly binary; SD-02 Sortino
   denominator) — a mismatch is a convention difference, not necessarily a bug.
4. Output: per-metric verdict → Evidence Ledger.

## Phase D — WFO audit sequence
1. Extract VAJRA's walk-forward window generation.
2. Check against the reference (`learning/walkforward.py`): no look-ahead, no
   train/test overlap, in-bounds, correct stepping, edge cases.
3. Explicitly test for **data leakage** and **overlapping test sets** (SD-05).
4. Output: WFO audit record → Evidence Ledger.

## Phase E — Evidence collection sequence
1. Register findings as pre-registered Experiments (Experiment Ledger).
2. Every conclusion → Decision Ledger with cited evidence.
3. Every reusable finding → Learning Ledger (append-only; supersede, never
   overwrite).
4. Any code change (only if evidence-justified + Founder-approved for protected
   zones): minimal, tested, reversible, committed separately.

## Invariants across all phases
- Never fabricate; Unknown stays Unknown.
- Never modify VAJRA during discovery (Phases A–D are read-only).
- Never touch the Founder Protected Zone without an approval token.
- Every step cites evidence; insufficient evidence → STOP + escalate.
