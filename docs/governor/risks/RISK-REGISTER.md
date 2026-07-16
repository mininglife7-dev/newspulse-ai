# Risk Register (Living)

Maintained by Governor Ω. Updated whenever a risk changes, not on a schedule.
Severity = Probability × Impact. Every entry cites evidence.
Scope: whole-organization (technical, security, business, operational,
compliance, customer). Infra-hardware risks remain in
[`docs/infra/HARDWARE_RISK_REGISTER.md`](../../infra/HARDWARE_RISK_REGISTER.md).

**Last updated:** 2026-07-16 (baseline)

| ID       | Description                                                                                                                          | Prob.                   | Impact   | Severity     | Owner    | Status                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | -------- | ------------ | -------- | ----------------------------------------------- |
| RISK-001 | Production Supabase schema not deployed — no customer can sign up; tenant-isolation (RLS) unverified in production                   | Certain (current state) | Critical | **Critical** | Founder  | Open — blocked on `SUPABASE_DB_PASSWORD` secret |
| RISK-002 | No branch protection on `main` — force-pushes accepted; one erasure incident already occurred                                        | Medium                  | Critical | **High**     | Founder  | Open — needs repo-settings action               |
| RISK-003 | PR queue drift / duplicate parallel work — stale PRs accumulate and parallel sessions rebuild existing features                      | High (recurred twice)   | Medium   | **High**     | Governor | Open — triage in progress                       |
| RISK-004 | Documentation sprawl → contradictory status claims (e.g. test counts, readiness verdicts differ across docs)                         | High                    | Medium   | **Medium**   | Governor | Open — mitigated by single-canonical-home rule  |
| RISK-005 | Production observability unverified — monitoring endpoints exist but end-to-end alert delivery to Founder never proven in production | Medium                  | High     | **Medium**   | Governor | Open — verify after schema deploy               |
| RISK-006 | Post-deploy env vars missing (`CEIS_CRON_SECRET`, optional API keys) — CEIS features degraded after schema deploy                    | High                    | Low      | **Low**      | Founder  | Open — post-deploy step                         |

## Detail

### RISK-001 — Production database schema undeployed

- **Evidence:** Deploy workflow run `29467340842` halts at `Verify database
password secret`; full trail in
  [CHECKPOINT-2026-07-16-DEPLOYMENT-UNBLOCK](../../governance/CHECKPOINT-2026-07-16-DEPLOYMENT-UNBLOCK.md).
- **Mitigation:** Pipeline is proven up to the password gate; workflow
  self-verifies schema + RLS on success. Single 5-minute Founder action
  closes this risk.

### RISK-002 — `main` unprotected

- **Evidence:** Force-push erasure incident, restored via PR #70;
  setup guide merged in PR #130.
- **Mitigation:** All Governor sessions work via PRs regardless; but only
  branch protection removes the failure mode. Requires Founder (admin).

### RISK-003 — PR queue drift / duplicate work

- **Evidence:** DR-0006 (duplicate implementations = #1 source of wasted
  work); DR-0021 reconciled queue to 2 active PRs on 2026-07-16, yet 8 are
  open at baseline — 6 stale (#48, #83, #87, #91, #92, #94, all based on
  pre-#144/#145 main).
- **Mitigation:** CLAIM-PROTOCOL.md exists; Governor triages stale PRs with
  per-PR evidence each cycle; "check before you build" rule in CLAUDE.md.

### RISK-004 — Documentation sprawl

- **Evidence:** 20+ status/checkpoint docs; FOUNDER_BRIEF says
  "1051/1051 tests" while the verified count on 2026-07-16 is 1287 passed /
  20 skipped; PR #87 audit documented self-attested metrics not wired to
  reality.
- **Mitigation:** One canonical home per fact (see
  [README](../README.md#operating-rules)); superseded docs get marked, not
  multiplied.

### RISK-005 — Observability unproven end-to-end

- **Evidence:** Monitoring/alert endpoints merged and gated (#144), but no
  production incident or synthetic test has yet proven Founder alert
  delivery in the live environment.
- **Mitigation:** After schema deploy, run a synthetic alert through the
  production path and record the result in `deployments/`.
