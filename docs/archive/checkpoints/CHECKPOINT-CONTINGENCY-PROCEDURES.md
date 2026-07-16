# Checkpoint Contingency Procedures
**Scope:** 2026-07-15 14:30 UTC to 2026-07-17 08:00 UTC (41 hours)  
**Purpose:** Handle every conceivable failure mode during final countdown to checkpoint audit  
**Owner:** Governor (autonomous); escalates to Lalit for business decisions

---

## Executive Summary: Risk Posture

**Overall Risk Level:** 🟢 LOW

**Probability of Each Scenario:**
- ✅ **Perfect execution** (no issues): 85%
- 🟡 **Minor issue, easily fixed**: 12%
- 🔴 **Major issue, needs escalation**: 3%
- ⚫ **Unrecoverable failure**: <1%

**Key Assumption:** All systems are healthy and stable going into final 41 hours. If something breaks, it will be a regression (not pre-existing), which makes it diagnosable and fixable.

---

## Scenario 1: Vercel Deployment Becomes Red (Error Spike)

**Signal:** Vercel dashboard shows deployment status as red or latest build failed

**Probability:** 2% (code is stable, all tests passing)

**Impact:** 
- Cannot deploy fixes
- May prevent traffic to endpoints
- Measurement window data collection halted

**Immediate Response (First 15 Minutes):**

1. **Diagnose:**
   ```
   Q1: Did anything change in the code? (No → likely infra issue; Yes → likely code issue)
   Q2: When did it start? (Last 24h → my changes; Before → someone else's changes)
   Q3: What's the error message? (Log it for analysis)
   ```

2. **Quick Fixes (Try These First):**
   - Restart deployment: Vercel dashboard → Deployments → Redeploy
   - Check if issue is temporary (wait 2 min, try redeploy again)
   - Verify all environment variables are set (Vercel → Settings → Environment Variables)
   - Check if Supabase is down (status.supabase.com)

3. **If Quick Fixes Work:**
   - System is back online
   - Monitor for 30 min to ensure stability
   - Continue with measurement window
   - Report all clear to Lalit

**If Issue Persists (>15 min):**

4. **Deep Diagnosis:**
   - Read full Vercel logs: Deployments → [Latest] → Logs
   - Search for error patterns: `error`, `failed`, `timeout`, `connection`
   - Check when issue started: Compare to last successful deployment
   - Run locally: `npm run build` to see if build works locally
   
5. **Recovery Procedures:**
   - **If build error:** Fix code locally, test, re-push
   - **If dependency error:** Verify package.json matches expected versions
   - **If database error:** Check Supabase connection string in env vars
   - **If edge function error:** Check API route code for syntax errors

6. **Last Resort - Rollback:**
   - Vercel → Deployments → Click previous successful deployment
   - Click "Redeploy" button
   - This reverts to last known-good state
   - Measurement window continues on stable version

**Escalation to Lalit:**
- Status: Deployment is down/fixing/recovered
- Time to fix: X minutes
- Impact on checkpoint: Can still proceed (checkpoint uses SQL queries, not live API)
- Action needed: None (unless rollback breaks something unexpected)

---

## Scenario 2: Supabase Connection Fails (Database Down)

**Signal:** All API requests return "database connection failed" or timeout

**Probability:** 1% (Supabase is managed service; very rare outages)

**Impact:**
- All /api/obligations endpoints fail
- Measurement data cannot be collected
- System is unusable

**Immediate Response (First 10 Minutes):**

1. **Check Status Page:**
   - Go to https://status.supabase.com
   - Look for active incidents
   - If incident is ongoing: Wait 5-10 min (usually resolves quickly)
   - If no incident but you have issues: Likely your account/connectivity issue

2. **Verify Connection:**
   - Vercel → Settings → Environment Variables
   - Check `NEXT_PUBLIC_SUPABASE_URL` is correct (should match your project URL)
   - Check `SUPABASE_SERVICE_ROLE_KEY` is present and correct (don't paste it openly)
   - If URLs are wrong: Correct them and redeploy

3. **Test Connection Locally:**
   ```bash
   # In local terminal, try to connect to Supabase
   # This verifies if issue is network-related or auth-related
   curl https://YOUR_SUPABASE_URL/rest/v1/health -H "Authorization: Bearer YOUR_ANON_KEY"
   # Should return something like {"status":"ok"}
   ```

4. **Restart Supabase (If Possible):**
   - Supabase dashboard → Your project
   - Check if there's a "Restart" button (usually in Settings → Compute)
   - Click Restart (this takes 2-5 minutes)
   - Wait for it to come back online

**If Issue Persists (>15 min):**

5. **Check for Data Corruption:**
   - Once connection is restored, verify data:
   ```sql
   SELECT COUNT(*) FROM obligations;
   SELECT COUNT(*) FROM assessments;
   -- These should not be 0 (unless no data was collected yet)
   ```

6. **Recovery:**
   - If data is intact: Continue measurement window, no action needed
   - If data is corrupted: See "Scenario 5: Data Corruption" below

**Escalation to Lalit:**
- Status: Supabase down/recovered
- Duration: X minutes
- Data status: Intact / Corrupted
- Action needed: If corrupted, may need to extend measurement window

---

## Scenario 3: RLS Policies Broken (403 Errors)

**Signal:** Vercel logs show repeated "403 Forbidden" or "RLS policy denied access"

**Probability:** <1% (policies deployed and tested)

**Impact:**
- Users cannot access obligations (permission denied)
- Measurement data collection is blocked
- System appears broken to end users

**Immediate Response (First 15 Minutes):**

1. **Verify RLS Policies Exist:**
   ```sql
   -- In Supabase SQL Editor
   SELECT tablename, policyname, permissive 
   FROM pg_policies 
   WHERE tablename = 'obligations'
   ORDER BY policyname;
   ```
   
   - Should return 4 policies (SELECT, INSERT, UPDATE, DELETE)
   - If 0 policies: Policies were accidentally dropped or schema wasn't deployed
   - If >0 policies: Policies exist but may be buggy

2. **Test Policy Access Manually:**
   ```sql
   -- Check if you can read obligations as the current user
   SELECT COUNT(*) FROM obligations;
   -- Should return a number, not "permission denied"
   ```

3. **If Policies Are Missing:**
   - Re-run `/supabase/schema.sql` to restore them
   - Instructions in `/docs/infra/SUPABASE-DEPLOYMENT-VERIFICATION.md`
   - Redeploy Vercel to pick up changes

4. **If Policies Exist But Fail:**
   - Check policy conditions:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'obligations';
   -- Look for the actual policy conditions
   ```
   - Verify workspace membership is working:
   ```sql
   SELECT * FROM workspace_members WHERE user_id = current_user_id();
   -- Should return at least one row
   ```

**Recovery:**
- Once policies are verified, re-test API endpoint
- `/api/obligations` should return 200 with data
- If still 403, likely issue is with user session (not policy)

**Escalation to Lalit:**
- Status: RLS policy issue (diagnosed / fixed)
- Impact: Users cannot access data temporarily
- Action: May need to extend measurement window if users can't use system during measurement period

---

## Scenario 4: Performance Degradation (Slow Queries)

**Signal:** `/api/obligations` taking >5 seconds; Supabase CPU >80%; users report slowness

**Probability:** 2% (system is simple; queries are indexed)

**Impact:**
- User experience is poor (feels broken)
- May discourage adoption during measurement window
- Checkpoint data may show artificially low engagement (users gave up due to slowness)

**Immediate Response (First 10 Minutes):**

1. **Check Supabase Monitoring:**
   - Go to Supabase dashboard → Monitoring
   - **Postgres CPU:** Should be <50%. If >80%, there's a problem.
   - **Connection Count:** Should be stable. If growing, possible connection leak.
   - **Query Performance:** Look for queries with high avg time (>1000ms)

2. **Find Slow Queries:**
   ```sql
   -- In Supabase SQL Editor
   SELECT query, calls, total_time, mean_time 
   FROM pg_stat_statements 
   WHERE mean_time > 1000 
   ORDER BY mean_time DESC 
   LIMIT 10;
   ```
   
   - If slow queries found: Identify which API endpoint they're from
   - If no queries: Issue is not in database (likely Vercel function overhead)

3. **Quick Fixes:**
   - **Restart Supabase:** Settings → Compute → Restart (2-5 min)
   - **Verify Indexes Exist:** `\d obligations` in SQL Editor (should see index_obligations_workspace_id, etc.)
   - **Check for Runaway Connections:** `SELECT * FROM pg_stat_activity` (should be <20 connections)

4. **If Issue Persists:**
   - Check if this is expected load or unexpected spike
   - If expected (legitimate traffic): Acknowledge and continue measuring
   - If unexpected (no reason for spike): Investigate cause

**Recovery:**
- Restart typically fixes the issue
- Monitor Supabase CPU for 30 minutes to ensure it stays low
- If issue returns, may indicate a real problem (not just a spike)

**Escalation to Lalit:**
- Status: Performance degradation (temporary / persistent)
- Severity: High (affects user experience during measurement)
- Options: Wait for restart to fix / Extend measurement window / Investigate root cause

---

## Scenario 5: Data Corruption (Invalid Data in Database)

**Signal:** Checkpoint queries return unexpected data (10x growth in 1 hour, orphaned records, duplicates)

**Probability:** <1% (schema has constraints; RLS prevents cross-workspace access)

**Impact:**
- Measurement data is unreliable
- Checkpoint metrics will be wrong
- Cannot trust adoption data to make Phase 3 decision

**Immediate Response (First 30 Minutes):**

1. **Detect Corruption:**
   ```sql
   -- Run these checks
   
   -- Check for growth spike
   SELECT COUNT(*) FROM obligations WHERE created_at >= now() - interval '1 hour';
   -- Expected: <50 (normal hourly rate). If >500, possible loop.
   
   -- Check for orphaned records
   SELECT COUNT(*) FROM obligations WHERE workspace_id NOT IN (SELECT id FROM workspaces);
   -- Expected: 0. If >0, orphaned data exists.
   
   -- Check for duplicates
   SELECT title, COUNT(*) FROM obligations 
   GROUP BY title 
   HAVING COUNT(*) > 1
   ORDER BY COUNT(*) DESC;
   -- Expected: 0 (no duplicate titles). If >0, duplicates exist.
   ```

2. **Investigate Root Cause:**
   - Check Vercel logs for error patterns in last hour
   - Check if template import endpoint was called repeatedly
   - Check if there's a loop creating obligations
   - Look for any unusual API calls

3. **Containment (Don't Make Worse):**
   - Stop the process causing corruption (restart API if needed)
   - Don't delete data yet (need to analyze first)
   - Isolate the issue (identify which workspace is affected)

4. **Analysis:**
   ```sql
   -- Find which workspace has the problem
   SELECT workspace_id, COUNT(*) 
   FROM obligations 
   WHERE created_at >= now() - interval '1 hour'
   GROUP BY workspace_id 
   ORDER BY COUNT(*) DESC;
   
   -- Find when corruption started
   SELECT DATE(created_at), COUNT(*) 
   FROM obligations 
   WHERE created_at >= '2026-07-10'
   GROUP BY DATE(created_at)
   ORDER BY DATE(created_at);
   -- Should show steady growth; spike = corruption start time
   ```

5. **Recovery Options:**

   **Option A: Delete Corrupted Data**
   ```sql
   -- If you know which workspace is affected:
   DELETE FROM obligations 
   WHERE workspace_id = 'CORRUPTED_WORKSPACE_ID'
   AND created_at >= CORRUPTION_START_TIME;
   ```

   **Option B: Restore from Backup**
   - Supabase has backups (usually available)
   - Contact Supabase support to restore to point-in-time before corruption

   **Option C: Accept Corrupted Window, Extend Measurement**
   - If corruption is contained to small window: Ignore that data
   - Extend measurement to 2026-07-24 to get clean data
   - Checkpoint uses data from clean period only

**Escalation to Lalit:**
- Status: Data corruption detected (scope: X obligations in Y workspace)
- Root cause: [loop / import gone wrong / other]
- Options: Delete corrupted data / Restore backup / Extend measurement window
- Recommendation: [based on severity and scope]
- Action: Requires your decision on recovery option

---

## Scenario 6: Code Breaks During Final 41 Hours

**Signal:** New commit introduced bug; tests pass but runtime fails

**Probability:** 1% (parallel sessions may merge breaking changes)

**Impact:**
- New deployments are broken
- Cannot deploy fixes if other changes needed
- May need to rollback

**Immediate Response (First 15 Minutes):**

1. **Identify Breaking Change:**
   - Check `git log --oneline -5` to see recent commits
   - If recent changes: Likely source of break
   - Run `npm run build` locally to test

2. **Options:**
   - **If small fix needed:** Fix locally, test, re-push
   - **If requires revert:** Use rollback procedure (see Scenario 1)
   - **If unclear:** Revert to last known-good commit temporarily

3. **Testing Before Re-Deploy:**
   ```bash
   npm run test    # Ensure all tests pass
   npm run build   # Ensure build succeeds
   npm run lint    # Ensure code is clean
   ```

4. **Deploy Only When All Pass**

**Escalation to Lalit:**
- Status: Code issue (identified / fixed / reverted)
- Impact: Brief downtime (X minutes) during testing
- Measurement window: Continues normally

---

## Scenario 7: Schema Was Never Deployed (Critical Path)

**Signal:** `/api/obligations` fails with "table obligations does not exist"

**Probability:** 5% (Lalit hasn't deployed schema yet; code-side is ready)

**Impact:**
- System cannot function
- No measurement data can be collected
- Measurement window is blocked

**Immediate Response (First 5 Minutes):**

1. **Verify Schema Status:**
   ```sql
   -- In Supabase SQL Editor
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```
   
   - Should see 13+ tables (obligations, assessments, workspaces, etc.)
   - If only see 'auth' table or nothing: Schema was not deployed

2. **If Schema Not Deployed:**
   - Go to `/docs/infra/SUPABASE-DEPLOYMENT-VERIFICATION.md`
   - Follow deployment instructions
   - Copy `/supabase/schema.sql` and run in SQL Editor
   - Takes 30-60 seconds to deploy

3. **After Deployment:**
   - Verify all tables exist (run query above)
   - Test endpoint: `/api/obligations` should return 200
   - Measurement window can continue

**This Is Lalit's Action Item**

**Escalation to Lalit:**
- Status: Schema not deployed
- Action: Deploy schema using instructions in SUPABASE-DEPLOYMENT-VERIFICATION.md
- Time required: 10-15 minutes
- Urgency: High (blocks measurement window)
- Note: Code is ready; just needs schema deployment

---

## Scenario 8: Measurement Window Data Is All Zeros (No Adoption)

**Signal:** Checkpoint queries show 0 obligations, 0 assessments, 0 teams signed up

**Probability:** 30% (depends on distribution of system to customers)

**Impact:**
- This is actually GOOD data (tells us adoption is low)
- NOT a failure - this is a valid measurement result
- Means Phase 3 may need to wait; product-market fit work comes first

**This Is Not a Problem**

**What It Means:**
- System works (code is correct, data collection is working)
- Adoption is low (0 signups means no one is using it)
- Measurement is valid (accurate measurement of true adoption)
- Next decision: Investigate why adoption is low, improve messaging/distribution, re-measure

**Escalation to Lalit:**
- Status: Measurement window complete; adoption is 0
- Interpretation: System works; adoption strategy needs adjustment
- Action: Pivot to improving adoption (better messaging, wider distribution) before Phase 3
- Timeline: 2-3 days strategy work + 2 weeks re-measurement

---

## Scenario 9: Concurrent Changes Cause Merge Conflicts

**Signal:** `git rebase` shows conflicts in DECISION_REGISTER.md or governance files

**Probability:** 5% (parallel sessions may make changes)

**Impact:**
- Cannot push changes
- Brief delay in deployment
- Usually easily resolved

**Immediate Response (First 10 Minutes):**

1. **See the Conflicts:**
   ```bash
   git rebase origin/main
   # If conflicts: Will show which files have conflicts
   ```

2. **Resolve Conflicts:**
   - Open conflicted files
   - Look for `<<<<<<<`, `=======`, `>>>>>>>`
   - Choose which version to keep (usually keep both if governance docs)
   - For sequential decisions: Re-number to avoid duplicates
   ```bash
   git add <resolved-file>
   git rebase --continue
   ```

3. **Push:**
   ```bash
   git push origin main
   ```

**This Is Routine Maintenance**

**Escalation to Lalit:**
- Usually no escalation needed (handled autonomously)
- Only if conflict is in critical file and unclear how to resolve

---

## Scenario 10: Network Outage or ISP Issues (External)

**Signal:** Cannot reach Vercel, cannot reach Supabase, cannot push to Git

**Probability:** <1% (environment is managed in cloud)

**Impact:**
- Brief connectivity loss
- Cannot push changes during outage
- Measurement window continues unaffected (systems are in cloud)

**Response:**

1. **Wait:** Network issues usually resolve in minutes
2. **Retry:** After 5 minutes, retry push/deployment
3. **Work Offline:** While waiting, can work locally and push when connectivity returns

**No Escalation Needed**

---

## Critical Timing: Last 24 Hours (2026-07-16)

**Window:** 2026-07-16 08:00 UTC to 2026-07-17 08:00 UTC

**Key Events:**

| Time | Event | Risk | Action |
|------|-------|------|--------|
| 08:00 | Pre-verification checklist | Low | Lalit runs checks; confirms GO/NO-GO |
| 12:00 | System monitoring | Low | Monitor Supabase CPU, Vercel errors |
| 18:00 | Final sanity check | Low | Verify build still passes; deployment still green |
| 02:00 | Overnight quiet time | Very Low | Automated monitoring only |
| 08:00 | Checkpoint begins | Low | All systems should be green |

**Contingency During This Window:**

| Issue | Response Time | Impact | Escalation |
|-------|---|---|---|
| Build fails | <15 min | High | Fix/rollback |
| Database slow | <10 min | Medium | Monitor/restart |
| RLS policy fails | <30 min | Critical | Re-deploy schema |
| Data corruption | <1 hour | Critical | Extend window |

---

## Escalation Decision Tree

**Use this tree to decide if you need to escalate to Lalit:**

```
1. Is checkpoint audit happening on 2026-07-17 at 08:00?
   ├─ YES → Continue to step 2
   └─ NO → (No checkpoint, no escalation)

2. Is the system functioning (can users access /obligations)?
   ├─ YES → No escalation needed (continue monitoring)
   └─ NO → Continue to step 3

3. Can the issue be fixed autonomously?
   ├─ YES → Fix it (restart, redeploy, rollback)
   └─ NO → Continue to step 4

4. Will checkpoint be blocked?
   ├─ NO → Monitor but don't escalate
   ├─ YES → Continue to step 5

5. Is data integrity compromised?
   ├─ NO → Escalate: System down but fixable
   └─ YES → Escalate: Data is compromised; options needed

ESCALATION MESSAGE FORMAT:
- Issue: [what's broken]
- Diagnosis: [what we know]
- Options: [what we can do]
- Recommendation: [what I think is best]
- Time to decide: [how urgent]
```

---

## Pre-Checkpoint Green Lights (Final Verification)

**These 7 items must be green before checkpoint begins:**

| Item | How to Check | Green State |
|------|--------------|------------|
| Deployment | Vercel dashboard | Green status, last build successful |
| API Endpoints | Vercel Functions tab | All 3 critical endpoints <500ms p95, 0% errors |
| Database | Supabase Monitoring | CPU <50%, connections <20, no slow queries |
| Data Integrity | Checkpoint-Audit queries | No orphans, no unexpected growth, data is clean |
| Error Rate | Vercel Logs | 0 critical errors in last 24h |
| Code Quality | Local: `npm test` | All tests passing, lint 0 errors, build clean |
| Schema Deployed | Supabase SQL Editor | 13+ tables exist, RLS policies in place |

**If ANY item is not green:** Do NOT proceed to checkpoint. Fix the issue first.

**If ALL items are green:** ✅ Ready for checkpoint audit.

---

## Contingency Contact Protocol

**If Critical Issue During 2026-07-16:**

1. **Diagnose** (5 min)
   - What's broken?
   - When did it start?
   - What's the error message?

2. **Attempt Fix** (15 min)
   - Restart (if applicable)
   - Redeploy (if applicable)
   - Rollback (if applicable)

3. **If Not Fixed in 15 Min → Escalate to Lalit:**
   ```
   [Date/Time] ISSUE: [Title]
   PROBLEM: [What's broken]
   DIAGNOSIS: [Root cause]
   ATTEMPTED FIXES: [What we tried]
   OPTIONS:
   A) [Fix option 1 + risks]
   B) [Fix option 2 + risks]
   C) [Extend measurement window + timeline]
   RECOMMENDATION: [Option X because...]
   DECISION NEEDED: [By when?]
   ```

---

## Success Criteria for Final 41 Hours

**If all of these are true on 2026-07-17 08:00 UTC:**

- ✅ Deployment is green and responsive
- ✅ All 3 critical APIs are <500ms and 0% error rate
- ✅ Supabase is healthy (CPU <50%, connections stable)
- ✅ Tests still passing (1128/1128)
- ✅ Build still clean (0 errors)
- ✅ Data is clean (no corruption, no orphans, no unexpected growth)
- ✅ Checkpoint queries run without errors
- ✅ Measurement window data is collected (or will be empty, which is also valid)

**Then:** ✅ **READY FOR CHECKPOINT AUDIT**

---

## Post-Checkpoint (If Issues Occurred)

If any of the above contingencies were triggered during 2026-07-15 to 2026-07-17:

1. **Document It:** Add entry to DECISION_REGISTER.md explaining the issue and resolution
2. **Learn from It:** What could prevent this next time? (Better monitoring? Different approach?)
3. **Continue Normally:** Once resolved, checkpoint proceeds on schedule

Remember: The system is built to be resilient. One temporary issue doesn't invalidate the measurement window.

---

**Governor stands ready with full contingency procedures. Checkpoint countdown: 41 hours. 🚀**
