# CI/CD Recovery Runbook — GitHub Actions Restoration

**Purpose:** Clear, step-by-step procedure to verify CI/CD health and deploy queued work once GitHub Actions outage is resolved

**Trigger:** "GitHub Actions workflow runs now appearing in Actions tab" or "Founder reports issue fixed"

---

## Pre-Recovery Checklist

- ✅ Governor has observed GitHub Actions creating new workflow runs
- ✅ Founder has checked billing console and verified root cause (rate limit, spending, billing issue)
- ✅ Recent workflow run succeeded (green checkmark in Actions tab)

**Estimated recovery time:** 5-10 minutes

---

## Step 1: Verify GitHub Actions Health (2 min)

### 1.1 Check workflow status

1. Go to: https://github.com/mininglife7-dev/newspulse-ai/actions
2. Look for the most recent workflow run
3. Expected: Green checkmark (✅ succeeded)
4. Verify: "Conclusion: success"

### 1.2 Check workflow logs

1. Click the most recent run
2. Expand any job (e.g., "build")
3. Scan for errors: Look for "Error", "failed", "404", "500"
4. Expected: No error messages; build output shows "npm run build" succeeded

### 1.3 Verify pull request checks

1. If any PRs are open, click one
2. Go to "Checks" tab
3. Expected: All checks pass (green ✅)
4. If any fail: Click to see error details

**Result:** GitHub Actions is healthy ✅

---

## Step 2: Verify Local Build (2 min)

Run a quick sanity check locally:

```bash
cd /home/user/newspulse-ai

# Pull latest main
git fetch origin main
git checkout main

# Install dependencies
npm ci

# Run tests
npm test
# Expected: 800+ tests passing

# Type check
npm run type-check
# Expected: No errors

# Build
npm run build
# Expected: "ready - started server on 0.0.0.0:3000, url: http://localhost:3000"
```

**Result:** Code is buildable locally ✅

---

## Step 3: Verify Deployment (2 min)

### 3.1 Check Vercel deployment status

1. Go to: https://vercel.com/dashboard
2. Find "newspulse-ai" project
3. Click to open project
4. Check "Deployments" tab
5. Expected: Most recent deployment has green checkmark (✅ Ready)
6. If red (❌): Click to see error; likely caused by failed GitHub Actions (should resolve now)

### 3.2 Test live site

1. Open https://newspulse-ai.vercel.app (or your Vercel domain)
2. Should load landing page without errors
3. Click "Sign In"
4. Should load signin form without errors
5. Expected: No console errors (check browser DevTools)

**Result:** Live deployment is working ✅

---

## Step 4: Deploy Queued Work (3 min)

If there were PRs waiting for CI to pass, they're now ready to merge.

### 4.1 Find queued PRs

1. Go to: https://github.com/mininglife7-dev/newspulse-ai/pulls
2. Look for PRs with:
   - "❌ Some checks haven't completed yet" (yellow indicator)
   - Or: "All checks passed" but not merged (waiting for CI approval)

### 4.2 Merge and deploy

For each PR:

1. Click PR to open
2. Scroll to "Checks" section
3. Verify: All checks passed (green ✅)
4. Click "Merge pull request"
5. Confirm merge
6. Expected: PR merged, "Deleting branch..." message appears
7. Watch Vercel dashboard: New deployment should start automatically

### 4.3 Verify deployment

1. Go to Vercel dashboard → Deployments
2. Refresh page
3. Watch for new deployment to appear
4. Wait for "Ready" status (green ✅, ~1-2 min)
5. Click deployment to open live site
6. Verify: Feature from merged PR is working

**Result:** Queued work deployed ✅

---

## Step 5: Deploy DNA-GOV-001 (15 min)

Once CI is healthy, deploy the Blocking Condition Detector:

### 5.1 Create and merge DNA-GOV-001 workflow

Follow `DNA-GOV-001-DEPLOYMENT-GUIDE.md`:

1. Create `.github/workflows/dna-gov-001-blocking-conditions.yml` (see guide)
2. Create `scripts/check-blocking-conditions.mjs` (see guide)
3. Add `"check-blocking-conditions": "node scripts/check-blocking-conditions.mjs"` to `package.json`
4. Commit and push: `git add . && git commit -m "chore(dna-gov-001): Deploy Blocking Condition Detector"`
5. Push to `main`: `git push origin main`
6. Wait for GitHub Actions to run workflow (should succeed)
7. Verify in Actions tab: "DNA-GOV-001 - Blocking Condition Detector" workflow exists and runs

### 5.2 Monitor first detection run

1. Wait for first scheduled run (workflow runs every 30 minutes)
2. Go to Actions tab → "DNA-GOV-001 - Blocking Condition Detector"
3. Click most recent run
4. Expected output: "✅ All infrastructure health checks passed"
5. If any issues: Click run to see detailed output

**Result:** DNA-GOV-001 monitoring is live 24/7 ✅

---

## Step 6: Document Recovery (2 min)

Create a post-incident summary:

```markdown
## CI/CD Recovery Log — [DATE/TIME]

**Incident:** GitHub Actions outage since [start time]
**Root cause:** [Check billing console / rate limit / etc.]
**Resolution:** [What was fixed]
**Time to recovery:** [start to ✅ verified]
**Impact:** [PRs delayed, features queued, etc.]

**Verification checklist:**
- [x] GitHub Actions health verified (recent run succeeded)
- [x] Local build verified (npm test, build clean)
- [x] Vercel deployment verified (site loads)
- [x] Queued work deployed (X PRs merged)
- [x] DNA-GOV-001 deployed (monitoring live)

**Lessons:**
- [What we learned about this type of outage]
- [How to prevent in future]

**Next actions:**
- [Monitor for recurrence]
- [Review billing/rate limits]
- [Follow up with GitHub on outage]
```

Save as: `docs/governance/CI-CD-RECOVERY-LOG-[DATE].md`

---

## Rollback (If Something Goes Wrong)

If deployment introduces a breaking bug:

```bash
# 1. Identify bad commit
git log --oneline | head -5

# 2. Revert bad commit
git revert [commit-sha]
git push origin main

# 3. Vercel auto-deploys reverted code
# Monitor Vercel dashboard for new deployment (should be ready in 1-2 min)

# 4. Verify rollback succeeded
# Test live site: should show previous working version
```

---

## Success Criteria

✅ **Recovery succeeds if:**
- GitHub Actions creates workflow runs (can see in Actions tab)
- Recent workflow runs have green checkmarks
- Local build, type-check, tests all pass
- Vercel deployment shows green ✅
- Live site loads without errors
- Any queued PRs are now mergeable and deploy
- DNA-GOV-001 workflow is scheduled and runs

❌ **Recovery fails if:**
- Workflow runs still not appearing
- Recent runs have red ❌ or yellow indicators
- Local build fails
- Vercel deployment fails
- Live site 404s or errors
- [See troubleshooting below]

---

## Troubleshooting

### "Workflows still not creating runs"

1. Check GitHub Status: https://status.github.com
2. Verify GitHub Actions is not in maintenance
3. Check repository Actions settings: https://github.com/mininglife7-dev/newspulse-ai/settings/actions
4. Confirm: "Actions" is enabled (not disabled)
5. If still failing: Founder should contact GitHub Support

### "Build is failing in GitHub Actions but passes locally"

1. Common causes:
   - Node version mismatch (Actions uses different version)
   - Missing environment variables in Vercel
   - Timing/race condition in CI
2. Debug: Click failed workflow run; expand job logs; look for "error" keyword
3. Usually: npm ci fails (node_modules issue); re-run workflow
4. If persists: Check `.github/workflows/ci.yml` for correct Node version

### "Vercel deployment not starting"

1. Check Vercel dashboard → Project Settings
2. Verify GitHub integration is connected
3. Verify: "Deploy on push to main" is enabled
4. If not: Manually trigger deployment in Vercel
5. Check Vercel build logs for errors

### "Queued PR won't merge due to 'branch is behind main'"

1. This happens if `main` moved ahead after PR was created
2. Solution: In PR, click "Update branch" button
3. Wait for GitHub Actions to re-verify
4. Once green: Merge button becomes available

---

## Prevention: Post-Recovery Actions

Once CI/CD is healthy, take these steps to prevent recurrence:

1. **Review GitHub Actions limits**
   - Check GitHub → Settings → Billing → Actions
   - Verify rate limits are set appropriately
   - Set spending limit if needed

2. **Monitor DNA-GOV-001**
   - Blocking Condition Detector now runs every 30 min
   - Will detect GitHub Actions outages within 30 min
   - Will auto-create GitHub issue if blocker detected

3. **Document incident**
   - What broke, why, how it was fixed
   - Add to `docs/governance/INCIDENT-LOG.md`

4. **Consider redundancy (future)**
   - Alternative CI system (GitHub Actions is already quite reliable)
   - Or: More frequent health checks

---

## Timeline

| Step | Time | Owner |
|------|------|-------|
| 1. Verify GitHub Actions | 2 min | Governor/Founder |
| 2. Verify local build | 2 min | Governor |
| 3. Verify live deployment | 2 min | Governor/Founder |
| 4. Deploy queued work | 3 min | Governor |
| 5. Deploy DNA-GOV-001 | 15 min | Governor |
| 6. Document recovery | 2 min | Governor |
| **Total** | **~26 min** | — |

---

## Contacts

- **GitHub Support:** https://support.github.com
- **Vercel Support:** https://vercel.com/support
- **Status Pages:**
  - GitHub: https://status.github.com
  - Vercel: https://www.vercel-status.com
  - Supabase: https://status.supabase.com

---

**Status:** Ready to execute upon GitHub Actions restoration  
**Last Updated:** 2026-07-10
