# Production Deployment Runbook

**Type**: Runbook  
**Audience**: Deployers, Release Leads  
**Authority**: Governor Ω  
**Status**: Active  
**Last Updated**: 2026-07-16  
**Review Schedule**: After each deployment or quarterly  
**Time Estimate**: 15-30 minutes  
**Owner**: Governor Ω

---

## Quick Reference

Step-by-step procedure for deploying code from `claude/alpha-cathedral-roadmap-*` branch to production (`main`). This ensures all code meets quality standards before reaching customers.

**Prerequisites**:
- Code is on a feature branch (`claude/*`)
- All local tests pass (`npm test`)
- All static checks pass (`npm run lint`, `npm run type-check`)
- PR has been reviewed and approved (if applicable)
- You have commit rights to the repository

---

## Deployment Procedure

### Phase 1: Pre-Deployment Verification (5 min)

**Goal**: Ensure code is safe to deploy before pushing to production.

1. **Run local verification**
   ```bash
   npm run type-check    # TypeScript type safety
   npm run lint          # ESLint code quality
   npm run format        # Prettier formatting
   npm test              # Unit tests
   npm run test:e2e      # End-to-end tests (if changed UI)
   ```
   - If any check fails, fix the issue and return to step 1
   - Do not proceed to production if checks fail

2. **Review git status**
   ```bash
   git status
   git log --oneline -n 5
   ```
   - Ensure you're on the correct feature branch
   - Ensure all changes are committed
   - No uncommitted files should be present

3. **Check remote branch is up-to-date**
   ```bash
   git fetch origin
   git status
   ```
   - If your branch is behind `origin/main`, rebase before continuing
   ```bash
   git rebase origin/main
   npm test  # Re-run tests after rebase
   ```

### Phase 2: Create Pull Request (2 min)

**Goal**: Get code reviewed and approved before merging to main.

1. **Check if PR already exists**
   - Go to GitHub → PRs tab
   - Search for your branch name
   - If PR exists, review feedback and make changes if needed
   - If no PR exists, continue to step 2

2. **Create PR if needed**
   ```bash
   gh pr create --title "Your Title" --body "Description of changes"
   ```
   - Title: Clear, concise summary of changes
   - Body: What changed and why (reference decision log if major decision)
   - Set as Draft until ready for review

3. **Mark as Ready for Review**
   - GitHub UI → "Ready for review" button
   - Or: `gh pr ready <pr-number>`

### Phase 3: Code Review (Varies)

**Goal**: Get approval from at least one team member.

1. **Wait for review feedback**
   - Address any comments or requested changes
   - Re-run tests if code changed: `npm test`
   - Commit changes: `git commit -am "Address review feedback"`
   - Push: `git push origin <branch-name>`

2. **Get approval**
   - At least one review approval required
   - All conversations resolved
   - Check passes (CI/CD green)

### Phase 4: Merge to Main (2 min)

**Goal**: Merge approved code to production branch.

1. **Merge PR to main**
   ```bash
   gh pr merge <pr-number> --squash --delete-branch
   ```
   - `--squash`: Combine all commits into one (cleaner history)
   - `--delete-branch`: Delete feature branch after merge

2. **Or merge manually**
   ```bash
   git checkout main
   git pull origin main
   git merge --squash <feature-branch>
   git commit -m "Your commit message (see commit protocol)"
   git push origin main
   ```

### Phase 5: Verify Deployment (5 min)

**Goal**: Confirm deployment to production succeeded.

1. **Check Vercel deployment**
   - Go to Vercel dashboard or GitHub PR status
   - Look for "Vercel" check mark ✅
   - Wait for deployment to complete (usually 2-3 minutes)
   - If deployment fails, see Error Handling section below

2. **Verify production URL responds**
   ```bash
   curl -s https://newspulse-ai.vercel.app/api/health | jq .
   ```
   - Should return `{"status":"healthy","timestamp":"...","version":"..."}`
   - If fails, immediately proceed to Error Handling → Rollback

3. **Run smoke tests**
   - Visit https://newspulse-ai.vercel.app
   - Log in with test account
   - Navigate to main features:
     - Create workspace
     - Inventory page loads
     - Assessment workflow works
     - Evidence page loads
   - If anything fails, proceed to Error Handling → Rollback

4. **Check monitoring**
   - Supabase dashboard: Look for database errors (should be near zero)
   - Vercel dashboard: Check response times (should be <500ms)
   - GitHub Actions: Check CI passed for main branch

5. **Announce deployment**
   - Slack message: "✅ Deployed: [Feature Name] - link to PR"
   - Include: What changed, why, and any breaking changes

---

## Error Handling

### If Pre-Deployment Checks Fail

**Problem**: `npm test`, `npm run lint`, or `npm run type-check` fails

**Action**:
1. Read the error message carefully
2. Fix the issue in your code
3. Re-run the check to verify it passes
4. Commit the fix: `git commit -am "Fix: [description]"`
5. Push: `git push origin <branch-name>`
6. Return to Phase 1, Step 1

**Common Fixes**:
- `npm run format` — Auto-fix formatting issues
- `npm test -- --watch` — Debug failing tests interactively
- `npm run type-check` — Check for TypeScript errors

### If PR Review Feedback Arrives

**Problem**: Reviewer requests changes

**Action**:
1. Address each comment
2. Reply to comments with explanation or fix link
3. Make code changes if needed
4. Re-run tests to ensure they still pass
5. Commit and push changes
6. Wait for re-review approval

### If Deployment to Vercel Fails

**Problem**: Deployment status shows ❌ on GitHub

**Action**:
1. Check Vercel dashboard for error message
2. Common causes:
   - Build timeout → Could indicate large files or slow dependency install
   - Type errors → Run `npm run type-check` locally to debug
   - Env var missing → Check Vercel project settings
   - Database connection → Verify Supabase URL in .env
3. Fix the issue and push to the same branch
4. Vercel will automatically redeploy
5. Wait for ✅ status before proceeding

### If Production Health Check Fails

**Problem**: Smoke tests fail after deployment

**Action**:
1. **Do NOT attempt further testing** — User experience is degraded
2. **Immediately roll back** (see Rollback section below)
3. Investigate what broke
4. Fix locally and re-test before re-deploying

---

## Rollback

Use this if deployment causes production issues.

**Immediate Action** (< 1 min):
1. Go to Vercel dashboard
2. Click on the previous deployment (last successful one)
3. Click "Rollback to this deployment"
4. Confirm the rollback

**Verification** (2 min):
```bash
curl -s https://newspulse-ai.vercel.app/api/health | jq .
```
- Should show success
- Visit app to manually verify core flows work

**Root Cause Analysis**:
1. What broke? (which feature, which API)
2. Why did tests not catch it?
3. What should have prevented this?
4. Update test coverage before re-deploying

**Re-Deploy After Fix**:
1. Fix the issue locally
2. Add test case to prevent regression
3. Re-run all tests locally: `npm test`
4. Create new PR with fix
5. Get review approval
6. Merge to main and deploy again

---

## Verification Checklist

Before considering deployment complete:

- [ ] All pre-deployment checks pass (lint, type-check, tests)
- [ ] PR created and reviewed
- [ ] PR approved by at least one team member
- [ ] Code merged to main branch
- [ ] Vercel deployment shows ✅ status
- [ ] Health check endpoint responds successfully
- [ ] Smoke tests (manual user flows) all pass
- [ ] No spike in error rate in Supabase logs
- [ ] Deployment announcement posted to Slack

---

## Related Documents

- `CHECKLISTS/PRE_DEPLOYMENT.md` — Detailed pre-deployment verification checklist
- `CHECKLISTS/POST_DEPLOYMENT_VERIFICATION.md` — Post-deployment verification checklist
- `PROCEDURES/GIT_WORKFLOW.md` — Git branch and commit conventions
- `PROCEDURES/ROLLBACK.md` — Detailed rollback procedure
- `docs/governance/ENGINEERING_STANDARDS.md` — Code quality standards before deployment
- `docs/operations/INDEX.md` — All operational procedures

---

## Updated By

**Session**: Governor Ω (STAGE 4 Phase 4.2)  
**Date**: 2026-07-16  
**Changes**: Initial creation as part of STAGE 4 Phase 4.2 (Operational Knowledge)
