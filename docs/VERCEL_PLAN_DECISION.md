# Vercel Plan Decision: Hobby vs Pro

**Status:** This branch deploys successfully on Vercel Hobby plan (free tier).

---

## What you get right now (Hobby)

✅ Core product functionality:
- Landing page
- Authentication (signup/signin/email confirmation)
- Workspace setup
- Governance dashboard
- API routes and database access

⏸️ Monitoring is **disabled**:
- No proactive blocker detection (GitHub Actions outages, etc.)
- No production health checks (every 5 min)
- No automatic deployment verification

---

## Why monitoring is disabled

Vercel's Hobby plan limits cron jobs to **once per day maximum**. EURO AI's monitoring DNA needs:
- Blocking conditions detection: every 30 minutes
- Production health checks: every 5 minutes
- Deployment verification: every 10 minutes
- Error rate monitoring: every 5 minutes

These exceed Hobby's limit.

---

## Trade-off: Choose one

### Option A: Hobby Plan (free)
**Cost:** $0/month  
**Trade-off:** No production monitoring  
**Good for:** Initial launch, small demo, single customer pilot  
**Risk:** Outages are silent until you manually check `/api/health`  

**To deploy:**
1. Push this branch to Vercel (already configured)
2. Vercel auto-deploys on `main` push
3. App is live and working
4. You monitor manually (check `/api/health` occasionally)

### Option B: Vercel Pro Plan
**Cost:** $20/month  
**Benefit:** Full monitoring DNA enabled  
**Good for:** Production-ready, multi-customer, peace of mind  

**What you get:**
- ✅ Automatic blocker detection (GitHub Actions down, Supabase down, etc.)
- ✅ 5-minute health checks (catches failures immediately)
- ✅ Deployment verification (confirms each push works)
- ✅ Error rate monitoring (API failure alerts)

**To enable (after upgrade):**
1. Upgrade to Vercel Pro in your account
2. Edit `vercel.json` and restore the `crons` array:
   ```json
   "crons": [
     { "path": "/api/blocking-conditions", "schedule": "*/30 * * * *" },
     { "path": "/api/production-health", "schedule": "*/5 * * * *" },
     { "path": "/api/verify-deployment", "schedule": "*/10 * * * *" },
     { "path": "/api/error-rate", "schedule": "*/5 * * * *" }
   ]
   ```
3. Push and Vercel will enable crons

---

## Recommendation

**For launch:** Start with **Hobby** (today, free).
**For multi-customer:** Upgrade to **Pro** once you have paying customers.

The code is complete either way. You're only choosing infrastructure cost vs monitoring convenience.

---

## Current state

This branch (`claude/governor-prime-directive-mg6p2d`) has crons **disabled** (empty array in `vercel.json`).
You can merge and deploy on Hobby.

When you're ready to upgrade:
1. Change plan on Vercel
2. Restore crons (see above)
3. Push change
4. Monitoring activates automatically

---

## Next steps

1. ✅ Deploy this branch (Hobby works now)
2. ⏳ Decide: Hobby (free) or Pro ($20/month)?
3. ⏳ If Pro: restore crons and re-push

Questions? See the [Founder Brief](./governance/FOUNDER_BRIEF.md) for full status.
