# PROJECT_STATE — Verified Facts Only

**Last verified:** 2026-07-16 ~13:15 UTC (truth-reconciliation mission COMPLETE — proving run `29499904621` green)
Rules: facts only, each labelled and evidence-cited. Unknown stays UNKNOWN
until verified. Update whenever verified reality changes.

## Current product status

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
- **EU migration (RISK-008): NOT COMPLETE.** All successful deploy runs
  target the Tokyo project — verified from run `29490828367` job logs
  (`SUPABASE_PROJECT_ID: yrroytwfdrafvajdfkog`, pooler
  `aws-0-ap-northeast-1`). The former "EU deployment verified / GO
  certification" documents are **bannered as unsupported and void**
  (Law 3 correction, DR-0024). — Verified
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

1. **RISK-008 decision:** EU-region Supabase project (Frankfurt
   `eu-central-1`) — create + provide project ref & credentials; Governor
   executes and verifies the migration. Decide before first customer data.
2. `CEIS_CRON_SECRET` in Vercel env (RISK-006, degraded CEIS until set).
3. Branch protection on `main` (RISK-002; one force-push erasure already
   occurred).

## Customer readiness

See [`DEMO_READINESS.md`](DEMO_READINESS.md). Summary: infrastructure
VERIFIED; every customer-journey step UNKNOWN until exercised against the
live environment.

## Reference registers

Risks: `docs/governor/risks/RISK-REGISTER.md` · Decisions:
`docs/governance/DECISION_REGISTER.md` (via `DECISION_LOG.md`) · Lessons:
`docs/governor/lessons/LESSONS.md` · Deployments:
`docs/governor/deployments/`.
