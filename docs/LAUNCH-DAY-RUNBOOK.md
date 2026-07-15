# Launch Day Runbook: Infrastructure → Production → Customer

**For:** Founder on launch day  
**Purpose:** Step-by-step operational guide from infrastructure setup through first customer  
**Time Required:** ~3-4 hours total  
**Success Condition:** First German customer invited and scheduled for kickoff call

---

## Timeline Overview

```
MORNING (Hour 1-2):
├─ Complete 4 infrastructure tasks (DEPLOYMENT-CHECKLIST.md)
├─ Verify Vercel deployment succeeds
├─ Smoke test production

MIDDAY (Hour 2-3):
├─ Run staging verification (quick-start or full)
├─ Verify all features work
├─ Check logs for any issues

AFTERNOON (Hour 3-4):
├─ Merge PR #48 to main
├─ Verify production deployment
├─ Invite first customer
├─ Schedule customer kickoff call
└─ Begin daily monitoring

RESULT: First customer onboarded by end of week
```

---

## Part 1: Infrastructure Setup (20-30 min)

**Reference:** `docs/DEPLOYMENT-CHECKLIST.md`

### Task 1.1: Vercel github-token Secret

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click project: `newspulse-ai`
3. Settings → Environment Variables
4. Click "Add"
   - Name: `GITHUB_TOKEN`
   - Value: [Paste your GitHub personal access token]
   - Environments: Production, Preview, Development (select all)
5. Click "Add"
6. Wait for deployment to trigger
7. Check Deployments tab — should show ✅ Production deployment succeeding

**Verify:** PR #48 deployment shows green checkmark (may take 2-3 min)

---

### Task 1.2: Supabase Schema Deploy

1. Go to [Supabase Console](https://app.supabase.com)
2. Select your project
3. SQL Editor → Run this query:

```sql
-- Copy entire contents of supabase/schema.sql
-- (See DEPLOYMENT-CHECKLIST.md step 2 for full schema)
```

Actually, easier way:
1. Supabase Console → SQL Editor
2. Create new query
3. Open `supabase/schema.sql` from project
4. Copy all contents
5. Paste into SQL Editor
6. Click "Run"
7. Wait for completion (30 seconds typical)

**Verify:** No error messages. Tables created successfully.

---

### Task 1.3: Enable Supabase Email Auth

1. Supabase Console → Settings → Auth
2. Scroll to "Email Auth"
3. Ensure **Email** is enabled (toggle: ON)
4. Check **Auto Confirm** is OFF (customers must verify via email link)
5. Save changes

**Verify:** Email auth section shows green ✅ Enabled

---

### Task 1.4: Verify Supabase Region

1. Supabase Console → Settings → General
2. Find "Region"
3. Confirm it shows: **eu-central-1** (or other EU region)
4. If not EU: You need to migrate database (beyond this runbook scope)

**Verify:** Region confirms EU (GDPR compliance for German customers)

---

## Checkpoint: Infrastructure Complete ✅

At this point:
- [ ] Vercel deployment showing ✅ in Deployments tab
- [ ] Supabase schema tables created (run SELECT COUNT(*) FROM workspaces; should return 0)
- [ ] Email auth enabled in Supabase
- [ ] Region confirmed as EU

**If any item not passing:** Stop and fix before proceeding.  
**If all passing:** Continue to staging verification.

---

## Part 2: Staging Verification (1-2 hours)

**Reference:** `docs/STAGING-VERIFICATION.md`

Choose one path based on time available:

### Option A: Quick-Start (15 minutes)

1. Open production app: `https://newspulse-ai.vercel.app/en/`
2. **Step 1:** Sign up with test email
   - Does signup form load? ✅
   - Can you enter email? ✅
   - Click "Sign up" button — does it submit? ✅
3. **Step 2:** Verify email
   - Check email (your personal email)
   - Find verification link
   - Click link — are you redirected to login? ✅
4. **Step 3:** Log in with verified email
   - Enter email and password
   - Click "Sign in" — does dashboard load? ✅
5. **Step 4:** Company setup
   - Fill company name, size, industry
   - Click "Next" — does it save? ✅
6. **Step 5:** Add AI system
   - Click "Add system"
   - Fill system name, type, data type
   - Click "Add" — does it appear in list? ✅
7. **Step 6:** Risk assessment
   - Click "Start assessment"
   - Answer 5-10 questions
   - Click "Submit" — do you see results? ✅

**If all ✅:** Go to Part 3  
**If any ❌:** Check logs (see troubleshooting below)

### Option B: Full Verification (90 minutes)

Run entire testing checklist from `docs/STAGING-VERIFICATION.md`:
- Desktop browsers (Chrome, Safari, Firefox)
- Mobile responsiveness (375px, 768px, 1024px)
- Accessibility (keyboard nav, screen reader, labels)
- Error scenarios (invalid email, network timeout, etc.)
- Performance (page load <3 sec)
- No console errors

**Complete full checklist:** Check off each item  
**If all ✅:** Go to Part 3  
**If any ❌:** Document and fix before proceeding

---

## Troubleshooting Staging Issues

### Issue: "404 Not Found" on /en/

**Cause:** Deployment not complete or route not configured  
**Fix:**
1. Check Vercel Deployments tab — is latest deployment ✅ showing?
2. Wait 2-3 minutes if still deploying
3. Refresh page
4. If still 404: Rollback to previous deployment (see rollback procedures below)

### Issue: "Email not received"

**Cause:** Supabase email auth not configured or region issue  
**Fix:**
1. Go to Supabase Console → Settings → Auth
2. Verify Email is ON
3. Check region is EU (eu-central-1)
4. Try again
5. If still no email: Check spam folder; may need to reconfigure email service

### Issue: "Error: Database connection failed"

**Cause:** Supabase schema not deployed or connection issue  
**Fix:**
1. Go to Supabase Console → SQL Editor
2. Run: `SELECT COUNT(*) FROM workspaces;`
3. If error: Schema not deployed. Re-run schema.sql (Part 1.2)
4. If returns 0: Tables exist, may be temporary connection issue. Refresh page and retry.

### Issue: Page loads but buttons don't work

**Cause:** TypeScript errors or missing dependencies  
**Fix:**
1. Open browser DevTools (F12)
2. Click Console tab
3. Look for red error messages
4. Screenshot error and share with engineering
5. This indicates code issue — may need rollback

---

## Checkpoint: Staging Verified ✅

- [ ] Successfully completed all 6 onboarding steps
- [ ] No errors in browser console
- [ ] All pages load in <3 seconds
- [ ] Mobile responsive (tested at 375px)

**If all items checked:** Proceed to Part 3  
**If any issue:** Fix (using troubleshooting guide above) and re-test before proceeding

---

## Part 3: Production Merge & Launch (1 hour)

### Step 3.1: Review PR #48

1. Go to GitHub: [`mininglife7-dev/newspulse-ai/pull/48`](https://github.com/mininglife7-dev/newspulse-ai/pull/48)
2. Scroll to top
3. Confirm:
   - [ ] All checks are ✅ (CI, build, etc.)
   - [ ] Vercel deployment shows ready
   - [ ] Reviews approved (if required)
4. If any ❌ items: Do not merge. Contact engineering.

### Step 3.2: Merge to Main

1. Click **"Merge pull request"** button
2. Select merge strategy: **Create a merge commit** (default)
3. Click **"Confirm merge"**
4. Wait for GitHub to process (10-30 seconds)
5. You should see: "Pull request successfully merged and closed"

### Step 3.3: Verify Production Deployment

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click `newspulse-ai` project
3. Click **Deployments** tab
4. You should see new deployment from main branch
5. Status: **Building** → **Ready** (takes 2-5 minutes)
6. When status shows **Ready**: Production is live ✅

### Step 3.4: Smoke Test Production

1. Open production URL: `https://newspulse-ai.vercel.app/en/`
2. Quick test (2 minutes):
   - Does landing page load? ✅
   - Click signup button — does form appear? ✅
   - Try signing up — does submit work? ✅
   - Language switcher works (click "Deutsch", route changes to /de/)? ✅

**If all ✅:** Production is live and working  
**If any ❌:** Rollback (see procedures below)

---

## Rollback Procedures (If Needed)

### Rollback from Production

**Use ONLY if production is broken. Otherwise, deploy fix instead.**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click `newspulse-ai`
3. Click **Deployments**
4. Find previous successful deployment (look for ✅ Ready status)
5. Click **...** menu on that deployment
6. Select **"Promote to Production"**
7. Wait 2-3 minutes for Vercel to redeploy previous version
8. Verify previous version is working

**After rollback:**
- Previous code is now live
- Notify engineering of what broke
- Engineering fixes issue and creates new PR
- New PR goes through staging verification again

---

## Part 4: First Customer Invitation (30 minutes)

### Step 4.1: Prepare Customer List

Before sending invitations, have ready:
- [ ] First German customer name
- [ ] First German customer email
- [ ] Their company name
- [ ] Brief context (how you know them, why EURO AI is relevant)

### Step 4.2: Send Invitation

**Reference:** `docs/CUSTOMER-INVITATION-EMAIL.md` Template 1 (First Customer - Detailed Intro)

1. Open `docs/CUSTOMER-INVITATION-EMAIL.md`
2. Copy Template 1 content
3. Open your email client
4. Create new email
5. Paste template
6. Customize:
   - [First German Customer Email] → actual email
   - [Customer Name] → actual name
   - [Your Name] → your name
   - [https://euro-ai.vercel.app] → verify this is production URL
7. Preview email (check formatting, links work)
8. Send

**Email should include:**
- ✅ Clear value prop (3-step process, 30 minutes)
- ✅ Call to action (direct link to signup)
- ✅ Your contact info (for questions)
- ✅ "First 5 spots" urgency
- ✅ What you're asking in return (feedback, time)

---

### Step 4.3: Schedule Kickoff Call

1. Immediately after sending email (within 1 hour), send follow-up:

```
Hi [Customer Name],

Just sent you the EURO AI beta invitation. 

When you've created your account, I'd love to jump on a 30-min call to walk through the process together. 

Here's my calendar: [Insert calendar link / availability]

Looking forward to working together.

—
[Your Name]
```

2. Set calendar reminder for kickoff call (once they confirm)

---

### Step 4.4: Set Up Daily Monitoring

1. Open `docs/PRODUCTION-MONITORING-SETUP.md`
2. Follow Part 3 (Google Sheets Daily Tracker) to create tracking spreadsheet
3. Add customer name to spreadsheet
4. Set calendar reminder: **Daily 9 AM — Customer monitoring check-in**
5. Set calendar reminder: **Daily 2 PM — Check email for customer messages**

**What to monitor each day:**
- Is customer stuck on any step?
- Did they receive verification email?
- Are they progressing through onboarding?
- Any errors in Vercel logs or Supabase?

---

## Checkpoint: First Customer Invited ✅

- [ ] Invitation email sent to first customer
- [ ] Follow-up message sent with calendar link
- [ ] Google Sheets tracker created
- [ ] Daily monitoring reminders set (9 AM and 2 PM)
- [ ] Ready to respond to customer questions within 2 hours

---

## Part 5: First Week Operations

### Day 1-2: Customer Signup & Email Verification

**Your role:** Monitor for email verification issues

1. **Check daily:** Vercel Logs → search "verify_email"
2. **If customer emails:** Respond within 1 hour
3. **If stuck:** Offer help (spam folder check, resend link, etc.)
4. **Record:** Update Google Sheets with customer status

**Success:** Customer receives verification email and clicks link within 2 hours

### Day 3-4: Company Setup & AI Systems

**Your role:** Monitor for setup confusion

1. **Daily check:** Google Sheets progress
2. **If customer emails:** Respond within 2 hours
3. **If stuck >2 hours:** Proactively reach out with help
4. **Pattern:** If unclear, send clarifying questions via email

**Success:** Customer completes company setup and adds at least 1 AI system

### Day 5-7: Risk Assessment & Completion

**Your role:** Ensure customer can finish

1. **Daily check:** Is customer progressing?
2. **Offer help:** "Happy to walk through risk assessment questions if helpful"
3. **Collect feedback:** Send weekly check-in form (CUSTOMER-FEEDBACK-TEMPLATES.md Template 1)
4. **Record:** Final status in Google Sheets

**Success:** Customer completes all 3 steps + provides initial feedback

---

## Part 6: Decision Point — Ready for Next Customers?

### End of Week 1 Review

After first customer completes (or gets stuck):

1. **Check metrics** (from Google Sheets):
   - Did customer verify email? (✅ yes = success signal)
   - Did customer complete company setup? (✅ yes = success signal)
   - Did customer add systems? (✅ yes = success signal)
   - Did customer complete risk assessment? (✅ yes = success signal)

2. **Check feedback**:
   - What worked well?
   - What was confusing?
   - Any blockers?

3. **Check logs**:
   - Any errors in Vercel or Supabase?
   - Performance issues?
   - Security concerns?

### If All Good → Invite Next Customers

If:
- ✅ Customer completed without major issues
- ✅ No critical bugs found
- ✅ Positive feedback

Then:
1. Invite next 2-3 customers (stagger invitations 2-3 days apart)
2. Continue daily monitoring
3. Scale playbook from 1 → 5 customers

### If Problems Found → Fix First

If:
- ❌ Customer got stuck on a step
- ❌ Critical bug found
- ❌ Negative feedback on critical feature

Then:
1. Document problem clearly (what step, what error)
2. Contact engineering with detailed reproduction steps
3. Engineering hotfix SLA: 2 hours for critical, 24 hours for high
4. Test fix with customer
5. Once fixed: Invite next customer

---

## Critical Paths & Escalation

### If Customer Can't Sign Up

**SLA:** Respond within 30 minutes

1. Check Vercel logs for auth errors
2. Try signing up yourself (verify it's not global issue)
3. Message customer: "Try clearing browser cache and refresh"
4. If still broken: Escalate to engineering (critical SLA)

### If Customer Can't Verify Email

**SLA:** Respond within 1 hour

1. Check Supabase email auth is enabled (DEPLOYMENT-CHECKLIST.md step 3)
2. Ask customer: "Check spam folder?"
3. Try resend verification link
4. If no email arrives: Escalate to engineering

### If Any Customer Sees Another Customer's Data

**SLA:** Respond within 30 minutes (SECURITY INCIDENT)

1. Immediately take screenshot
2. Note customer email and timestamp
3. Go to Vercel and rollback to previous deployment
4. Escalate to engineering immediately
5. This indicates RLS (row-level security) failure — critical

---

## Debrief: End of Week 1

**Friday evening, spend 30 minutes:**

1. Review all customer feedback (from Google Sheets + emails)
2. Identify top 3 issues (blockers, confusion, bugs)
3. Prioritize fixes vs. features
4. Create GitHub Issues for each
5. Brief engineering on priorities
6. Plan next week's customer onboarding

---

## Success Criteria: Launch Week

You've successfully launched when:

✅ First customer invited  
✅ First customer email verified  
✅ First customer completed company setup  
✅ First customer added at least 1 AI system  
✅ First customer completed risk assessment  
✅ Zero critical bugs during onboarding  
✅ Customer feedback collected  
✅ Next customers ready to invite  

---

## Files You'll Need on Launch Day

Keep these bookmarked:

1. **DEPLOYMENT-CHECKLIST.md** — Infrastructure tasks
2. **STAGING-VERIFICATION.md** — Testing procedures
3. **CUSTOMER-INVITATION-EMAIL.md** — Email templates
4. **PRODUCTION-MONITORING-SETUP.md** — Daily monitoring
5. **CUSTOMER-FEEDBACK-TEMPLATES.md** — Feedback forms
6. **CUSTOMER-SUCCESS-PLAYBOOK.md** — Support procedures
7. Vercel Dashboard: https://vercel.com/dashboard
8. Supabase Console: https://app.supabase.com
9. GitHub PR #48: https://github.com/mininglife7-dev/newspulse-ai/pull/48
10. Production URL: https://newspulse-ai.vercel.app/

---

## Quick Reference: Commands You'll Use

```bash
# Check infrastructure status
curl https://newspulse-ai.vercel.app/api/health

# If you need to check Vercel logs
# (Go to Vercel Dashboard → Deployments → select deployment → Logs)

# If you need to run database query in Supabase
# (Go to Supabase Console → SQL Editor)

# Emergency rollback (if production broken)
# (Go to Vercel → Deployments → click previous good deploy → Promote to Production)
```

---

## Timeline to Remember

| When | What | Owner | Notes |
|------|------|-------|-------|
| Today | Infrastructure setup + staging verification | You | ~3 hours |
| Today | Merge PR #48 + first customer invite | You | ~1 hour |
| Week 1 | Daily monitoring (9 AM + 2 PM) | You | 15 min/day |
| Week 1 | Collect feedback + log issues | You | 30 min |
| End Week 1 | Decide: Ready for next customers? | You | 30 min review |
| Week 2-3 | Scale to 3-5 customers | You | Stagger invitations |
| Week 6 End | Phase 1 decision gate (German localization) | You | Analyze metrics |
| Week 7-8 | Phase 1 implementation (if approved) | Engineering | 2-3 days |

---

## You're Ready

Everything is prepared. Documentation is complete. Code is tested. Monitoring is in place.

Today is go day. Let's launch. 🚀

---

**Launch Day Runbook: Complete**  
**Status:** Ready to execute  
**Last Updated:** 2026-07-15  
**Next Review:** After successful first customer completion
