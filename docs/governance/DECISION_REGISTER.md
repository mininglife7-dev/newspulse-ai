# 📒 Decision Register

Autonomous engineering decisions made under the
[Governor Autonomous Decision Constitution](./GOVERNOR_CONSTITUTION.md).
Newest entries first. Every non-trivial decision gets an entry — routine approvals
are never requested from the Founder.

---

## DR-0007 — Complete the customer journey loop; truthful UI over cosmetic completion

- **Decision:** Add the missing journey pieces (email-confirmation handler at
  /auth/confirm, sign-out, session-aware header) and make the dashboard render the
  user's real workspace state; label unbuilt features "coming soon" and remove
  fake href="#" documentation/support links.
- **Reason:** Mission quality bar: no fake buttons, no misleading indicators.
  A verifying customer previously had no working email-confirmation landing, no
  way to sign out, a header that showed "Sign In" while signed in, and a dashboard
  implying features exist that don't.
- **Alternatives considered:** German-language i18n was evaluated as the next
  increment and deliberately deferred — doing it properly (full locale
  infrastructure + reviewed translations) exceeds what remains of the shift, and a
  half-translated UI reduces customer trust rather than increasing it.
- **Evidence:** 61/61 unit tests (6 new confirm-route tests incl. open-redirect
  guard), 6/6 e2e, lint/tsc/build clean.
- **Confidence:** High
- **Expected impact:** The first customer can complete sign-up → email verify →
  sign-in → workspace setup → dashboard and always sees truthful state.
- **Risk assessment:** Low — additive routes/components; dashboard falls back to
  the fresh-account view on any data error.
- **Timestamp:** 2026-07-10

## DR-0006 — Replace simulated auth with real cookie-based Supabase auth

- **Decision:** Adopt @supabase/ssr cookie sessions end-to-end: browser client,
  middleware session validation/refresh, and a real `/api/workspace` route executing
  onboarding writes under RLS. Add the RLS policies the schema was missing.
- **Reason:** Three pieces of the customer journey were fake or broken: sessions
  didn't persist (`persistSession: false`), the middleware protected nothing (a
  `startsWith('/')` public-route bug plus a cookie name supabase-js never sets),
  and the workspace form "saved" via `setTimeout`. A first customer would hit all
  three in their first ten minutes. Mission quality bar: no fake buttons.
- **Alternatives considered:**
  1. Cookie-presence check in middleware without @supabase/ssr — no token refresh,
     treats stale cookies as sessions.
  2. Admin-client writes in /api/workspace — bypasses RLS; user-scoped client keeps
     tenant isolation enforced by the database, and the missing policies were the
     actual defect to fix.
- **Evidence:** 54/54 unit tests (route classification, workspace API incl. German
  umlaut slugs, health endpoint), 6/6 e2e (unauthenticated /dashboard →
  /auth/signin redirect verified in a real browser; /api/workspace returns 401
  JSON), lint/tsc/build clean.
- **Confidence:** High for code paths verified by tests; **Unknown** for the live
  Supabase project (deployment state of schema + policies can only be confirmed in
  the Supabase dashboard — flagged in Founder Brief).
- **Expected impact:** Sign-up → sign-in → workspace setup → dashboard is a real,
  protected journey instead of a demo façade.
- **Risk assessment:** Low-medium — auth flows are the most sensitive UX; mitigated
  by e2e coverage and by RLS as the actual security boundary. Reversible per commit.
- **Timestamp:** 2026-07-10

## DR-0005 — Execute the EURO AI pivot; integration policy for conflicting work

- **Decision:** Treat the Founder's 9-hour mission brief ("first German customer",
  "EU AI workflow", "tenant isolation", "governance engine") as the product decision
  on PR #22: EURO AI is the product. Integrate #22 with current main using the
  policy: EURO AI wins the product surface; main-side infrastructure survives (PWA
  layer, canonical governance state at /governance, tracing, Dependabot); the
  NewsPulse-only surface is removed (recoverable from git history).
- **Reason:** #22 was mergeable_state=dirty against a main that had absorbed #21,
  #23, #2 and demo-mode work. Every queued task sequenced behind this integration.
- **Alternatives considered:**
  1. Merge #22 as-is via API — impossible (conflicts) and would silently drop the
     PWA and governance-state work.
  2. Wait for the Founder — contradicts the mission's explicit delegation.
- **Evidence:** Local verification after integration + cleanup: lint clean, tsc
  clean, 31/31 unit tests at the time, production build green, 2/2 e2e.
- **Confidence:** High
- **Expected impact:** One coherent codebase implementing the Founder vision;
  six stale PRs become re-triageable against a settled base.
- **Risk assessment:** Product-surface removal is the biggest step; mitigated by
  the Founder's explicit direction and full git recoverability.
- **Timestamp:** 2026-07-10

## DR-0004 — Patch `next` 14.2.15 → 14.2.35; defer major upgrade to a dedicated PR

- **Decision:** Bump `next` and `eslint-config-next` to 14.2.35 (latest 14.x, pinned
  exact) now, and queue a dedicated Next 16 migration for the remaining advisories.
- **Reason:** 14.2.35 carries all security fixes ever backported to the 14.x line
  (including the 2025-12-11 update flagged on install of 14.2.15) at near-zero risk —
  lint, type-check, and production build all verified green. `npm audit` shows the
  remaining high-severity advisories are fixed only in Next 16 (14.x is EOL, no
  backports), which is a breaking major-version migration — too large and risky to
  ride along in a governance PR.
- **Alternatives considered:**
  1. Jump straight to `next@16` here — full remediation, but a breaking migration
     (React 19, async request APIs) buried in an unrelated PR; poor reviewability.
  2. Do nothing until the major migration — leaves backported fixes unapplied for
     no benefit.
  3. Ship this bump as a separate PR — preferred in principle, but this session is
     restricted to the current branch; adjusted to a distinct, clearly-scoped commit.
- **Evidence:** `npm view next dist-tags` (`next-14: 14.2.35`); `npm audit --omit=dev`
  on 14.2.35 lists remaining advisories with "fix available: next@16.2.10 (breaking)";
  local verification: lint 0 errors, `tsc --noEmit` clean, `next build` succeeds.
- **Confidence:** High
- **Expected impact:** All backportable CVE fixes applied; install-time security
  deprecation warning resolved; clear, documented path to full remediation.
- **Risk assessment:** Low — patch-level bump within the same minor line, exact-pinned,
  fully verified; reversible by reverting the commit. Residual risk (EOL advisories)
  is documented in the Founder Brief until the Next 16 migration lands.
- **Timestamp:** 2026-07-09

## DR-0003 — Fix broken CI by committing `package-lock.json`

- **Decision:** Generate and commit `package-lock.json` to repair the "Lint & Build"
  CI job, which has been failing since the initial scaffold.
- **Reason:** `ci.yml` uses both `actions/setup-node` with `cache: npm` and `npm ci` —
  each hard-requires a lockfile that was never committed. A lockfile also gives
  reproducible installs and enables dependency caching.
- **Alternatives considered:**
  1. Remove `cache: npm` and switch `npm ci` → `npm install` — hides the problem,
     loses reproducibility and caching.
  2. Vendor a lockfile only in CI — non-standard, drifts from local installs.
- **Evidence:** CI run 28998170205 failed with "Dependencies lock file is not found";
  after generating the lockfile, all four CI steps (`npm ci`, lint, `tsc --noEmit`,
  `next build`) passed locally.
- **Confidence:** High
- **Expected impact:** CI goes green for this and all future PRs; installs become
  reproducible.
- **Risk assessment:** Low — lockfile pins the exact versions already resolved from
  `package.json`; reversible by deleting the file.
- **Timestamp:** 2026-07-09

## DR-0002 — Store governance docs in `docs/governance/`, wired via `CLAUDE.md`

- **Decision:** Codify the Constitution as versioned markdown under `docs/governance/`
  (constitution, this register, and the Founder Brief), and reference it from a root
  `CLAUDE.md` so every future agent session in this repository loads it as standing
  operating policy automatically.
- **Reason:** Versioned-in-repo policy survives across sessions, machines, and
  contributors; `CLAUDE.md` is the mechanism the agent harness reads on session start,
  making the policy self-enforcing rather than dependent on the Founder re-pasting it.
- **Alternatives considered:**
  1. Keep the constitution only in conversation context — lost when the session ends.
  2. Single flat `GOVERNANCE.md` at repo root — works, but mixes constitution, log, and
     brief into one file that grows unboundedly.
  3. `.github/` directory — conventionally for GitHub metadata, not operating policy.
- **Evidence:** Repository had no existing `docs/` or `CLAUDE.md`; no conflicting
  conventions found in `README.md` or `CONTRIBUTING.md`.
- **Confidence:** High
- **Expected impact:** All future sessions operate under the Constitution without
  Founder intervention; decisions and briefs accumulate in a stable, reviewable place.
- **Risk assessment:** Minimal — documentation only, fully reversible via git revert.
- **Timestamp:** 2026-07-09

## DR-0001 — Adopt the Governor Autonomous Decision Constitution

- **Decision:** Accept the Founder's standing delegation of routine engineering
  decision authority, effective immediately.
- **Reason:** Direct Founder instruction; eliminates approval-latency on reversible
  engineering work while keeping the seven Founder Gates as hard stops.
- **Alternatives considered:** None — Founder directive.
- **Evidence:** Founder instruction dated 2026-07-09.
- **Confidence:** High
- **Expected impact:** Continuous execution; Founder interruptions limited to gated
  categories (money, legal, strategy, irreversible/destructive, risky production,
  secrets, explicitly reserved decisions).
- **Risk assessment:** Low — the Founder Gates and the reversibility requirement bound
  the delegated authority; all decisions are logged here for after-the-fact review.
- **Timestamp:** 2026-07-09

---

## Entry template

```markdown
## DR-NNNN — <short title>

- **Decision:**
- **Reason:**
- **Alternatives considered:**
- **Evidence:**
- **Confidence:** High | Medium | Low
- **Expected impact:**
- **Risk assessment:**
- **Timestamp:** YYYY-MM-DD
```
