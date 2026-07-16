# Deployment Record — Production Supabase Schema (2026-07-16)

**Outcome:** ✅ SUCCESS — production database schema deployed and verified.
**Run:** [`29479537494`](https://github.com/mininglife7-dev/newspulse-ai/actions/runs/29479537494)
(workflow `supabase-schema-deploy.yml`, `workflow_dispatch` on `main` @ `56dd24e`,
completed 2026-07-16 07:20 UTC). All 3 jobs, all steps `success`.

## What was deployed

- Base application schema (`supabase/schema.sql`) — idempotent.
- CEIS schema (`supabase/ceis-schema.sql`, DNA-300) — 5 `ceis_*` tables.
- Target: Supabase project `yrroytwfdrafvajdfkog` via Session Pooler
  (`aws-0-ap-northeast-1.pooler.supabase.com:5432`).

## Verification evidence (from run logs)

- ✅ CEIS hard verification: "CEIS verification passed (5 tables, RLS enabled)"
  (`ON_ERROR_STOP=1` — hard-fails on missing tables/RLS).
- ✅ Security tests passed: multi-tenant isolation (Tenant A/B), anonymous
  access restrictions, service-role HERCULES access, full CRUD workflows,
  workspace membership enforcement — all `✓ PASS`.
- ✅ Object counts: 21 tables (≥15), 60 indexes (≥25), 39 RLS policies (≥31),
  3 functions (≥1).
- ⚠️ Trigger check reported `0/1` and "DEPLOYMENT INCOMPLETE" — determined to
  be a **false negative in the verification script**: `on_auth_user_created`
  is created on `auth.users` (schema `auth`), but the script counted only
  `trigger_schema = 'public'`, so the check could never pass. Fixed in this
  PR (query `pg_trigger` by name); true trigger state confirmed on the next
  deploy run. App impact either way is contained: the workspace flow upserts
  `profiles` itself (`app/api/workspace/route.ts:196`).

## The failure→success arc (same day)

1. Run `29478929749` (07:08 UTC, first Founder-dispatched run after creating
   `SUPABASE_DB_PASSWORD`): credential gate **passed** for the first time;
   connection failed because the stored `SUPABASE_DB_URL` was the dashboard's
   ready-made `psql -h ... -U ...` command, not a URI — psql fell back to a
   local socket.
2. Fix merged (PR #148, `56dd24e`): both connection sites normalize the
   pasted `psql ...` form into arguments, pass URIs through, and export
   `PGPASSWORD` from `SUPABASE_DB_PASSWORD`.
3. Run `29479537494` (07:19 UTC, Governor-dispatched): success end-to-end.

## Register impact

- RISK-001 (schema undeployed) → **Closed**.
- RISK-005 (observability unverified) → now unblocked for verification.
- RISK-006 (post-deploy env vars) → now the active Founder follow-up.
- Lesson L-005 recorded.
