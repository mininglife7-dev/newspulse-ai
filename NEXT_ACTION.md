# NEXT_ACTION — The One Active Mission

> Exactly one mission lives here. Finish it, verify it, replace it.

## Current Mission

**Truth reconciliation of the deployment pipeline:** restore the proven
deploy-workflow connection logic lost in merge `e09353f`, and correct the
unsupported "EU deployment verified / GO" claims on main so that every
readiness statement matches run evidence.

## Why this mission is first

Law 3 (No Unsupported Production Readiness) is currently violated on main:
GO-certification documents exist with zero EU deploy-run evidence (all
successful runs target Tokyo — see PROJECT_STATE.md). Simultaneously the
deploy workflow regressed to a connection method that has never succeeded
for this project, so the next deploy — including the real EU migration —
would fail. Nothing customer-facing can be trusted until the pipeline and
its claims are truthful.

## Success criteria

1. `supabase-schema-deploy.yml` again supports `SUPABASE_DB_URL`
   (postgresql:// URI **and** pasted `psql ...` form, with `PGPASSWORD`
   export) at every psql call site, merged to main with green CI.
2. `db_password` workflow input removed or justified in the PR (secrets do
   not travel as inputs — Law 4).
3. Every "EU deployment verified / GO" document on main is marked
   **UNSUPPORTED — superseded by PROJECT_STATE.md** (banner, not deletion)
   or corrected with real evidence if any exists.
4. A deploy dispatch after the fix completes green (proves no regression).
5. PROJECT_STATE.md and the risk register updated to match.

## Files expected

`.github/workflows/supabase-schema-deploy.yml`, banner edits to the
EU-claim docs (locate via `git log 985af49..e46309c`), `PROJECT_STATE.md`,
`docs/governor/risks/RISK-REGISTER.md`, decision-log entry.

## Verification required

Green CI on the PR; a successful "Deploy Supabase Schema" run from post-fix
main citing its run ID; grep shows no unbannered GO claims.

## Completion conditions

All five success criteria met with evidence cited in the PR and
PROJECT_STATE.md updated. Then replace this file with the next mission.

## Next owner

Any Governor Ω session (start with the execution loop in AGENTS.md).

## Queued missions (not active — do not start)

1. Customer-journey verification against the live environment → populate
   DEMO_READINESS.md (registration → workspace → inventory → assessment →
   obligations → evidence → report).
2. EU migration execution once the Founder provides the EU project
   ref + credentials (RISK-008).
3. Adopt or close PR #124 (billing/obligations tests) and PR #149
   (test lab) with evidence.
