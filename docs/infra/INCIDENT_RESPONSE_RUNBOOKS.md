# Incident Response Runbooks — Step-by-Step Procedures

**Purpose:** When something breaks, follow these exact steps. Do not improvise.

**Golden Rule:** If you're unsure, rollback to the last known good version.

---

## INCIDENT: Customer Signup Failing (403 Error)

**Severity:** 🔴 CRITICAL  
**TTR Goal:** <15 min  
**Last occurred:** [Never in production, tested locally]

### Diagnosis (2 min)

1. **Reproduce:** Try signing up yourself at https://newspulse-ai.vercel.app/auth/signup
2. **Check error:** Look at browser DevTools (F12) → Console → Network
3. **Expected error:** `POST /api/workspace → 403 Forbidden`

### Root Causes (in order of likelihood)

| Cause                        | Probability | How to Verify                                |
| ---------------------------- | ----------- | -------------------------------------------- |
| Supabase schema not deployed | 95%         | Check Supabase SQL Editor → No tables exist  |
| RLS policies missing         | 4%          | Tables exist but `auth.users()` returns null |
| Database connection failed   | 1%          | Supabase dashboard shows connection error    |

### Fix Steps

**Step 1: Verify Supabase connection (2 min)**

- Open Supabase dashboard: https://app.supabase.com
- Project: [YOUR_PROJECT_NAME]
- Check "Status" page (top right)
  - If 🟢 green: Connection OK
  - If 🔴 red: Contact Supabase support (outage)
  - If 🟡 yellow: Degraded, may recover

**Step 2: Verify schema deployed (3 min)**

- Supabase dashboard → SQL Editor
- Run this query:
  ```sql
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public';
  ```
- Should return: profiles, workspaces, companies, workspace_members, etc.
- **If empty:** Schema not deployed
  - **Action:** Follow SUPABASE-PRODUCTION-SETUP.md → Phase 1 (copy-paste schema.sql)

**Step 3: Verify RLS policies (2 min)**

- Supabase dashboard → SQL Editor
- Run this query:
  ```sql
  SELECT tablename, policyname FROM pg_policies
  WHERE schemaname = 'public';
  ```
- Should return 10+ policies
- **If empty:** Policies not created
  - **Action:** Re-run Phase 2 of SUPABASE-PRODUCTION-SETUP.md

**Step 4: Test signup flow again (2 min)**

- Try signup at https://newspulse-ai.vercel.app/auth/signup
- Check for 403 error
- **If still failing:** Escalate to Founder for deep investigation

### Recovery Actions

**If Supabase is down (outage):**

- Check status.supabase.com
- If outage: Wait 10-30 min for recovery
- Notify customer: "Brief outage, we're monitoring and should be back shortly"

**If schema missing:**

- Deploy schema immediately (15-30 min)
- Test signup afterward
- Notify customer: "We fixed an issue with our database. You can sign up now."

**If something else:**

- Do NOT guess
- Save the error message
- Contact Supabase support with full error details

### Verification (Test to confirm fix)

After fix, verify:

```bash
# 1. Try signing up through UI (5 min)
curl -X POST https://newspulse-ai.vercel.app/auth/signup \
  -d "email=test@example.com&password=SecurePassword123"

# 2. Check verification email arrives (2 min)
# (Check test email account)

# 3. Click verification link and confirm (2 min)
# 4. Log in with those credentials (1 min)
# 5. Complete workspace setup (3 min)

# Expected: End up on /dashboard with workspace data
```

### Escalation

| Condition                         | Action                       |
| --------------------------------- | ---------------------------- |
| Signup still failing after 15 min | Contact Supabase support     |
| Multiple customers affected       | Post to status page          |
| Data loss occurred                | Restore from Supabase backup |

---

## INCIDENT: API Returns 500 (Internal Server Error)

**Severity:** 🔴 CRITICAL  
**TTR Goal:** <10 min

### Diagnosis (3 min)

1. **Identify which API:** Which endpoint is failing? (/api/workspace, /api/health, etc.)
2. **Check browser:** Does https://newspulse-ai.vercel.app load?
3. **Check status:** GET /api/health → What's the response?

### Most Common Causes

| API                     | Likely Cause                | Fix                          |
| ----------------------- | --------------------------- | ---------------------------- |
| /api/workspace          | Supabase connection failed  | Restart connection pool      |
| /api/health             | Missing env var             | Check Vercel env vars        |
| /api/customer-retention | Memory leak                 | Restart Vercel deployment    |
| Any                     | Code error in recent deploy | Rollback to previous version |

### Fix Steps (By Cause)

**Cause 1: Supabase Connection Failed**

- Open Supabase dashboard
- Check project health (top right)
- If degraded: Reconnect
  ```
  Supabase → Settings → Database → Reset connection string
  ```
- Wait 2 minutes for Vercel to pick up new credentials
- Test: `curl https://newspulse-ai.vercel.app/api/health`

**Cause 2: Missing Environment Variable**

- Open Vercel dashboard: https://vercel.com/lalit-kumar-d-s-projects/newspulse-ai
- Settings → Environment Variables
- Verify these exist:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- If missing: Add from Supabase project settings
- Redeploy: `git push origin main` (triggers auto-redeploy)

**Cause 3: Code Error in Recent Deploy**

- Check: `git log --oneline -3` (What was deployed?)
- Check: Vercel build logs (Did build succeed?)
- If suspicious commit: Rollback
  ```bash
  git revert [COMMIT_SHA]
  git push origin main
  ```
- Vercel will auto-redeploy
- Verify: `curl https://newspulse-ai.vercel.app/api/health`

**Cause 4: Vercel Function Timeout**

- Check Vercel logs: Dashboard → Logs tab
- If "Function execution timeout": Query is too slow
  - Likely: Supabase query returning massive dataset
  - Fix: Add database index to speed up query
  - Temporary: Restart Vercel deployment
    ```
    Vercel Dashboard → Settings → Redeploy
    ```

### Verification

```bash
# Test each endpoint
for endpoint in /api/health /api/alerts /api/production-health /api/customer-retention; do
  echo "Testing $endpoint..."
  curl -s https://newspulse-ai.vercel.app$endpoint | jq '.' || echo "FAILED"
done
```

All should return valid JSON with no 500 errors.

### Escalation

| Condition                  | Action                                     |
| -------------------------- | ------------------------------------------ |
| Still 500 after 10 min     | Rollback to last known good                |
| Multiple endpoints failing | May be Vercel/Supabase outage              |
| Specific customer affected | Check if it's customer-specific (bad data) |

---

## INCIDENT: High Error Rate (>15%)

**Severity:** 🟠 HIGH  
**TTR Goal:** <30 min

### Diagnosis (5 min)

1. **Confirm:** Check /api/error-rate → `last_1h > 15%`?
2. **Duration:** When did errors start? (Last hour? 10 minutes?)
3. **Type:** What kind of errors? (Timeouts? 403? 500? 404?)

### Investigation

- Open Vercel dashboard → Functions logs
- Filter by error type
- Look for patterns:
  - All errors in same function? → Code bug
  - All errors after X time? → Deployment issue
  - Random errors? → Infrastructure issue

### Fix Steps

**If errors started after recent deploy:**

```bash
# 1. Check what was deployed
git log --oneline -1

# 2. Check Vercel build logs
# Dashboard → Recent deployment → Build output

# 3. If suspicious: Rollback
git revert [COMMIT]
git push origin main
# Wait 2 min for redeploy
```

**If errors are timeouts (Supabase):**

```bash
# 1. Check Supabase query performance
Supabase Dashboard → SQL Editor → Query Performance

# 2. If slow queries: Add indexes
# 3. Or temporarily increase connection pool size
Supabase → Settings → Database → Connection pooling
```

**If errors are authentication (401/403):**

```bash
# 1. Check JWT tokens expiring
# 2. Verify auth middleware working
grep -n "auth.getUser()" middleware.ts

# 3. Verify session refresh working
curl -v https://newspulse-ai.vercel.app/api/health
# Look for Set-Cookie headers
```

### Recovery

- Fix: Deploy code fix OR restart infrastructure
- Verify: Monitor error rate for 5 minutes (should drop below 5%)
- If still high: Escalate (may need Supabase support)

### Escalation

| Condition                   | Action                                         |
| --------------------------- | ---------------------------------------------- |
| Errors persist after 30 min | Contact Supabase (may be their infrastructure) |
| 100+ errors in last hour    | Urgent: Post status update + consider rollback |

---

## INCIDENT: Slow Performance (API >5s response time)

**Severity:** 🟡 MEDIUM  
**TTR Goal:** <1 hour

### Diagnosis (5 min)

1. **Confirm:** Check /api/performance-baseline → Latency >5s?
2. **Which endpoints:** Is it all APIs or specific ones?
3. **When started:** Recent deploy? Sudden spike?

### Root Causes (Order of likelihood)

| Cause                           | Indicator                         | Fix                               |
| ------------------------------- | --------------------------------- | --------------------------------- |
| Database query is slow          | Vercel logs show DB wait time >3s | Add index to slow table           |
| Network latency                 | All APIs slow, consistent delay   | Check ISP/CDN (likely Vercel)     |
| Vercel function cold start      | First request slow, then fast     | Normal, not a problem             |
| Memory leak                     | Gets slower over time             | Restart deployment                |
| Heavy load (legitimate traffic) | Many concurrent users             | Scale Vercel (increase resources) |

### Fix Steps

**If database slow:**

```sql
-- Check slow queries
SELECT * FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

- Identify slow query
- Add index:

```sql
CREATE INDEX idx_name ON table_name (column);
```

**If cold start (normal):**

- This is expected on Vercel Hobby tier
- First request: 1-2 seconds
- Subsequent: <200ms
- Not a problem (customer won't notice with connection warm)

**If memory leak:**

```bash
# Restart Vercel deployment
curl -X POST https://api.vercel.com/v13/deployments \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -d '{"action": "redeploy", "deploymentId": "..."}'
```

Or simpler: `git push origin main` (triggers redeploy)

**If legitimate load:**

- Upgrade Vercel plan from Hobby to Pro
- Or optimize code (profile with Vercel Analytics)

### Verification

```bash
# Measure response time
time curl -s https://newspulse-ai.vercel.app/api/health | jq '.'

# Should be <1 second
```

---

## INCIDENT: Database Connection Lost

**Severity:** 🔴 CRITICAL  
**TTR Goal:** <5 min

### Symptoms

- All API requests return 500
- Vercel logs show "Error: connect ECONNREFUSED"
- Supabase dashboard shows connection error

### Immediate Action (1 min)

1. Check Supabase status: https://status.supabase.com
2. If showing outage: Wait for recovery (usually <30 min)
3. If not showing outage: Proceed to fix

### Fix Steps (2 min)

**Option 1: Restart Vercel deployment**

```bash
git push origin main
# Triggers automatic redeploy
# Wait 2-3 minutes
```

**Option 2: Manually reconnect in Supabase**

- Supabase dashboard
- Settings → Database → Connection pooling
- Toggle "Connection pooling" OFF then ON
- Wait 1 minute

**Option 3: Check credentials**

- Verify env vars in Vercel still valid:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_SUPABASE_URL`
- If expired: Update from Supabase project settings
- Redeploy Vercel

### Recovery Verification

```bash
curl https://newspulse-ai.vercel.app/api/health
# Should return 200 with health info
```

### Escalation

| Condition                      | Action                                              |
| ------------------------------ | --------------------------------------------------- |
| Still disconnected after 5 min | Contact Supabase support (provide connection error) |
| Recurring (happens daily)      | May be connection pool exhaustion, contact Supabase |

---

## Emergency Escalation Checklist

If you're unsure or fix isn't working:

- [ ] Save error message / logs
- [ ] Note exactly when it started
- [ ] Document steps you've already tried
- [ ] Check status pages (Vercel, Supabase, GitHub)
- [ ] Contact Supabase support if database-related
- [ ] Contact Vercel support if deployment-related
- [ ] Post incident in /api/knowledge for future reference

---

**Remember:** Every incident is a learning opportunity. Document what happened, why it happened, and how to prevent it next time.

The best incidents are the ones you prevent. 🚀
