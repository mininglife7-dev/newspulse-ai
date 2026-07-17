# Deployment Record — EU Production Database Migration (2026-07-17)

**Outcome:** ✅ SUCCESS — first verified EU production deployment.
**Run:** [`29586277262`](https://github.com/mininglife7-dev/newspulse-ai/actions/runs/29586277262)
(workflow `supabase-schema-deploy.yml`, dispatched 2026-07-17 ~14:01 UTC).
All 3 jobs success.

## Region certification (Law 3 — from the run's own logs)

- Target: Supabase project `cwbcvjiklrrkpmybefdp` via
  **`aws-0-eu-central-1.pooler.supabase.com`** — AWS **Frankfurt, EU**.
- Credential stored as a masked Secret (`[***]` in the env block).

## Verification evidence (log lines from the run)

| Gate                   | Result                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Connection/auth        | ✅ "Connected to Supabase"                                                                                                           |
| Base schema            | ✅ "Schema deployed successfully"                                                                                                    |
| CEIS schema (DNA-300)  | ✅ "CEIS schema deployed successfully"                                                                                               |
| Object counts          | ✅ tables 21/15, indexes 60/25, RLS policies 39/31, triggers 1/1, functions 3/1 — "✓✓✓ DEPLOYMENT SUCCESSFUL ✓✓✓"                    |
| CEIS hard verification | ✅ "CEIS verification passed (5 tables, RLS enabled)" (`ON_ERROR_STOP=1`)                                                            |
| Security tests         | ✅ Multi-tenant isolation, anonymous-access restrictions, service-role HERCULES access, full CRUD, workspace membership — all ✓ PASS |

## The migration arc

1. Founder created EU project + provided ref/keys (2026-07-16).
2. Run `29584989863`: credentials proven pointing at Frankfurt; failed —
   pasted URI kept `[…]` placeholder brackets and unencoded password
   → fixed in PR #171 (native URI parsing → libpq env vars).
3. Run `29585730440`: auth failed — password in URI was never set on the
   database. Founder reset the DB password.
4. Run `29586277262`: **success end-to-end** (this record).
   Logs of the two failed runs (which printed the then-variable value
   unmasked) were deleted; value now stored as a Secret.

## Remaining to complete RISK-008

- Founder: repoint Vercel env (`NEXT_PUBLIC_SUPABASE_URL` →
  `https://cwbcvjiklrrkpmybefdp.supabase.co`, anon key, service key) and
  redeploy — until then the app still serves against Tokyo.
- Founder decision (Law 5): decommission the Tokyo project
  `yrroytwfdrafvajdfkog` (no customer data ever landed there).
- Recommended: rotate the DB password once more at leisure — it transited
  chat during setup.

## Closure — app-side verification (16:37 UTC)

Production application verified end-to-end on the EU project:

- **True production URL:** `https://newspulse-ai-eight.vercel.app`
  (Founder-confirmed from Vercel dashboard; publicly served, no auth wall).
  Note: `newspulse-ai.vercel.app`, cited ~90× in older docs, is NOT this
  project — bare vercel.app names are global first-come.
- **Runtime evidence** (probe run
  [`29596903172`](https://github.com/mininglife7-dev/newspulse-ai/actions/runs/29596903172),
  `/api/health` verbatim): `{"ok":true,"status":"healthy","db":"ok",
"supabase_host":"cwbcvjiklrrkpmybefdp.supabase.co","uptime_s":226,
"checks":{"supabase_url":true,"supabase_anon":true,"supabase_service":true}}`
  — the live server is wired to the Frankfurt project with a working DB
  connection (`supabase_host` reporting added in #177 for exactly this).
- **RISK-008 CLOSED.** Data residency is EU end-to-end: database deployed
  and verified in Frankfurt (run `29586277262`) AND the production app
  runtime confirmed against it (run `29596903172`).

Remaining Founder-discretion items (not blockers): decommission Tokyo
project `yrroytwfdrafvajdfkog` (no customer data ever landed); rotate the
DB password at leisure (transited chat during setup).
