# Launch Day Troubleshooting Guide

**Purpose:** Rapid diagnosis and fix procedures for critical launch day issues  
**Audience:** Founder and Governor  
**Time Required:** Follow procedures as needed  
**Status:** Ready  
**Date:** 2026-07-15

---

## Executive Summary

If something goes wrong during launch, use this guide. Each section has:
1. **Symptom** - What you observe
2. **Diagnosis** - How to determine the problem
3. **Fix** - How to resolve it
4. **Verify** - How to confirm it's fixed
5. **Escalation** - When to seek help

**Response Time Goal:** Identify and fix within 10 minutes

---

## CRITICAL ISSUES (Fix Now - Blocks Launch)

### Issue 1: Supabase Schema Deployment Fails

**Symptoms:**
- SQL Editor shows red error message
- "Syntax error" or "permission denied"
- "Table already exists" message
- Deployment hangs (spinning for >30 seconds)

**Diagnosis:**

1. Read the error message carefully - note the exact error text
2. Check which table/operation failed:
   ```
   If error mentions "workspaces" → workspace creation failed
   If error mentions "auth_users" → auth setup failed
   If error mentions "ai_systems" → system tracking failed
   ```

**Fixes:**

**Fix A: "Already Exists" Error (Most Common)**
```
Why: You may have deployed before, or someone else did.
How: Safe to re-run. Just click "Run" again on the same SQL.
Verify: 9 tables appear in "Tables" list on left sidebar
Time: <2 minutes
```

**Fix B: Syntax Error in SQL**
```
Why: SQL file may be corrupted or have encoding issues.
How:
  1. Verify you copied the entire file
  2. Check file ends with ";" 
  3. Check no special characters at top
  4. Delete text in SQL Editor
  5. Re-copy entire schema.sql file
  6. Click Run again
Verify: 9 tables created
Time: <5 minutes
```

**Fix C: Permission Denied**
```
Why: Your Supabase user doesn't have admin permissions.
How:
  1. Go to Supabase Project Settings
  2. Click "Database" → "Permissions"
  3. Verify your user has "Owner" or "Editor" role
  4. If not, invite owner and try again
Verify: Your user shows correct role
Time: <10 minutes
Escalation: Contact Supabase support if permissions still wrong
```

**Fix D: Deployment Hangs (Spinning >30 seconds)**
```
Why: SQL execution is taking too long (rare).
How:
  1. Wait up to 2 minutes more (schema is large)
  2. If still spinning: Close SQL Editor tab
  3. Reopen SQL Editor
  4. Try running again
Verify: Deployment completes
Time: <3 minutes
Escalation: Contact Governor if still hanging
```

**If None of Above Work:**
```
Next step: Screenshot the error and message Governor
Provide: Screenshot of exact error message
Include: What step you're on (deploy/email auth/verify)
Governor will investigate and advise
```

---

### Issue 2: Email Authentication Won't Enable

**Symptoms:**
- Email provider toggle stays OFF (gray)
- Toggle switches OFF when you try to turn it ON
- Email toggle shows OFF after saving
- "Error saving provider" message

**Diagnosis:**

1. Navigate back to Supabase → Project Settings → Auth → Providers
2. Look for Email row:
   - If toggle is gray → not enabled
   - If toggle is blue → enabled (check next section)
   - If toggle flips back off → settings issue

**Fixes:**

**Fix A: Refresh and Retry**
```
Why: UI may not have refreshed.
How:
  1. Refresh page (F5 or Cmd+R)
  2. Navigate back to Auth → Providers
  3. Try toggling Email ON again
  4. Click Save
Verify: Email toggle stays blue after page refresh
Time: <1 minute
```

**Fix B: Clear Browser Cache**
```
Why: Cached data may be stale.
How:
  1. Open DevTools (F12)
  2. Right-click refresh button
  3. Click "Empty cache and hard refresh"
  4. Wait for page to reload
  5. Navigate back to Providers
  6. Enable Email again
Verify: Email toggle is blue and persists after refresh
Time: <2 minutes
```

**Fix C: Try Different Email Provider Settings**
```
Why: Email provider may have default issues.
How:
  1. Go to Auth → Providers → Email
  2. Scroll down to "Email/Password"
  3. Verify:
     - "Enable email/password" is ON
     - "Email Confirmations" is ON
  4. Click Save
Verify: Both switches are ON and persist
Time: <2 minutes
```

**Fix D: Manual Configuration (If UI Fails)**
```
Why: UI bug may prevent toggle from working.
How:
  1. Open SQL Editor
  2. Run this query:
     UPDATE auth.schema_provider SET enabled = true 
     WHERE provider_id = 'email';
  3. Wait for success
  4. Go back to Providers UI
  5. Refresh page
  6. Email should show ON
Verify: Email toggle shows blue
Time: <3 minutes
Escalation: If still doesn't work, message Governor
```

**If Email Still Won't Enable:**
```
Next step: Screenshot the state and message Governor
Provide: Screenshot of Auth → Providers page
Include: Whether you see Email row at all
Governor will investigate configuration
Note: Launch can proceed without email auth enabled initially
      (will test in pre-flight verification)
```

---

### Issue 3: Environment Variables Not Set in Vercel

**Symptoms:**
- Environment variables don't appear in Vercel dashboard
- Settings page says "No environment variables"
- Vercel deployment still shows as building after 5+ minutes
- Pre-flight verification fails with "SUPABASE_URL not found"

**Diagnosis:**

1. Go to vercel.com → mininglife7-dev/newspulse-ai → Settings
2. Click "Environment Variables"
3. Check if you see three variables:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY

**Fixes:**

**Fix A: Variables Not Saved**
```
Why: Form submission may have failed silently.
How:
  1. Scroll to "Environment Variables"
  2. Click "Add New"
  3. Enter: NEXT_PUBLIC_SUPABASE_URL
  4. Paste: URL from Supabase (https://xxxx-project-ref.supabase.co)
  5. Click "Save"
  6. Repeat for NEXT_PUBLIC_SUPABASE_ANON_KEY
  7. Repeat for SUPABASE_SERVICE_ROLE_KEY
  8. Wait for "✓ Saved" confirmation
Verify: All three variables appear in list
Time: <3 minutes
```

**Fix B: Refresh Vercel Page**
```
Why: Vercel page may have stale UI state.
How:
  1. Go to https://vercel.com/dashboard
  2. Click project: mininglife7-dev/newspulse-ai
  3. Click Settings
  4. Refresh page (F5)
  5. Go to Environment Variables again
  6. Variables should appear
Verify: Variables are listed
Time: <1 minute
```

**Fix C: Re-Add Variables from Supabase**
```
Why: Values may have been copied incorrectly.
How:
  1. Go to Supabase → Project Settings → API
  2. Copy each value carefully:
     - URL (full URL starting with https://)
     - Anon key (long string starting with eyJ...)
     - Service role key (long string starting with eyJ...)
  3. Go back to Vercel Settings
  4. Delete old variables (click trash icon)
  5. Add new variables with correct values from step 2
  6. Save each one
Verify: Variables are saved and match Supabase exactly
Time: <5 minutes
```

**Fix D: Trigger Manual Redeployment**
```
Why: Vercel may need to redeploy with new variables.
How:
  1. Go to Vercel → Deployments
  2. Find most recent deployment
  3. Click "..." menu
  4. Click "Redeploy"
  5. Watch deployment progress
  6. Wait for "Ready ✓"
Verify: Deployment shows "Ready" and variables are active
Time: <3 minutes
```

**If Variables Still Won't Save:**
```
Next step: Try incognito/private browser window
  1. Open private window
  2. Go to https://vercel.com
  3. Log in
  4. Navigate to project settings
  5. Try adding variables again
If that doesn't work: Message Governor with screenshot
Include: Screenshot of Environment Variables page
Governor will check Vercel account permissions
```

---

### Issue 4: Pre-Flight Verification Fails

**Symptoms:**
- Pre-flight check reports "Database structure incomplete"
- "Email auth not working"
- "Health endpoint returned error"
- "Cross-tenant isolation failed"
- One or more checks show ❌ FAILED

**Diagnosis:**

1. Review the pre-flight report from Governor
2. Identify which check failed (e.g., "Table not found", "Email test failed")
3. Note the exact error message

**Fixes:**

**Fix A: Database Tables Not Created**
```
Why: Supabase schema didn't deploy successfully.
How:
  1. Go back to "Supabase Schema Deployment" section above
  2. Re-run the schema deployment
  3. Verify 9 tables appear in Supabase → Tables list
  4. Once verified, message Governor to re-run pre-flight
Verify: Pre-flight runs again and passes
Time: <5 minutes
```

**Fix B: Email Auth Not Working**
```
Why: Email provider may not be enabled.
How:
  1. Go back to "Email Authentication Won't Enable" section above
  2. Follow those steps to enable email
  3. Once enabled, message Governor to re-run pre-flight
Verify: Pre-flight email test passes
Time: <5 minutes
```

**Fix C: Environment Variables Missing**
```
Why: Vercel env vars may not be deployed yet.
How:
  1. Verify env vars are in Vercel Settings
  2. Trigger manual redeployment (see "Environment Variables" section)
  3. Wait for deployment to show "Ready"
  4. Message Governor to re-run pre-flight
Verify: Pre-flight can reach Supabase endpoints
Time: <3 minutes
```

**Fix D: Health Endpoint Failing**
```
Why: App may not be reachable or has errors.
How:
  1. Open your Vercel deployment URL in browser
  2. Try accessing: https://your-url/api/health
  3. You should see JSON: {"status":"ok"}
  4. If you see error: Check Vercel logs
     - Go to Vercel → Deployments
     - Click most recent deployment
     - Click "Logs"
     - Look for error messages
  5. Fix any errors shown in logs
  6. Redeploy if needed
Verify: Health endpoint returns 200 status
Time: <5 minutes
```

**Fix E: Data Isolation Test Failed**
```
Why: RLS policies may not be active.
How:
  1. Go to Supabase → SQL Editor
  2. Run this query to check RLS:
     SELECT tablename, rowsecurity 
     FROM pg_tables 
     WHERE schemaname = 'public'
  3. All tables should show "t" (true) for rowsecurity
  4. If any show "f" (false):
     Run: ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
  5. Once all tables have RLS enabled
  6. Message Governor to re-run pre-flight
Verify: All tables show rowsecurity = t
Time: <5 minutes
```

**If Pre-Flight Still Fails:**
```
Next step: Message Governor with full pre-flight report
Include: Screenshot of all failed checks
Include: Error messages from logs (if available)
Governor will investigate and determine:
  - Is this a blocker for launch?
  - What additional steps are needed?
  - Should we proceed or delay?
```

---

## URGENT ISSUES (Blocks Customer Signup)

### Issue 5: Customer Signup Endpoint Returns 500 Error

**Symptoms:**
- Customers see "Internal Server Error" on signup
- "Something went wrong" message
- Signup form submissions fail
- Vercel logs show 500 errors

**Diagnosis:**

1. Try signing up yourself in incognito window
2. Note the exact error message
3. Check Vercel logs:
   - Go to Vercel → Deployments → Latest
   - Click "Logs"
   - Look for errors during signup attempt

**Fixes:**

**Fix A: Database Connection Issue**
```
Symptoms: Logs show "cannot connect to database"
Why: Environment variables may not be set correctly
How:
  1. Verify env vars in Vercel Settings
  2. Check URL format: https://xxx-project-ref.supabase.co
  3. Check anon key starts with: eyJ
  4. Verify no extra spaces or quotes
  5. Redeploy: Vercel → Deployments → "..." → Redeploy
Verify: Signup works without errors
Time: <5 minutes
```

**Fix B: RLS Policy Error**
```
Symptoms: Logs show "row-level security" or "RLS" error
Why: RLS policies may be broken or missing
How:
  1. Go to Supabase → SQL Editor
  2. Check that auth_users table has RLS enabled
  3. Check RLS policy allows inserts for signed-up users
  4. If policies missing: Run schema deployment again
Verify: Signup completes without RLS errors
Time: <5 minutes
```

**Fix C: Email Service Error**
```
Symptoms: Logs show "email" or "SMTP" error
Why: Email provider may not be configured correctly
How:
  1. Go to Supabase → Project Settings → Auth → Email Templates
  2. Check that verification email template exists
  3. Verify "Send email" is enabled
  4. Try signup again
Verify: Verification email is sent
Time: <5 minutes
```

**If Signup Still Fails:**
```
Next step: Take screenshot of error and logs
Message Governor with:
  - Screenshot of signup error
  - Last 50 lines of Vercel logs
  - What happened (did it work before, was it always broken?)
Governor will:
  - Check application logs
  - Investigate database
  - Determine if rollback is needed
```

---

### Issue 6: Customer Data Loss or Corruption

**Symptoms:**
- Customer workspaces missing
- AI systems disappeared
- Data appears corrupted or wrong
- Database shows unexpected empty tables

**⚠️ CRITICAL: DO NOT attempt to fix without Governor guidance**

**Diagnosis:**

1. Do NOT make any database changes
2. Do NOT delete anything
3. Screenshot the current state
4. Note exactly what's missing

**Action:**

```
Immediate: Message Governor with:
  - Screenshot of what's missing
  - Time you first noticed the issue
  - Last known good state
  - What was happening when issue started

Governor will:
  1. Stop all database writes (if needed)
  2. Assess scope of data loss
  3. Check backups
  4. Determine recovery procedure
  5. Execute disaster recovery if needed

Timeline: Depends on scope
  - Single customer: 15-30 minutes
  - Multiple customers: 30-60 minutes
  - System-wide: Follow DISASTER_RECOVERY_PLAN.md
```

---

## PERFORMANCE ISSUES (Not Blocking, but Monitor)

### Issue 7: Signup Taking >10 Seconds

**Symptoms:**
- Signup form hangs after submit
- Page shows spinning wheel for 10+ seconds
- Eventually completes or times out
- Multiple users reporting slow signup

**Diagnosis:**

1. Open browser DevTools (F12)
2. Go to Networks tab
3. Try signup
4. Look for slow requests:
   - If Supabase request slow → database issue
   - If Vercel API slow → application issue
   - If email request slow → email service issue

**Fixes:**

**Fix A: Database Query Slow**
```
Symptoms: Supabase requests taking >5 sec
Why: Too many active users or slow query
How:
  1. Go to Supabase → Logs → Slow Queries
  2. Check if signup queries are slow
  3. If yes: May be due to volume (not critical)
  4. Monitor over next 30 minutes
Action: Track performance, escalate if gets worse
Monitor: Verify signup stays <10 seconds
```

**Fix B: Vercel Function Cold Start**
```
Symptoms: First signup is slow (>5 sec), rest are fast
Why: Vercel function needs to start up
How: This is normal for first request after deploy
  1. Try signup again - should be faster (2-3 sec)
  2. If stays slow: Check CPU/memory in logs
Action: This is expected behavior, not a blocker
Monitor: Verify performance stabilizes
```

**Fix C: Email Service Slow**
```
Symptoms: Signup completes but email is slow (>10 sec)
Why: Email provider may be slow
How: This is often external (not your problem)
  1. Check email eventually arrives (even if slow)
  2. Confirm verification works
Action: Email delay is not a critical blocker
Monitor: Track how long emails take
Note: Typical delay: 1-5 seconds
```

**If Performance Stays Bad:**
```
Next step: Message Governor with:
  - Screenshots of DevTools Network tab
  - Timeline of when it started
  - How many users are affected
Governor will:
  - Check server metrics
  - Identify bottleneck
  - Optimize or scale as needed
```

---

## COMMUNICATION ISSUES

### Issue 8: Can't Reach Governor or Support Team

**Symptoms:**
- Messages not getting responses
- Can't reach support contact
- No way to escalate urgent issue

**Action:**

1. Try multiple channels:
   - Slack (if available)
   - Email (mininglife7@gmail.com)
   - GitHub issues/discussions
   - Direct phone (if available)

2. If truly unable to reach anyone:
   - Document the issue thoroughly
   - Take screenshots
   - Note timeline
   - Post to team communication channel
   - Leave voicemail/email

3. Escalation path:
   - Try Governor first (technical issues)
   - Try Founder if Governor unreachable (business decisions)
   - Try Supabase support (for Supabase-specific issues)

---

## Decision Tree: "What Should I Do?"

```
START
│
├─ Is customer signup broken? 
│  └─ YES → Follow "Issue 5: Signup Returns 500"
│  └─ NO → Continue
│
├─ Did schema deployment fail?
│  └─ YES → Follow "Issue 1: Schema Deployment Fails"
│  └─ NO → Continue
│
├─ Is email auth not working?
│  └─ YES → Follow "Issue 2: Email Won't Enable"
│  └─ NO → Continue
│
├─ Did pre-flight verification fail?
│  └─ YES → Follow "Issue 4: Pre-Flight Fails"
│  └─ NO → Continue
│
├─ Is the app running slowly?
│  └─ YES → Follow "Issue 7: Signup Taking >10 Seconds"
│  └─ NO → Continue
│
├─ Is data missing or corrupted?
│  └─ YES → Follow "Issue 6: Data Loss" → Message Governor
│  └─ NO → Continue
│
└─ All checks passed? 
   └─ YES → Launch is healthy, continue monitoring
   └─ NO → Follow relevant issue section above
```

---

## Post-Issue Resolution Checklist

After fixing any issue:

1. **Verify** the fix worked (test the feature)
2. **Document** what went wrong and how you fixed it
3. **Notify** Governor (if Governor wasn't already involved)
4. **Monitor** for 15 minutes to ensure issue doesn't recur
5. **Update** this guide if you found new solutions

---

## When to Escalate Immediately

Do NOT wait - message Governor immediately if:

- ✅ Customer data is lost or corrupted
- ✅ System is completely down (no one can access)
- ✅ Security breach suspected
- ✅ Signup broken and you can't fix within 10 minutes
- ✅ Multiple customers affected by same issue
- ✅ Issue appears to be getting worse over time
- ✅ You're unsure what to do after 5 minutes

**Message format:**
```
URGENT: [Issue name]
Symptom: [What users see]
Affected: [How many customers/systems]
Time started: [When did it start]
Steps taken: [What you've tried]
Status: [Is it getting better or worse]
```

---

## Key Contact Info

| Role | Contact | Response |
|------|---------|----------|
| Governor (technical) | Immediate response | Via message/chat |
| Founder (decisions) | Urgent → founder approval | Via message/chat |
| Supabase support | For DB issues | <1 hour typically |
| Email service support | For email issues | <1 hour typically |

---

## Document Control

**Created:** 2026-07-15  
**Purpose:** Launch day rapid diagnosis  
**Version:** 1.0  
**Maintained by:** Governor  
**Review Frequency:** Daily during launch week, then quarterly

---

**Remember:** Stay calm, follow the steps, and escalate when needed. Most launch day issues are solvable within 10 minutes. You've got this! 🚀
