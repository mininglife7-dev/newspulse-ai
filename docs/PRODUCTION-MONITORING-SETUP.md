# Production Monitoring Setup Guide

**Purpose:** Step-by-step guide to configure monitoring dashboards and daily check-in procedures after deployment to production.

**Audience:** Founder  
**Time to complete:** 30-45 minutes  
**When to do this:** After PR #48 merges to main and production deployment completes  
**Why this matters:** Catch customer issues before they become problems. Your first customer pilot depends on reliable daily monitoring.

---

## Part 1: Vercel Deployment Monitoring (5 min)

### 1.1 Access Vercel Dashboard

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Select project: `newspulse-ai`
3. Click **Deployments** tab
4. You should see recent deployment from PR #48 merge

### 1.2 Enable Deployment Notifications

1. Click **Settings** → **Notifications**
2. Select **Deployments**
3. Choose: "Notify me on failed deployments"
4. Email: mininglife7@gmail.com
5. Save

**Result:** You'll get email alerts if any production deployment fails. SLA: Check within 2 hours, rollback if needed.

### 1.3 Monitor Build Performance

Each deployment shows:
- Build duration (target: <3 min)
- Function count (verify both `/en` and `/de` routes present)
- Bundle size (should be stable, not growing)

If build time exceeds 5 min or bundle size jumps >20%, investigate before next deployment.

---

## Part 2: Error Tracking with Vercel Analytics (10 min)

### 2.1 Enable Real User Monitoring (RUM)

1. In Vercel dashboard, go to **Settings** → **Analytics**
2. Ensure **Real User Monitoring** is enabled (should be default)
3. This tracks errors, performance, and user interactions in production

### 2.2 Access Error Dashboard

1. Click **Analytics** tab
2. Scroll to **Errors** section
3. You should see 0 errors initially

**Watch for:**
- Any errors appearing (red indicators)
- Error spike indicates customer issue
- Click error to see stack trace + affected users

### 2.3 Set Up Error Alerts (Optional but Recommended)

If Vercel provides email alerts:
1. Go to **Settings** → **Notifications**
2. Enable "Notify on errors"
3. Save

**Result:** Same-day visibility into any customer-facing errors.

---

## Part 3: Application Monitoring via Logs (10 min)

### 3.1 Access Vercel Logs

1. In Vercel dashboard, go to **Deployments**
2. Click latest production deployment
3. Click **Logs** tab
4. You'll see real-time logs as customers use the app

### 3.2 Monitor for Common Issues

Watch logs for:
- `auth: signup_failed` → Customer email not received (Supabase email auth issue)
- `db: query_failed` → Database issue (RLS policy or schema problem)
- `api: 500 error` → Unexpected server error (investigate immediately)
- `api: 401 unauthorized` → Session issue (cookie problem)

### 3.3 Log Search Patterns

**Find email verification issues:**
```
filter: "verify_email"
```

**Find database errors:**
```
filter: "db:" OR "sql:"
```

**Find API errors:**
```
filter: "error" OR "failed"
```

If you see errors, document:
- Timestamp
- Error message
- User email (if visible)
- Take screenshot

**Then escalate:** Contact customer via email or phone immediately.

---

## Part 4: Customer Funnel Tracking (10 min)

### 4.1 Create a Simple Tracking Spreadsheet

Open Google Sheets and create:

| Date | Customer | Signup | Email Verified | Company Setup | Systems Added | Risk Assessment | Status | Notes |
|------|----------|--------|----------------|---------------|----------------|-----------------|--------|-------|
| | | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | | |

**Purpose:** Track customer progress through 3 steps at a glance.

### 4.2 Daily Check-In Procedure (5 min)

**Every morning (same time):**

1. Open Vercel Analytics → Users section
2. Note: How many unique visitors?
3. Check logs for errors (see Part 3.2)
4. Update tracking spreadsheet with customer progress
5. If any customer is stuck (status = "blocked"):
   - Check error logs for their email
   - Send them a direct message: "Hey, I noticed you're on Step 2. Any blockers? Happy to help."
   - Document response and fix if needed

**SLA for customer blockers:** Response within 2 hours.

### 4.3 Weekly Review (Friday afternoon)

Every Friday, spend 15 minutes reviewing:

1. **Funnel completion rates:**
   - Signup → Email verified: target ≥95%
   - Email verified → Company setup: target ≥90%
   - Company setup → Add systems: target ≥85%
   - Systems added → Risk assessment: target ≥75%

2. **Error trends:**
   - Any spike in API errors? (target: 0)
   - Any spike in auth failures? (target: 0)
   - Any spike in database errors? (target: 0)

3. **Performance metrics:**
   - Page load time <3 sec? (target: yes)
   - No console errors on any page? (target: yes)

4. **Customer satisfaction signals:**
   - Customer replied to feedback requests? Document response.
   - Any support requests or questions? Log them.

**If metrics look good:** Continue normal operations.  
**If metrics look concerning:** Escalate to engineering (me) immediately with data.

---

## Part 5: Customer Communication Setup (5 min)

### 5.1 Create a Customer Communication Template

Save this as a draft email template for quick responses:

```
Subject: EURO AI Support — [Issue]

Hi [Customer Name],

Thanks for using EURO AI! I noticed [issue]. Here's what I found:

[Explanation]

To fix it, please:
1. [Step 1]
2. [Step 2]

Let me know if that helps. If not, I'm here to help.

—
[Your Name]
Founder, EURO AI
```

### 5.2 Set Up Notification Check

Configure your email to alert you when customers reply:
1. Go to Gmail
2. Settings → Filters & Blocked Addresses
3. Create filter: "From: [first customer email]"
4. Action: Star it and mark important
5. Repeat for each customer as you add them

**Result:** Customer emails stand out in your inbox. Won't miss responses.

---

## Part 6: Daily Monitoring Checklist

Print this or save to your phone. Do every morning:

```
☐ Vercel: Any failed deployments? (Should be 0)
☐ Errors: Check Vercel Analytics → Errors tab (Should be 0)
☐ Logs: Any red errors in Vercel logs? (Should be 0)
☐ Funnel: Update tracking spreadsheet with customer progress
☐ Blockers: Any customer stuck for >2 hours? If yes, message them.
☐ Performance: Page load time OK? (Target <3 sec)
☐ Response: Any customer emails overnight? Reply within 2 hours.
```

**Time:** ~5 minutes  
**Frequency:** Every morning, 5 days/week minimum  
**When to escalate:** Any error, any customer blocker, any performance issue

---

## Part 7: Weekly Metrics Review Checklist

Do Friday afternoon (30 min):

```
☐ Funnel rates
  ☐ Signup → Email verified: ___% (target ≥95%)
  ☐ Email → Company setup: ___% (target ≥90%)
  ☐ Setup → Add systems: ___% (target ≥85%)
  ☐ Systems → Risk assessment: ___% (target ≥75%)

☐ Error summary
  ☐ Total errors this week: ___
  ☐ Top error: ___
  ☐ Any spikes? (Yes/No)

☐ Performance
  ☐ Avg page load: ___ sec (target <3)
  ☐ Zero console errors? (Yes/No)

☐ Customer feedback
  ☐ Customers who responded: ___
  ☐ Main feedback theme: ___

☐ Decision: Continue normal ops? (Yes/No)
  ☐ If no: What needs fixing?
```

---

## Part 8: Escalation Procedures

### Critical Issues (Fix within 30 min)

- Customer can't sign up (auth system down)
- Customer data is lost (data corruption)
- Customer sees other customer's data (security breach)
- Website is 500 error for all customers

**Action:**
1. Verify issue is real (try it yourself)
2. Check Vercel logs for root cause
3. If it's a deployment issue: Rollback via Vercel dashboard
   - Go to Deployments → Click previous successful deployment → Click "Promote to Production"
4. Contact customer: "We experienced a brief issue, now fixed. Please try again."
5. Document what happened for future reference

### High Priority Issues (Fix within 2 hours)

- Customer can't verify email (email auth issue)
- Customer can't access dashboard (session issue)
- Form submission fails (data issue)
- Performance degradation (page slow)

**Action:**
1. Reproduce the issue
2. Check logs for error messages
3. Respond to customer within 2 hours with:
   - "Here's what I found: [explanation]"
   - "To fix it: [steps]"
   - "Try it and let me know if it works"
4. Follow up within 24 hours: "Did that fix it?"

### Medium Priority Issues (Fix within 24 hours)

- UI button is confusing
- Help text is unclear
- Minor visual bug
- Feature request

**Action:**
1. Log the issue in your notes
2. Respond to customer within 24 hours:
   - "Thanks for the feedback. I'm noting this for next iteration."
   - (Or: "Here's a workaround: [steps]")
3. Batch these into product updates for next sprint

---

## Part 9: What to Do If Something Goes Wrong

### Issue: Customer can't verify email

**Check:**
1. Go to Vercel logs, search: "verify_email"
2. Do you see error messages?

**Common causes:**
- Supabase email auth not enabled (should have been in infrastructure setup)
- Email domain blocked (unlikely)
- Customer's inbox is filtering it

**Fix:**
1. Message customer: "Can you check your spam folder? Sometimes verification emails end up there."
2. If still no email: Trigger resend from your Supabase dashboard
   - Go to Supabase → Auth → Select user → Resend verification
3. If resend fails: Email auth not configured. See DEPLOYMENT-CHECKLIST.md step 3.

### Issue: Customer can't access dashboard after login

**Check:**
1. Vercel logs, search: "dashboard" or "401"
2. Check if it's a session issue

**Common causes:**
- Session cookie expired (reload page)
- Browser cache stale (clear cookies)
- RLS policy blocking access (rare but possible)

**Fix:**
1. Ask customer to clear browser cookies and reload
2. If still broken: Try incognito window
3. If incognito works: Cache issue, customer should clear cookies
4. If incognito fails: Contact me (engineering issue)

### Issue: Form submission fails silently

**Check:**
1. Browser DevTools → Console tab
2. Any red errors when submitting?
3. Vercel logs, search customer email

**Common causes:**
- Network timeout (retry usually works)
- Validation issue (field missing)
- Database issue (RLS or schema)

**Fix:**
1. Ask customer to try again (retry usually fixes transient issues)
2. If fails again: Check DevTools console together
3. Screenshot the error and send to me with customer email

### Issue: Page loads very slowly

**Check:**
1. Vercel Analytics → Performance
2. Page load time >5 sec?
3. Is it consistently slow or intermittent?

**Common causes:**
- Database query slow (rare, I'll optimize)
- User's internet slow (not our fault)
- Vercel region overloaded (rare, auto-recovers)

**Fix:**
1. Check if it's global (try from different location/device)
2. If global: Note the time and message me
3. If just that user: Likely their internet, nothing to fix

---

## Part 10: When to Contact Engineering (Me)

Contact me immediately if you see:

- Any 500 error (server crashed)
- Any 401/403 errors appearing frequently (auth system issue)
- Any data corruption (customer sees wrong data)
- Database query slow (take >10 sec to load dashboard)
- API endpoints returning wrong data
- TypeScript or ESLint errors in logs

**Include in message:**
- Timestamp of issue
- Customer email (if relevant)
- Error message (screenshot or text)
- Steps to reproduce

**I'll respond within 2 hours during business hours.**

---

## Summary: Your Daily Responsibility

**Every morning (5 min):**
- Check Vercel for errors
- Update customer funnel spreadsheet
- Message any blocked customers
- Reply to customer emails

**Every Friday (30 min):**
- Review weekly funnel metrics
- Review error trends
- Assess if customer pilot is healthy
- Decide: continue or escalate

**Your success metric:** Customer completes all 3 steps without friction.

---

**You're ready. Let's bring the first customer through.** 🚀

