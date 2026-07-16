# CI Governance Audit — How Broken Code Reached `main`, and What Now Prevents It

**Date:** 2026-07-15
**Author:** Governor (autonomous engineering)
**Scope:** Why a type-broken `main` shipped despite CI, and the repo-level safeguards now in place (delivered in PR #54).
**Evidence labels:** _Verified_ = confirmed from git history / test runs / CI logs this session · _Estimated_ = reasoned from the mechanism · _Unknown_ = needs data I cannot see · _Blocked_ = requires Founder GitHub action.

---

## 1. Root cause

Two independent DNA monitor endpoints called `recordAlert()` with the **wrong argument shape**. The function's signature is positional:

```ts
recordAlert(source, severity, title, description, recommendation?)
```

but `POST /api/cost-anomaly` (DNA-GOV-011) and `POST /api/incident` (DNA-GOV-014) called it as `recordAlert(alertObject)` — a single object — and their sources (`cost-anomaly`, `incident-commander`) were not members of the `AlertSource` union. That is a **compile-time type error**: `tsc --noEmit` (and therefore `npm run build`) fails on it. _Verified._

So the real question is not "why did the code break" — it is **"why did a change that fails `type-check` land on `main` at all,"** since CI runs `type-check` on every PR.

## 2. How the broken code reached `main`

_Verified_ from `git log`: the offending commits were authored directly on `main` (committer `Claude`), **not** through a pull request. The CI workflow (`.github/workflows/ci.yml`) runs `Lint & Build` (which includes `type-check`) on `pull_request` and `push`. A change that never opens a PR, pushed straight to `main`, skips the PR gate entirely — and nothing **blocked** the push, because `main` had **no branch protection** requiring a passing check before the ref updates. _Verified: the direct-push path exists; the absence of branch protection is inferred from the push having succeeded — `Unknown/Blocked` until confirmed in Settings._

Compounding it: at the same time the repo's **GitHub Actions minutes were exhausted**, so even runs that were queued may not have executed. The DNA monitor workflows were scheduled at `*/5`, `*/10`, and `*/30` — roughly **770 scheduled runs/day** across the monitors, against a 2,000-minute/month free-tier budget. The monitoring meant to protect production instead **took CI itself offline**, so a broken push had no live gate at all. _Verified (cron cadence + arithmetic); the billing state itself is Blocked — Founder-only to read._

**Summary:** broken code reached `main` because (a) it bypassed the PR CI gate via a direct push, and (b) branch protection did not require a green check to update `main`, while (c) the CI budget was drained by over-frequent cron monitors.

## 3. The exact repair

All in PR #54, `Lint & Build` + `E2E smoke` green on the merged tree. _Verified._

- **Fixed both call sites** to the positional signature and **extended the `AlertSource` union** to include `cost-anomaly` and `incident-commander`. `type-check` ✓ / `build` ✓.
- **DNA-GOV-011 monitor workflow** — removed `require('node-fetch')` (never a dependency; it threw `MODULE_NOT_FOUND` on Node 20, which has a global `fetch`, so this scheduled job had been failing _every_ run).
- **Cron retune** — DNA monitors moved from `*/5`/`*/10`/`*/30` to `0 */6`/`0 */12` (~770 → ~14 runs/day), all retaining `workflow_dispatch` for on-demand use. This stops the Actions-minute drain that took CI down.
- **Flaky-test repair** — `deployment-verification.test.ts` had two nondeterministic assertions (single-check failure → 90 % pass → `RETRY`; and a critical-failure block that excluded the reachable `HOLD` state and asserted `canRollback` unconditionally). Both fixed and proven against every reachable decision state; full suite stress-run 5× (1100 tests) with zero failures.

## 4. Governance changes (so it can't silently recur)

- **`recordAlert` contract guard** — a type-level regression test that fails `tsc` if `recordAlert` ever again accepts a wrong-arity / wrong-source call. This makes the _exact_ class of defect a **build failure before merge**, not a runtime surprise. _Verified — the guard is in the suite._
- **`detect-direct-push` CI job** — flags any non-PR push to `main` so a bypass is at least visible in the Actions log.
- **`main-health-alert` CI job** — opens a `main-broken` issue if `main`'s CI fails after a push (requires Actions write permission — see §5).
- **Least-privilege + concurrency** on `ci.yml` (`permissions: contents: read`; PR-only cancellation so `main` runs are never cancelled; Playwright browser cache) — reduces burn and blast radius.

## 5. Remaining Founder-only actions (GitHub settings — I cannot perform these)

1. **Branch protection on `main`** — require a PR, require `Lint & Build` and `E2E smoke` to pass, and "require branches up to date before merging." _This is the true structural fix for §2 — the CI jobs already exist; protection is what makes them mandatory._ **Blocked.**
2. **Actions → Workflow permissions → Read and write** — so `main-health-alert` can open issues. **Blocked.**
3. **Confirm/restore Actions billing** — verify the minute budget recovered after the cron retune. **Blocked.**

## 6. Evidence that `main` can no longer go red silently

| Failure mode                      | Detection now                                                                                              |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Wrong `recordAlert` shape         | `type-check` fails via the contract guard **before merge** — _Verified_                                    |
| Any type error in a PR            | `Lint & Build` runs `type-check` on every PR — _Verified_                                                  |
| Direct push to `main`             | `detect-direct-push` records it in the Actions log — _Verified (job runs; skips on PRs)_                   |
| Broken `main` after a push        | `main-health-alert` opens a `main-broken` issue — _Verified logic; needs §5.2 permission to actually file_ |
| CI budget drain                   | Cron load cut ~55× (770 → 14/day) — _Verified_                                                             |
| Nondeterministic test regressions | The two known flakes fixed; suite stable over 5 full runs — _Verified_                                     |

Residual gap: until branch protection (§5.1) is enabled, a direct push can still _land_ on `main` — it will be **detected and alerted**, but not **blocked**. Blocking is Founder-only.

## 7. Recommendation on PR #54 merge-safety

**Recommendation: merge PR #54.** _Confidence: high, on the engineering axis._

- On the merged tree: `type-check` ✓, `lint` ✓ (0 errors), `build` ✓, **1100** unit/integration tests ✓, `E2E smoke` ✓; GitHub `Lint & Build` + `E2E smoke` green; `mergeable_state: clean`. _Verified._
- The diff is scoped to **32 files** (the pre-commit hook's incidental reformat of ~150 unrelated files was reverted to keep review surface honest and avoid conflicts with other in-flight branches).
- Merging `main` triggers a **production Vercel deploy**, so this is a Founder-authorized action, not an autonomous one.

**Before/at merge:** apply `supabase/schema.sql` (it adds the `ai_systems` RLS **delete** policy the new inventory delete relies on). Immediately after merge, enable branch protection (§5.1) so the next change cannot repeat §2.

---

## 8. Incident log — the pattern is recurring (evidence for §5.1 urgency)

Same session, same mechanism (unprotected direct-to-`main` changes shipping a type error that fails `tsc`):

| #   | Commit(s)                                       | What broke                                                                                               | Detection                                          | Status                                   |
| --- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------- |
| 1   | DNA-GOV-011/014 direct pushes                   | `recordAlert` wrong-arity → `tsc` fail                                                                   | Surfaced on a PR merge-ref, not on `main`          | Fixed in PR #54 + contract guard         |
| 2   | `deployment-verification` test                  | Two nondeterministic assertions → CI flake                                                               | CI red on PR #54                                   | Fixed in PR #54                          |
| 3   | `9bb29b2`/`64aec2f` (committer `Claude`, no PR) | `new Map([])` → `Map<unknown,unknown>` not assignable to `classifyRisk`'s `Map<string,any>` → `tsc` fail | Reproduced locally on `main`'s tree; `main` CI red | Fixed in PR #54 (3-line type annotation) |

Incident #3 is the clearest proof of §5.1's necessity: within an hour of this audit being written, an automated `Claude` process committed a type-broken test **straight to `main` with no PR**, turning `main` red again. Production was spared only because the error is in a test file (`next build` does not type-check tests), i.e. it was luck, not a safeguard. **Until branch protection (§5.1) requires `Lint & Build` to pass before `main` updates, this will keep happening.** The CI jobs that would catch it already exist; only the Founder can make them mandatory.

---

_This document records engineering facts and repo-level safeguards. It is subordinate to the two Founder constitutions in this directory._
