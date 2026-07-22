# PROJECT_STATE — Verified Facts Only

**Last verified:** 2026-07-22 (Governor OS Phase 1 COMPLETE — acceptance gate 4/4 passing, build verified)
Rules: facts only, each labelled and evidence-cited. Unknown stays UNKNOWN
until verified. Update whenever verified reality changes.

## Governor OS Foundation Status

- **Phase 1 (Reference Implementation):** ✅ **COMPLETE** — All 13 Governor OS modules implemented with TypeScript strict mode. Reference mission (health-check) executes end-to-end with proper state machines, policy enforcement, and evidence collection. Acceptance gate test 4/4 passing (test file: `tests/governor-acceptance-gate.test.ts`). Evidence: commit `bda1319`, branch `claude/governor-os-foundation-89zihp`. Build verified (`npm run build` passes). — Verified (tests + build + commit)
- **Phase 2 (Customer-Journey Shadow Execution):** 🔄 IN PROGRESS — Step 1 complete (registration succeeded, email delivered 1 min, confirmation link error UX detected). Step 2+ BLOCKED on RISK-009 (Supabase "Confirm email" ON, built-in SMTP restricts to project-team only; real customers cannot receive verification emails). Evidence infrastructure prepared: `docs/governor/missions/PHASE-2-SHADOW-EXECUTION.md`, defect register at `PHASE-2-DEFECT-REGISTER.md`. Awaiting Founder decision: disable "Confirm email" or configure custom SMTP. — Verified (blocker RISK-009)
- **VAJRA Phase 0 (Environment Discovery):** ⏸️ BLOCKED — Awaiting Founder to execute Windows discovery script (`tools/windows/START_VAJRA_RECOVERY.cmd` on Windows laptop running Claude Code Mobile bridge). Script will generate repository discovery report. — Blocked (awaiting Founder action)

## Current product status (EURO AI)

- **Product:** EURO AI — multi-tenant EU AI Act compliance platform
  (Next.js 16, React 19, TS strict, Supabase + RLS, Vercel). — Verified (codebase)
- **Test suite:** 1287 passed / 20 skipped (67 files) — Verified (local
  `npm test`, 2026-07-16 03:39 UTC; integration tests since split from the
  standard run in `214a382`, so current counts may differ — re-verify on next run).
- **CI:** green on main through `509bb41`; later commits assumed green but
  not individually checked — Estimated.

## Current deployment status

- **Application code:** deployed to Vercel (pushes to main auto-deploy);
  production URL (`https://newspulse-ai.vercel.app`) **UNREACHABLE** from this
  cloud environment — blocked by organization egress policy (proxy status:
  "gateway answered 403 to CONNECT (policy denial or upstream failure)" for
  host `newspulse-ai.vercel.app:443`, timestamp 2026-07-17T03:31:12Z). Code
  deploy Verified via Vercel bot; live-URL behavior cannot be verified from
  cloud. — Verified (blocker)
- **Production database:** Supabase project `yrroytwfdrafvajdfkog`,
  **AWS Tokyo (`ap-northeast-1`)** — schema + CEIS deployed and verified.
  Evidence: runs `29479537494`, `29479962355`, `29490828367` (all success;
  last at 10:26 UTC — 22 tables, 62 indexes, 43 RLS policies, trigger 1/1,
  CEIS hard-verify, security tests all PASS). — Verified
- **EU migration (RISK-008): IN PROGRESS, one gate left.** Founder created
  EU project `cwbcvjiklrrkpmybefdp` and updated repo credentials; runs
  `29584989863`/`29585382999` (2026-07-17) prove the pipeline reaches
  **Frankfurt** (`aws-0-eu-central-1.pooler.supabase.com`) but fail with
  `password authentication failed` — stored DB password not accepted.
  Founder must verify/reset the password and store the pooler URI as a
  **Secret** (current variable prints unmasked; leaked run logs deleted).
  All _successful_ deploys to date still target Tokyo; the void
  EU-GO-certification banners (DR-0024) remain accurate. — Verified
- **Deploy workflow:** restored to the proven `56dd24e` version
  (`SUPABASE_DB_URL` pooler/psql-paste handling, `PGPASSWORD` export, CEIS
  deploy + hard verification; `db_password` workflow input removed — Law 4).
  The `e09353f` regression that dropped this logic is corrected (DR-0024).
  Post-restore proving dispatch: run `29499904621` completed **success**. —
  Verified

## Verified features (platform level)

- Multi-tenant RLS isolation, anonymous-access restrictions, CRUD,
  workspace membership — Verified against the live Tokyo DB (security
  tests in runs above).
- Customer-facing surfaces exist on main: auth, workspace, inventory,
  assessment, obligations, evidence, compliance, governance ops. —
  Verified (code present); **end-to-end behavior against production is
  UNKNOWN** (see DEMO_READINESS.md).

## Known blockers

- None engineering-internal. Founder-gated items below.

## Founder-pending items

1. **RISK-009 (CRITICAL for Phase 2):** Email verification undeliverable — Supabase "Confirm email" ON, built-in SMTP blocks all non-team emails. **Action:** Disable "Confirm email" in Supabase project settings (`cwbcvjiklrrkpmybefdp`) OR configure custom SMTP (Resend, SendGrid, etc.). Unblocks Phase 2 Steps 2–14.
2. **VAJRA Phase 0 discovery:** Execute `tools/windows/START_VAJRA_RECOVERY.cmd` on Windows laptop (where Claude Code Mobile runs). Script generates repository discovery report with VAJRA location, Git status, branches, health. Results required to begin Phase 0 adapter integration.
3. **RISK-008 decision:** EU-region Supabase project (Frankfurt `eu-central-1`) — create + provide project ref & credentials; Governor executes and verifies the migration. Decide before first customer data.
4. `CEIS_CRON_SECRET` in Vercel env (RISK-006, degraded CEIS until set).
5. Branch protection on `main` (RISK-002; one force-push erasure already occurred).

## Customer readiness

See [`DEMO_READINESS.md`](DEMO_READINESS.md). Summary: infrastructure
VERIFIED; every customer-journey step UNKNOWN until exercised against the
live environment.

## Reference registers

Risks: `docs/governor/risks/RISK-REGISTER.md` · Decisions:
`docs/governance/DECISION_REGISTER.md` (via `DECISION_LOG.md`) · Lessons:
`docs/governor/lessons/LESSONS.md` · Deployments:
`docs/governor/deployments/`.
