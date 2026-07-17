# Rollback Procedure

**Type**: Procedure  
**Audience**: Deployers, On-Call Engineers, Incident Commanders  
**Authority**: Governor Ω  
**Status**: Active  
**Last Updated**: 2026-07-16  
**Review Schedule**: After each rollback or quarterly  
**Owner**: Governor Ω

---

## Purpose

Quick procedure for rolling back production to the previous known-good deployment when current deployment causes issues. Goal: Restore service to customers within 5-10 minutes.

**When to use**: After deployment verification reveals critical issues

**Not for**: Reverting code to fix bugs (use normal deployment instead)

**Time estimate**: 5-10 minutes (including verification)

---

## Quick Start (2 min)

If you need to rollback immediately:

1. Go to https://vercel.com/lalit-kumar-d-s-projects/newspulse-ai
2. Find "Deployments" tab
3. Click on the deployment before the current one (second in list)
4. Click "Rollback to this deployment"
5. Wait 2-3 minutes for Vercel to redeploy
6. Verify with: `curl https://newspulse-ai.vercel.app/api/health | jq .`

Done. Continue to "Verification" section below.

---

## Full Rollback Procedure

### Step 1: Assess Severity (1 min)

Before rolling back, confirm this is necessary:

**Ask**:

- Is production broken or severely degraded?
- Are customers unable to use core features?
- Is there data loss or security exposure?

**If yes to any**: Proceed with rollback
**If no**: Consider fixing forward instead of rollback

### Step 2: Identify Previous Deployment (1 min)

**In Vercel Dashboard**:

1. Go to: https://vercel.com/lalit-kumar-d-s-projects/newspulse-ai
2. Click "Deployments" tab
3. Look at deployment list (most recent first)
4. Find the one marked ✅ successful (usually second in list)
5. Note the deployment ID (e.g., `dpl_3tMYHQP1zMZDmkK1q7qwv63UhR1X`)

**Verify previous deployment**:

- [ ] Status: ✅ (green check, successful)
- [ ] No error messages in logs
- [ ] Timestamp: Shortly before current broken deployment

### Step 3: Declare Rollback (1 min)

Notify the team immediately:

**Slack** (`#incidents` or appropriate channel):

```
@channel 🔄 ROLLING BACK to [deployment date/time]
Reason: [Brief reason — e.g., "Auth endpoints returning 500 errors"]
ETA: 5 minutes for service restoration
IC: [Your name]
```

### Step 4: Execute Rollback (1 min)

**In Vercel Dashboard**:

1. Click on the previous successful deployment (the one you identified in Step 2)
2. Look for "Rollback" button or menu option
3. Click "Rollback to this Deployment"
4. Confirm when prompted: "Yes, rollback"
5. Vercel will:
   - Cancel current deployment (if still in progress)
   - Activate the previous deployment
   - Restart infrastructure with old code

**Wait for completion**:

- Vercel shows deployment status
- Typically completes within 2-3 minutes
- Status changes to ✅ when done

### Step 5: Verify Rollback Succeeded (2 min)

**Health Check** (immediate):

```bash
curl -s https://newspulse-ai.vercel.app/api/health | jq .
```

- Should return: `{"status":"healthy",...}`
- Response time: <100ms
- If error: See Error Handling below

**Detailed Health** (verify components):

```bash
curl -s https://newspulse-ai.vercel.app/api/health/detailed | jq .
```

- All components should show `status: "ok"`
- Check: database, auth, api

**Manual Smoke Tests** (verify key features):

1. Visit: https://newspulse-ai.vercel.app
2. Log in with test account
3. Navigate to main features:
   - Workspace loads
   - Can view inventory
   - Can start assessment
   - Can view evidence
4. Check browser console: No major errors (some warnings ok)

**Verify error rate**:

- Supabase dashboard → Logs
- Filter: Last 5 minutes
- Should show near-zero errors
- If still high: See Error Handling section

### Step 6: Announce Resolution (1 min)

**Slack** (same channel):

```
✅ ROLLBACK COMPLETE
Service restored to [previous deployment date]
Status: Healthy, all endpoints responding normally
Customers can resume using service

Next: Root cause analysis within 24 hours
```

---

## Verification Checklist

Before considering rollback complete:

- [ ] Health endpoint responds successfully (`/api/health` returns healthy)
- [ ] Detailed health check passes (all components ok)
- [ ] Manual smoke tests pass (main features work)
- [ ] Error rate is near normal (<1%)
- [ ] No spike in error logs
- [ ] Vercel dashboard shows deployment as ✅ active
- [ ] Team notified in Slack

---

## Error Handling

### If Rollback Fails to Complete

**Symptom**: Vercel shows deployment status but is stuck or showing error

**Action**:

1. Wait 5 minutes (sometimes Vercel takes longer)
2. Refresh Vercel page (F5)
3. Check health endpoint again
4. If still not working, contact Vercel support with deployment ID

### If Previous Deployment Also Shows Issues

**Problem**: Rollback completed but service still broken

**Action**:

1. Previous deployment may also be broken
2. Roll back to the one before (third in list)
3. Verify that one works
4. If it does: Use that deployment
5. If entire history is broken: This is critical — escalate to tech lead/Founder

### If Rollback Breaks Data or Migrations

**Problem**: Previous deployment can't handle current database schema

**Scenario**: If database migration was deployed with current code, rolling back code but not database causes mismatch

**Decision**:

- **Option A**: Keep current code, fix the bug and redeploy
- **Option B**: Revert database migration to match rolled-back code (risky — may lose data)
- **Action**: Escalate to tech lead or DBA immediately

### If You Cannot Access Vercel Dashboard

**Action**:

1. Have someone else with access execute rollback
2. Or contact Vercel support for manual rollback
3. Provide: Deployment ID you want to rollback to
4. Vercel support can rollback for you

---

## Post-Rollback Analysis

After rollback succeeds and service is restored:

### Immediate (within 1 hour)

- [ ] What went wrong? (Which feature/endpoint/data issue)
- [ ] When was it deployed? (Time and who deployed)
- [ ] Why did tests not catch it?
- [ ] Should we have caught it in pre-deployment checks?

### Follow-Up (within 24 hours)

- [ ] Complete INCIDENT_POSTMORTEM.md checklist
- [ ] Team reviews root cause
- [ ] Plan prevention measures
- [ ] Document in LEARNING_LOG.md
- [ ] Create GitHub issue for follow-up fix

### Example Follow-Up

If authentication broke in recent deployment:

1. Review the auth code change
2. What test is missing? → Add test case
3. What check is missing? → Add pre-deployment check
4. Re-deploy the fix with new test coverage

---

## Comparison: Rollback vs. Fix Forward

**Use Rollback if**:

- Incident is critical (customers blocked)
- Root cause is unclear
- Fix would take >30 minutes
- Risk of fix is unknown
- Easier to roll back than fix

**Use Fix Forward if**:

- Incident is not customer-blocking
- Root cause is obvious
- Fix is quick (<10 minutes) and low-risk
- Rollback would cause other issues (data migration)

**Example**: Auth is broken (critical) → Rollback
**Example**: Slow query causes timeouts → Fix forward (add index)

---

## Database Migrations & Rollback

**Important**: Rollback only reverts application code, NOT database schema changes.

**Scenario A**: Deployment includes database migration

- Code requires new schema
- Rolling back code leaves new schema in place
- ❌ Old code + new schema = mismatch
- **Action**: Cannot simply rollback. Either:
  1. Keep current code and fix the bug
  2. Revert database migration (risky, may lose data)
  3. Contact DBA/Founder for guidance

**Scenario B**: Deployment is code-only (no migration)

- Code is optional-compatible with previous schema
- ✅ Can safely rollback
- **Action**: Safe to rollback

**Prevention**: Never deploy database migrations with critical code changes if you might need to rollback. Separate migrations to separate deployments.

---

## Related Documents

- `RUNBOOKS/DEPLOYMENT.md` — Deployment procedure (references rollback)
- `RUNBOOKS/INCIDENT_RESPONSE.md` — Incident response (includes rollback decision point)
- `CHECKLISTS/POST_DEPLOYMENT_VERIFICATION.md` — Verification that leads to rollback decision
- `PROCEDURES/GIT_WORKFLOW.md` — Git conventions

---

## Rollback Checklist (Quick Reference)

Quick checklist for on-call engineer:

- [ ] 1. Verify issue is critical/urgent
- [ ] 2. Get previous deployment ID from Vercel
- [ ] 3. Announce rollback in Slack
- [ ] 4. Click "Rollback" in Vercel dashboard
- [ ] 5. Wait 2-3 minutes for completion
- [ ] 6. Verify health endpoints respond
- [ ] 7. Announce completion in Slack
- [ ] 8. Schedule postmortem for root cause analysis

---

## Updated By

**Session**: Governor Ω (STAGE 4 Phase 4.2)  
**Date**: 2026-07-16  
**Changes**: Initial creation as part of STAGE 4 Phase 4.2 (Operational Knowledge)
