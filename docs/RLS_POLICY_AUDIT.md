# RLS Policy Audit Checklist

**Status:** Ready to execute after Supabase schema deployment  
**Purpose:** Verify row-level security policies enforce proper data isolation  
**Time:** ~30 minutes  

---

## Overview

Row-Level Security (RLS) is the database-level enforcement of multi-tenant data isolation. Users should only see data they own or are members of.

This audit verifies:
1. All tables have RLS enabled
2. Policies are correct and complete
3. Workspace isolation works
4. Company data is private
5. No data leakage across tenants

---

## Pre-Audit Setup

### Requirement 1: Supabase Schema Deployed
✅ Verify `supabase/schema.sql` has been run in Supabase SQL Editor

### Requirement 2: Test Users & Workspaces
Create at least 2 test users with separate workspaces:

**Test User 1:**
- Email: test1@example.com
- Password: any password
- Sign up → Create Workspace "Acme Corp"
- Record: Workspace ID, User ID

**Test User 2:**
- Email: test2@example.com
- Password: any password
- Sign up → Create Workspace "Beta Inc"
- Record: Workspace ID, User ID

### Requirement 3: Supabase SQL Editor Access
Go to: Supabase dashboard → Your project → SQL Editor

---

## Audit Checklist

### TABLE 1: workspaces

**Policy 1: Users can see workspaces they own**

```sql
-- Run this query in Supabase SQL Editor:
SELECT id, name, owner_id FROM public.workspaces 
WHERE auth.uid() = owner_id;

-- Expected: Should see only YOUR workspaces (as currently logged-in user)
-- If you see other users' workspaces → POLICY FAILURE
```

✅ **Check 1.1:** Logged in as Test User 1, verify you see ONLY "Acme Corp" workspace  
✅ **Check 1.2:** Log out, log in as Test User 2, verify you see ONLY "Beta Inc" workspace  
✅ **Check 1.3:** Verify you cannot see Test User 1's "Acme Corp" workspace  

**Result:** [PASS / FAIL]

---

### TABLE 2: workspace_members

**Policy 1: Users can see members of their workspace**

```sql
SELECT workspace_id, user_id, role, email 
FROM public.workspace_members 
WHERE workspace_id IN (
  SELECT id FROM public.workspaces WHERE auth.uid() = owner_id
);

-- Expected: Should see members ONLY of your workspaces
```

✅ **Check 2.1:** As Test User 1, verify you see your membership in "Acme Corp"  
✅ **Check 2.2:** Verify you cannot see Test User 2's membership in "Beta Inc"  

**Result:** [PASS / FAIL]

---

### TABLE 3: companies

**Policy 1: Users can see companies in their workspaces**

```sql
SELECT id, workspace_id, name, country 
FROM public.companies 
WHERE workspace_id IN (
  SELECT id FROM public.workspaces WHERE auth.uid() = owner_id
);

-- Expected: Should see ONLY companies in your workspaces
```

✅ **Check 3.1:** As Test User 1, verify you see your company profile  
✅ **Check 3.2:** Verify you cannot see Test User 2's company profile  

**Result:** [PASS / FAIL]

---

### TABLE 4: ai_systems

**Policy 1: Users can see AI systems in their workspaces**

```sql
SELECT id, workspace_id, name, vendor 
FROM public.ai_systems 
WHERE workspace_id IN (
  SELECT id FROM public.workspaces WHERE auth.uid() = owner_id
);

-- Expected: Should see ONLY systems in your workspaces
```

✅ **Check 4.1:** As Test User 1, add an AI system to your workspace  
✅ **Check 4.2:** Verify it appears in your dashboard  
✅ **Check 4.3:** Switch to Test User 2, verify the system is NOT visible  

**Result:** [PASS / FAIL]

---

### TABLE 5: alerts

**Policy 1: Users can see alerts from their workspaces**

```sql
SELECT id, workspace_id, alert_type, severity 
FROM public.alerts 
WHERE workspace_id IN (
  SELECT id FROM public.workspaces WHERE auth.uid() = owner_id
);

-- Expected: Should see ONLY alerts from your workspaces
```

✅ **Check 5.1:** Verify alerts are workspace-isolated  

**Result:** [PASS / FAIL]

---

### TABLE 6: error_logs

**Policy 1: Users can see error logs from their workspaces**

```sql
SELECT id, workspace_id, endpoint, error_message 
FROM public.error_logs 
WHERE workspace_id IN (
  SELECT id FROM public.workspaces WHERE auth.uid() = owner_id
);

-- Expected: Should see ONLY errors from your workspaces
```

✅ **Check 6.1:** Verify error logs are workspace-isolated  

**Result:** [PASS / FAIL]

---

### TABLE 7: deployment_status

**Policy 1: Users can see deployment status for their workspaces**

```sql
SELECT id, workspace_id, deployed_commit, status 
FROM public.deployment_status 
WHERE workspace_id IN (
  SELECT id FROM public.workspaces WHERE auth.uid() = owner_id
);

-- Expected: Should see ONLY deployments for your workspaces
```

✅ **Check 7.1:** Verify deployment status is workspace-isolated  

**Result:** [PASS / FAIL]

---

### TABLE 8: audit_logs

**Policy 1: Users can see audit logs from their workspaces**

```sql
SELECT id, workspace_id, action, actor_id 
FROM public.audit_logs 
WHERE workspace_id IN (
  SELECT id FROM public.workspaces WHERE auth.uid() = owner_id
);

-- Expected: Should see ONLY audit logs from your workspaces
```

✅ **Check 8.1:** Verify audit logs are workspace-isolated  

**Result:** [PASS / FAIL]

---

## Multi-Tenant Isolation Test

**Purpose:** Verify complete data isolation between workspaces

### Test Scenario 1: Direct SQL Injection Attempt

As Test User 1, try to manually query another user's data:

```sql
-- This query SHOULD FAIL (RLS prevents it)
SELECT * FROM public.workspaces 
WHERE id = '<Test User 2 Workspace ID>';

-- Expected error: "new row violates row-level security policy"
-- If query succeeds: RLS IS NOT WORKING
```

✅ **Result:** Query should fail with RLS policy violation  
**Status:** [PASS / FAIL]

---

### Test Scenario 2: API Test (If Available)

Create a test script to verify API endpoints also respect RLS:

```bash
# As Test User 1, fetch your AI systems:
curl https://yourapp.vercel.app/api/ai-systems \
  -H "Authorization: Bearer <Test User 1 Token>"

# Expected: See ONLY Test User 1's systems

# Then try to access Test User 2's workspace:
# (This should fail or return empty)
```

✅ **Result:** API respects RLS, returns only user's data  
**Status:** [PASS / FAIL]

---

## Audit Results Summary

| Table | Check | Result | Notes |
|-------|-------|--------|-------|
| workspaces | User isolation | [  ] | Owner can only see own workspaces |
| workspace_members | User isolation | [  ] | Members only see their workspace |
| companies | User isolation | [  ] | Companies only visible to members |
| ai_systems | User isolation | [  ] | Systems only visible to workspace members |
| alerts | User isolation | [  ] | Alerts only visible to workspace members |
| error_logs | User isolation | [  ] | Errors only visible to workspace members |
| deployment_status | User isolation | [  ] | Deployments only visible to workspace members |
| audit_logs | User isolation | [  ] | Audit logs only visible to workspace members |
| Multi-tenant | SQL injection | [  ] | Direct SQL queries blocked by RLS |
| Multi-tenant | API isolation | [  ] | API endpoints respect RLS |

---

## Pass/Fail Criteria

**PASS:** All 10 checks pass  
**FAIL:** Any check fails (indicates policy misconfiguration)

### If FAIL
1. Review the failing policy in Supabase
2. Check the SQL in `supabase/schema.sql`
3. Re-run the schema or manually fix the policy
4. Re-run this audit

### If PASS
✅ Platform is ready for production multi-tenant use
✅ Data isolation is enforced at database level
✅ Customer data is protected from unauthorized access

---

## Authority & Responsibility

**Audit Owner:** Founder / Security Lead  
**Prerequisite:** Supabase schema deployed  
**Time Required:** ~30 minutes  
**Impact:** Blocks production launch if fails  

**Contact:** If RLS audit fails, report the failing check and we'll fix the policies.

---

**Status:** Ready to execute after Supabase deployment  
**Expected Timeline:** Day 1 after schema deployment  
**Blocker for:** Customer signup, production launch
