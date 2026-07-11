# CI/CD Governance Standards

**Date:** 2026-07-11  
**Owner:** Governor (CI/CD)  
**Status:** Required enforcement for all commits to main

---

## Root Cause Analysis: DNA-GOV-011 & DNA-GOV-014

On 2026-07-11 at 03:24 UTC, two commits (033b04e, a2e00a3) merged to main with **broken TypeScript code**:

```typescript
// BROKEN — reached main without detection
recordAlert(alert);  // ← Expects 4-5 args, got 1
```

**How it happened:**
1. DNA-GOV-011 and DNA-GOV-014 implemented new monitoring features
2. Both called `recordAlert()` with wrong signature (object instead of individual parameters)
3. TypeScript error: "Expected 4-5 arguments, but got 1"
4. CI did NOT catch this because typecheck was skipped or not required
5. Commits pushed/merged directly to main without PR review
6. Branch protection did NOT block the merge

**Impact:**
- Main branch became undeployable
- Typecheck failures blocked all downstream work
- Vercel preview showed green, but GitHub Actions saw red
- Degraded confidence in CI/CD pipeline

---

## Required CI Enforcement

### Every PR Must Verify

On every PR that targets main, GitHub Actions MUST run and PASS:

| Check | Command | Required | Fail Behavior |
|-------|---------|----------|---------------|
| Type-check | `npm run type-check` | YES | Fail — blocks merge |
| Lint | `npm run lint` | YES | Fail — blocks merge |
| Build | `npm run build` | YES | Fail — blocks merge |
| Unit Tests | `npm test` | YES | Fail — blocks merge |
| E2E Tests | `npm run test:e2e` | YES | Fail — blocks merge |
| Smoke Tests | `npm run test:smoke` | YES | Fail — blocks merge |

**CI file:** `.github/workflows/ci.yml`

### Every Merge to Main Must Verify

After every commit reaches main (via merge OR direct push), GitHub Actions MUST run **post-merge verification**:

| Check | Command | Required | Behavior on Fail |
|-------|---------|----------|------------------|
| Type-check | `npm run type-check` | YES | 🚨 Alert + fail workflow |
| Lint | `npm run lint` | YES | 🚨 Alert + fail workflow |
| Build | `npm run build` | YES | 🚨 Alert + fail workflow |
| Unit Tests | `npm test` | YES | 🚨 Alert + fail workflow |
| E2E Tests | `npm run test:e2e` | YES | 🚨 Alert + fail workflow |

**CI file:** `.github/workflows/ci-post-merge-verify.yml`

**Purpose:** Catch integration defects on the merged tree (merge conflicts, implicit dependencies, etc.)

### Direct Push Detection

Post-merge workflow detects direct pushes to main (commits with 1 parent instead of 2):

```bash
# This triggers ALERT but does NOT block the push
⚠️ Direct push to main detected
Author: <name>
Commit: <sha>
Message: <msg>
```

Future pushes should use PR workflow:
```bash
git push -u origin feature-branch
gh pr create
```

---

## Branch Protection Settings (Founder Action Required)

**Status:** ⏳ Blocked on Founder permissions  
**Location:** https://github.com/mininglife7-dev/newspulse-ai/settings/branches

Configure `main` branch with:

### Required Checks
```
✅ Lint & Build (GitHub Actions)
✅ E2E smoke (GitHub Actions)
✅ Vercel Preview Comments (Vercel)
```

**Requirement:** ALL required checks must pass before merge is allowed.

### Dismiss Stale Reviews
```
❌ Uncheck: Dismiss stale pull request approvals when new commits are pushed
```

**Rationale:** New commits might change risk profile; reviews should be fresh.

### Require Status Checks to Pass Before Merging
```
✅ Check: Require status checks to pass before merging
```

**Rationale:** Blocks merge until CI passes.

### Require Branches to be Up to Date
```
✅ Check: Require branches to be up to date before merging
```

**Rationale:** Ensures merge commit has been tested on latest main.

### Include Administrators
```
✅ Check: Include administrators in restrictions
```

**Rationale:** CI applies to all, including Founder.

---

## Merge Readiness: Merged Tree, Not Branch Head

**Problem:**
- Old behavior: Only tested the PR branch head, not the merge result
- This missed conflicts and integration defects
- DNA-GOV-011/014 passed CI on branch, but failed on main after merge

**Solution:**
1. PR CI tests the branch head (existing `.github/workflows/ci.yml`)
2. Post-merge CI tests the merged tree (new `.github/workflows/ci-post-merge-verify.yml`)
3. Branch protection requires BOTH to pass

**Timeline:**
- Push to branch → GH Actions runs PR CI on head
- Merge to main → GH Actions runs post-merge CI on merged commit
- If post-merge CI fails → alert + workflow fails (no auto-revert, manual action required)

---

## Prevent Silent Skips

### Typecheck is NOT optional

```yml
# ✅ CORRECT: Continue-on-error false (default)
- name: Type-check
  run: npm run type-check
  continue-on-error: false

# ❌ WRONG: Silently skips on error
- name: Type-check
  run: npm run type-check
  continue-on-error: true  # ← Never use this for required checks
```

### Workflow Path Filters Must NOT Exclude Integration-Critical Files

```yml
# ❌ WRONG: Skips CI if only app/ changed
on:
  pull_request:
    paths:
      - 'app/**'
      - 'lib/**'
    # Missing: docs, .github/workflows, tsconfig, package.json, etc.

# ✅ CORRECT: Run on all code changes, exclude only docs/comments
on:
  pull_request:
    paths-ignore:
      - '**.md'
      - '.gitignore'
```

### Concurrency Cancellation Must Not Treat Unverified as Healthy

```yml
# ❌ WRONG: Cancelled workflows are not reported as failures
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
  # This cancels old runs, but GitHub marks them as "neutral"
  # not "failed", so unverified commits look green

# ✅ CORRECT: Require explicit verification
# Use GitHub branch protection + post-merge CI to catch this
```

---

## Enforcement Checklist

Every merged commit to main MUST satisfy:

- ✅ PR CI passed (`ci.yml`): type-check, lint, build, tests, E2E
- ✅ Post-merge CI passed (`ci-post-merge-verify.yml`): type-check, lint, build, tests, E2E
- ✅ Branch protection enforced (GitHub settings)
- ✅ Required checks cannot be skipped or marked non-blocking
- ✅ No path filters that exclude shared types/APIs/alert infrastructure
- ✅ Direct pushes detected and logged
- ✅ Broken main triggers 🚨 alert, not silent pass

---

## Regression Test

File: `tests/record-alert-signature.test.ts`

Proves that calling `recordAlert()` with invalid signature fails **TypeScript type-check** before runtime. This prevents DNA-GOV-011/014 type of defect.

```typescript
// This DOES compile (correct signature)
recordAlert('performance', 'critical', 'Title', 'Description');

// This DOES NOT compile (wrong signature)
recordAlert({ id: '...', severity: '...', source: '...' });
// → TypeScript error: Expected 4-5 arguments, but got 1
```

---

## Related Documents

- `FOUNDER-ACTION-BOARD.md` → GitHub branch protection settings (Founder only)
- `CI-CD-RECOVERY-RUNBOOK.md` → Unblock CI if broken
- `.github/workflows/ci.yml` → PR verification workflow
- `.github/workflows/ci-post-merge-verify.yml` → Main branch verification

---

## Next Steps

**Immediate (Founder):**
1. Enable branch protection on `main` with settings above
2. Confirm required checks are: Lint & Build, E2E smoke, Vercel

**Ongoing (Governor/Team):**
1. Every PR must pass CI before merging
2. Watch for post-merge CI failures (🚨 alert in Actions)
3. If post-merge CI fails, investigate and either fix or revert
4. Keep CI configuration in sync with required checks

---

**Status:** Ready for implementation  
**Last Updated:** 2026-07-11  
**Owner:** Governor (CI/CD Governance)
