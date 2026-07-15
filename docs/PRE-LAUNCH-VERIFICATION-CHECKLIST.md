# Pre-Launch Verification Checklist

**For:** Founder before launch day begins  
**Purpose:** Final verification that everything is ready (no surprises on launch day)  
**Time Required:** 30-45 minutes  
**When to Do:** Day before infrastructure setup, or morning of

---

## Quick Status Check (2 minutes)

Before diving into detailed verification, answer these:

- [ ] Have I read DEPLOYMENT-CHECKLIST.md? (Yes/No)
- [ ] Do I have GitHub personal access token ready? (Yes/No)
- [ ] Is my first German customer identified? (Yes/No)
- [ ] Do I have 2-3 hours blocked for launch day? (Yes/No)

**If all YES → Continue to Section 1**  
**If any NO → Pause and prepare (contact engineering if unclear)**

---

## Section 1: Code Quality Verification (5 minutes)

**Verify:** All code is production-ready

### 1.1 Tests Passing

Run:
```bash
npm test
```

**Expected output:**
```
Test Files  16 passed (16)
     Tests  177 passed (177)
```

**Verify:** All 177 tests pass ✅  
**If any tests fail:** Contact engineering before proceeding

### 1.2 TypeScript Clean

Run:
```bash
npm run type-check
```

**Expected output:**
```
(no output = success)
```

**Verify:** Zero TypeScript errors ✅  
**If any errors:** Contact engineering before proceeding

### 1.3 ESLint Clean

Run:
```bash
npm run lint
```

**Expected output:**
```
✔ No ESLint warnings or errors
```

**Verify:** Zero linting errors ✅  
**If any errors:** Contact engineering before proceeding

### 1.4 Build Succeeds

Run:
```bash
npm run build
```

**Expected output:**
```
✔ compiled successfully
```

**Verify:** Build completes without errors ✅  
**If build fails:** Contact engineering before proceeding

---

## Section 2: Documentation Verification (10 minutes)

**Verify:** All documentation exists and is correct

### 2.1 Core Documentation Files

Check that these files exist and contain meaningful content (not empty):

- [ ] `docs/DEPLOYMENT-CHECKLIST.md` (4 infrastructure tasks)
- [ ] `docs/STAGING-VERIFICATION.md` (testing procedures)
- [ ] `docs/LAUNCH-DAY-RUNBOOK.md` (step-by-step guide)
- [ ] `docs/PRODUCTION-MONITORING-SETUP.md` (daily monitoring)
- [ ] `docs/CUSTOMER-FEEDBACK-TEMPLATES.md` (feedback forms)
- [ ] `docs/CUSTOMER-SUCCESS-PLAYBOOK.md` (ops procedures)
- [ ] `docs/CUSTOMER-INVITATION-EMAIL.md` (email templates)
- [ ] `docs/PHASE-1-APPROVAL-MEMO.md` (German localization decision)

**Verify:** All 8 files present and complete ✅  
**If any missing:** Contact engineering before proceeding

### 2.2 Key Links in Documentation

Spot-check 3 random links in documentation:

1. Open `docs/DEPLOYMENT-CHECKLIST.md`
   - Click one link (e.g., Vercel dashboard link)
   - Does it work? ✅

2. Open `docs/CUSTOMER-INVITATION-EMAIL.md`
   - Check product URL: https://newspulse-ai.vercel.app (or production domain)
   - Is it correct? ✅

3. Open `docs/LAUNCH-DAY-RUNBOOK.md`
   - Check GitHub PR #48 link
   - Does it open PR? ✅

**Verify:** Links are correct and working ✅  
**If any broken:** Update before launch

### 2.3 Email Templates

Open `docs/CUSTOMER-INVITATION-EMAIL.md`

- [ ] Template 1 (First Customer) — contains value prop, CTA, "5 spots" urgency
- [ ] Template 2 (Warm Intro) — contains personal context, customization guidance
- [ ] Template 3 (Batch Invitation) — for multiple customers
- [ ] Template 4 (Follow-up) — if no response
- [ ] Template 5 (Confirmation) — after signup
- [ ] Template 6 (Weekly Check-in) — during pilot
- [ ] Template 7 (End-of-Pilot) — conclusion

**Verify:** All 7 templates present with realistic content ✅

---

## Section 3: Infrastructure Readiness (5 minutes)

**Verify:** You have everything needed for infrastructure setup

### 3.1 External Account Access

- [ ] Can log into Vercel dashboard (test: go to https://vercel.com/dashboard)
- [ ] Can log into Supabase console (test: go to https://app.supabase.com)
- [ ] Can log into GitHub (test: go to https://github.com)

**Verify:** All 3 accounts accessible ✅

### 3.2 Credentials Ready

- [ ] GitHub personal access token generated (for Vercel secret)
- [ ] Supabase SQL ready to deploy (have supabase/schema.sql in project)
- [ ] Email domain verified (if using custom domain; note: product uses Supabase email auth)

**Verify:** Credentials prepared ✅

### 3.3 Time Blocked

- [ ] Calendar blocked: 3-4 hours for launch day
- [ ] Interruptions minimized (no meetings during launch window)
- [ ] Phone available (in case customer calls)

**Verify:** Time protected ✅

---

## Section 4: Customer Preparation (10 minutes)

**Verify:** You're ready to invite first customer

### 4.1 Customer Details Prepared

- [ ] First German customer name: ________________
- [ ] First German customer email: ________________
- [ ] Their company name: ________________
- [ ] Connection context (how you know them): ________________

**Verify:** All customer details filled in ✅

### 4.2 Email Templates Customized

- [ ] Copied invitation template (from CUSTOMER-INVITATION-EMAIL.md)
- [ ] Updated [Customer Name] with real name
- [ ] Updated [Your Name] with your name
- [ ] Verified signup link: https://newspulse-ai.vercel.app/
- [ ] Saved as draft in Gmail for quick sending

**Verify:** Email draft ready to send ✅

### 4.3 Kickoff Call Scheduled

- [ ] Calendar available for 30-min kickoff call
- [ ] Can share screen (Zoom, Google Meet, Teams)
- [ ] Have customer's preferred meeting time noted

**Verify:** Call ready to schedule ✅

### 4.4 Monitoring Setup Plan

- [ ] Know how to access Vercel analytics (bookmarked)
- [ ] Know how to access Supabase logs (bookmarked)
- [ ] Google Sheets template ready (for daily tracking)
- [ ] Daily 9 AM reminder set in calendar (monitoring check-in)

**Verify:** Monitoring procedures understood ✅

---

## Section 5: Decision Readiness (5 minutes)

**Verify:** You understand key decision points

### 5.1 Infrastructure Decisions

- [ ] Understand why github-token secret is needed (Vercel preview deployments)
- [ ] Know where to configure it (Vercel dashboard → Settings → Environment Variables)
- [ ] Know rollback procedure (if something breaks) — have DEPLOYMENT-CHECKLIST.md open

**Verify:** Infrastructure tasks understood ✅

### 5.2 Staging Verification Decision

- [ ] Decided: Quick-start (15 min) or full (90 min) verification?
- [ ] Know what to test (6-step onboarding: signup → verify → setup → add system → assess)
- [ ] Know escalation path (if testing finds issues)

**Verify:** Testing approach decided ✅

### 5.3 Launch Decision

- [ ] Understand: Don't merge PR #48 until infrastructure ✅ and staging ✅
- [ ] Know: Merging to main triggers production deployment
- [ ] Know: Production deployment takes 2-5 minutes

**Verify:** Merge decision understood ✅

### 5.4 Customer Invitation Decision

- [ ] Understand: Invite only after production tested
- [ ] Know: Customer will receive email within minutes of signup
- [ ] Know: You need to schedule kickoff call same day

**Verify:** Customer invitation timing understood ✅

---

## Section 6: Risk & Rollback Readiness (5 minutes)

**Verify:** You know what to do if something breaks

### 6.1 Email Verification Issue

**If customer can't receive verification email:**

- [ ] Know how to enable Supabase email auth (DEPLOYMENT-CHECKLIST.md step 3)
- [ ] Know how to resend verification (Supabase Console → Auth → select user → Resend)
- [ ] Know when to escalate (if no email after resend → contact engineering)

**Verify:** Email troubleshooting understood ✅

### 6.2 Staging Test Failure

**If staging verification finds bugs:**

- [ ] Documented bug (what step, what error, screenshot)
- [ ] Know how to escalate (contact engineering with reproduction steps)
- [ ] Know SLA (critical bugs: 2 hours, high: 24 hours)

**Verify:** Bug escalation understood ✅

### 6.3 Production Deployment Fails

**If production shows 500 error after merge:**

- [ ] Know how to rollback (Vercel → Deployments → select previous successful → Promote to Production)
- [ ] Know rollback takes 2-3 minutes
- [ ] Know to escalate immediately to engineering after rollback

**Verify:** Rollback procedure understood ✅

### 6.4 Customer Gets Stuck

**If customer can't complete a step:**

- [ ] Know to respond within 2 hours
- [ ] Know how to debug (check browser console, check logs)
- [ ] Know when to escalate (if you can't fix in 1 hour → contact engineering)

**Verify:** Customer support SLA understood ✅

---

## Section 7: Documentation Organization (5 minutes)

**Verify:** You can find everything quickly on launch day

### 7.1 Bookmarks

Create these bookmarks (or have tabs open):

- [ ] DEPLOYMENT-CHECKLIST.md (infrastructure tasks)
- [ ] LAUNCH-DAY-RUNBOOK.md (step-by-step guide)
- [ ] PRODUCTION-MONITORING-SETUP.md (monitoring procedures)
- [ ] CUSTOMER-FEEDBACK-TEMPLATES.md (feedback forms)
- [ ] Vercel dashboard (https://vercel.com/dashboard)
- [ ] Supabase console (https://app.supabase.com)
- [ ] GitHub PR #48 (https://github.com/mininglife7-dev/newspulse-ai/pull/48)

**Verify:** All bookmarks created ✅

### 7.2 Phone Notes

Add to phone notes or print this checklist:

- [ ] First customer name and email
- [ ] Product URL: https://newspulse-ai.vercel.app/
- [ ] Escalation contact: engineering@example.com
- [ ] Emergency rollback: Vercel → Deployments → Promote to Production
- [ ] SLA reminders: Critical <30min, High <2hr, Medium <24hr

**Verify:** Quick reference notes created ✅

### 7.3 Slack/Email Alert Setup

- [ ] Set up email filter for customer (see PRODUCTION-MONITORING-SETUP.md Part 5)
- [ ] Test: Send email to yourself, verify filter works
- [ ] Know: Customer emails should be starred/marked important

**Verify:** Alert setup complete ✅

---

## Section 8: Success Criteria Clarity (5 minutes)

**Verify:** You know what success looks like

### 8.1 Launch Day Success

Successful launch day = all of these:

- [ ] Infrastructure setup complete (4 tasks)
- [ ] Staging verification passed (quick or full)
- [ ] PR #48 merged to main
- [ ] Production deployment successful (shows ✅)
- [ ] Production smoke test passed
- [ ] First customer invited
- [ ] Kickoff call scheduled

**Verify:** Success criteria understood ✅

### 8.2 Week 1 Success

Successful week 1 = first customer:

- [ ] Receives and clicks verification email
- [ ] Completes company setup
- [ ] Adds at least 1 AI system
- [ ] Completes risk assessment
- [ ] Provides feedback (via weekly check-in form)
- [ ] No critical bugs encountered
- [ ] No data privacy issues

**Verify:** Week 1 goals understood ✅

### 8.3 Go/No-Go for Next Customers

Ready to invite customers 2-3 after customer 1 completes if:

- [ ] Customer 1 completed all steps without major blockers
- [ ] Feedback was positive (or at least constructive)
- [ ] No critical bugs found
- [ ] No data privacy/security issues

**Verify:** Go/no-go criteria understood ✅

---

## Final Checklist: Ready to Launch?

Answer these yes/no questions:

| Question | Yes/No |
|----------|--------|
| All 177 tests passing? | ☐ |
| TypeScript clean? | ☐ |
| ESLint clean? | ☐ |
| Build succeeds? | ☐ |
| All 8 documentation files present? | ☐ |
| All external links working? | ☐ |
| Vercel, Supabase, GitHub accessible? | ☐ |
| GitHub personal access token ready? | ☐ |
| First customer details filled in? | ☐ |
| Invitation email drafted? | ☐ |
| Kickoff call time identified? | ☐ |
| Monitoring setup understood? | ☐ |
| Rollback procedure understood? | ☐ |
| SLAs understood? | ☐ |
| All bookmarks created? | ☐ |
| Launch day calendar blocked? | ☐ |

**Scoring:**
- **15/15 ✅** → Ready to launch today. Go to LAUNCH-DAY-RUNBOOK.md Part 1.
- **13-14 ✅** → Almost ready. Review missing items. Launch tomorrow.
- **<13 ✅** → Not ready yet. Address gaps, contact engineering if unclear.

---

## If You're Not Ready

**For each missing checkbox:**

1. Identify what's missing (test, documentation, prep, or understanding)
2. Fix or clarify:
   - **Code issues?** → Run the failing test/check and contact engineering
   - **Documentation issues?** → Check file exists; contact engineering if corrupted
   - **Prep issues?** → Complete the preparation task (customer details, email draft, etc.)
   - **Understanding issues?** → Re-read the relevant guide section or contact engineering
3. Re-check once fixed

**Don't proceed to launch day until all 15 items are ✅**

---

## Go/No-Go Decision

### GO (Proceed to Launch Day)

You should launch today if:
- ✅ All 15 checklist items verified
- ✅ No critical issues discovered
- ✅ Founder availability confirmed (3-4 hours uninterrupted)
- ✅ First customer is ready to receive invitation

### NO-GO (Delay Launch)

Delay launch if:
- ❌ Any code quality checks failing
- ❌ Documentation incomplete or broken
- ❌ Infrastructure preparation incomplete
- ❌ Founder unavailable for sustained 3-4 hours
- ❌ First customer not yet identified

**If no-go:** Identify blocker, fix, re-run this checklist, try again tomorrow.

---

## Launch Day Next Steps

Once all items verified ✅:

1. **Print or bookmark:** `docs/LAUNCH-DAY-RUNBOOK.md`
2. **Set phone timer:** 4 hours (realistic timeline for full launch)
3. **Block calendar:** Mark unavailable for interruptions
4. **Open bookmarks:** Vercel, Supabase, GitHub, Slack
5. **Start:** Go to LAUNCH-DAY-RUNBOOK.md Part 1 (Infrastructure Setup)

---

## You're Ready to Ship

Everything has been tested, documented, and verified.

First customer is waiting. Let's launch. 🚀

---

**Pre-Launch Checklist: Complete**  
**Status:** Ready to execute  
**Last Updated:** 2026-07-15  
**Usage:** Run this checklist morning of launch day, or day before
