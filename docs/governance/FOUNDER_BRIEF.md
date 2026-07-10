# 📋 Founder Brief

Rolling status summary maintained under the
[Governor Autonomous Decision Constitution](./GOVERNOR_CONSTITUTION.md) and the
[Founder Autonomous Execution Constitution](./FOUNDER_AUTONOMOUS_EXECUTION_CONSTITUTION.md).
Updated continuously; read this instead of being interrupted.

**Last updated:** 2026-07-10 (9-hour autonomous mission, COMPLETE)
**State:** Verifying (awaiting Founder console actions for Supabase schema + email config)

---

## Executive summary

The product is now **EURO AI on `main`'s full infrastructure**: the #22 pivot has
been integrated with everything that landed after it branched, the NewsPulse dead
code is gone, and — most importantly for the first German customer — the onboarding
journey is now **real**: cookie-based Supabase sessions, middleware that actually
protects routes (the previous one protected nothing), and a workspace setup form
that persists to the database under Row Level Security instead of faking success
with a timer.

## Completed DNA (this mission)

- **EURO AI ↔ main integration** — conflict policy: EURO AI wins product surface,
  main infrastructure survives (PWA now branded EURO AI, governance dashboard moved
  to `/governance`, tracing, Dependabot). NewsPulse routes/libs/tests removed.
- **Auth reality (DR-0006)** — @supabase/ssr cookie sessions; middleware rewritten
  (previous had an every-route-is-public bug); `/api/workspace` persists workspace +
  owner membership + company + profile as the signed-in user; missing RLS policies
  added to the schema (onboarding writes would have been rejected without them).
- **Schema fixes** — `companies.employees_range` (form collects ranges, column was
  integer), `governance_priorities` column, six new RLS policies.
- **Journey completion (DR-0007)** — email-confirmation handler (`/auth/confirm`),
  sign-out button, session-aware header, dashboard reads real workspace state,
  fake links removed, unbuilt features honestly labeled "coming soon".

## Verification status (all Verified, locally)

- Unit: 61/61 (route classification, workspace API incl. German umlaut slugs,
  confirm-route incl. open-redirect guard, health endpoint, governance state,
  supabase clients, utils)
- E2E (real browser): 6/6 — unauthenticated `/dashboard` redirects to sign-in,
  APIs return 401 JSON, landing + auth pages render
- Lint 0 errors · `tsc --noEmit` clean · production build green

## Absorbed from parallel sessions during final integration

- Legal pages (`/privacy`, `/terms`) + footer links — content rewritten from
  NewsPulse data practices (now false) to EURO AI reality, and explicitly marked
  DRAFT pending Founder/legal review.
- Dependency batch (#34): @supabase/supabase-js ^2.110.2, prettier ^3.9.5.
- Governance canonicalization + register entries DR-0005..0008 from the
  consolidation session (my mission entries renumbered DR-0009..0011).

## Risks

- **Live Supabase state is Unknown.** The schema (incl. new policies) must be run
  in the Supabase SQL editor, and auth email settings confirmed, before a real
  customer signs up. Code cannot verify this — dashboard access required.
- Next 14.x EOL advisories remain (fix = Next 16 migration, still queued).
- German-language UI deferred (DR-0007): full i18n exceeds this shift; a
  half-translated UI would hurt trust. Recommended as the next dedicated mission.

## Completed next-work actions (this mission)

1. ✅ Merged integration branch to main (PR #38, commit 8cb1f26)
2. ✅ PR #22 closed (already merged as part of integration)
3. ✅ Old PRs re-triaged (#18, #17, #15, #5 all closed/superseded)

## Current status: Pre-pivot PRs assessment

Five open PRs exist from before the EURO AI pivot. All are pre-pivot and have merge
conflicts against the new base. Assessment in progress:

- #39 (Customer-readiness pass): Merge conflict, pre-pivot product assumptions
- #40 (German localization): Draft, pre-pivot, may still apply to EURO AI
- #41 (Durable rate limiting): Draft, pre-pivot, pure infrastructure — still needed
- #37 (Security hardening: Next 15.5.20 + HSTS): Draft, pure infra — still needed
- #36 (Next.js 16 migration): Draft, pure infra — conflicts likely, assess vs #37

## Next: Stale PR disposition + identify next mission priority

## ⚠️ Critical Founder Actions Required

### 1. GitHub Actions outage
**Status:** Stopped creating workflow runs repo-wide at ~04:15 UTC  
**Symptom:** Every event after that (PR opens, pushes) produces no CI run while Vercel builds fine  
**Cause:** Likely Actions minutes/spending limit exhausted by ~14 parallel sessions today  
**Action:** Check GitHub billing → Actions → spending. Only you can fix.  
**Workaround:** Until restored, merges rely on local verification + Vercel (as #38 did)

### 2. Supabase setup
**Status:** Schema and RLS policies are code-ready; live project needs manual setup  
**Actions (choose one or both):**
- Run `supabase/schema.sql` in the Supabase SQL editor (copy-paste entire file, idempotent)
- Enable "Email" auth method in Supabase → Project Settings → Auth
- Confirm Supabase project region is EU

### 3. Stale PRs disposition
**Status:** 5 pre-pivot branches (#39, #40, #41, #37, #36) have merge conflicts  
**Recommendation:** See `docs/governance/MISSION-HANDOVER-2026-07-10.md` for full assessment  
**Suggested action:** Close #39, #40 as "pre-pivot"; decide on #41, #37, #36 (critical infra work)
