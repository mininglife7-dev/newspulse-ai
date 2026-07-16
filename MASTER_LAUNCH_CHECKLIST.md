# MASTER LAUNCH CHECKLIST — Anne Catherine Customer Launch
**From:** Governor Ω  
**Purpose:** Single executable document for Founder-directed customer launch  
**Scope:** From decision → customer onboarding → 72-hour stability

---

## PRE-DECISION: Clarification Required

**STATUS:** ⏳ AWAITING FOUNDER DECISION

Before proceeding below, Founder must resolve one critical question:

### Frankfurt Deployment Status
Two sources claim contradictory things:

**Claim A:** Frankfurt is deployed (commit e46309c)  
**Claim B:** Frankfurt credentials needed (NEXT_ACTION.md)

**Founder must choose ONE:**

- [ ] **OPTION 1** — "Frankfurt is deployed. Credentials already configured."
  - Governor executes: 65-minute verification + 15-min launch = **90 minutes total**
  - Anne Catherine ready: [timestamp + 90 min]

- [ ] **OPTION 2** — "Frankfurt credentials to follow" (Founder provides 4 values)
  - Governor executes: 5-min config + 65-min verification + 15-min launch = **85 minutes total**
  - Anne Catherine ready: [timestamp + 85 min]

- [ ] **OPTION 3** — "Use Tokyo production (fallback)"
  - Governor executes: 15-minute launch only = **15 minutes total**
  - Anne Catherine ready: [timestamp + 15 min]

**If choosing OPTION 2:**
Provide these 4 values from new Frankfurt Supabase project:
```
Project Reference ID: [e.g., cwbcvjiklrrkpmybefdp]
Project URL: [e.g., https://cwbcvjiklrrkpmybefdp.supabase.co]
Session Pooler Connection String: [from Settings → Database]
Service Role Key: [from Settings → API]
```

**Founder Decision Made At:** [TIME]  
**Founder Selected Option:** [1/2/3]  

---

## PHASE 1: Founder Configuration (if Option 2)

**Duration:** 5 minutes  
**Prerequisite:** Option 2 chosen, 4 credentials provided

**Action 1: Update GitHub Secrets**
```bash
# Visit: https://github.com/mininglife7-dev/newspulse-ai → Settings → Secrets and Variables → Actions

# Add or update these secrets:
SUPABASE_DB_URL = [Session Pooler Connection String from Founder]
SUPABASE_DB_PASSWORD = [Database password from Frankfurt project]
```

✅ Confirmed secrets updated: [checkbox]  
⏰ Time: [timestamp]

---

**Action 2: Update GitHub Variables**
```bash
# Visit same location: Actions secrets and variables

# Add or update these variables:
NEXT_PUBLIC_SUPABASE_URL = [Project URL from Founder, e.g., https://xxxx.supabase.co]
NEXT_PUBLIC_SUPABASE_ANON_KEY = [Anon key from Founder]
```

✅ Confirmed variables updated: [checkbox]  
⏰ Time: [timestamp]

---

**Action 3: Update Vercel Production Environment**
```bash
# Visit: https://vercel.com → mininglife7-dev/newspulse-ai → Settings → Environment Variables

# Update for Production environment:
NEXT_PUBLIC_SUPABASE_URL = [Same as above]
NEXT_PUBLIC_SUPABASE_ANON_KEY = [Same as above]
SUPABASE_SERVICE_ROLE_KEY = [From Frankfurt project]
FIRECRAWL_API_KEY = [Keep existing]
OPENAI_API_KEY = [Keep existing]
```

✅ Confirmed production environment updated: [checkbox]  
⏰ Time: [timestamp]

---

**Action 4: Trigger Deployment**
```bash
# Push to main to trigger Vercel redeploy
git fetch origin main
git log origin/main -1 --oneline
# If recent: Skip to Phase 2
# If stale: Manually trigger redeploy at https://vercel.com

# Watch deployment status: https://vercel.com/mininglife7-dev/newspulse-ai/deployments
# Wait for: "Ready" status (green) — takes 2-3 minutes
```

✅ Deployment triggered: [checkbox]  
✅ Deployment reached "Ready" status: [checkbox]  
⏰ Time: [timestamp]

---

## PHASE 2: Environment Verification (All Options)

**Duration:** 5 minutes  
**Prerequisite:** Deployment successful (Phase 1 if Option 2)

### Check 1: Health Endpoint
```bash
curl -X GET https://newspulse-ai.vercel.app/api/health

# Expected response:
# {"status":"healthy","database":"connected","timestamp":"..."}
```

✅ Returns 200 OK with healthy status: [checkbox]  
Response time: [ms]  
⏰ Time: [timestamp]

---

### Check 2: Landing Page
```bash
# Open: https://newspulse-ai.vercel.app
# Verify: Page loads without errors
# Check: No red error messages in browser console
```

✅ Landing page loads: [checkbox]  
✅ No console errors: [checkbox]  
⏰ Time: [timestamp]

---

### Check 3: Supabase Connection
```bash
# Visit: https://supabase.com → [Your project] → Logs
# Verify: No connection errors in last 5 minutes
# Check: Database shows healthy status
```

✅ Supabase dashboard shows healthy: [checkbox]  
⏰ Time: [timestamp]

---

### Check 4: Vercel Logs
```bash
# Visit: https://vercel.com → Deployments → [Latest] → Logs
# Verify: No ERROR or CRITICAL entries
# Check: Build logs show successful build
```

✅ No error logs: [checkbox]  
✅ Build succeeded: [checkbox]  
⏰ Time: [timestamp]

---

### ⚠️ VERIFICATION FAILED?
If ANY check failed:
- **STOP here** — Do not proceed
- Check error messages in logs
- Review TROUBLESHOOTING_GUIDE.md for solutions
- Contact Governor with error details

---

## PHASE 3: Customer Journey Verification (Options 1 & 2 only)

**Duration:** 60 minutes  
**Prerequisite:** Phase 2 all checks passed

**Running:** 10 sequential verification phases  
**Success Criteria:** All phases pass without errors

### Verification Phase 3.1: Authentication
- ✅ User signup works
- ✅ Email verification flow triggers
- ✅ User can login with credentials
- ✅ Session created and persisted

See: DEPLOYMENT_PLAYBOOKS.md "Phase 2.1" for detailed steps  
⏰ Completed at: [timestamp]

---

### Verification Phase 3.2: Workspace Creation
- ✅ Workspace can be created
- ✅ Creator automatically becomes member
- ✅ No orphaned records in database
- ✅ Atomic transaction verified

See: DEPLOYMENT_PLAYBOOKS.md "Phase 2.2" for detailed steps  
⏰ Completed at: [timestamp]

---

### Verification Phase 3.3: AI System Inventory
- ✅ 3 test systems created successfully
- ✅ Systems retrievable via API
- ✅ Database count matches API response
- ✅ No data corruption

See: DEPLOYMENT_PLAYBOOKS.md "Phase 2.3" for detailed steps  
⏰ Completed at: [timestamp]

---

### Verification Phase 3.4: Risk Assessment
- ✅ Assessment created for system
- ✅ Status workflow (draft → review → finalized) works
- ✅ Data persisted correctly in database
- ✅ No validation errors

See: DEPLOYMENT_PLAYBOOKS.md "Phase 2.4" for detailed steps  
⏰ Completed at: [timestamp]

---

### Verification Phase 3.5: Obligations & Evidence
- ✅ EU AI Act obligations returned
- ✅ Evidence upload successful
- ✅ Evidence retrievable via API
- ✅ Database integrity verified

See: DEPLOYMENT_PLAYBOOKS.md "Phase 2.5" for detailed steps  
⏰ Completed at: [timestamp]

---

### Verification Phase 3.6: Dashboard Metrics
- ✅ All metrics present (systems, assessments, risk distribution)
- ✅ Calculations correct for test data
- ✅ Readiness percentage calculated
- ✅ No null or missing values

See: DEPLOYMENT_PLAYBOOKS.md "Phase 2.6" for detailed steps  
⏰ Completed at: [timestamp]

---

### Verification Phase 3.7: Report Generation
- ✅ PDF report generated successfully
- ✅ Report contains correct organization name
- ✅ Data populated correctly in report
- ✅ File size > 50KB (proper content)

See: DEPLOYMENT_PLAYBOOKS.md "Phase 2.7" for detailed steps  
⏰ Completed at: [timestamp]

---

### Verification Phase 3.8: Data Isolation
- ✅ Second user cannot access first user's workspace
- ✅ RLS policies enforced at database level
- ✅ No data leakage between users
- ✅ Complete workspace isolation verified

See: DEPLOYMENT_PLAYBOOKS.md "Phase 2.8" for detailed steps  
⏰ Completed at: [timestamp]

---

### Verification Phase 3.9: Performance
- ✅ Health endpoint: < 200ms (x5 tests)
- ✅ Systems listing: < 500ms (x5 tests)
- ✅ Dashboard: < 1s (complex queries)
- ✅ Database: CPU < 20%, Memory < 50%

See: DEPLOYMENT_PLAYBOOKS.md "Phase 2.9" for detailed steps  
⏰ Completed at: [timestamp]

---

### Verification Phase 3.10: Error Handling
- ✅ Invalid auth returns 401 (not 5xx)
- ✅ Missing resource returns 404 (not 5xx)
- ✅ Bad JSON returns 400 (not 5xx)
- ✅ No unhandled exceptions in logs

See: DEPLOYMENT_PLAYBOOKS.md "Phase 2.10" for detailed steps  
⏰ Completed at: [timestamp]

---

### ⚠️ VERIFICATION FAILED?
If ANY phase failed:
- **STOP verification** — Do not proceed
- Document which phase failed and error details
- Implement fix or rollback
- Re-run failed phase
- Report status to Founder

---

## PHASE 4: Go/No-Go Decision

**Prerequisite:** All 10 verification phases passed (Options 1 & 2) OR Phase 2 only (Option 3)

### Verification Summary
```
VERIFICATION RESULTS:
├─ Environment Configuration ✅
├─ Phase 1: Auth ✅
├─ Phase 2: Workspace ✅
├─ Phase 3: Inventory ✅
├─ Phase 4: Assessment ✅
├─ Phase 5: Obligations ✅
├─ Phase 6: Dashboard ✅
├─ Phase 7: Report ✅
├─ Phase 8: Isolation ✅
├─ Phase 9: Performance ✅
└─ Phase 10: Error Handling ✅

GATES PASSED: 10/10 ✅
```

### Decision

- [ ] **GO FOR PRODUCTION** — All gates passed, proceed with launch
- [ ] **NO-GO** — Issues found, DO NOT launch (see issues below)

---

**If NO-GO, document issues:**
```
Issue 1: [Description]
  Root cause: [Analysis]
  Impact: [Blocking/Non-blocking]
  Timeline: [When fix available]
  
Issue 2: [Description]
  ...
```

---

## PHASE 5: Production Launch

**Duration:** 15 minutes  
**Prerequisite:** GO decision made in Phase 4

**STATUS:** Already deployed (Phases 1-2)  
**ACTION:** Activate customer access

### Action 1: Verify Production URLs
```
[ ] Platform URL: https://newspulse-ai.vercel.app ✅
[ ] Health check: https://newspulse-ai.vercel.app/api/health ✅
[ ] Landing page loads: https://newspulse-ai.vercel.app ✅
```

✅ Confirmed: [checkbox]  
⏰ Time: [timestamp]

---

### Action 2: Verify Database Backup
```bash
# Supabase → [Project] → Backups
# Check: Latest backup timestamp
# Expected: Within last 24 hours

Backup confirmed: [checkbox]
Last backup: [timestamp]
```

---

### Action 3: Enable Monitoring
```bash
# Activate POST_LAUNCH_MONITORING.md procedures
# Governor will monitor: Error rates, response times, customer journey
# Alert threshold: Any error rate > 1% triggers immediate investigation

Monitoring activated: [checkbox]
⏰ Time: [timestamp]
```

---

### Action 4: Notify Anne Catherine
**Send message:**
```
Subject: Your EURO AI Platform is Ready

Hi [Customer name],

Your EURO AI platform is live and ready to use!

Platform URL: https://newspulse-ai.vercel.app

You can now:
1. Create your account
2. Set up your organization
3. Begin your compliance workflow

If you have any questions, check our support materials:
- Customer FAQ: [link]
- Getting Started: [link]
- Troubleshooting: [link]

We're monitoring your experience closely and will be here to support
you throughout the next 7 days.

Looking forward to showing you how EURO AI simplifies EU AI Act compliance!

Best regards,
Governor (AI Platform Support)
```

✅ Customer notified: [checkbox]  
⏰ Time: [timestamp]

---

### Action 5: Start Customer Onboarding
See: CUSTOMER_ONBOARDING_CHECKLIST.md

**Day 1 Checkpoints:**
- [ ] Customer received launch notification
- [ ] Customer accessed platform
- [ ] Customer completed signup
- [ ] Customer created workspace
- [ ] First daily check-in with customer

✅ Day 1 complete: [checkbox]  
⏰ Time: [timestamp]

---

## PHASE 6: Post-Launch Monitoring (Continuous, 72 hours)

**Duration:** Ongoing (72-hour critical window)  
**Procedure:** See POST_LAUNCH_MONITORING.md

### Critical First Hour Checks (Every 5 minutes)
```
⏰ 0 min: Health check ✅
⏰ 5 min: Error rate check ✅
⏰ 10 min: Response time check ✅
⏰ 15 min: Database health ✅
⏰ 20 min: Customer journey test ✅
⏰ 25 min: Log review ✅
⏰ 30 min: Dashboard check ✅
... (every 5 min for first hour)
```

---

### 6-Hour Stability Window
- Continue monitoring every 15 minutes
- Check for performance degradation
- Monitor customer activity (should see signups/logins)
- Verify no error spikes

---

### 24-Hour Daily Check
See: POST_LAUNCH_MONITORING.md "Daily Monitoring Checklist"
- [ ] All health metrics green
- [ ] Customer journey working
- [ ] Logs clean
- [ ] No escalations
- [ ] Daily sign-off complete

✅ Day 1 health check: [checkbox]  
⏰ Time: [timestamp]

---

### 48-Hour Check
- Verify sustained stability
- Check customer progress
- Monitor for any degradation

✅ Day 2 health check: [checkbox]  
⏰ Time: [timestamp]

---

### 72-Hour Final Check
- Confirm all systems stable
- Generate stability report
- Customer validation complete

✅ Day 3 health check: [checkbox]  
⏰ Time: [timestamp]

---

## PHASE 7: Customer Success (Days 2-7)

**Duration:** 7 days  
**Procedure:** See CUSTOMER_ONBOARDING_CHECKLIST.md and ANNE_CATHERINE_ALPHA_SCENARIO_2026_07_23.md

### Daily Checkpoints

**Day 2:**
- [ ] Customer has workspace setup
- [ ] Customer has added AI systems
- [ ] Customer can access dashboard
- [ ] Governor check-in with customer

**Day 3:**
- [ ] Customer has started assessment
- [ ] Customer understands compliance workflow
- [ ] No friction points reported
- [ ] Governor support engagement

**Day 4:**
- [ ] Customer has completed first assessment
- [ ] Customer viewing obligations
- [ ] Customer collecting evidence
- [ ] Governor feedback integration

**Day 5:**
- [ ] Customer generating report
- [ ] Report quality verified
- [ ] Customer understands compliance status
- [ ] Governor recommendations provided

**Day 6:**
- [ ] Customer refining assessments
- [ ] Customer gathering additional evidence
- [ ] Customer building confidence in platform
- [ ] Governor coaching

**Day 7:**
- [ ] Customer validates full workflow
- [ ] Customer can demonstrate compliance to auditors
- [ ] Customer satisfied with platform
- [ ] Success criteria met

---

## PHASE 8: Success Validation (End of 7 days)

**Prerequisite:** All 7 daily checkpoints passed

### Customer Feedback Collection
```
[ ] Can customer understand their compliance status?
[ ] Can customer take required actions?
[ ] Can customer collect and organize evidence?
[ ] Can customer demonstrate compliance to auditors?
[ ] Does customer trust the platform?
```

### Success Criteria Met?
- [ ] Customer completed full 7-day journey
- [ ] All workflow steps functioning correctly
- [ ] Customer data integrity verified
- [ ] No critical issues encountered
- [ ] Customer satisfaction > 80%

---

## CRITICAL ISSUE ESCALATION

### If Issue Detected at Any Phase

**Severity Assessment:**
- **CRITICAL:** Customer blocked from workflow → STOP & ROLLBACK
- **HIGH:** Performance degradation → INVESTIGATE & FIX
- **MEDIUM:** Non-blocking errors → DOCUMENT & CONTINUE
- **LOW:** Info-level issues → LOG & MONITOR

**Escalation Path:**
1. Governor identifies issue
2. Governor notifies Founder immediately
3. Governor implements fix or rollback
4. Governor updates Anne Catherine (transparency)
5. Governor continues monitoring

See: POST_LAUNCH_MONITORING.md "Incident Response Protocol"

---

## Success Completion

**Status:** ✅ COMPLETE when all phases pass

```
✅ Pre-decision: Founder clarification received
✅ Phase 1: Configuration (if Option 2)
✅ Phase 2: Environment verified
✅ Phase 3: Customer journey verified (10/10 phases)
✅ Phase 4: Go/No-Go decision (GO issued)
✅ Phase 5: Production launch complete
✅ Phase 6: 72-hour monitoring green
✅ Phase 7: Customer success (7-day journey)
✅ Phase 8: Success validation

PLATFORM STATUS: 🟢 PRODUCTION READY
CUSTOMER STATUS: ✅ VALIDATED & SATISFIED
NEXT PHASE: Scale customer acquisition
```

---

## Reference Documents

**For Launch Decision:**
- FOUNDER_CLARIFICATION_REQUEST.md — All three options explained

**For Deployment Procedures:**
- DEPLOYMENT_PLAYBOOKS.md — Detailed step-by-step for both paths

**For Customer Support:**
- CUSTOMER_ONBOARDING_CHECKLIST.md — Daily procedures (Days 1-7)
- ANNE_CATHERINE_ALPHA_SCENARIO_2026_07_23.md — Expected customer journey
- CUSTOMER_FAQ.md — Common questions + answers
- TROUBLESHOOTING_GUIDE.md — Support escalation procedures

**For Operations:**
- POST_LAUNCH_MONITORING.md — 72-hour monitoring protocol
- RISK_REGISTER.md — Risk assessment + mitigations
- PROJECT_STATE.md — Build status + infrastructure

---

## Summary

**This checklist is your operational runbook for customer launch.**

- ✅ **Pre-decision:** Confirm Frankfurt/Tokyo path
- ✅ **Phases 1-2:** Environment configuration & verification (5-70 min)
- ✅ **Phase 3:** Customer journey verification (60 min, if needed)
- ✅ **Phase 4:** Go/No-Go decision (1 min)
- ✅ **Phase 5:** Production launch (15 min)
- ✅ **Phase 6:** Post-launch monitoring (72 hours)
- ✅ **Phase 7:** Customer success (7 days)
- ✅ **Phase 8:** Success validation (1 day)

**Total time to customer launch:** 15-90 minutes depending on path chosen

**Total time to validated customer:** 8 days

Follow this checklist step-by-step. Governor is ready to execute anything needed.

**Next action:** Make your one-sentence decision (Option 1, 2, or 3) in FOUNDER_CLARIFICATION_REQUEST.md

