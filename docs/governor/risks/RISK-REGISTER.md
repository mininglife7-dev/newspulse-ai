# Risk Register (Living)

Maintained by Governor Ω. Updated whenever a risk changes, not on a schedule.
Severity = Probability × Impact. Every entry cites evidence.
Scope: whole-organization (technical, security, business, operational,
compliance, customer). Infra-hardware risks remain in
[`docs/infra/HARDWARE_RISK_REGISTER.md`](../../infra/HARDWARE_RISK_REGISTER.md).

**Last updated:** 2026-07-16 07:35 UTC (RISK-007 closed — trigger confirmed present by run `29479962355`)

| ID       | Description                                                                                                                          | Prob.                 | Impact   | Severity   | Owner    | Status                                                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------- | -------- | ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| RISK-001 | Production Supabase schema not deployed — no customer can sign up; tenant-isolation (RLS) unverified in production                   | —                     | —        | **Closed** | Founder  | ✅ Closed 2026-07-16 — deployed + verified (run `29479537494`; see [deployment record](../deployments/2026-07-16-SUPABASE-SCHEMA-DEPLOY.md)) |
| RISK-007 | `on_auth_user_created` trigger existence in production Unknown — verification script false-negative masked its true state            | —                     | —        | **Closed** | Governor | ✅ Closed 2026-07-16 — run `29479962355` (fixed check): triggers 1/1 ✓ PASS; trigger existed all along                                       |
| RISK-002 | No branch protection on `main` — force-pushes accepted; one erasure incident already occurred                                        | Medium                | Critical | **High**   | Founder  | Open — needs repo-settings action                                                                                                            |
| RISK-003 | PR queue drift / duplicate parallel work — stale PRs accumulate and parallel sessions rebuild existing features                      | High (recurred twice) | Medium   | **High**   | Governor | Open — triage in progress                                                                                                                    |
| RISK-004 | Documentation sprawl → contradictory status claims (e.g. test counts, readiness verdicts differ across docs)                         | High                  | Medium   | **Medium** | Governor | Open — mitigated by single-canonical-home rule                                                                                               |
| RISK-005 | Production observability unverified — monitoring endpoints exist but end-to-end alert delivery to Founder never proven in production | Medium                | High     | **Medium** | Governor | Open — verify after schema deploy                                                                                                            |
| RISK-006 | Post-deploy env vars missing (`CEIS_CRON_SECRET`, optional API keys) — CEIS features degraded after schema deploy                    | High                  | Low      | **Low**    | Founder  | Open — post-deploy step                                                                                                                      |

## Detail

### RISK-001 — Production database schema undeployed — ✅ CLOSED 2026-07-16

- **Closure evidence:** Run `29479537494` (2026-07-16 07:20 UTC) deployed
  base + CEIS schemas and passed all verifications: CEIS hard-verify
  (5 tables, RLS enabled), security tests (tenant isolation, anon
  restrictions, CRUD, membership), 21 tables / 60 indexes / 39 policies.
  Full record: [deployment record](../deployments/2026-07-16-SUPABASE-SCHEMA-DEPLOY.md).
- **History:** blocked for days on the `SUPABASE_DB_PASSWORD` secret
  (run `29467340842`); Founder created credentials 2026-07-16; connection
  format defect fixed in PR #148 (`56dd24e`).

### RISK-007 — Production `on_auth_user_created` trigger state Unknown — ✅ CLOSED 2026-07-16

- **Evidence:** Run `29479537494` verification printed triggers `0/1 ✗ FAIL`;
  root cause is the script counting `trigger_schema = 'public'` while the
  trigger lives on `auth.users` (schema `auth`) — a check that can never
  pass. Fixed to query `pg_trigger` by name.
- **Impact if truly missing:** signup does not auto-create a `profiles` row;
  contained because the workspace flow upserts `profiles` itself
  (`app/api/workspace/route.ts:196`).
- **Closure evidence:** Confirmation run `29479962355` (07:28 UTC) with the
  fixed check reported triggers **1/1 ✓ PASS** and
  "✓✓✓ DEPLOYMENT SUCCESSFUL ✓✓✓" across all categories (22 tables,
  62 indexes, 43 policies, 3 functions). The trigger existed all along —
  the old check was a false negative. Security tests additionally passed
  "Anonymous cannot read profiles".

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
