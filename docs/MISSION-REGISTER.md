# Mission Register — "Mission 99" Audit → Version 2

## ⚡ Version 3 addendum — 2026-07-10: open-PR consolidation register

The duplicate-work risk flagged in V2 has materialized. Seven draft PRs are open against a `main` that moves hourly, and they overlap heavily. Verified from the PR bodies and diffs on 2026-07-10:

| PR | Branch | Claims | Overlap risk |
|---|---|---|---|
| #60 | `euro-ai-product-vision` | Full backend API: workspaces, AI systems, **risk assessments, obligations, evidence, remediation**, dashboards, audit log | **Collides with #55 and #48** (same domain objects, different implementations). Base commit already stale |
| #55 | `governor-evolution-charter` | **Risk assessment + obligations + remediation** (lib/risk-assessment.ts, 3 API routes, 4 pages), 369 tests | **Collides with #60 and #48**. Note: main *already has* obligations pages/APIs (commits 0f57a35…f8e9027) — partially obsolete |
| #48 | `governor-founder-freedom` | **Risk assessment step 3** + WCAG accessibility pass + customer-readiness audit doc | **Collides with #55 and #60** on assessment; accessibility work is unique |
| #58 | `glo-foundation-dna` | Open-redirect fix, vercel.json deploy unblock, workspace atomicity, smoke gate, CRON_SECRET guard | Mostly unique, security-critical. **Recommend merging FIRST** |
| #54 | `continuing-tasks` | Signup legal-link fix, workspace form fields | Small, unique. Merge second. Flags public ops endpoints (founder decision) |
| #49 | `governor-bootstrap-protocol` | Dependency health monitoring (cron) | Overlaps #46 (dependency security scanning) — **two monitoring implementations of the same idea** |
| #46 | `autonomous-process-governor` | Dependency security scanning + perf baseline + git governance (DNA-GOV-008/9/10) | Overlaps #49; also its vulnerability findings are **stale** (written pre-Next-15.5.20; audit is now 2 moderate, not 1 critical + 5 high) |

**Recommended consolidation order — now VERIFIED by local test-merges against main `f8e9027` (2026-07-10 ~14:00 UTC):**

| Step | PR | Test-merge result | Verified gate on the merge |
|---|---|---|---|
| 1 | **#54** | ✅ **Merges clean** (it has grown: legal links + workspace fields + full password-reset flow + 3 new E2E tests) | **529 unit / 9 E2E / build / lint / tsc — all green.** Safe to merge first |
| 2 | **#58** | ⚠️ **3 conflicts** — `vercel.json` (semantic: main deliberately emptied `crons` per the Vercel-plan decision; #58 re-adds a 30-min cron), `tests/routes.test.ts`, `scripts/smoke-test.mjs` | Needs rebase + a cron/Hobby-plan decision before merge; content itself (open-redirect fix, atomicity) remains valuable |
| 3 | #48 | ❌ 4 conflicts incl. **`supabase/schema.sql`** and dashboard; 7,331 lines, **58 commits behind** | Do not merge as-is |
| 3 | #55 | ❌ 8 conflicts incl. **`lib/risk-assessment.ts`, obligations API, `schema.sql`** — it collides with main's own stack; 10,187 lines, 43 commits behind | Do not merge as-is |
| 3 | #60 | ⚠️ 1 conflict (workspace setup page); 2,617 lines, **102 commits behind** | Do not merge as-is |

**Decisive verified fact:** `main` already contains a **fourth** assessment/obligations implementation, actively evolving (`lib/risk-assessment.ts`, `app/api/obligations`, `app/compliance`, assessment-detail pages; see commit `3158d84` "reconcile assessment-engine replacement residue"). All three assessment PRs re-implement what main already has.

**Revised recommendation:** treat **main's stack as canonical**. Merge #54 now (verified green). Rebase #58 and resolve the cron decision, then merge. For #48/#55/#60: **harvest unique deltas only** — #48's WCAG/accessibility pass and customer-readiness audit, #60's evidence/audit-log endpoints if main lacks them — as small fresh PRs against current main, then close all three as superseded. #49 vs #46: pick one dependency monitor (both must re-verify findings against Next 15.5.20; #46's vulnerability list is stale). Freeze new feature branches until this consolidation lands.

Every open PR reports its own green local verification, but **none have CI runs** (Actions billing outage) and every base commit is stale — merging without rebase + re-verification will break main.

---

# Version 2 (2026-07-09, historical)

## Rule 4 finding: Mission 99 does not exist

The mission ordered a complete review of "Mission 99". Verified search results:

- Repository content: `grep -ri "mission"` → **0 matches** (44 tracked files).
- GitHub issues: **0 issues** exist on the repository (API `totalCount: 0`).
- GitHub PRs: 2 open drafts (#1 build fix, #2 PWA) — neither references any mission plan.
- Accessible repositories: only `mininglife7-dev/newspulse-ai` (`list_repos` finds nothing else, including nothing matching "euro").

Per the mission's own Rule 1 ("Never assume something exists"), the honest deliverable is not a fabricated re-score of an imaginary plan. **Mission 99 Version 2 is therefore this register**: the real, verified backlog, scored from scratch.

## Wrong assumptions detected (Rule 4 categories)

| Category | Finding |
|---|---|
| Wrong assumptions | That "EURO AI", Mission 99, pilots, partners, evidence packs, and an August launch pipeline exist. None are verifiable. |
| Obsolete work | None to remove — there was no tracked work at all. |
| Duplicate work | **Real and active:** PR #1's build fix is independently re-implemented on this branch; a third Claude branch (`claude/governor-decision-constitution-3zoi9n`, CI run 2026-07-09) is also active. Three concurrent AI sessions on one repo without merging any PR is the process failure to fix first. |
| Low-ROI work | PR #2 rebrands the PWA as "Governor" while the repo is NewsPulse — a naming decision nobody made explicitly. |
| Missing work | Everything in `docs/LAUNCH-BLOCKERS.md` M-04…M-10; there was no test suite, no security review, no ops doc. |
| Incorrect priorities | The implied priority (compliance dashboards, localization, investor decks) inverts reality: the app did not even build. |
| Unfinished work | PRs #1 and #2 sit unmerged as drafts. Unmerged work is inventory, not progress. |
| New opportunities | The hardened scaffold (build+tests+CI+security) is now a clean base for whatever the real product identity is. |

## Mission 99 V2 — scored backlog

Score = launch-probability impact (10 = launch impossible without it) × confidence in estimate. Sorted by ROI.

| # | Mission | Impact | Effort | Owner | Status |
|---|---|---|---|---|---|
| V2-1 | Merge the open work (this PR; close #1 as superseded; decide #2) | 10 | 15 min | Founder | ⏳ |
| V2-2 | M-10 Deploy: secrets, env, schema, first verified production deploy | 10 | 30 min | Founder | ⏳ |
| V2-3 | M-06 Uptime monitor on /api/health | 7 | 1 h | Founder | ⏳ |
| V2-4 | M-05 Protect destructive endpoints (auth decision) | 8 | 0.5 d | Founder+code | ⏳ |
| V2-5 | M-07 Privacy/Terms/AI-transparency pages | 7 | 1–2 d | Founder+legal | ⏳ |
| V2-6 | Demo evidence: screenshots, 2-min demo script, README completion | 6 | 2 h | Founder | ⏳ |
| V2-7 | M-08 Playwright E2E smoke suite in CI | 5 | 1 d | Code | ⏳ |
| V2-8 | M-04 Next 15/16 upgrade (clears residual audit findings) | 5 | 0.5–1 d | Code | ⏳ |
| V2-9 | M-09 Durable rate limiting (Upstash/KV) | 4 | 0.5 d | Founder+code | ⏳ |
| V2-10 | Decide the product identity (NewsPulse vs "Governor" vs "EURO AI") — one name, one README, one roadmap | 8 | founder decision | Founder | ⏳ |
| — | Build fix, lockfile+CI+tests, dep upgrade, RLS lockdown, rate-limit extension, security headers | 10 | done | Code | ✅ this branch |

**Removed as waste** (Rule 5): German i18n before a German customer exists; investor/partner dashboards for an unnamed product; EU AI Act dossier for a minimal-risk summarizer beyond the transparency label.
