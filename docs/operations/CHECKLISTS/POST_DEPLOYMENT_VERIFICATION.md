# Post-Deployment Verification Checklist

**Type**: Checklist  
**Audience**: Deployers, Release Leads  
**Authority**: Governor Ω  
**Status**: Active  
**Last Updated**: 2026-07-16  
**Review Schedule**: After every deployment  
**Owner**: Governor Ω

---

## Purpose

Verify production deployment succeeded and service is operating normally. Use this checklist immediately after every deployment to `main`.

**When to use**: Within 10 minutes after deployment shows ✅ on Vercel

**Time estimate**: 10-15 minutes

**Success criteria**: All checks pass without errors or warnings

---

## Deployment Verification

- [ ] **Vercel deployment shows ✅**
  - Go to GitHub PR or Vercel dashboard
  - Check: "Vercel" status shows green checkmark
  - If red: See Error Handling section below
  - Note: Deployment typically takes 2-5 minutes

- [ ] **No build errors in Vercel logs**
  - Vercel dashboard → Deployments tab → Latest
  - Check Build Logs: No error messages
  - Check: TypeScript compilation succeeded
  - Check: Next.js build succeeded
  - Check: Migration ran successfully (if database change)

- [ ] **Deployment timestamp matches expectation**
  - Note: When deployment should have happened
  - Actual time: When Vercel shows completed
  - Acceptable lag: 5-10 minutes from push to complete

---

## Service Health Verification

- [ ] **Health endpoint responds**
  ```bash
  curl -s https://newspulse-ai.vercel.app/api/health | jq .
  ```
  - Should return: `{"status":"healthy",...}`
  - Response time: <100ms
  - If error: Check health endpoint logs

- [ ] **Detailed health check passes**
  ```bash
  curl -s https://newspulse-ai.vercel.app/api/health/detailed | jq .
  ```
  - All components should report: `status: "ok"`
  - Components to check:
    - `database`: Connected to Supabase
    - `auth`: Supabase auth working
    - `api`: API routes responding
  - If any fails: See Error Handling section

- [ ] **Database connectivity confirmed**
  - Supabase dashboard: Online indicator (usually green)
  - No connection pool issues
  - Recent queries executing normally (check SQL Editor)

- [ ] **No immediate error spike**
  - Supabase dashboard → Logs tab
  - Filter: Last 10 minutes
  - Error count: Should be near zero (normal <1% error rate)
  - If high: Check which endpoint is failing

---

## Feature-Specific Verification

Depending on what was deployed, verify specific features:

### If Authentication Modified
- [ ] **Test login flow**
  - Go to: https://newspulse-ai.vercel.app
  - Click: Login button
  - Action: Enter test account credentials
  - Verify: Successfully logged in and redirected to workspace
  - Verify: No error messages in browser console

### If Workspace/Inventory Modified
- [ ] **Test workspace operations**
  - Create a new workspace (if feature exists)
  - Verify: Workspace appears in list
  - Verify: Can switch between workspaces
  - Verify: Cannot see other users' data

- [ ] **Test inventory features**
  - Add a new AI system
  - Verify: Appears in system list
  - Verify: Can edit system details
  - Verify: Can delete system

### If Assessment Modified
- [ ] **Test assessment workflow**
  - Create new assessment
  - Verify: Assessment appears with correct status (draft)
  - Add answers to assessment
  - Verify: Risk level calculates correctly
  - Finalize assessment
  - Verify: Status changes to finalized

### If Evidence/Obligations Modified
- [ ] **Test evidence operations**
  - Create evidence item
  - Verify: Links to correct obligation
  - Update evidence status
  - Verify: Status changes correctly
  - Delete evidence
  - Verify: Removed from list

### If API Endpoints Modified
- [ ] **Test affected endpoints**
  - Use curl or Postman
  - Test: GET endpoints return correct data
  - Test: POST endpoints create new records
  - Test: PUT endpoints update correctly
  - Test: DELETE endpoints remove correctly
  - Test: Validation works (try invalid input)
  - Test: Error responses use correct status codes

### If Database Schema Changed
- [ ] **Verify migration applied**
  - Supabase dashboard → Migrations tab
  - Check: Latest migration shows as applied
  - Check: No migration errors
  - Verify: New tables/columns exist via SQL Editor

- [ ] **Test new schema**
  - Manual query to verify changes
  - Example: `SELECT COUNT(*) FROM [new_table]`
  - Verify: Data is accessible
  - Verify: RLS policies work correctly

---

## Performance Verification

- [ ] **Response times are acceptable**
  - Check: API endpoints respond <500ms
  - Check: Pages load <2 seconds
  - Check: Database queries execute <1 second
  - Measurement: Browser DevTools Network tab or curl timing

- [ ] **No memory leaks**
  - Vercel dashboard → Logs
  - Check: No "out of memory" errors
  - Check: Process memory stable (not growing)

- [ ] **Database is not overloaded**
  - Supabase dashboard → Database → Monitoring
  - CPU usage: <80%
  - Active connections: <20
  - Query queue: Empty
  - If high: May need to scale or optimize

---

## Monitoring & Observability

- [ ] **Error monitoring shows normal levels**
  - Check monitoring service (if configured)
  - Error rate: <1% (normal baseline)
  - Check: Spike alerts not triggered
  - If errors: Review type and frequency

- [ ] **No unusual logs or warnings**
  - Supabase Logs: Scan for WARN or ERROR
  - Vercel Logs: Check for issues
  - Application logs: Review via monitoring service
  - Ignore: Expected warnings in frameworks (next.js dev messages)

- [ ] **Alerts system is functional**
  - Test: No missed alerts
  - Check: Alert channels working (Slack, email, etc.)
  - Verify: Can be reached if incident occurs

---

## Workspace Isolation Verification

Critical for multi-tenant system: Verify workspaces are properly isolated.

- [ ] **Cross-workspace data leak test**
  - Create test data in workspace A
  - Log in to workspace B (different user)
  - Verify: Cannot see workspace A's data
  - Verify: Lists only show workspace B's items
  - If visible: CRITICAL — Rollback immediately

- [ ] **Query scope verification**
  - RLS policies are enforced
  - Database queries use `workspace_id` filtering
  - Manual query: `SELECT * FROM assessments` should be filtered by current workspace

---

## Documentation & Rollback Preparation

- [ ] **Deployment documented**
  - Post Slack message: "✅ Deployed: [Feature] - [PR Link]"
  - Include: What changed and any breaking changes
  - Include: Link to PR for anyone needing details

- [ ] **Know how to rollback**
  - Previous deployment identified (Vercel dashboard)
  - Rollback procedure understood (see PROCEDURES/ROLLBACK.md)
  - Can execute rollback in <5 minutes if needed

- [ ] **Customer communication plan**
  - If breaking changes: Notify customers
  - If major feature: Highlight in release notes
  - If downtime or issues: Send explanation

---

## Final Checks

- [ ] **No critical errors found**
  - All checks above passed
  - All features work as expected
  - Service is stable and responsive

- [ ] **Ready for customer traffic**
  - Feature is live and working
  - No regressions in existing features
  - Safe to announce to customers

- [ ] **Follow-up tasks captured**
  - Any issues found: Logged in GitHub
  - Lessons: Added to LEARNING_LOG.md
  - Improvements: Tracked for future

---

## If Any Check Fails

**Severity Assessment**:
- **Critical**: Customers cannot use core features → Rollback immediately
- **High**: Features broken or unusable → Rollback or quick fix
- **Medium**: Specific feature has issue → Plan fix but don't block rollback decision
- **Low**: Minor issue, no customer impact → Log and fix separately

**Response**:

1. **Document the failure**
   - What failed? Which feature/endpoint?
   - Error message or symptom?
   - How many customers affected?

2. **Decide: Rollback or Fix Forward**
   - Rollback if: Critical, uncertain how to fix, or fix takes >30 min
   - Fix forward if: Low risk, quick fix, or rollback requires data changes
   - See PROCEDURES/ROLLBACK.md for rollback steps

3. **Communicate**
   - Slack: Notify team of issue and action
   - If rollback: Announce deployment reverted
   - If fix forward: Announce fix being deployed

4. **Post-Mortem**
   - After resolving: Complete INCIDENT_POSTMORTEM.md checklist
   - Why did this get through testing?
   - What should prevent this next time?

---

## Success Criteria

Deployment is verified as successful when:

- [ ] Health checks pass (health, detailed health endpoints)
- [ ] All feature-specific tests pass
- [ ] Performance is acceptable (<500ms response times)
- [ ] No errors in logs or monitoring
- [ ] Cross-workspace isolation verified
- [ ] Deployment announced to team
- [ ] No critical issues found

---

## Next Steps

After deployment verification passes:

1. **Announce completion**: Slack message ✅ Deployed
2. **Monitor for issues**: Watch for errors in logs for next 1 hour
3. **If issues arise**: See RUNBOOKS/INCIDENT_RESPONSE.md
4. **Capture learnings**: Update LEARNING_LOG.md with any insights

---

## Related Documents

- `RUNBOOKS/DEPLOYMENT.md` — Full deployment procedure
- `PROCEDURES/ROLLBACK.md` — How to rollback if needed
- `CHECKLISTS/INCIDENT_POSTMORTEM.md` — If incident occurs during deployment
- `RUNBOOKS/INCIDENT_RESPONSE.md` — How to respond to production issues

---

## Updated By

**Session**: Governor Ω (STAGE 4 Phase 4.2)  
**Date**: 2026-07-16  
**Changes**: Initial creation as part of STAGE 4 Phase 4.2 (Operational Knowledge)
