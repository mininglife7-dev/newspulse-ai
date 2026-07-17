# GitHub Actions Outage Diagnostic & Recovery Guide

**Incident:** GitHub Actions CI pipeline stopped creating workflow runs at ~04:15 UTC on 2026-07-10  
**Impact:** All PRs stop verification (build, lint, type-check) although Vercel preview builds still work  
**Status:** Requires Founder investigation and manual intervention

---

## Quick Diagnosis Checklist

Open https://github.com/mininglife7-dev and navigate to:

### 1. Check Actions Status (Primary Issue)

**URL:** Settings → Actions → General

- [ ] Is "Actions" enabled? (should be ON)
  - If OFF: Click "Enable Actions" → Save

**URL:** Settings → Actions → Billing & Plans

- [ ] Check "Usage this month" and "Spending limit"
  - If quota exceeded: Shows red warning "You have exceeded your spending limit"
  - If quota low: Shows yellow warning with remaining minutes
  - Action: Increase spending limit or check if auto-disabled

- [ ] Check "Actions usage"
  - Look for spikes around 04:15 UTC (when outage started)
  - If there's a plateau/cliff, it likely hit the spending limit

### 2. Check Repository Settings

**URL:** mininglife7-dev/newspulse-ai → Settings → Actions → General

- [ ] Is Actions enabled for this repo? (should be ON)
- [ ] Are there any branch protections blocking Actions? (Settings → Branches)
- [ ] Are workflow files present? (`.github/workflows/ci.yml` exists in repo)

### 3. Check Workflow Run History

**URL:** mininglife7-dev/newspulse-ai → Actions

- [ ] Scroll to bottom, find last successful run
  - Likely timestamp: ~04:15 UTC 2026-07-10
  - All runs after should show "Not run" or "Skipped"
- [ ] Recent runs should show status:
  - ❌ If "Status skipped" → Actions disabled or quota exceeded
  - ❌ If no runs after 04:15 → Outage confirmed

### 4. Check for Billing Alerts

**URL:** github.com settings → Billing & plans

- [ ] Look for email alerts or notifications about spending limits
- [ ] Check if you received "Actions spending limit reached" notification
- [ ] Check invoice history for any recent Actions charges

---

## Root Cause Analysis

Based on the symptoms (stopped exactly at ~04:15 UTC, Vercel still building), likely cause is:

### **Most Likely: Actions Spending Limit Reached**

**Evidence:**

- Exact cutoff time (04:15 UTC) suggests automatic disable, not manual shutdown
- ~14 parallel sessions today likely exhausted monthly minutes
- GitHub auto-disables Actions when spending limit is exceeded
- Affects all repos in org that are over limit

**Recovery:**

1. Go to github.com settings → Billing & plans → Actions usage
2. Increase "Spending limit" from current value to higher amount (e.g., $100/month)
3. Actions should re-enable automatically within 1 minute
4. All subsequent pushes/PRs will trigger CI runs again

### **Alternative: Actions Disabled by Admin**

**Evidence:**

- Manual decision to turn off Actions
- Prevents workflow runs without error messages

**Recovery:**

1. Go to Settings → Actions → General
2. Click "Enable Actions" button
3. Click "Save"
4. Actions should be active within 1 minute

### **Alternative: Quota Exceeded (Not Spending Limit)**

**Evidence:**

- Monthly Actions minutes quota exceeded
- GitHub doesn't auto-disable, but CI becomes slow/unreliable

**Recovery:**

1. Go to Settings → Actions → Billing & plans
2. Check "Usage this month" — if ≥ monthly quota, this is the issue
3. Increase "Included minutes" (free tier: 2000 min/month; Pro: 3000 min/month)
4. Or increase "Spending limit" to pay for overflow minutes

---

## Step-by-Step Recovery Process

### **Option A: Increase Spending Limit (Recommended)**

1. **Navigate to Billing Settings**
   - Go to https://github.com/settings/billing/summary

2. **Check Actions Usage**
   - Click "Actions" in the billing menu
   - Note the current "Spending limit"

3. **Increase the Limit**
   - Click the "Spending limit" dropdown
   - Select a higher value (e.g., from $0 to $50, or $50 to $100)
   - Click "Update"

4. **Verify Actions Re-enabled**
   - Go to https://github.com/mininglife7-dev/newspulse-ai/actions
   - Trigger a test by:
     - Pushing an empty commit: `git commit --allow-empty -m "test: trigger ci"`
     - Or opening a PR with a small change
   - Within 1-2 minutes, a new workflow run should appear

5. **Confirm Recovery**
   - [ ] Workflow run shows "In progress" or "Completed"
   - [ ] Lint check started
   - [ ] Build check started
   - [ ] Type check started

### **Option B: Re-enable Actions (If Manually Disabled)**

1. **Navigate to Actions Settings**
   - Go to https://github.com/mininglife7-dev/newspulse-ai/settings/actions

2. **Enable Actions**
   - Find "Actions permissions" section
   - Select "Allow all actions and reusable workflows"
   - Click "Save"

3. **Verify Actions Re-enabled**
   - Go to Actions tab
   - Trigger a test run (same as Option A step 4)
   - Confirm workflow appears within 1-2 minutes

---

## Temporary Workaround (While Fixing)

Until Actions is restored, use this workaround:

1. **Local Verification**

   ```bash
   npm run lint    # Check formatting
   npm run test    # Run all tests
   npm run build   # Verify production build
   ```

2. **Rely on Vercel Preview**
   - Vercel still builds successfully for every PR
   - Provides build + deployment verification
   - Check https://vercel.com/lalit-kumar-d-s-projects/newspulse-ai for preview URLs

3. **Manual Merge Strategy**
   - Verify tests pass locally before pushing
   - Push to feature branch
   - Open PR (Vercel preview will be generated)
   - Verify Vercel build succeeds
   - Manually merge when confident (no GitHub Actions approval needed)

This is safe for now because we have:

- Comprehensive test suite (255/255 passing)
- Vercel deployment verification
- TypeScript strict mode
- No breaking changes planned

---

## Prevention & Monitoring

### Prevent This in Future

1. **Set Spending Limit Higher**
   - Current estimated usage: ~14 sessions × ~10 min/session ≈ 140 minutes/day
   - Monthly: 140 × 30 ≈ 4200 minutes/month
   - Set limit to allow for concurrent sessions: suggest $50/month minimum

2. **Monitor Usage Trends**
   - Check Actions usage weekly: github.com/settings/billing
   - Alert if approaching 80% of monthly quota
   - Plan scaling before hitting limit

3. **Optimize Workflow**
   - Current `.github/workflows/ci.yml` runs: lint, test, build
   - Consider caching dependencies to reduce run time
   - Run tests in parallel where possible

### Monitor This Incident

- [ ] Bookmark github.com/settings/billing for weekly checks
- [ ] Create a calendar reminder to check every Monday
- [ ] Document monthly spend trends in governance logs

---

## Contact & Escalation

If recovery doesn't work:

1. **Check GitHub Status Page**
   - https://www.githubstatus.com
   - If GitHub platform is down, wait for resolution

2. **GitHub Support**
   - https://github.com/contact/form
   - Include: org name (mininglife7-dev), issue description, affected workflows

3. **Alternative CI Options**
   - GitLab CI (if GitHub remains broken)
   - CircleCI (alternative cloud CI)
   - Local Actions runner (self-hosted option)

---

## Appendix: CI Workflow Details

**Workflow file:** `.github/workflows/ci.yml`

**What it does:**

1. **Lint** — Check code style (ESLint, Prettier)
2. **Type-check** — TypeScript strict mode verification
3. **Build** — Production build validation
4. **Test** — Run full test suite

**Triggered by:**

- Push to any branch
- Pull requests

**Time to complete:** ~2-3 minutes per run

**Cost:** Free tier has 2000 minutes/month; Pro has 3000 minutes/month; additional minutes billed at standard rate

---

**Last updated:** 2026-07-10 (Incident occurred 04:15 UTC)  
**Status:** Awaiting Founder investigation  
**Next action:** Follow diagnostic checklist and execute recovery option
