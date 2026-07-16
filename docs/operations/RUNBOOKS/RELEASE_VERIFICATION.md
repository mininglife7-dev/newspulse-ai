# Release Verification Runbook

**Type**: Runbook  
**Audience**: Release Leads, QA Engineers, Product Managers  
**Authority**: Governor Ω  
**Status**: Active  
**Last Updated**: 2026-07-16  
**Review Schedule**: After each release or quarterly  
**Time Estimate**: 30-60 minutes  
**Owner**: Governor Ω

---

## Quick Reference

Step-by-step procedure for verifying a production release meets quality standards and is ready for customers. This is the final verification before announcement.

**When to use**: After deployment is complete (see POST_DEPLOYMENT_VERIFICATION.md checklist) and service is stable

**Success criteria**: All checks pass, no regressions, features work as intended

---

## Pre-Verification Setup (5 min)

### Prepare Test Environment

1. **Get deployment details**
   - Deployment timestamp: `[when deployed]`
   - What changed: `[feature/fix description]`
   - Who deployed: `[deployer name]`
   - Link to PR: `[GitHub PR URL]`

2. **Identify test accounts**
   - Use test workspace (not customer data)
   - Log in credentials available and working
   - Sufficient permissions to test feature

3. **Notification ready**
   - Slack message template prepared
   - Customer communication drafted (if needed)
   - Release notes prepared

### Check Basic Health (2 min)

```bash
# Verify service is responding
curl -s https://newspulse-ai.vercel.app/api/health | jq .

# Should show: status: healthy, all components ok
```

If health check fails: Do NOT proceed. Contact on-call engineer.

---

## Feature Verification (20-30 min)

### For Each New Feature

**Step 1: Understand the feature**
- Read the PR description
- Know: What changed, why, expected behavior
- Know: Which pages/endpoints affected

**Step 2: Test happy path** (main workflow)

Example: If feature is "evidence linking to obligations"
```
1. Create workspace (if needed)
2. Create AI system
3. Create assessment
4. Create obligation
5. Create evidence
6. Link evidence to obligation
7. Verify evidence appears in obligation details
8. Verify evidence status can be changed
9. Verify evidence can be deleted
```

**Step 3: Test edge cases**

- Empty lists (no obligations to link to)
- Maximum values (hundreds of evidence records)
- Permissions (can different roles access?)
- Isolation (can other workspaces see this data?)
- Error cases (invalid input, missing required fields)

**Step 4: Verify no regressions**

Test that unchanged features still work:
- Log in still works
- Workspace switching works
- Previous features not broken
- No error messages in console

**Step 5: Check UI/UX**

- [ ] Text is clear and correct (no typos)
- [ ] Buttons work and have clear labels
- [ ] Form validation messages are helpful
- [ ] Loading states show (spinners, disabled buttons)
- [ ] Error messages are user-friendly (not technical)
- [ ] Mobile responsive (if applicable)

**Step 6: Check accessibility**

- [ ] Keyboard navigation works (Tab through form)
- [ ] Form labels associated with inputs
- [ ] Error messages linked to fields
- [ ] Color not only way to convey info
- [ ] No unexpected focus traps

### For Each Bug Fix

**Step 1: Reproduce original bug**
- Understand what was broken
- Verify bug actually exists in released version
- Document steps to reproduce

**Step 2: Test the fix**
- Perform the same steps that caused bug
- Verify bug no longer happens
- Test edge cases that might trigger bug again

**Step 3: Verify fix didn't break other features**
- Features that use the same code
- Related features that might be affected
- Any features mentioned in the fix PR

---

## Performance Verification (10 min)

### Page Load Time

Use browser DevTools (F12 → Network tab):

```
1. Clear cache (Ctrl+Shift+Delete)
2. Open page URL
3. Check Network tab: Total time
4. Target: <3 seconds for page load
5. Check: No failed requests (404, 500 errors)
```

| Page | Target | Acceptable |
|------|--------|-----------|
| Login | <2s | <3s |
| Workspace | <2s | <3s |
| Inventory | <3s | <4s |
| Assessment | <3s | <4s |
| Evidence | <3s | <4s |

**If slow**:
- Check Network tab for slow requests
- Check browser console for errors
- Verify database is not overloaded
- Contact backend engineer if API slow

### Database Performance

Check Supabase monitoring:
1. Supabase dashboard → Database → Monitoring
2. CPU: Should be <80%
3. Query time: No recent spikes
4. Connections: <20 (normal)

**If database slow**:
- Check for long-running queries
- Verify no connection leaks
- Contact DBA if persistent

### Memory/Resource Usage

```bash
# Check for memory leaks (watch for growing memory)
# Open DevTools → Memory tab
# Take heap snapshot at start
# Use feature for 5 minutes
# Take another snapshot
# Compare: Memory should not grow significantly
```

---

## Data Integrity Verification (10 min)

### Workspace Isolation

Test that data is properly isolated:

1. **Create test data in workspace A**
   - Create AI system in workspace A
   - Create assessment, obligation, evidence
   - Note IDs of created records

2. **Switch to workspace B**
   - Verify you see workspace B's data only
   - Verify workspace A's data is NOT visible
   - Try to directly access workspace A's record URL
   - Verify: "Access denied" or similar error

3. **If you can see workspace A's data: CRITICAL BUG**
   - Stop verification immediately
   - Report to security team
   - Rollback deployment (see PROCEDURES/ROLLBACK.md)

### Data Consistency

```sql
-- Check for orphaned records (evidence without obligation)
SELECT COUNT(*) FROM evidence WHERE obligation_id IS NULL;
-- Should return: 0

-- Check for cross-workspace leaks
SELECT COUNT(*) FROM evidence 
WHERE workspace_id != (SELECT workspace_id FROM obligations WHERE id = obligation_id);
-- Should return: 0
```

### Required Fields

For new features, verify all required fields are:
- Validated on input (prevent save without value)
- Visible in list views (user can see what they created)
- Editable (user can change after creation)
- Properly displayed (not truncated, readable)

---

## Security Verification (5 min)

### Authentication

- [ ] Users cannot access app without login
- [ ] Expired sessions log out user
- [ ] Logout clears session cookies
- [ ] Session data not exposed in URL

### Authorization

- [ ] Different roles see different options
- [ ] Users cannot change role (only admin can)
- [ ] Cannot access higher-privilege features
- [ ] Workspace isolation enforced (see above)

### Input Validation

Test with malicious input:

- [ ] Injection test: `'; DROP TABLE evidence; --`
  - Should: Error or store as literal string
  - Should NOT: Execute SQL

- [ ] XSS test: `<img src=x onerror="alert('xss')">`
  - Should: Render as text or escape
  - Should NOT: Execute JavaScript

- [ ] CSRF test: Verify CSRF tokens on forms
  - Form should include hidden token
  - Token should change per request

---

## Browser & Device Verification (10 min)

Test on:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile (iPhone or Android)

For each:
- [ ] Feature works
- [ ] No console errors
- [ ] Text readable (not cut off)
- [ ] Touch targets big enough (mobile)
- [ ] Responsive layout (mobile)

---

## Monitoring & Logging (5 min)

### Application Logs

Check for errors in logs:
```bash
# Supabase dashboard → Logs
# Filter: Last 30 minutes (since deployment)
# Should see: Mostly SUCCESS responses, few errors
# Should NOT see: Hundreds of errors, 500s, timeouts
```

### Browser Console

Open DevTools Console:
- [ ] No red errors
- [ ] Warnings are acceptable (framework warnings)
- [ ] No "undefined is not a function" errors

### Monitoring Alerts

- [ ] No new alerts triggered
- [ ] Error rate is normal (<1%)
- [ ] Response times are normal
- [ ] No CPU/memory spikes

---

## Verification Checklist

Before approving release:

### Functionality

- [ ] All new features work as described in PR
- [ ] All bug fixes verified working
- [ ] No regressions in existing features
- [ ] Edge cases handled correctly
- [ ] Error cases handled gracefully

### Performance

- [ ] Page load times acceptable
- [ ] Database performance normal
- [ ] No memory leaks
- [ ] No unusual resource spikes

### Data Integrity

- [ ] Workspace isolation verified
- [ ] Data consistency checks pass
- [ ] Required fields enforced
- [ ] No orphaned records

### Security

- [ ] Authentication working
- [ ] Authorization enforced
- [ ] Input validation working
- [ ] RLS policies enforced

### User Experience

- [ ] UI clear and intuitive
- [ ] Error messages helpful
- [ ] Accessibility standards met
- [ ] Works on mobile

### Quality

- [ ] No console errors
- [ ] Monitoring looks healthy
- [ ] Logs show normal operation
- [ ] No new alerts triggered

---

## Sign-Off & Release

### If All Checks Pass

1. **Document results**
   - Timestamp: When verification completed
   - Verifier: Your name
   - Features tested: List what was verified
   - Issues found: None (or none blocking)

2. **Approve release**
   - GitHub PR: Approve / merge (if not already done)
   - Slack: Post approval message

3. **Announce to customers** (if applicable)
   - Email: Release announcement
   - Blog: Feature description
   - Help docs: Updated documentation

### If Issues Found

**Severity 1 (Blocking)**:
- Feature doesn't work
- Data is corrupted or leaked
- Security vulnerability
- **Action**: Rollback immediately (see PROCEDURES/ROLLBACK.md)

**Severity 2 (High)**:
- Feature partially broken
- Performance degraded
- **Action**: Fix forward or rollback (decision required)

**Severity 3 (Medium)**:
- Minor UI issue
- Non-critical feature broken
- **Action**: Log issue, plan fix for next release

**Severity 4 (Low)**:
- Typo or cosmetic issue
- **Action**: Log issue, fix when convenient

---

## Common Issues & Fixes

### Feature Works Locally but Not in Production

**Cause**: Environment variables or configuration different

**Fix**:
- Check environment variables (Vercel → Settings → Environment)
- Verify database connection (health endpoint)
- Check for region-specific issues

### Slow Performance in Production

**Cause**: Not visible locally due to faster hardware/network

**Fix**:
- Add database index
- Optimize query (see DATABASE_OPERATIONS.md)
- Verify CDN caching is working

### Data Inconsistency

**Cause**: Race condition or incomplete transaction

**Fix**:
- Add database constraints
- Improve error handling
- Add validation

---

## Related Documents

- `CHECKLISTS/POST_DEPLOYMENT_VERIFICATION.md` — Deployment verification (before this runbook)
- `PROCEDURES/ROLLBACK.md` — Emergency rollback if issues found
- `docs/governance/ENGINEERING_STANDARDS.md` — Quality standards

---

## Updated By

**Session**: Governor Ω (STAGE 4 Phase 4.2)  
**Date**: 2026-07-16  
**Changes**: Initial creation as part of STAGE 4 Phase 4.2 (Operational Knowledge)
