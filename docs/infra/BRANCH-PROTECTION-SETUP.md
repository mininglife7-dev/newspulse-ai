# Branch protection for `main` — Founder setup instructions

**Why (evidence):** on 2026-07-11 a force-push to `main` destroyed landed work,
which had to be manually re-landed (see `docs/GO-NO-GO-REPORT.md`, 07-11
addendum; recovery preserved in `backup/main-pre-forcepush-1719dcf`). The
workflow-level guards that exist today (`Flag direct pushes to main`,
`Alert on broken main` in `ci.yml`) only _detect after the fact_ — they cannot
prevent the next force-push. Only repository settings can. This requires
**admin access**, which automation sessions do not have.

## Where

GitHub → repository **Settings → Rules → Rulesets → New ruleset** (or the
legacy path: Settings → Branches → Add branch protection rule). Target branch:
`main`.

## Recommended settings

| Setting                                          | Value                                                                                         | Why                                                       |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Require a pull request before merging            | **ON**, required approvals: 0 (single-maintainer repo — raise later)                          | Ends direct pushes; every change gets CI                  |
| Require status checks to pass                    | **ON** — required checks: **`Lint & Build`**, **`E2E smoke`** (exact job names from `ci.yml`) | Broken code cannot merge                                  |
| Require branches to be up to date before merging | **ON**                                                                                        | Prevents the stale-merge-ref failures seen on 07-09/07-15 |
| Block force pushes                               | **ON**                                                                                        | Directly prevents a repeat of the 07-11 incident          |
| Restrict deletions                               | **ON**                                                                                        | Protects `main` and the backup branch pattern             |
| Require conversation resolution before merging   | **ON**                                                                                        | Review comments cannot be silently ignored                |
| Bypass list                                      | **Repository admin (you) only**                                                               | Emergency recovery path — see below                       |

## Emergency recovery path (documented so the rules cannot deadlock you)

As the repository admin on the bypass list you can always: merge with checks
red (bypass), temporarily disable the ruleset (Settings → Rules → toggle), or
push a revert PR. Never resolve an emergency by deleting the ruleset and
force-pushing — that recreates the 07-11 incident.

## Validation procedure (2 minutes, after enabling)

1. `git push origin main` with any trivial local commit → must be **rejected**.
2. `git push --force origin main` → must be **rejected**.
3. Open a trivial docs PR → confirm the merge button stays disabled until
   `Lint & Build` and `E2E smoke` are green, then merges normally.
4. Delete the test branch; done.
