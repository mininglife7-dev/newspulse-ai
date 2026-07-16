# Skill: supabase-validation

**Purpose:** Deploy and/or verify the production database schema.
**Inputs:** target project (repo var `SUPABASE_PROJECT_ID` or a new ref for
migrations); credentials as repo secrets (`SUPABASE_DB_URL` — Session
Pooler URI recommended — and/or `SUPABASE_DB_PASSWORD`). **Never pass
secrets as workflow inputs.**
**Steps:**

1. Dispatch Actions → "Deploy Supabase Schema" on `main`.
2. The workflow self-verifies: base schema, CEIS tables + RLS (hard,
   `ON_ERROR_STOP=1`), object counts, trigger `on_auth_user_created`
   (query `pg_trigger` by name — it lives on `auth.users`, NOT schema
   `public`), and security tests (tenant isolation, anon restrictions,
   CRUD, membership).
3. Read the run's summary line: require `✓✓✓ DEPLOYMENT SUCCESSFUL ✓✓✓`
   and security tests all `✓ PASS`.
4. Record the run ID in `docs/governor/deployments/` and PROJECT_STATE.md.
   **Known facts:** direct `db.{ref}.supabase.co:5432` is IPv6-only for
   current projects → use the Session Pooler
   (`aws-0-{region}.pooler.supabase.com:5432`, user `postgres.{ref}`). The
   stored `SUPABASE_DB_URL` may be the dashboard's pasted `psql ...` command —
   the workflow must parse that form (see PR #148). Schema is idempotent;
   re-runs are safe.
   **Verification:** run ID with all steps `success`; no `✗ FAIL` lines.
   **Failure handling:** connection errors → check URL form + pooler host;
   verification FAIL → determine if reality or the check is wrong before
   touching either (L-005).
