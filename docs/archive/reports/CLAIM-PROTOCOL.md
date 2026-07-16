# Mission Claim Protocol (V4 claim mechanism)

**Why this exists:** between 2026-07-09 and 2026-07-15 this repository lost more
work to parallel-session collisions than to missing features — at least four
duplicate implementations (three rival risk-assessment stacks, two dependency
monitors, one duplicated security guard) and one force-push that destroyed
landed work. The GO/NO-GO audit's Mission Register V4 mandated a lightweight
claim mechanism. This is it. First live claim:
[issue #128](https://github.com/mininglife7-dev/newspulse-ai/issues/128).

## The rule

**Before starting any mission that writes to the repository, open a claim
issue. Before pushing to any file surface, check no ACTIVE claim covers it.**

## Claim issue format

- **Title:** `🔒 CLAIM: <mission name>` — labels: `claim`, `coordination`
- **Body table:** Mission · Owner (session/branch identifier) · Claimed at
  (UTC) · Status (`ACTIVE` / `RELEASED` / `DONE`) · Expires (default: claimed
  at + 24h)
- **Claimed scope:** explicit list of files, directories, PR numbers, or API
  surfaces the mission will write. Everything not listed is unclaimed.
- **Collision check:** state that open claim issues were searched and no
  ACTIVE claim overlaps the scope.

## Lifecycle

| Event                                           | Action                                                                                                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start mission                                   | Search open issues with label `claim`; if an ACTIVE claim overlaps your scope, **yield or coordinate in its thread — first claim wins**. Otherwise open your claim issue. |
| Scope grows mid-mission                         | Comment the scope change on your claim issue _before_ pushing to the new surface.                                                                                         |
| Progress                                        | Comment meaningful checkpoints (keeps the claim demonstrably non-stale).                                                                                                  |
| Complete                                        | Close the issue with a summary + evidence links (commits, PRs). Closed = completed mission record.                                                                        |
| Abandon                                         | Comment `RELEASED` and close.                                                                                                                                             |
| Stale claim (past expiry, no progress comments) | Any session may comment a takeover notice, wait 1 hour, then open its own claim referencing the stale one.                                                                |

## Collision detection

Detection is by convention, not enforcement: the search step is mandatory
before pushing. Sessions should search both open claim issues **and** open
PRs touching their surface (`git diff --name-only` against each open PR head
catches textual overlap; watch for _semantic_ overlap too — competing
implementations of the same domain under different paths, which file diffs
will not flag).

## What does NOT need a claim

Read-only work (audits, analysis), comments on issues/PRs, and single-file
docs fixes under `docs/` that no ACTIVE claim lists.
