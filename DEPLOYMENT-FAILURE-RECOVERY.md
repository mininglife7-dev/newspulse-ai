# Deployment Failure Recovery Procedures

**Document Status:** Cathedral Ω Enterprise DNA  
**Authority:** Governor Ω  
**Audience:** Founder, DevOps, On-Call Engineers

---

## Overview

This document defines automated recovery procedures for Supabase schema deployment failures. All procedures are designed to execute without Founder intervention and restore system to known-good state.

**Principle:** Fail-closed. If deployment fails, revert immediately. No partial states.

---

## Failure Scenarios & Recovery

### **Scenario 1: Pre-Deployment Validation Failure**

**Symptoms:**

- Workflow stops at "Validate Supabase configuration" step
- Error: "SUPABASE_PROJECT_ID not configured" or "format invalid"
- No schema changes applied

**Root Causes:**

- GitHub secret `SUPABASE_PROJECT_ID` not set
- GitHub secret `SUPABASE_DB_PASSWORD` not set
- Provided credentials malformed

**Automated Recovery:**

```bash
# No recovery needed - deployment hasn't started
# Action: Configure GitHub secrets and retry
```

**Manual Verification:**

```bash
# Check GitHub Actions logs
gh run view [RUN_ID] --log --repo mininglife7-dev/newspulse-ai

# Verify secrets exist
gh secret list --repo mininglife7-dev/newspulse-ai
```

**Founder Action Required:**

- Verify Supabase project ID: `yrroytwfdrafvajdfkok`
- Verify postgres password from Supabase dashboard
- Configure as GitHub repository secret: `SUPABASE_DB_PASSWORD`

---

### **Scenario 2: Database Connection Failure**

**Symptoms:**

- Workflow fails at "Connect to Supabase database"
- Error: "Connection refused" or "network unreachable"
- Schema deployment never starts

**Root Causes:**

- Supabase project offline or in maintenance
- Network connectivity issue
- Invalid connection parameters

**Automated Recovery:**

```bash
# Check Supabase project status
curl -s https://status.supabase.com | grep yrroytwfdrafvajdfkok

# Wait 30 seconds, retry automatically
# Workflow has 15-minute timeout
```

**Manual Verification:**

```bash
# Test connection manually
psql -h db.yrroytwfdrafvajdfkok.supabase.co -U postgres -d postgres \
  -c "SELECT 1" -v ON_ERROR_STOP=1

# Expected output: 1 (connection successful)
```

**Founder Action Required:**

- Verify Supabase project status at https://app.supabase.com
- Contact Supabase support if project is offline
- Retry deployment after service restored

---

### **Scenario 3: Schema Deployment Failure During Execution**

**Symptoms:**

- Workflow progresses to "Deploy Supabase schema"
- Error: "column X already exists" or "constraint violation"
- Deployment halts mid-way

**Root Causes:**

- Schema already partially deployed
- Incompatible schema version
- Data conflicts with new schema

**Automated Recovery (Schema is Idempotent):**

```bash
# All CREATE statements use IF NOT EXISTS
# Safe to re-run: duplicates are skipped
# Automatic retry: workflow will restart failed step

# To manually retry:
git push origin [branch-name]
# Workflow will re-execute automatically
```

**Manual Verification:**

```bash
# Check what actually got deployed
psql -h db.yrroytwfdrafvajdfkok.supabase.co -U postgres -d postgres \
  -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'"

# If count < 16, rerun deployment
# If count == 16, check indexes and policies
```

**Founder Action Required:**

- Review GitHub Actions logs for specific error
- Verify schema syntax in supabase/schema.sql
- Rerun deployment with `./deploy-schema.sh`

---

### **Scenario 4: Post-Deployment Verification Failure**

**Symptoms:**

- Schema deployment succeeds
- Verification step fails: "Only X tables found (expected 16+)"
- Dashboard reports missing objects

**Root Causes:**

- Network glitch during verification
- Service Role Key permissions insufficient
- Supabase cache not refreshed

**Automated Recovery:**

```bash
# Verification is read-only operation
# Automatic retry: wait 30 seconds, verify again
# (Supabase eventually-consistent model)

# Manual verification:
SERVICE_ROLE_KEY='...' ./verify-schema-deployment.sh
```

**Manual Verification:**

```bash
# Directly query Supabase
curl -s https://yrroytwfdrafvajdfkok.supabase.co/rest/v1/information_schema.tables \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  | jq 'length'

# Expected: 16+
```

**Founder Action Required:**

- Wait 2-3 minutes for Supabase cache refresh
- Rerun verification script
- If still failing, review Supabase logs

---

### **Scenario 5: RLS Policy Deployment Failure**

**Symptoms:**

- All tables deployed successfully
- Verification reports: "Only X policies found (expected 38+)"
- API queries work but show all rows (no tenant isolation)

**Root Causes:**

- Permissions issue: schema user can't create policies
- Policy syntax error
- SQL parsing error

**Automated Recovery:**

```bash
# Policies are recreated in dependency order
# Re-run deployment: creates policies with IF NOT EXISTS

./deploy-schema.sh
```

**Manual Verification - Check Active Policies:**

```bash
# Connect to database
psql -h db.yrroytwfdrafvajdfkok.supabase.co -U postgres -d postgres -c \
  "SELECT tablename, policyname FROM pg_policies WHERE schemaname='public' ORDER BY tablename"

# Expected: 38+ rows
```

**Founder Action Required:**

- Verify schema owner has necessary permissions
- Review Supabase database role configuration
- Redeploy schema if policies were skipped

---

### **Scenario 6: E2E Test Failure Post-Deployment**

**Symptoms:**

- Schema deployment succeeds and verifies
- E2E test suite fails
- Specific test: workspace creation returns 500 error

**Root Causes:**

- RLS policy blocking API requests
- Application code incompatibility
- Missing migration step

**Automated Recovery:**

```bash
# E2E tests are read-write against real database
# If tests fail, schema is working but application layer has issue

# Do NOT retry without understanding failure
# Action: Review test output for specific error

npm test tests/e2e-registration.integration.test.ts -- --reporter=verbose
```

**Manual Verification:**

```bash
# Test workspace creation manually
curl -X POST https://yrroytwfdrafvajdfkok.supabase.co/rest/v1/workspaces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [USER_TOKEN]" \
  -d '{"name":"test","owner_id":"...","company_id":"..."}'

# Check response: should be 2xx or known 4xx error (not 500)
```

**Founder Action Required:**

- Review application API routes for bugs
- Verify RLS policies allow API requests
- Check error logs in Vercel dashboard
- Fix application code if needed, redeploy

---

### **Scenario 7: Production Regression After Deployment**

**Symptoms:**

- Schema deployment succeeded
- Customers report issues registering
- Error rate spike in Vercel dashboard
- Specific failures: workspace creation, team management

**Root Causes:**

- Schema migration broke application assumptions
- RLS policies too restrictive
- Missing data in existing records

**Automated Recovery (Rollback Procedure):**

```bash
# IMPORTANT: Backup production data FIRST
# Do not truncate/delete without backup

# Option A: Revert to previous database backup
# 1. Access Supabase dashboard
# 2. Settings → Backups → Restore
# 3. Select backup from before deployment
# 4. Confirm restoration

# Option B: Roll back application code (schema works, app doesn't)
git revert HEAD
git push origin main
# Vercel auto-deploys

# Option C: Re-run schema deployment (schema changes are idempotent)
./deploy-schema.sh
```

**Manual Verification:**

```bash
# Monitor error rate
# Expected: return to baseline within 5 minutes of rollback

# Test critical flow manually
# 1. Sign up with test email
# 2. Create workspace
# 3. Add team member
# 4. Verify no 500 errors
```

**Founder Action Required:**

- Decide rollback strategy based on root cause
- If database backup needed, Supabase restore is automatic
- If application fix needed, deploy code change
- Monitor error rates for 30 minutes post-fix

---

## Automated Rollback Checklist

**Automatic Actions (No Founder Intervention):**

- ✅ Pre-deployment validation catches configuration issues
- ✅ Schema is idempotent (safe to re-run)
- ✅ Post-deployment verification retries on transient failures
- ✅ GitHub Actions has failure notifications enabled
- ✅ Vercel auto-detects production errors

**Semi-Automatic Actions (Founder Review Required):**

- ⚠️ E2E test failures require code review
- ⚠️ Production regression requires root-cause analysis
- ⚠️ Database rollback requires confirmation

**Manual Actions (Founder Decision Required):**

- 🔴 Reverting to database backup
- 🔴 Reverting application code
- 🔴 Post-incident root cause analysis

---

## Recovery Time Objectives (RTO)

| Scenario                          | Time to Detect | Time to Recover        | RTO    |
| --------------------------------- | -------------- | ---------------------- | ------ |
| Pre-deployment validation failure | < 1 min        | 15 min (manual config) | 20 min |
| Database connection failure       | < 1 min        | 5 min (wait + retry)   | 10 min |
| Schema deployment failure         | 5 min          | 5 min (re-run)         | 15 min |
| Verification failure              | 10 min         | 2 min (cache refresh)  | 5 min  |
| E2E test failure                  | 15 min         | 15 min (debug + fix)   | 30 min |
| Production regression             | < 5 min        | 10 min (rollback)      | 15 min |

---

## Monitoring & Alerting

**Automatic Alerts (GitHub Actions):**

- Deployment workflow failure → @Founder notification
- E2E test failure → @Founder + @DevOps notification
- Deployment exceeds 15-minute timeout → escalation

**Production Monitoring:**

- Error rate spike > 5% above baseline → alert
- Database query latency spike > 500ms → alert
- Registration failure rate > 1% → alert

**Dashboard Monitoring:**

- Founder reviews: `deployment-status-*.json` after each deployment
- DevOps reviews: Vercel error logs in real-time
- On-call reviews: Supabase database logs for slowness

---

## Post-Incident Learning

**After Every Failure:**

1. Document root cause
2. Update this playbook
3. Add preventive check to pre-deployment validation
4. Update monitoring thresholds
5. Add scenario to test suite

**Cathedral DNA Update:**

- Every failure becomes a test case
- Every test case becomes an automated check
- Every automated check prevents recurrence

---

## Escalation Path

```
Deployment Failure Detected
         ↓
Automated Recovery Attempted (idempotent re-run)
         ↓
         ├─ Success → Monitor for 30 min
         │
         └─ Failure → Alert Founder
                     ↓
              Review Error Logs
                     ↓
              Decide Recovery Strategy
                     ↓
         ┌─────────────────────────────┐
         │                             │
    Retry Deploy          Rollback to Backup
         │                             │
         └─────────────────────────────┘
                     ↓
              Monitor & Verify
                     ↓
              Post-Incident Review
                     ↓
              Update Playbooks
```

---

## Contact & Escalation

**On-Call (First Response):** Governor Ω (automated)
**Review (Second Response):** Founder
**Escalation (Third Response):** Supabase Support (if database issue)

**Critical Contact Info:**

- Supabase Project: yrroytwfdrafvajdfkok
- Supabase Status: https://status.supabase.com
- GitHub Actions Logs: https://github.com/mininglife7-dev/newspulse-ai/actions
- Vercel Dashboard: https://vercel.com/lalit-kumar-d-s-projects/newspulse-ai

---

**This document is living DNA.** Update after every incident. Share learnings with the Cathedral.

_Last Updated: 2026-07-16_  
_Authority: Governor Ω_
