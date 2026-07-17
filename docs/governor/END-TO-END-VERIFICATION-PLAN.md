# End-to-End Verification Plan

**Authority**: Governor Ω (Autonomous Verification Planning)  
**Date**: 2026-07-17 16:05 UTC  
**Scope**: Customer journey validation, feature verification, performance measurement  
**Verification Level**: Level 2 (DOCUMENTED) — Plan documented with clear criteria; execution blocked by environment

---

## Executive Summary

All end-to-end testing is **BLOCKED BY NETWORK POLICY**: Cloud environment restricts HTTPS outbound to Vercel deployments.

| Verification Task           | Status     | Blocker                                  | Verification Level   |
| --------------------------- | ---------- | ---------------------------------------- | -------------------- |
| **Signup flow**             | 🔴 BLOCKED | Cannot reach vercel.app                  | Level 0 (UNVERIFIED) |
| **Authentication**          | 🔴 BLOCKED | Cannot test login                        | Level 0 (UNVERIFIED) |
| **Dashboard access**        | 🔴 BLOCKED | Cannot reach protected routes            | Level 0 (UNVERIFIED) |
| **Core features**           | 🔴 BLOCKED | Cannot test assessments, evidence, team  | Level 0 (UNVERIFIED) |
| **Performance measurement** | 🔴 BLOCKED | Cannot run Playwright against preview    | Level 0 (UNVERIFIED) |
| **RLS isolation**           | 🔴 BLOCKED | Cannot test multi-tenant data boundaries | Level 0 (UNVERIFIED) |

**Current Blocker**: Cloud environment network policy restricts HTTPS to external domains.  
**Resolution**: Founder must test from external network (laptop, office, or personal device).

---

## SECTION 1: Network Blocker Evidence

### Error Observed

```
Error [ERR_CONNECTION_REFUSED]: Cannot connect to
https://newspulse-ai-git-claude-alpha-c-1777d4-lalit-kumar-d-s-projects.vercel.app
```

### Root Cause

**Network Policy**: Claude Code remote execution environment restricts outbound HTTPS.

- ✅ Internal connections work (git, npm registry)
- ❌ External HTTPS blocked (vercel.app, googleapis.com, etc.)
- 📄 Configuration: `/root/.ccr/README.md` documents proxy rules

### Attempted Workarounds

1. **Playwright script against preview** → Network refused
2. **curl to preview URL** → Network refused
3. **npm perf measurement** → Network refused

**Conclusion**: Blocker is environmental, not code-related. Cannot be resolved without external access.

---

## SECTION 2: End-to-End Verification Plan

This section documents **WHAT WOULD BE TESTED** if network access were available.

### Test 1: Signup Flow Verification

**Purpose**: Verify user can create account and receive email confirmation

**Steps**:

1. Navigate to `https://preview-url/auth/signup`
2. Fill signup form: email, password, confirm password
3. Click "Sign Up"
4. Verify: Redirect to email verification page
5. Check email for verification link
6. Click verification link
7. Verify: Auto-login and redirect to workspace creation

**Verification Criteria**:

- ✅ Form validation works (empty fields rejected)
- ✅ Password strength validation works
- ✅ Email doesn't already exist check works
- ✅ Redirect to email verification page succeeds
- ✅ Email sent (check spam folder)
- ✅ Verification link redirect works
- ✅ Auto-login sets session cookie

**Evidence Type**: Level 3 (EXECUTED) once run

**Risk if untested**: Email flow could be broken in production; users unable to verify accounts

### Test 2: Authentication & Session Management

**Purpose**: Verify login/logout and session refresh work correctly

**Steps**:

1. Navigate to `/auth/signin`
2. Enter email and password from signed-up account
3. Click "Sign In"
4. Verify: Redirect to workspace dashboard
5. Check that session cookie is set
6. Refresh page (F5)
7. Verify: Still logged in (session refresh works)
8. Click "Log Out"
9. Verify: Redirect to home page, session cleared

**Verification Criteria**:

- ✅ Wrong password rejected
- ✅ Unknown email rejected
- ✅ Correct credentials accepted
- ✅ Redirect to dashboard succeeds
- ✅ Session cookie present
- ✅ Page refresh maintains session
- ✅ Logout clears session

**Evidence Type**: Level 3 (EXECUTED) once run

**Risk if untested**: Auth system could have session leaks; users logged out unexpectedly; unauthorized access possible

### Test 3: Workspace & Team Management

**Purpose**: Verify multi-tenant isolation and role-based access control

**Steps**:

1. Create workspace 1 (Team A)
   - Go to `/workspace`
   - Click "Create Workspace"
   - Enter name: "Test Workspace A"
   - Verify: Workspace created, user is admin

2. Invite team member
   - Go to `/team`
   - Click "Invite Team Member"
   - Enter email: test-member@example.com
   - Set role: Member
   - Verify: Invitation sent

3. Verify RLS isolation
   - Switch back to Team A workspace
   - Access inventory, assessments, evidence
   - Verify: Can see Team A data
   - Create second account (browser incognito)
   - Log in with second account
   - Verify: Cannot see Team A data or workspace

**Verification Criteria**:

- ✅ Workspace creation works
- ✅ User is set as admin
- ✅ Team invitations send
- ✅ Multi-tenant isolation enforced (RLS policies working)
- ✅ Role-based access control (member cannot delete workspace)
- ✅ Team member receives invite (check email)

**Evidence Type**: Level 4 (INTEGRATED) once multi-user test passes

**Risk if untested**: Critical: Data leaks across workspaces possible; RLS policies could be bypassed; unauthorized access to other customers' data

### Test 4: Core Feature Workflows

**Purpose**: Verify primary customer workflows function end-to-end

#### Test 4a: Risk Assessment Flow

1. Go to `/assessment`
2. Create new assessment
3. Select AI system from inventory (or create new)
4. Answer assessment questions
5. Submit assessment
6. Verify: Assessment saved and viewable on dashboard

**Verification Criteria**:

- ✅ Assessment form loads
- ✅ Answer validation works
- ✅ Submission saves to database
- ✅ Saved assessment appears in list
- ✅ Can view/edit assessment

#### Test 4b: Evidence Collection

1. Go to `/evidence`
2. Create new evidence item
3. Link to assessment
4. Upload document (or link to external resource)
5. Verify: Evidence saved and linked to assessment

#### Test 4c: Obligation Tracking

1. Go to `/obligations`
2. Create new obligation (e.g., "Document AI decision-making process")
3. Set deadline
4. Assign to team member
5. Verify: Obligation visible in compliance dashboard

**Evidence Type**: Level 3-4 (EXECUTED/INTEGRATED) once tested

**Risk if untested**: Core product workflows could be broken; data loss possible; customers cannot use primary features

### Test 5: Performance Measurement

**Purpose**: Measure actual page load times against stated metrics

**Method**: Run Playwright script from external network

```bash
node scripts/perf-test-vercel.mjs https://preview-deployment-url
```

**Pages to measure**:

- `/` (home page)
- `/auth/signup` (signup form)
- `/auth/signin` (login form)
- `/workspace` (workspace dashboard)
- `/inventory` (AI systems inventory)
- `/assessment` (assessments list)
- `/compliance` (compliance dashboard)
- `/team` (team management)

**Measurement criteria**:

- Load time per page (start to networkidle)
- Average across all pages
- Comparison to baseline (1018ms → target 603ms)

**Evidence Type**: Level 5 (PRODUCTION VERIFIED) once measured and compared

**Risk if untested**: Performance claims unverified; regression could exist; user experience unknown

### Test 6: RLS Enforcement (Multi-User)

**Purpose**: Verify Row-Level Security prevents cross-workspace data access

**Setup**:

- Account A: Create workspace "Company 1", create assessment
- Account B: Create workspace "Company 2", create assessment
- Both accounts: Verify cannot see other workspace's data

**Test sequence**:

1. Log in as Account A
   - Create assessment "Assessment A1"
   - Verify: Appears in `/assessment` list

2. Log in as Account B (different workspace)
   - Check `/assessment` list
   - Verify: "Assessment A1" NOT visible
   - Cannot access URL: `/assessment/a1-id`
   - Verify: 403 Forbidden

3. Database-level verification (Founder only)
   - Query assessments as Account B
   - Verify: RLS policy prevents seeing Account A data

**Verification Criteria**:

- ✅ Multi-user isolation enforced
- ✅ RLS policies block cross-workspace queries
- ✅ Direct URL access to other workspace forbidden

**Evidence Type**: Level 4 (INTEGRATED) once tested end-to-end

**Risk if untested**: CRITICAL: Data could leak between customers; multi-tenant isolation could be completely broken; regulatory violation (GDPR)

### Test 7: Error Handling & Recovery

**Purpose**: Verify graceful error handling and user guidance

**Test scenarios**:

1. Network timeout
   - Simulate slow/offline condition
   - Verify: Error message displayed
   - Verify: Retry option available

2. Form validation
   - Submit empty assessment form
   - Verify: "This field is required" message

3. Authorization error
   - Try to access workspace as non-member
   - Verify: Redirect to signup or 403 page

4. Rate limiting
   - Send rapid requests to `/api/assessments`
   - Verify: 429 Too Many Requests returned

**Evidence Type**: Level 3 (EXECUTED) once tested

**Risk if untested**: Poor user experience; bugs hidden by missing error boundaries; rate limiting not working

---

## SECTION 3: Verification Readiness Matrix

| Test               | Complexity | Risk Level | Estimated Time | Can Run Locally | Requires Staging |
| ------------------ | ---------- | ---------- | -------------- | --------------- | ---------------- |
| Signup/Auth        | Medium     | High       | 10 min         | ❌ No           | ✅ Yes           |
| Session Management | Medium     | High       | 5 min          | ❌ No           | ✅ Yes           |
| RLS Isolation      | High       | Critical   | 20 min         | ❌ No           | ✅ Yes           |
| Core Workflows     | High       | High       | 30 min         | ❌ No           | ✅ Yes           |
| Performance        | Low        | Medium     | 5 min          | ❌ No           | ✅ Yes           |
| Error Handling     | Medium     | Medium     | 15 min         | ❌ No           | ✅ Yes           |

**Total time to execute**: ~90 minutes (all tests)  
**Prerequisites**:

- Access to preview/staging deployment
- Network access to vercel.app
- Test email account (for email verification tests)

---

## SECTION 4: Founder Action Required

To advance from Level 2 (DOCUMENTED) to Level 3+ (EXECUTED), Founder must:

### Action 1: Test from External Network

**Timeline**: Before production launch  
**Device**: Laptop, office computer, or personal device (NOT cloud)  
**Steps**:

1. Open preview URL: `https://newspulse-ai-git-claude-alpha-c-1777d4-lalit-kumar-d-s-projects.vercel.app`
2. Walk through Test 1-4 above
3. Document any issues encountered
4. Report: Pass/Fail with specific failures

**Effort**: ~60 minutes  
**Blocker resolution**: This unblocks everything

### Action 2: Run Performance Measurement

**If tests pass**, measure performance:

```bash
node scripts/perf-test-vercel.mjs <preview-url>
```

**Record**:

- Timestamp (ISO-8601)
- Average load time
- Per-page breakdown
- Comparison to baseline (603ms claim)

**Effort**: ~10 minutes

### Action 3: Enable Email Verification

**If signup test reveals email not working**:

1. Go to Supabase dashboard
2. Configure email provider (SendGrid or similar)
3. Enable email verification in auth settings
4. Re-test signup flow

**Effort**: ~20 minutes (if needed)

---

## SECTION 5: Success Criteria

### All Tests Pass

- ✅ Signup flow works end-to-end
- ✅ Authentication maintains session
- ✅ RLS enforces multi-tenant isolation
- ✅ Core features functional (assessments, evidence, obligations)
- ✅ Performance meets stated targets
- ✅ Error handling user-friendly
- ✅ No unauthorized access possible

**Result**: Level 4 (INTEGRATED) — Production ready for launch

### Some Tests Fail

- ❌ Document specific failures
- ❌ Identify root cause (code bug vs. configuration)
- ❌ Create GitHub issues for failures
- ❌ Fix and re-test

**Result**: Level 1 (DOCUMENTED) + Fix list — Not ready until failures resolved

### Critical Tests Fail (RLS, Auth)

- 🔴 DO NOT DEPLOY TO PRODUCTION
- 🔴 Security issue possible
- 🔴 Escalate to Governor immediately
- 🔴 All multi-tenant products must pass RLS test

**Result**: BLOCKED — Cannot proceed

---

## SECTION 6: Contingency Plans

### If Email Service Not Available

**Impact**: Users cannot verify accounts  
**Workaround**: Temporarily disable email verification (not recommended for production)  
**Alternative**: Use transactional email service (SendGrid, Mailgun, AWS SES)  
**Timeline**: Must resolve before production

### If RLS Tests Fail

**Impact**: CRITICAL — Data could leak between workspaces  
**Action**:

1. Stop all testing
2. Review RLS policy code
3. Check Supabase schema deployment
4. Verify `workspace_id` isolation
5. Re-run test in staging environment

**Timeline**: BLOCKING issue, must resolve immediately

### If Performance Below Target

**Impact**: User experience degraded  
**Action**:

1. Measure where time is spent (network, rendering, compute)
2. Check Vercel build output (cache hits)
3. Verify font optimization applied
4. Check if ISR caching working
5. Review database query performance

**Timeline**: Post-launch optimization acceptable; document baseline for improvements

---

## SECTION 7: Post-Verification Handoff

Once all tests pass:

1. **Founder approval**: Sign off that tests passed
2. **Governor documentation**: Record test results with timestamps
3. **Deployment decision**: Determine go/no-go for production
4. **Monitoring setup**: Enable alert thresholds from DEEP-VERIFICATION-REPORT
5. **Launch readiness**: Verify all 5 prerequisites from SECURITY-AUDIT-REPORT

---

## CONCLUSION

End-to-end verification is **BLOCKED BY NETWORK POLICY** but **FULLY PLANNED** and **ACTIONABLE**.

**Current Status**: Level 2 (DOCUMENTED)  
**Path to Level 3+**: Founder tests from external network (~60 min)  
**Path to Level 5**: Measurement + production verification

**Risk**: Cannot launch without running these tests. RLS isolation in particular is critical for multi-tenant security.

**Next Step**: Founder executes Test 1-4 with preview deployment when network access available.

---

**Prepared by**: Governor Ω — Verification Planning Module  
**Verification Method**: Test plan design based on feature architecture  
**Status**: Complete — Ready for Founder execution
