# Immediate Next Steps: After Supabase Deployment

**Purpose:** Quick reference for what to do immediately after Supabase schema is deployed  
**When:** Right after you complete docs/SUPABASE_DEPLOYMENT.md  
**Time needed:** 5 minutes to read, then 20 minutes to complete verification  
**Critical:** Do not skip any step

---

## You Just Deployed Supabase Schema ✅

**Congratulations!** You've completed the blocking item for customer launch.

Now follow these exact steps in order:

---

## Step 1: Verify the Deployment (2 minutes)

Go to Supabase dashboard → **SQL Editor**

Run this query:
```sql
select count(*) from information_schema.tables 
where table_schema = 'public' and table_type = 'BASE TABLE';
```

**You should see:** `count = 9`

**If you see a different number:**
- ❌ STOP. Schema deployment failed.
- Re-run the full schema.sql file from docs/SUPABASE_DEPLOYMENT.md Step 3
- Repeat this verification

**If count = 9:** ✅ Continue to Step 2

---

## Step 2: Enable Email Auth (1 minute)

1. Supabase dashboard → **Project Settings** (left sidebar, bottom)
2. Click **Auth → Providers**
3. Find **Email** section
4. Toggle the switch to **ON** (blue)
5. Click **Save**

**Verify:** The Email provider should now show as enabled

**If it shows as disabled:**
- Click the toggle again
- Wait 10 seconds
- Refresh the page

---

## Step 3: Check Your Environment Variables (1 minute)

Make sure these are set in your Vercel project:

1. Go to **Vercel dashboard** → Your project
2. Click **Settings** (left navigation)
3. Click **Environment Variables**
4. Verify these exist (don't need to read values, just confirm they're there):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`

**If any are missing:**
- ❌ STOP. Variables not set.
- Get the values from Supabase dashboard → Project Settings → API
- Add them to Vercel dashboard → Settings → Environment Variables
- Redeploy (Vercel will auto-deploy when env vars are added)

**If all are present:** ✅ Continue to Step 4

---

## Step 4: Check Vercel Deployment Status (1 minute)

1. Go to **Vercel dashboard** → Your project
2. Look for **Deployments** section
3. Find the latest deployment (top of list)
4. Wait for status to be **Ready** (should say "✅ Ready" in blue)

**Expected timeline:**
- Redeploy triggers automatically when env vars are added
- Takes 2-5 minutes to complete

**If deployment shows "Error":**
- ❌ STOP. Deployment failed.
- Click on the failed deployment to see error message
- Common causes:
  - Build error (check build logs)
  - Missing env var (go back to Step 3)
- Fix the issue and Vercel will auto-redeploy

**Once deployment shows ✅ Ready:** ✅ Continue to Step 5

---

## Step 5: Test the Health Endpoint (1 minute)

Open this URL in your browser:

```
https://<your-vercel-url>/api/health
```

(Replace `<your-vercel-url>` with your actual Vercel deployment URL, e.g., `newspulse-ai.vercel.app`)

**You should see** (in browser, JSON format):
```json
{
  "status": "healthy",
  "timestamp": "2026-07-15T..."
}
```

**If you see an error:**
- ❌ STOP. Connection broken.
- Check Supabase dashboard status (maybe the service is down)
- Verify environment variables are correct in Vercel
- Wait 30 seconds and try again (deployment might still be initializing)

**If you see "healthy":** ✅ Continue to Step 6

---

## Step 6: Run Complete Pre-Flight Verification (20 minutes)

**Follow the entire checklist in:** [`docs/PRE_FLIGHT_VERIFICATION.md`](./PRE_FLIGHT_VERIFICATION.md)

This verifies:
- ✅ All database tables exist
- ✅ All indexes deployed
- ✅ RLS policies active and working
- ✅ Email authentication functioning
- ✅ Signup flow works end-to-end
- ✅ Data isolation verified
- ✅ No errors in production logs

**Time:** 20 minutes

**Must complete:** All checks must pass before customer signup

---

## Step 7: Record the Deployment (2 minutes)

Create a log entry documenting the deployment:

**File:** `docs/DEPLOYMENTS/YYYY-MM-DD-supabase-schema.md`

```markdown
# Supabase Schema Deployment — 2026-07-15

## Deployment Details
- Date: 2026-07-15
- Time: 14:30 UTC
- Deployed by: [Your name]
- Deployment method: Manual (SQL Editor)

## Verification Results
- ✅ 9 tables created
- ✅ 13+ indexes deployed
- ✅ RLS policies active
- ✅ Email auth enabled
- ✅ Production health checks: All green
- ✅ Signup flow verified
- ✅ Data isolation verified

## Next Action
→ Proceed to LAUNCH_DAY_PROCEDURES.md (Pre-Launch Checklist at T-1 hour)

## Rollback Procedure (if needed)
If critical issue found before customer launch:
1. Disable customer signup immediately
2. Investigate in Supabase console
3. Fix issue
4. Re-verify with pre-flight checklist
5. Re-enable signup

See DISASTER_RECOVERY_PLAN.md for detailed procedures.
```

---

## Step 8: Notify Governor (1 minute)

Send message to Governor/Claude Code:
```
"Supabase deployed and verified. All pre-flight checks pass. 
Ready to begin LAUNCH_DAY_PROCEDURES.md"
```

Or simpler: "Supabase deployed ✅"

This signals that the blocking item is complete and you're ready to launch.

---

## You're Now Ready for Launch ✅

**All autonomous preparations complete.**

**What's next:**
1. Follow `docs/LAUNCH_DAY_PROCEDURES.md` starting at **Pre-Launch Checklist (T-1 Hour)**
2. Monitor first customer signups using `docs/FIRST_WEEK_TRACKING.md`
3. Keep disaster recovery procedures (`docs/DISASTER_RECOVERY_PLAN.md`) available for reference

---

## Timeline Summary

```
✅ Supabase schema deployed (Step 1-2)
   ↓
✅ Environment variables verified (Step 3)
   ↓
✅ Vercel deployment ready (Step 4)
   ↓
✅ Health endpoint responsive (Step 5)
   ↓
✅ Pre-flight verification complete (Step 6)
   ↓
✅ Deployment documented (Step 7)
   ↓
🚀 LAUNCH DAY BEGINS (See LAUNCH_DAY_PROCEDURES.md)
```

**Elapsed time:** ~30 minutes from Supabase deployment to launch-ready

---

## Troubleshooting Quick Reference

| Problem | Solution |
|---------|----------|
| Health endpoint shows error | Check Vercel env vars, wait 2 min for deployment |
| Email auth not working | Re-enable Email provider in Supabase, wait 30 sec |
| Database query errors | Verify all 9 tables exist (Step 1 query) |
| RLS blocking legitimate access | Go to PRE_FLIGHT_VERIFICATION Phase 2 to debug |
| Signup flow fails | Check `/api/health` and `/api/production-health` endpoints |

---

**Questions?** Check:
- `docs/SUPABASE_DEPLOYMENT.md` — Initial deployment steps
- `docs/PRE_FLIGHT_VERIFICATION.md` — Detailed verification checklist
- `docs/TROUBLESHOOTING_GUIDE.md` — Customer support issues
- `docs/DISASTER_RECOVERY_PLAN.md` — If something goes wrong

---

**Last updated:** 2026-07-15  
**Critical:** Do not skip steps 1-6
