# 📒 Decision Register

Autonomous engineering decisions made under the
[Governor Autonomous Decision Constitution](./GOVERNOR_CONSTITUTION.md).
Newest entries first. Every non-trivial decision gets an entry — routine approvals
are never requested from the Founder.

---

## DR-0005 — Pause Next 16 migration; reconcile Founder Brief to portfolio reality

- **Decision:** Pause the queued Next 16 migration and instead verify `main` and
  update the Founder Brief with a full open-PR portfolio analysis, surfacing the one
  Founder-gated decision (PR #22 product pivot) that sequences all other work.
- **Reason:** PR #22 rewrites or deletes large parts of the codebase (layout,
  middleware, news routes). A breaking framework migration now would conflict with
  it wholesale and could be discarded by it. Meanwhile the brief on `main` still
  described the pre-consolidation state, hiding the portfolio conflict from the
  Founder. Reconciling truth first is the highest-value non-conflicting task.
- **Alternatives considered:**
  1. Proceed with Next 16 migration — high conflict risk with #22; possibly wasted.
  2. Merge open engineering PRs autonomously — #21/#5/#2 conflict with #22; #22
     itself is product vision (Founder gate). Sequencing requires the gate first.
  3. Idle until instructed — violates continuous-execution mandate.
- **Evidence:** `main` verified 2026-07-10: 55/55 vitest tests, lint 0 errors,
  `tsc --noEmit` clean, `next build` succeeds. PR list inspected: #22 (base current,
  deletes `app/api/search`, `app/history`, rewrites `middleware.ts`, `app/layout.tsx`);
  conflicts mapped against #21, #5, #2; #18/#17/#15 on stale bases.
- **Confidence:** High
- **Expected impact:** Founder gets an accurate board and a single decision to make;
  no conflicting engineering work is generated in the meantime.
- **Risk assessment:** Minimal — documentation only, reversible; the paused migration
  is explicitly re-queued behind the #22 decision.
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
