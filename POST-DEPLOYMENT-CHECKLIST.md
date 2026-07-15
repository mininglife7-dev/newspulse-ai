# 📋 Post-Deployment Checklist

**Use this after completing the two Founder actions to verify everything works.**

---

## Phase 1: Founder Actions (Must Complete First)

### ✅ Action 1: Deploy Supabase Schema

- [ ] Navigated to https://app.supabase.com
- [ ] Selected production project
- [ ] Opened SQL Editor
- [ ] Copied entire `supabase/schema.sql` file
- [ ] Pasted and executed in SQL editor
- [ ] No errors in execution output
- [ ] Verified: `SELECT COUNT(*) FROM customers;` returns 0 (table exists, empty)
- [ ] Verified: `SELECT COUNT(*) FROM users;` returns 0 (table exists, empty)

**Success Criteria Met:** ✅ Yes / ❌ No

### ✅ Action 2: Increase GitHub Actions Spending

- [ ] Went to https://github.com/settings/billing/actions
- [ ] Set spending limit to $50/month or higher
- [ ] Clicked Update/Save
- [ ] No "spending limit exceeded" warning visible

**Success Criteria Met:** ✅ Yes / ❌ No

---

## Phase 2: Verify Production Deployment (15 min)

### 1. Vercel Deployment Status

```bash
# Check if app is live
curl https://your-vercel-app.vercel.app/api/health
# Should return: {"ok": true, "status": "healthy", "db": "ok"}
```

- [ ] Vercel deployment shows "Ready"
- [ ] `/api/health` endpoint responds with 200 status
- [ ] Health response shows `"db": "ok"`

### 2. Test Database Connection

```bash
# Run verification script
./scripts/verify-launch-readiness.sh
```

- [ ] Script completes without errors
- [ ] All checks show ✅ status

### 3. Visual Verification

- [ ] Go to https://your-vercel-app.vercel.app
- [ ] Landing page loads (no errors in browser console)
- [ ] "Get Started" button visible
- [ ] Navigation works (click through pages)

### 4. Email Configuration

- [ ] Check `.env.local` has `SENDGRID_API_KEY` set
- [ ] (or other email provider configured)
- [ ] Email sending will be tested in Phase 3

**All Checks Passed:** ✅ Yes / ❌ No

---

## Phase 3: First Customer Journey Test (15-20 min)

### 1. Create Test Account

```
Email: test-customer-01@example.com
Password: TestPassword123!
```

- [ ] Signup form loads
- [ ] Email validates (no spam/blacklist check yet)
- [ ] Password meets requirements
- [ ] Account created successfully
- [ ] Redirected to email confirmation page

### 2. Verify Email Confirmation (if email configured)

- [ ] Check email inbox (test-customer-01@example.com)
- [ ] Confirmation email received
- [ ] Click confirmation link
- [ ] Account status changes to "verified"

### 3. Create Workspace

- [ ] Click "Create Workspace"
- [ ] Enter workspace name: "Test Workspace"
- [ ] Select industry: "Technology"
- [ ] Workspace created successfully
- [ ] Dashboard loads

### 4. Add First AI System

- [ ] Click "Add AI System"
- [ ] Enter system name: "Test LLM"
- [ ] Enter system type: "Language Model"
- [ ] System added to inventory
- [ ] Visible in inventory list

### 5. Run Risk Assessment

- [ ] Click "Start Assessment"
- [ ] Answer 12 EU AI Act screening questions
- [ ] Submit assessment
- [ ] Risk level calculated (Low/Medium/High)
- [ ] Risk assessment shows obligations

### 6. Generate Compliance Report

- [ ] Click "Generate Report"
- [ ] Select report type: "Compliance Assessment"
- [ ] PDF report downloads successfully
- [ ] Report contains system info and obligations
- [ ] PDF opens without errors

### 7. Check Reporting Features

- [ ] Dashboard shows metrics (systems, assessments, obligations)
- [ ] Obligations list shows generated obligations
- [ ] Can filter obligations by status
- [ ] Export to CSV works (if configured)

**First Customer Journey Complete:** ✅ Yes / ❌ No

---

## Phase 4: Monitoring Verification (5 min)

### 1. GitHub Actions Workflows

- [ ] Go to https://github.com/mininglife7-dev/newspulse-ai/actions
- [ ] See workflow runs:
  - [ ] `monitor-production-health.yml` (every 5 min)
  - [ ] `track-performance-baseline.yml` (every hour)
  - [ ] `aggregate-errors.yml` (every 12 hours)
- [ ] At least one successful run for each workflow
- [ ] No "spending limit exceeded" error

### 2. Alert Hub

- [ ] Go to https://your-vercel-app.vercel.app/api/alerts
- [ ] Returns JSON with alert structure (even if no alerts)
- [ ] Status indicates "healthy" or "degraded" (not error)

### 3. Health Checks

- [ ] Go to https://your-vercel-app.vercel.app/api/health
- [ ] Response shows:
  ```json
  {
    "ok": true,
    "status": "healthy",
    "db": "ok",
    "checks": {
      "supabase_url": true,
      "supabase_anon": true,
      "supabase_service": true
    }
  }
  ```

**Monitoring Systems Active:** ✅ Yes / ❌ No

---

## Phase 5: Emergency Procedures Readiness

### Rollback Capability

- [ ] Previous Vercel deployment accessible (click "Rollback" on Vercel)
- [ ] Database backup exists in Supabase
- [ ] Git history preserved for any commit

### Support Documentation

- [ ] `docs/governance/FOUNDER_QUICK_REFERENCE.md` reviewed
- [ ] Emergency contacts documented
- [ ] Escalation procedures understood

### Known Issues Log

- [ ] Any issues encountered documented
- [ ] Reproduction steps captured
- [ ] Severity assessed (critical/high/medium/low)

**Emergency Procedures Ready:** ✅ Yes / ❌ No

---

## Final Verification

| Phase                  | Status      | Pass/Fail |
| ---------------------- | ----------- | --------- |
| Founder Actions        | ✅ Complete | ✅ / ❌   |
| Production Deployment  | Verified    | ✅ / ❌   |
| First Customer Journey | Tested      | ✅ / ❌   |
| Monitoring Active      | Confirmed   | ✅ / ❌   |
| Emergency Ready        | Documented  | ✅ / ❌   |

---

## Launch Decision

**All phases passed?**

- [ ] Yes → **🚀 LAUNCH APPROVED** — Invite first real customer
- [ ] No → Investigate failures, retry verification, or roll back

**If launching:**

1. Send welcome email to first customer (use template in `docs/customer/COMMUNICATION_TEMPLATES.md`)
2. Activate monitoring alerts (Slack/email notifications)
3. Begin daily health checks (5 min per day, see `docs/governance/FOUNDER_QUICK_REFERENCE.md`)
4. Track customer journey (see `docs/customer/FIRST_CUSTOMER_PLAYBOOK.md`)

---

**Date Completed:** ________  
**Verified By:** ________  
**Confidence Level:** 🟢 High / 🟡 Medium / 🔴 Low
