# Phase 3 Deployment Verification Guide

**Purpose:** Comprehensive post-deployment validation checklist to verify Phase 3 feature is working correctly in production

**Timeline:** Run immediately after Vercel deployment (est. 30-45 minutes)

**Owner:** Governor

**Trigger:** After Phase 3 code is merged to main and deployed to production

---

## Pre-Deployment Verification (Before Pushing to Main)

### Code Quality Checks

- [ ] **Type-check passes**
  ```bash
  npm run type-check
  # Expected: No errors
  ```

- [ ] **Linting passes**
  ```bash
  npm run lint
  # Expected: No errors or only warnings
  ```

- [ ] **Build succeeds**
  ```bash
  npm run build
  # Expected: "ready - started server on 0.0.0.0:3000"
  ```

- [ ] **Tests pass**
  ```bash
  npm test
  # Expected: All tests passing (>= 99%)
  ```

- [ ] **E2E smoke tests pass**
  ```bash
  npm run test:e2e
  # Expected: Golden path tests passing
  ```

### Code Review Checks

- [ ] **PR reviewed and approved** (if required by project policy)
- [ ] **No hardcoded credentials** (grep for api_key, token, secret)
- [ ] **No debug code left in** (console.log, debugger, etc.)
- [ ] **Database migrations are reversible** (rollback procedure documented)
- [ ] **Error handling is comprehensive** (try/catch blocks, error boundaries)

### Dependencies Check

- [ ] **No new critical vulnerabilities**
  ```bash
  npm audit
  # Expected: No critical/high severity issues
  ```

- [ ] **All dependencies pinned** (no wildcards in package.json)
- [ ] **No deprecated packages** (npm outdated output reviewed)

### Documentation Check

- [ ] **README updated** (if feature changes setup)
- [ ] **API documentation updated** (new endpoints documented)
- [ ] **Type definitions documented** (JSDoc comments on types)
- [ ] **Deployment notes added** (any special steps needed)

---

## Immediate Post-Deployment Verification (First 5 Minutes)

### 1. Deployment Status Check

- [ ] **Vercel deployment succeeded**
  - Go to: https://vercel.com/dashboard
  - Find project: newspulse-ai
  - Check latest deployment: Green ✅ status
  - Check deployment time: Should be < 2 minutes

- [ ] **No deployment rollbacks occurred**
  - Check: Deployment history (no red ❌ next to latest)
  - Check: Build logs (no errors)

- [ ] **Environment variables are correct**
  - Vercel dashboard → Settings → Environment Variables
  - Verify: All Phase 3 env vars present (if any new ones added)
  - Verify: Database connection working (check logs)

### 2. Application Health Check

- [ ] **Site loads without errors**
  - Open: https://newspulse-ai.vercel.app
  - Wait: 3-5 seconds for full load
  - Check: No 404, 500, or timeout errors
  - Check: Console (DevTools → Console) has no errors

- [ ] **Authentication works**
  - Click: "Sign In"
  - Check: Sign-in page loads
  - Page should load without JavaScript errors

- [ ] **Dashboard loads**
  - If already authenticated, navigate to: /dashboard
  - Check: Page loads (no infinite spinners)
  - Check: No console errors
  - Check: Data displays (workspaces, metrics visible)

### 3. Phase 3 Feature Loads

- [ ] **Phase 3 page accessible**
  - Navigate to: `/[feature]` (your Phase 3 feature route)
  - Check: Page loads successfully
  - Check: No 404 or 500 errors
  - Check: Console is clean (no errors)

- [ ] **Form/UI elements render**
  - Check: Form fields visible and editable
  - Check: Buttons are clickable
  - Check: No styling issues (Tailwind not loaded, etc.)

- [ ] **API endpoints responsive**
  - Open browser DevTools → Network
  - Trigger Phase 3 action (e.g., create record)
  - Check: API request succeeds (200/201 status)
  - Check: Response time < 5s
  - Check: Response data is valid JSON

---

## Functional Testing (10-15 Minutes)

### 1. Create Workflow

- [ ] **Can create new record**
  ```
  1. Navigate to Phase 3 feature page
  2. Fill form with valid test data
  3. Submit form
  4. Check: Success message appears
  5. Check: Data appears in list/table
  ```

- [ ] **Validation works**
  ```
  1. Try to submit form with missing required field
  2. Check: Error message displays
  3. Check: Record not created
  ```

- [ ] **Database constraint enforcement**
  ```
  1. Try to create duplicate (if unique constraint exists)
  2. Check: Error message (constraint violation)
  3. Check: No duplicate created
  ```

### 2. Read Workflow

- [ ] **Can list records**
  ```
  1. Navigate to list page
  2. Check: Records display in list/table
  3. Check: Pagination works (if applicable)
  4. Check: Sorting works (if implemented)
  5. Check: Filtering works (if implemented)
  ```

- [ ] **Can view record details**
  ```
  1. Click on a record in list
  2. Check: Detail page loads
  3. Check: All fields display correctly
  4. Check: No console errors
  ```

### 3. Update Workflow (If Implemented)

- [ ] **Can edit record**
  ```
  1. Click edit button
  2. Change a field
  3. Submit
  4. Check: Success message
  5. Check: List reflects update
  ```

### 4. Delete Workflow (If Implemented)

- [ ] **Can delete record**
  ```
  1. Click delete button
  2. Confirm deletion
  3. Check: Success message
  4. Check: Record removed from list
  ```

### 5. Multi-tenant Isolation

- [ ] **Workspace isolation enforced**
  ```
  1. Create record in Workspace A
  2. Switch to Workspace B
  3. Check: Record NOT visible in Workspace B
  4. Check: Cannot access Workspace A's records from B
  ```

- [ ] **RLS policies working**
  ```
  1. Try to access record via API with wrong workspace ID
  2. Check: Request fails with 403 Forbidden
  3. Check: Database error doesn't expose data
  ```

---

## Performance Testing (5-10 Minutes)

### 1. Response Time Validation

- [ ] **API response times**
  - Open DevTools → Network tab
  - Create test record
  - Check: Request < 1s (target)
  - Check: p99 < 5s (absolute max)
  - Check: No timeouts (30s+)

- [ ] **Page load time**
  - Open DevTools → Performance
  - Reload Phase 3 page
  - Check: First Contentful Paint (FCP) < 3s
  - Check: Largest Contentful Paint (LCP) < 5s
  - Check: Cumulative Layout Shift (CLS) < 0.1

### 2. Database Performance

- [ ] **Query performance good**
  - List view with 100+ records
  - Check: Loads in < 2s
  - Check: No N+1 queries (check Network tab)

- [ ] **No connection pool issues**
  - Supabase Dashboard → Database → Connections
  - Check: Connection count reasonable (< 50)
  - Check: No "max connections reached" errors

### 3. Error Rate Monitoring

- [ ] **Error rate baseline**
  - Wait: 5 minutes for traffic to generate
  - Check: Sentry (if configured) shows < 1% error rate
  - Check: Vercel Analytics shows green status
  - Check: No spike in 5xx errors

---

## Security Validation (10 Minutes)

### 1. Authentication & Authorization

- [ ] **Unauthenticated access blocked**
  - Open incognito window
  - Try to access: `/[feature]`
  - Check: Redirects to `/auth/signin` (403 or 401)
  - Check: Cannot access protected data

- [ ] **Authorization enforced**
  - User A creates record
  - User B (different workspace) cannot see record
  - User B cannot delete User A's record
  - Check: API returns 403 Forbidden

### 2. Input Validation

- [ ] **SQL injection protection**
  ```sql
  1. In form field, try: '; DROP TABLE [table]; --
  2. Check: Input treated as string (escaped)
  3. Check: No error, record not deleted
  ```

- [ ] **XSS protection**
  ```html
  1. In form field, try: <script>alert('XSS')</script>
  2. Check: Script doesn't execute
  3. Check: Input displayed as text
  ```

### 3. Data Leakage Prevention

- [ ] **API doesn't expose internals**
  - Create record
  - Check API response: Only expected fields
  - Check: No internal IDs, config, or secrets
  - Check: No stack traces in errors

- [ ] **Error messages don't leak data**
  - Try invalid operation
  - Check: Error message is generic ("Operation failed")
  - Check: No database constraint details exposed
  - Check: No file paths or internal errors shown

---

## Data Integrity Checks (5 Minutes)

### 1. Database State

- [ ] **Tables exist**
  ```bash
  # In Supabase SQL Editor:
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  # Should include your Phase 3 table
  ```

- [ ] **Indexes exist**
  ```bash
  # In Supabase SQL Editor:
  SELECT indexname FROM pg_indexes 
  WHERE tablename = '[table_name]'
  # Should show indexes created
  ```

- [ ] **RLS policies enabled**
  ```bash
  # In Supabase SQL Editor:
  SELECT * FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = '[table_name]'
  # Should show RLS policies
  ```

### 2. Test Data Cleanup

- [ ] **Test records created during verification**
  - Delete all test records created during testing
  - Check: No test data left in production

- [ ] **No orphaned records**
  - Verify: All records have valid foreign keys
  - Verify: No records with deleted parent (if applicable)

---

## Monitoring & Alerting (10 Minutes)

### 1. Application Monitoring

- [ ] **Error tracking configured**
  - Sentry (if enabled) is receiving errors
  - Check: Latest errors from deployment time
  - Check: No unexpected error spikes

- [ ] **Performance monitoring active**
  - Vercel Analytics showing data
  - Check: Response times tracked
  - Check: Error rate shown as < 1%

- [ ] **Logs accessible**
  - Vercel Deployments → Logs
  - Check: Build logs available
  - Check: Runtime logs showing (if applicable)

### 2. Health Checks Enabled

- [ ] **DNA-GOV-001 monitoring active**
  - Check: `/api/health` endpoint works
  - Status should be: 200 OK
  - Response includes: application status

- [ ] **Database health check**
  - Check: `/api/health/database` endpoint
  - Status should be: 200 OK
  - Response includes: database connection status

---

## Rollback Readiness (5 Minutes)

### 1. Rollback Procedure Verified

- [ ] **Previous version known**
  - Note previous commit SHA (before Phase 3)
  - Verified in git log

- [ ] **Rollback command prepared**
  ```bash
  # Rollback command (don't run unless needed):
  git revert [phase-3-commit-sha]
  git push origin main
  ```

- [ ] **Monitoring alerts configured**
  - Alerts set for: Error rate > 5%
  - Alerts set for: Response time > 10s
  - Alerts set for: Database connection failures

---

## Post-Deployment Communication (5 Minutes)

### 1. Status Update

- [ ] **Founder notified of successful deployment**
  - Message: "Phase 3 deployed successfully at [TIME]"
  - Include: Deployment link
  - Include: Monitoring dashboard link

- [ ] **Team notified (if applicable)**
  - Slack message: Phase 3 live, monitoring ongoing
  - Include: How to access Phase 3 feature
  - Include: How to report issues

- [ ] **Monitoring dashboard shared**
  - Share: Vercel Analytics dashboard link
  - Share: Sentry error tracking (if configured)
  - Share: Custom monitoring (if built)

### 2. First User Engagement

- [ ] **Early adopter feedback collected** (optional, within first hour)
  - Slack DM to 1-2 active teams
  - Ask: "Try out the new feature, let me know how it works"
  - Listen for: Quick issues, confusion points

---

## Continuous Post-Deployment Monitoring (First 24 Hours)

### Hour 1 (Active Monitoring)

- [ ] **Error rate < 1%** (check every 5 minutes)
  - Alert threshold: > 2%
  - Action: Investigate immediately if exceeded

- [ ] **Response time p99 < 5s** (check every 5 minutes)
  - Alert threshold: > 8s
  - Action: Investigate if sustained

- [ ] **Database connections stable** (check every 15 minutes)
  - Alert threshold: > 80% utilization
  - Action: Scale if needed

- [ ] **No authentication failures** (check logs)
  - Alert threshold: > 5% of requests
  - Action: Investigate token/session issues

### Hours 2-24 (Regular Monitoring)

- [ ] **Adoption tracking** (check every hour)
  - How many users have used Phase 3?
  - Are they returning?
  - Any errors in user workflows?

- [ ] **Performance stability** (check every 2 hours)
  - Response times consistent?
  - Error rate staying low?
  - Database healthy?

- [ ] **Customer sentiment** (check every 4 hours)
  - Slack messages about Phase 3
  - GitHub issues filed
  - Customer support inquiries

- [ ] **Business metrics** (check every 6 hours)
  - Are Phase 3 goals being met?
  - Adoption on track?
  - Any unexpected usage patterns?

---

## Verification Checklist Summary

| Phase | Checklist Items | Est. Time | Pass/Fail |
|-------|-----------------|-----------|-----------|
| Pre-Deployment | 5 code checks + 4 review checks + 2 dep checks + 3 doc checks | 15 min | — |
| Immediate (< 5 min) | 3 deployment checks + 3 application checks + 3 feature checks | 5 min | — |
| Functional (10-15 min) | 5 workflows × 3-5 checks each | 15 min | — |
| Performance (5-10 min) | Response time + page load + database + errors | 10 min | — |
| Security (10 min) | Auth, authorization, input validation, data leakage | 10 min | — |
| Data Integrity (5 min) | Tables, indexes, RLS, cleanup | 5 min | — |
| Monitoring (10 min) | Error tracking, health checks, logs | 10 min | — |
| Rollback Ready (5 min) | Previous version, rollback command, alerts | 5 min | — |
| Communication (5 min) | Founder, team, dashboard, early users | 5 min | — |
| **Total** | **~80 items across 9 phases** | **~80 min** | — |

---

## Success Criteria

✅ **Deployment succeeds if:**
- All pre-deployment checks pass
- Phase 3 feature accessible and functional
- Error rate < 1% in first hour
- Response time < 5s p99
- Zero security issues
- Multi-tenant isolation verified
- All rollback procedures working

🟡 **Deployment needs investigation if:**
- Error rate 1-2% (monitor closely for 1 hour)
- Response time 5-8s p99 (database optimization may help)
- A few validation failures (minor bugs, easy fix)
- Missing optional monitoring (non-critical)

❌ **Deployment fails if:**
- Error rate > 5% (indicates fundamental problem)
- Response time > 10s p99 (system unusable)
- Critical bugs in core workflow (data loss, auth failure)
- Multi-tenant isolation broken (security issue)
- Mass customer complaints (UX fundamentally wrong)

**Action on failure:** Trigger rollback immediately (see CI-CD-RECOVERY-RUNBOOK.md)

---

## Post-Verification Report Template

```markdown
## Phase 3 Deployment Verification — [DATE] [TIME]

**Deployment commit:** [SHA]  
**Deployed to:** Production (Vercel)  
**Deployment time:** [TIME]  
**Verification start:** [TIME]  
**Verification end:** [TIME]

### Results

**Overall status:** ✅ SUCCESS | ⚠️ WARNING | ❌ FAILURE

**Pre-deployment checks:** X/X passed  
**Immediate health checks:** X/X passed  
**Functional tests:** X/X passed  
**Performance tests:** X/X passed  
**Security tests:** X/X passed  
**Data integrity checks:** X/X passed  
**Monitoring configured:** ✅ Yes  
**Rollback verified:** ✅ Yes  

### Findings

[List any issues found, severity, and remediation]

### Monitoring Status

- Error rate: X% (target: < 1%)
- Response time p99: Xms (target: < 5s)
- Active users: X
- Feature adoption: X%

### Next Steps

1. [Continue monitoring for 24 hours]
2. [Daily checkpoint collection continues]
3. [Report results to Founder]
```

---

**Status:** Ready to use immediately after Phase 3 deployment  
**Owner:** Governor  
**Timeline:** ~80 minutes post-deployment  
**Last Updated:** 2026-07-10
