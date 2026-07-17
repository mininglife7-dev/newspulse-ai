# NEXT_ACTION — The One Active Mission

> Exactly one mission lives here. Finish it, verify it, replace it.

## Current Mission

**EU migration execution (RISK-008, Founder-activated 2026-07-16):**
deploy and verify the schema against the new EU-intended Supabase project
`cwbcvjiklrrkpmybefdp`, prove its region from run logs, and repoint the
platform. Founder provided project ref + Data-API keys in session (keys
held out-of-repo — Law 4). **Blocked on one Founder step:** repo secret
`SUPABASE_DB_URL` must be set to the NEW project's Session Pooler
connection string (this environment cannot write GitHub secrets — API
proxy-blocked, Verified).

## Why this mission is first

Founder explicit instruction (precedence level 1) delivered the EU project
credentials — this activates queued mission 1. Data residency must be EU
before any customer data lands; migration cost is near zero while the
platform has no customers.

## Success criteria

1. Founder sets repo secret `SUPABASE_DB_URL` = the NEW project's Session
   Pooler connection string (Dashboard → Settings → Database → Connection
   string → Session pooler; the pasted `psql ...` command form also works),
   and updates `SUPABASE_PROJECT_ID` (variable or secret) to
   `cwbcvjiklrrkpmybefdp`.
2. Governor dispatches "Deploy Supabase Schema"; run completes green
   (schema, CEIS hard-verify, security tests) — run ID recorded.
3. **Region proven from the run's own env log:** pooler host must be
   `aws-0-eu-*.pooler.supabase.com`. If it is not an EU region, STOP and
   report — do not certify (Law 3).
4. Founder repoints Vercel env (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, service key) to the new project and
   redeploys; Governor verifies afterward.
5. PROJECT_STATE.md, RISK-008, deployment record, and decision log updated
   with evidence. Old Tokyo project decommission decision goes to the
   Founder (data deletion = irreversible, Law 5).

## Files expected

`PROJECT_STATE.md`, `docs/governor/risks/RISK-REGISTER.md`,
`docs/governor/deployments/`, decision-log entry. NO credentials in any
file.

## Verification required

Deploy run ID with all steps success AND an `aws-0-eu-*` pooler host in
its logs. Vercel repoint verified by the app serving against the new URL.

## Completion conditions

Success criteria 1–5 met with evidence. Then replace this file with the
customer-journey verification mission (it moves back to the queue top).

## Next owner

Any Governor Ω session (start with the execution loop in AGENTS.md).

## Queued missions (not active — do not start)

1. Customer-journey verification against the live environment →
   DEMO_READINESS.md rows out of UNKNOWN (was active; superseded by
   Founder instruction — resume after migration).
2. Adopt or close PR #124 (billing/obligations tests) and PR #149
   (test lab) with evidence.
