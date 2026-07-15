# Pre-Deployment Readiness Guide

**Purpose:** Verify everything is ready before deploying Supabase schema  
**Audience:** Founder  
**Time Required:** 10-15 minutes  
**Status:** Ready  
**Date:** 2026-07-15

---

## Executive Summary

Before you deploy the Supabase schema, verify these 10 items. **All must be ready.** This checklist takes ~10 minutes and prevents deployment issues.

**Success Criteria:** All items checked ✅ → You're ready to deploy

---

## Part 1: Verify Your Supabase Project (3 minutes)

### 1. Supabase Project Access
```
□ Log in to https://supabase.com
□ You can see your project in the dashboard
□ Project shows "Active" status
```

**If you see an error:** Project creation may be in progress. Wait 2-3 minutes and refresh.

---

### 2. Supabase SQL Editor Access
```
□ Click your project
□ Left sidebar → "SQL Editor"
□ You can see a blank editor window
□ You can click "+ New Query" button
```

**If you see an error:** Check that your Supabase account has admin permissions. Contact Supabase support if needed.

---

### 3. Supabase URL & Keys Documented
```
□ Go to Project Settings (gear icon, bottom of left sidebar)
□ Click "API"
□ Copy: Project URL (looks like: https://xxx-project-ref.supabase.co)
□ Copy: Anon public key (starts with: eyJ...)
□ Copy: Service role key (starts with: eyJ...)
□ Save these somewhere safe (you'll need them in 30 seconds)
```

**If you see an error:** Keys may take a moment to generate. Refresh the page and try again.

---

## Part 2: Prepare the Environment (3 minutes)

### 4. Have the Schema File Ready
```
□ Open: supabase/schema.sql (in your editor or GitHub)
□ File contains 9 CREATE TABLE statements
□ File is not empty
□ You can see: workspaces, auth_users, ai_systems, etc.
```

**If you see an error:** File may be corrupted. Re-download from GitHub.

---

### 5. Time Zone & Location Verified
```
□ You're in a location where you can stay for 30 minutes uninterrupted
□ You have your Supabase URL, Anon key, and Service role key nearby
□ You have the schema.sql file open and ready to copy
□ You have 15-30 minutes free to complete this + email auth setup
```

**Tip:** Do this deployment in the morning your local time, when you're alert.

---

## Part 3: Verify Local Code (2 minutes)

### 6. Code is Built and Ready
```
□ Run: npm run build
□ Build completes successfully (no errors)
□ You see "✓ Build complete"
```

**If build fails:** Check Node version (v18+), and re-run `npm install`.

---

### 7. Current Branch Verified
```
□ Run: git status
□ You're on branch: claude/governor-prime-directive-mg6p2d
□ Working tree is clean (no uncommitted changes)
```

**If you see changes:** Contact Governor to discuss before proceeding.

---

## Part 4: Deployment Environment (2 minutes)

### 8. Vercel Project Connected
```
□ Go to https://vercel.com/dashboard
□ You see project: mininglife7-dev/newspulse-ai
□ Project shows: "Production" environment
□ Recent deployments show: Ready ✓
```

**If you see an error:** Vercel may need to sync with GitHub. Check GitHub Actions.

---

### 9. Environment Variables Documented
```
□ You have these Supabase keys ready:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
```

**Note:** You'll set these in Vercel Project Settings after schema deployment.

---

## Part 5: Communication & Support (1 minute)

### 10. Support Channel Ready
```
□ You have Governor's contact info (for technical issues)
□ You know who to contact if something goes wrong
□ You have a way to communicate status back to team
```

**Contact:** Governor available for real-time support during deployment

---

## Pre-Deployment Readiness Checklist

Copy-paste this into your notes. Check each before proceeding:

```
PRE-DEPLOYMENT VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Supabase Project
☐ Can log in to Supabase
☐ Project shows "Active"
☐ SQL Editor is accessible
☐ URL & keys are copied and saved

Schema & Code
☐ schema.sql file is open and ready
☐ npm run build succeeds
☐ git status shows clean working tree
☐ On correct branch: claude/governor-prime-directive-mg6p2d

Environment
☐ Vercel project shows "Ready" status
☐ Have 30 minutes uninterrupted time
☐ Support channel is ready
☐ All three Supabase keys documented

READY TO DEPLOY? → All 12 items checked
```

---

## What Happens Next (After You Check All Items)

**When all 10 items above are verified:**

1. **You message:** "Pre-deployment readiness verified ✅"
2. **Governor confirms:** "Ready to proceed"
3. **You proceed to:** FOUNDER_ACTION_BOARD.md → "Deploy Supabase Schema"

---

## Step-by-Step Deployment Path

Once you verify all items above, here's what happens:

```
NOW:
├─ Pre-deployment readiness check ← YOU ARE HERE
│
AFTER VERIFICATION:
├─ Deploy Supabase schema (5 min, you execute)
│  └─ Schema creates 9 tables with RLS policies
│
├─ Enable email authentication (2 min, you execute)
│  └─ Email provider activated in Supabase
│
├─ Set environment variables (5 min, you execute)
│  └─ Upload keys to Vercel → automatic redeploy
│
├─ Pre-flight verification (20 min, Governor executes)
│  └─ Automated test of all systems
│  └─ Email verification flow tested
│  └─ Data isolation verified
│  └─ Health endpoints confirmed
│
└─ LAUNCH DAY PROCEDURES (see LAUNCH_DAY_PROCEDURES.md)
   └─ Hour-by-hour checklist
   └─ Customer signup enabled
   └─ Monitoring active
```

**Total time from verified to customer signup:** 60-90 minutes

---

## Troubleshooting: If Something Isn't Ready

### Supabase Project Not Created Yet
- Go to https://supabase.com and create a new project
- Wait 2-3 minutes for project initialization
- Verify in dashboard

### Can't Access SQL Editor
- Refresh the page
- Try incognito/private browser window
- Check browser console for errors (F12)
- Contact Supabase support if persists

### npm run build Fails
- Delete node_modules: `rm -rf node_modules`
- Reinstall: `npm install`
- Rebuild: `npm run build`
- Check Node version: `node -v` (must be v18+)

### Git Working Tree Has Changes
- Contact Governor before proceeding
- Changes may need to be committed or stashed

### Vercel Project Not Showing
- Refresh https://vercel.com/dashboard
- Check GitHub integration is connected
- May need to trigger manual sync

---

## Critical Path: What Cannot Be Skipped

These items MUST be verified before deploying:

1. ✅ **Supabase project exists** — Without this, schema deployment fails
2. ✅ **SQL Editor is accessible** — Without this, you can't run schema
3. ✅ **Schema file exists** — Without this, there's nothing to deploy
4. ✅ **Supabase keys are copied** — Without these, environment won't be set
5. ✅ **30 minutes of time available** — Deployment through email setup should not be rushed

**Missing any of these?** Do not proceed. Get them ready first.

---

## Success Criteria for This Checklist

You are ready when:
- ✅ All 10 items are checked
- ✅ All prerequisites are available
- ✅ No errors or blockers exist
- ✅ You have time to proceed without interruption

**If all criteria are met:** Proceed to FOUNDER_ACTION_BOARD.md → Deploy Supabase Schema

---

## Next Steps

1. **Review this checklist** (5 minutes)
2. **Verify each item** (10 minutes)
3. **Message "Ready to deploy"** when all items checked
4. **Governor confirms** "Proceed to schema deployment"
5. **Follow FOUNDER_ACTION_BOARD.md exactly** (5-7 minutes per step)

---

## Document Control

**Created:** 2026-07-15  
**Purpose:** Pre-deployment verification  
**Version:** 1.0  
**Maintained by:** Governor

---

**Status:** ✅ Ready for use  
**Confidence:** HIGH  
**Estimated success probability:** 95% (if all items verified)

---

🚀 **Ready to check? Start at "Part 1: Verify Your Supabase Project" above.**
