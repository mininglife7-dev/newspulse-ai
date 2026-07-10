# 📋 Founder Brief

Rolling status summary maintained under the
[Governor Autonomous Decision Constitution](./GOVERNOR_CONSTITUTION.md) and the
[Founder Autonomous Execution Constitution](./FOUNDER_AUTONOMOUS_EXECUTION_CONSTITUTION.md).
Updated continuously; read this instead of being interrupted.

**Last updated:** 2026-07-10 (9-hour autonomous mission, in progress)
**State:** Executing

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

## Next planned work (this mission, in order)

1. Merge the integration branch to main after CI is green; close superseded #22;
   re-triage #18/#17/#15/#5 against the new base.
2. Handover report.

## Founder attention (when you return)

- **Run `supabase/schema.sql` in the Supabase SQL editor** (idempotent) and confirm
  the project region + auth email settings. This is the one step code cannot do.
- Decide fate of stale PRs #18 (GLO), #17 (founder dashboard), #15 (deploy audit),
  #5 (CEIS) — all pre-pivot; recommendations in the mission handover.
