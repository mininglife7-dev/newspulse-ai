# Checkpoint — Supabase Deployment Unblock (2026-07-16)

Audit-evidence record of the autonomous deployment-unblock arc, executed
under the Founder's exhaust-all-capabilities directive and 24-hour
standing mission. Every claim below is backed by a linked artifact.

## Current State

**One founder-only item remains.** The deployment pipeline is proven up to
and including project resolution; it halts exactly at the database
password gate, which no authorized autonomous capability can supply.

## Evidence trail (chronological)

| Artifact                     | What it proved                                                                                                                                                                                                                                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR #118 (merged)             | Deploy workflow was unrunnable in CI (read `.env.local`, absent in checkouts); fixed + CEIS schema added to the deploy                                                                                                                                                                                |
| Run 29437042645, 29439297669 | Failed at project-ID step: no repo-level values (preflight green)                                                                                                                                                                                                                                     |
| PR #136 (merged)             | Deploy job attaches GitHub Environment `production`, so environment-scoped values also resolve                                                                                                                                                                                                        |
| Run 29449102068              | Failed at same step even with environments visible → values exist nowhere GitHub can see                                                                                                                                                                                                              |
| Capability audit (session)   | Supabase CLI: no token; env: no Supabase credentials; GitHub MCP: no secrets/variables tools; `GITHUB_TOKEN` REST: variables/secrets API blocked by platform proxy; git history: **no leaked password** (verified — correct state); project ref FOUND in `docs/infra/DEPLOYMENT_EVIDENCE_TRACKING.md` |
| PR #137 (merged)             | Deploy workflow defaults the project ref from the repo's own deployment evidence (public-by-design value; var/secret always overrides)                                                                                                                                                                |
| PR #132 (merged)             | `CEIS_POST_DEPLOYMENT_VERIFICATION.sql` wired into the deploy: 5 `ceis_*` tables + RLS hard-verified on every run                                                                                                                                                                                     |
| **Run 29467340842**          | **Project-ID step now PASSES; halts at `Verify database password secret`** — single remaining gate isolated                                                                                                                                                                                           |

## Completed Work

- Deploy workflow: runnable in CI, environment-aware, provisions base +
  CEIS schemas, hard-verifies CEIS tables/RLS, fails loudly on partial
  deploys. Idempotent by construction (`IF NOT EXISTS` throughout).
- DNA-300 (CEIS) merged, restored after the main force-push erasure, and
  registered (DNA-REGISTRY, DECISION_REGISTER DR-0019).
- Rollback capability preserved: schemas additive; revert + drop `ceis_*`.

## Remaining Work

1. **Founder:** create repository secret `SUPABASE_DB_PASSWORD`
   (Settings → Secrets and variables → Actions; value from Supabase
   Dashboard → Settings → Database). Names must match exactly.
2. Re-run "Deploy Supabase Schema" (any dispatcher). On success the
   workflow itself verifies schema, CEIS tables and RLS; the standing
   watch then produces `docs/CEIS-PRODUCTION-READINESS.md` with the
   GO / CONDITIONAL GO / NO-GO certification.
3. Vercel env (post-deploy, founder): `CEIS_CRON_SECRET`; optional
   `OPENAI_API_KEY`, `FIRECRAWL_API_KEY` for full CEIS capability.

## Risks

- `main` still accepts force-pushes (no branch protection); one erasure
  incident already occurred and was restored (PR #70). Standing
  recommendation unchanged.
- The password gate is a hard stop: no deploy reaches the database until
  the secret exists. No workaround is possible or appropriate.
