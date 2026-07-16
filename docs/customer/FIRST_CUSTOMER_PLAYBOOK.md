# First Customer Playbook — EURO AI Launch Success

**Status:** Ready for Deployment  
**Audience:** Founder, Customer Success Team, Support  
**Goal:** Ensure first customer has flawless onboarding and early success

---

## Executive Summary

The first customer is critical. They don't know what to expect. Every friction point becomes a reason to leave. This playbook ensures they:

1. Complete onboarding without friction
2. Understand core product value in day 1
3. Experience reliability and support
4. Return for day 2 and beyond

---

## Pre-Customer Launch Prep (Founder)

**Before first customer signs up, complete:**

### Day 1: Pre-Launch Setup (4 hours)

- [ ] Supabase schema deployed & tested (SUPABASE-PRODUCTION-SETUP.md)
- [ ] Email verification working (send test email to yourself)
- [ ] GitHub Actions spending limit increased
- [ ] Vercel deployment pipeline verified (test deploy)
- [ ] Monitoring dashboards accessible (/api/alerts working)
- [ ] Read OPERATIONAL_READINESS.md (emergency procedures)
- [ ] Set up Slack/email notifications for /api/alerts
- [ ] Draft first customer welcome email
- [ ] Prepare status page link (public health dashboard)

### Day 2: Customer Communication (1 hour)

- [ ] Send first customer welcome email:
  ```
  Subject: Welcome to EURO AI — Your governance platform is ready
  
  Hi [Customer Name],
  
  We're thrilled to have you on board! EURO AI is now live and ready for your team.
  
  Getting started:
  1. Create your account at https://newspulse-ai.vercel.app/auth/signup
  2. Verify your email (check spam folder if needed)
  3. Set up your workspace with company info
  4. Explore the governance dashboard
  
  Need help? Reply to this email anytime.
  
  Welcome,
  [Founder Name]
  ```

- [ ] Schedule launch call (30 min) for Day 3 or 4:
  - Confirm signup successful
  - Walk through workspace dashboard
  - Answer initial questions
  - Set expectations for support

---

## Customer Journey Verification Checklist

### Step 1: Signup (Target: <3 min)

**What to verify:**

- [ ] Customer can navigate to `/auth/signup`
- [ ] Form loads and is responsive
- [ ] Customer can enter: email, password, first/last name
- [ ] Required field validation works (error messages clear)
- [ ] Password must be ≥8 characters (error shown if too short)
- [ ] Terms checkbox required (cannot submit without checking)
- [ ] Submit button works, shows loading state
- [ ] Success: Page redirects to "Check your email"

**If customer gets stuck:**

Problem | Solution
---|---
"Password too short" | Passwords must be 8+ characters. Offer password manager suggestion.
"Email already exists" | Account already created. Send password reset link or help them log in.
"Form won't submit" | Clear browser cache/cookies. Try incognito mode. Check if JavaScript enabled.
"Email not received" | Check spam folder. Wait 2-3 minutes. Resend link via "Didn't get email?" button.

---

### Step 2: Email Verification (Target: <5 min)

**What to verify:**

- [ ] Verification email arrives in inbox (or spam)
- [ ] Email contains clear "Verify Email" button or link
- [ ] Clicking link confirms email without friction
- [ ] Either auto-redirects to signin OR shows "Email confirmed, now login"
- [ ] No confusing extra steps

**If verification email doesn't arrive:**

Problem | Solution
---|---
Email never arrives (1 hour later) | Check Supabase settings. Verify email auth is enabled. Check outbound email config.
Email arrives but link is broken | Check /auth/confirm route in code. Test with different email. May need to resend.
Customer clicks link, nothing happens | Browser may have cached old version. Clear cache and retry. Or paste the full URL manually.

**Recommended:** Founder sends welcome email BEFORE customer tries to sign up (reduce confusion, set expectations).

---

### Step 3: Login (Target: <1 min)

**What to verify:**

- [ ] Customer can return to `/auth/signin`
- [ ] Login with verified email + password succeeds
- [ ] Auto-redirects to `/workspace/setup` (first time)
- [ ] OR auto-redirects to `/dashboard` (returning customer)

**If login fails:**

Problem | Solution
---|---
"Invalid email or password" | Confirm correct credentials. Password is case-sensitive. Reset if needed (forgot password link).
"Session expired" | Refresh page. Log out and back in. Browser cache issue—clear cookies.
Login succeeds but no redirect | Refresh page manually. Middleware should redirect automatically within 2s.

---

### Step 4: Workspace Setup (Target: <5 min)

**What to verify:**

- [ ] Workspace setup form loads
- [ ] Form requests: company name, country, industry, employee count (optional)
- [ ] All required fields have clear labels and placeholders
- [ ] Country selector includes their country (15+ EU countries + UK/Norway)
- [ ] Industry picker matches their business
- [ ] Submit creates workspace, shows success, redirects to dashboard
- [ ] No error messages on successful submit

**If workspace setup fails:**

Problem | Solution
---|---
"Server error" when submitting | Check /api/workspace in browser console (Network tab). If 403, Supabase schema not deployed. If 401, session expired (refresh and retry).
Form won't accept company name | Some special characters forbidden (@ # $ etc). Try alphanumeric only.
Country not in list | Only EU countries + UK/Norway supported. If customer needs other region, note for Phase 2.
After submit, stuck on form | Refresh page. Dashboard load may be slow (Supabase cold start, ~2-3 sec).

**Recommended:** Founder completes workspace setup test before customer to ensure it works.

---

### Step 5: Dashboard (Target: <1 min)

**What to verify:**

- [ ] Dashboard loads after workspace created
- [ ] Displays: "Welcome [First Name]", company name, workspace created date
- [ ] Shows onboarding progress (Step 1/2/3 completed)
- [ ] "Sign Out" button visible in header
- [ ] Dashboard is responsive on mobile
- [ ] No console errors (check DevTools)

**Founder's role:** Email customer after they complete setup:

```
Subject: Your EURO AI workspace is live!

Hi [Customer Name],

Congratulations! Your workspace is set up and ready to use.

What you can do now:
1. Explore the governance dashboard
2. Invite team members (coming soon)
3. Set up integrations (coming soon)
4. View insights and metrics

Next steps:
- [Feature 1]: Learn how to X
- [Feature 2]: Set up Y integration
- [Feature 3]: Invite your team (Phase 2)

Questions? I'm here to help. Reply to this email or schedule a call.

Best,
[Founder Name]
```

---

### Step 6: Core Product Usage (Target: Day 1-2)

**What customer should accomplish:**

- [ ] Successfully logged in and exploring dashboard
- [ ] Understands what "governance" features are available
- [ ] Completes at least one action (e.g., view metrics)
- [ ] No console errors when using features
- [ ] Performance acceptable (page load <3 sec)

**Founder's role:** Send feature education email on day 2:

```
Subject: Quick guide to EURO AI

Hi [Customer Name],

Here's what you can do with EURO AI:

1. **Dashboard** — See your organization's AI governance status
2. **Metrics** — Track usage, performance, and insights
3. **Integrations** — Connect to your tools (Slack, email, etc.)
4. **Team** — Manage access and roles (coming Phase 2)

For now, explore the dashboard and metrics. More features rolling out soon.

Let me know what you think! Your feedback shapes the roadmap.

Best,
[Founder Name]
```

---

### Step 7: Day 2+ Return (Target: Customer comes back)

**What to verify:**

- [ ] Customer can log back in (session persistence)
- [ ] Dashboard data unchanged (persisted in Supabase)
- [ ] No data loss between sessions
- [ ] Welcome message updated (no confusion about "is this new?")
- [ ] Navigation works (sign out → sign back in)

**If customer doesn't return:**

- [ ] Send friendly "We miss you" email on day 3
- [ ] Include link to tutorial or quick win
- [ ] Ask for feedback: "What would help you use EURO AI more?"

---

## Common Friction Points & Prevention

| Friction Point | Why It Happens | Prevention |
|---|---|---|
| "Email confirmation link doesn't work" | Supabase email auth not configured | Test email flow before customer signup |
| "I forgot my password" | New account, complex setup | Include password reset link prominently |
| "Form rejected my company name" | Special characters forbidden | Accept most characters, show clear error |
| "Dashboard is slow" | Supabase cold start | Warn customer first load is 2-3 sec |
| "I'm confused what to do" | No onboarding UX | Send email guide (this playbook, step 6) |
| "Nothing happened after I submitted" | Network error, silent fail | Show clear success message and next steps |
| "I can't see my data" | Workspace not created properly | Verify workspace in Supabase console |
| "Mobile doesn't work" | Responsive design issue | Test signup/login on mobile before launch |

---

## Metrics to Track (Week 1)

Watch these numbers closely:

**Signup Funnel:**
- [ ] Signup page views
- [ ] Signup attempts (form submits)
- [ ] Verification email sent
- [ ] Verification email opened
- [ ] Email verified (clicks confirmation link)
- [ ] Login success rate
- [ ] **Goal:** >80% completion through all steps

**Engagement:**
- [ ] Workspace created
- [ ] Dashboard visited
- [ ] Features used (which features, how often)
- [ ] Support tickets/emails received
- [ ] **Goal:** Customer returns on day 2, 3, 7

**Technical:**
- [ ] Error rate (should be ~0%)
- [ ] API response time (should be <1 sec)
- [ ] Database query latency (should be <200ms)
- [ ] Page load time (should be <3 sec)

**Action:** If any metric dips, investigate immediately. Example: If 0% of customers reach dashboard, workspace creation is likely broken.

---

## Support Playbook

### Response SLAs

| Severity | First Response | Resolution |
|---|---|---|
| 🔴 Critical (system down) | 15 min | 2 hours |
| 🟠 High (feature broken) | 1 hour | 8 hours |
| 🟡 Medium (unclear behavior) | 2 hours | 24 hours |
| 🟢 Low (question) | Next business day | 48 hours |

### Support Channels

**Email:** Forward to founder@euroai.com (for now)

**Ideal for:** Feature questions, feedback, bug reports, account issues

**Response template:**
```
Hi [Customer],

Thanks for reaching out! [Acknowledge their issue].

[Explain what's happening / what we're doing]

[Next steps for them]

[When to expect resolution]

Let me know if you have other questions!

Best,
[Founder Name]
```

### Escalation Path

| Issue | Action | Owner |
|---|---|---|
| "Can't sign up" | Immediate investigation (blocker) | Founder |
| "Feature doesn't work" | Reproduce, check error logs, fix or workaround | Founder |
| "How do I...?" | Provide tutorial/video, update docs | Founder |
| "Can I have feature X?" | Note for roadmap, explain timeline | Founder |
| "Bill is wrong" | Check usage, adjust if needed (Phase 2: automatic) | Founder |

---

## Post-Launch Checklist (Week 1)

**Every day:**
- [ ] Check /api/alerts for any critical issues
- [ ] Review error logs in Vercel
- [ ] Monitor customer email for feedback/issues
- [ ] Note any friction in onboarding

**End of week 1:**
- [ ] Summarize customer feedback
- [ ] Fix any onboarding friction discovered
- [ ] Document what worked and what didn't
- [ ] Plan improvements for Phase 2

**Example notes:**
```
Week 1 Learnings:

✅ What worked:
- Email verification flow smooth
- Dashboard load acceptable
- Customer understood workspace concept

⚠️ What didn't:
- 2 customers confused about next steps after workspace setup
  → Action: Add "Next steps" section to dashboard

❌ Bugs found:
- None (excellent!)

🔄 Improvements for Phase 2:
- Add tutorial video to dashboard
- Create help section with FAQs
- Implement in-app chat for support
```

---

## Founder Success Criteria

First customer is successful when:

1. ✅ Customer completes signup → workspace → dashboard without support
2. ✅ Customer visits dashboard on day 2 (returns without prompting)
3. ✅ Customer understands core value proposition (asks intelligent questions)
4. ✅ Customer invites team members or schedules follow-up
5. ✅ No critical bugs or data loss
6. ✅ Customer experience <5% friction

If all 5 are true after week 1: Launch to more customers (Phase 2).

---

## Notes

- **Every customer is a beta tester.** Their feedback is gold. Listen carefully.
- **Be responsive.** Email response within 2 hours builds trust.
- **Be honest about Phase 2.** "Coming soon" is better than broken features.
- **Celebrate wins.** When customer uses feature, acknowledge it. "We're glad you're using X!"
- **Watch for churn signals.** If customer goes quiet after day 3, reach out proactively.

---

## Emergency Contacts

If something breaks during customer onboarding:

| Issue | Action | Time |
|---|---|---|
| Signup not working | Check /api/health + Supabase status | 5 min |
| Email not sending | Check Supabase email settings | 5 min |
| Dashboard crashes | Check Vercel logs + rollback if needed | 10 min |
| Data disappeared | Restore from Supabase backup | 30 min |
| Customer upset | Reply to email immediately, explain + next steps | 15 min |

If you're stuck and don't know what to do:

1. Check /api/alerts (monitoring will tell you what's wrong)
2. Reread OPERATIONAL_READINESS.md (incident playbook)
3. Check DNS-GOV-001 blocking conditions (external service outage?)
4. Rollback if recent deploy (see OPERATIONAL_READINESS.md)
5. Document in /api/knowledge for future reference

You've got this! 🚀
