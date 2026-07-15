# Deployment Day Quick Reference Card

**Purpose:** One-page quick reference for deployment day steps  
**Print this:** Yes — have it next to you during deployment  
**Time:** Keep with you during T-1hr to T+90min window  
**Date:** 2026-07-15

---

## DEPLOYMENT CHECKLIST (Keep This Handy)

### ⏰ T-30min: PRE-DEPLOYMENT (15 minutes)

```
□ Read: docs/PRE_DEPLOYMENT_READINESS.md
□ Verify: All 10 items are checked
□ Message Governor: "Starting pre-deployment verification"
□ Supabase URL copied: ___________________________
□ Supabase Anon Key copied: ___________________________
□ Service Role Key copied: ___________________________
□ schema.sql file open in editor
□ 30+ minutes of uninterrupted time available
```

**❌ STOP** if any item is NOT checked. Fix it first.

---

### ✅ T+0min: DEPLOY SUPABASE SCHEMA (5 minutes)

**Location:** Supabase dashboard → SQL Editor

```
1. Open: supabase/schema.sql
2. Select all (Ctrl+A / Cmd+A)
3. Copy (Ctrl+C / Cmd+C)
4. Supabase SQL Editor → paste
5. Click: Run button
6. Wait for: "Success" message
7. ✅ VERIFY: 9 tables created
```

**⚠️ ERROR?** Re-run the query. "Already exists" is safe.

**Next:** Immediately proceed to T+5min step

---

### ✅ T+5min: ENABLE EMAIL AUTH (2 minutes)

**Location:** Supabase → Project Settings → Auth → Providers

```
1. Supabase Dashboard
2. Click: Project Settings (bottom left)
3. Click: Auth → Providers
4. Find: Email
5. Toggle: ON (blue)
6. Click: Save
7. ✅ VERIFY: Email toggle shows ON (blue)
```

**Next:** Message Governor "Supabase deployed & email enabled ✅"

---

### ✅ T+7min: SET ENVIRONMENT VARIABLES (5 minutes)

**Location:** Vercel Project Settings → Environment Variables

```
1. https://vercel.com/dashboard
2. Click: mininglife7-dev/newspulse-ai
3. Click: Settings → Environment Variables
4. Add variable: NEXT_PUBLIC_SUPABASE_URL
   Value: (paste URL from Supabase)
5. Add variable: NEXT_PUBLIC_SUPABASE_ANON_KEY
   Value: (paste anon key from Supabase)
6. Add variable: SUPABASE_SERVICE_ROLE_KEY
   Value: (paste service role key from Supabase)
7. Click: Save
8. ✅ WAIT: For automatic redeployment (~2-3 min)
9. ✅ VERIFY: Deployment shows "Ready" ✓
```

**Note:** Vercel will automatically redeploy after you save.

---

### ✅ T+15min: WAIT FOR PRE-FLIGHT VERIFICATION (20 minutes)

**Location:** Governor runs this automatically**

```
□ Governor begins pre-flight verification
□ Tests: Database structure
□ Tests: RLS policies
□ Tests: Email authentication
□ Tests: Health endpoints
□ Tests: End-to-end signup
□ Tests: Data isolation
□ Receives: Pre-flight verification report
□ Governor confirms: "All checks pass ✅"
```

**Your role:** Monitor messages from Governor. Ask questions if unclear.

**⚠️ If pre-flight FAILS:**
- Governor will explain what failed
- Governor will suggest fix
- Proceed to fix, then re-run pre-flight
- Do NOT proceed to launch until all checks pass

---

### ✅ T+35min: BEGIN LAUNCH DAY PROCEDURES (90 minutes)

**Location:** docs/LAUNCH_DAY_PROCEDURES.md**

```
T+0:00 → Enable customer signup (you, 5 min)
T+0:15 → Send launch announcement (you, 10 min)
T+0:30 → Monitor first wave (Governor, 30 min)
T+1:00 → First stability check (Governor, 10 min)
T+4:00 → End of critical period
T+12:00 → Half-day review
T+24:00 → First 24 hours complete
```

**Follow LAUNCH_DAY_PROCEDURES.md step-by-step**

---

## CRITICAL CONTACTS & ESCALATION

| Issue | Contact | Response Time |
|-------|---------|---|
| Technical problem | Governor | Immediate |
| Supabase question | Supabase support | <1 hour |
| Vercel deployment | Vercel support | <1 hour |
| Customer issue | Support team | <4 hours |

---

## IF SOMETHING GOES WRONG

### Schema Deployment Failed
```
→ Check error message
→ If "already exists" → safe, re-run
→ If different error → Message Governor with screenshot
→ Do NOT proceed until resolved
```

### Email Auth Won't Enable
```
→ Try toggling OFF then ON
→ Refresh page
→ Check Supabase status page
→ Message Governor if persists
```

### Environment Variables Not Working
```
→ Verify variables are set in Vercel
→ Refresh Vercel dashboard
→ Wait for redeploy to complete (watch status)
→ Message Governor if still failing
```

### Pre-Flight Verification Fails
```
→ Governor explains what failed
→ Do NOT proceed to launch
→ Follow Governor's remediation steps
→ Re-run pre-flight when ready
```

### Customer Signup Crashes
```
→ Governor investigates immediately
→ Check Vercel logs
→ Check Supabase for errors
→ Escalate if critical
→ Message affected customers
```

---

## TIMING SUMMARY

```
T-30min: Pre-deployment check (15 min)
T+0min:  Schema deployment (5 min)
T+5min:  Enable email auth (2 min)
T+7min:  Set environment variables (5 min)
T+12min: Wait for redeploy (2-3 min)
T+15min: Pre-flight verification (20 min)
T+35min: BEGIN LAUNCH DAY PROCEDURES

Total: ~90 minutes from verification to first customer
```

---

## SUCCESS CRITERIA CHECKLIST

### Deployment Successful When:
- ✅ No schema deployment errors
- ✅ Email auth enabled (blue toggle)
- ✅ Environment variables saved in Vercel
- ✅ Pre-flight verification passes ALL checks
- ✅ Governor confirms "Ready to launch"

### Launch Successful When (Day 1):
- ✅ Signup flow works (<5 sec)
- ✅ Email verification works
- ✅ Error rate <1%
- ✅ Uptime >99%
- ✅ No data isolation breaches

### Week 1 Successful When:
- ✅ 50+ signups
- ✅ 10+ active workspaces
- ✅ Error rate stays <1%
- ✅ No critical security issues
- ✅ Support response <4 hours

---

## BEFORE YOU START

**Print this page.** Keep it next to you.

**Have these ready:**
- [ ] Supabase URL
- [ ] Supabase Anon Key
- [ ] Supabase Service Role Key
- [ ] schema.sql file open
- [ ] 30+ minutes uninterrupted time
- [ ] Governor contact info

**Message Governor:** "Starting deployment"

---

## KEY NUMBERS TO REMEMBER

| Item | Value |
|------|-------|
| Tables created | 9 |
| Pre-flight duration | 20 min |
| Critical period (T+0 to T+4) | 4 hours |
| Launch success threshold | 50+ signups |
| Weekly target | 10+ workspaces |
| Max error rate | <1% |

---

## DOCUMENT DETAILS

**Created:** 2026-07-15  
**Type:** Quick Reference Card  
**For:** Deployment Day  
**Size:** 1 page (print-friendly)

---

## FULL PROCEDURES

For detailed steps, see:
- **Pre-deployment:** docs/PRE_DEPLOYMENT_READINESS.md
- **Schema deployment:** docs/FOUNDER_ACTION_BOARD.md
- **Launch procedures:** docs/LAUNCH_DAY_PROCEDURES.md
- **First week tracking:** docs/FIRST_WEEK_TRACKING.md

---

🚀 **YOU'VE GOT THIS. START WITH PRE-DEPLOYMENT CHECKLIST ABOVE.**
