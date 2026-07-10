# Customer Success Playbook

**Purpose:** Operational procedures for successful customer onboarding, support, and monitoring post-launch.  
**Audience:** Founder, customer success team, support  
**Scope:** MVP phase (single-customer pilot through early adoption)

---

## Pre-Customer Preparation (Do This Before First Customer Signup)

### 1. Infrastructure Verification Checklist

Before inviting the first customer, confirm:

- [ ] **Vercel Deployment**
  - Production URL working: https://euro-ai.vercel.app (or custom domain)
  - No deploy failures in last 2 hours
  - HTTPS certificate valid

- [ ] **Supabase Database**
  - Schema.sql deployed (4 tables: workspaces, ai_systems, risk_assessments, and supporting tables)
  - 33 RLS policies in place
  - Row-level security working (test: create two users, verify data isolation)

- [ ] **Email Authentication**
  - Verification emails sending successfully
  - Sent from known address (noreply@mail.supabase.io or configured sender)
  - Verification links work and aren't expiring prematurely

- [ ] **Supabase Region**
  - Data hosted in EU (Frankfurt, Ireland, or London)
  - GDPR compliant for German customers
  - Latency acceptable from Germany (should be <100ms)

- [ ] **Monitoring & Alerts**
  - Error tracking enabled (if using Sentry, DataDog, etc.)
  - Uptime monitoring configured
  - Alert channels set up (Slack, email)

---

## Customer Pilot Phase (Week 1: First Customer)

### 1. Customer Invitation

When you're ready to invite the first German customer:

**Email Template:**

```
Subject: Welcome to EURO AI — Your Free Pilot

Dear [Customer Name],

We're excited to invite you to EURO AI, our AI governance platform built 
specifically for EU companies.

[EURO AI] helps you:
✓ Catalog all AI systems in your organization
✓ Evaluate compliance against the EU AI Act
✓ Identify and prioritize governance risks

Your pilot link: https://euro-ai.vercel.app

Getting started takes ~30 minutes:
1. Sign up with your email
2. Verify your email
3. Tell us about your company
4. Add your AI systems
5. Assess compliance risks

If you have questions, reach out to me directly at [your email].

Looking forward to your feedback!

[Your name]
Founder, EURO AI
```

### 2. First-Time Onboarding Support

**During customer's first session:**

- [ ] Assign an onboarding specialist (could be you initially)
- [ ] Send welcome email with link to CUSTOMER-GUIDES.md
- [ ] Offer 30-minute kickoff call to walk through steps (optional but recommended)
- [ ] Collect their timezone for async support

**What to watch for:**
- Do they successfully verify their email? (If not, resend link or troubleshoot)
- Do they complete Company Setup? (If stuck, check data is persisting)
- Do they add at least 1 AI system? (If struggling, ask how many systems they have)
- Do they start Risk Assessment? (May need help with question interpretation)

### 3. Daily Monitoring (First Week)

**Daily checklist:**

- [ ] **8:00 AM:** Check monitoring dashboard
  - Any error rates ≥ 1%? Investigate
  - Any failed deployments? Check GitHub Actions
  - Any uptime alerts? Respond immediately

- [ ] **Customer Progress Check:**
  - Has customer signed in today?
  - How far through onboarding? (Step 1/2/3?)
  - Any errors in their journey? (Check logs if available)

- [ ] **Email Check:**
  - Any customer support requests?
  - Any error notifications from services?

### 4. End-of-Week Retrospective

After first customer completes (or at end of week):

**Feedback to collect:**
- [ ] Did all 3 steps work as expected?
- [ ] Were questions clear and relevant?
- [ ] Did risk assessment make sense?
- [ ] What was most valuable?
- [ ] What was confusing?
- [ ] Any UI/UX friction?
- [ ] Any missing features they wanted?

**Document findings:**
- Open GitHub issues for any bugs found
- Create feature requests for feedback
- Update CUSTOMER-GUIDES.md if explanations needed clarification

---

## Early Adoption Phase (Week 2-4: Multiple Customers)

### 1. Batch Invitations

Once pilot customer completes successfully:

- [ ] Invite 2-3 more German customers (stagger invitations by day)
- [ ] Use same email template
- [ ] Assign onboarding specialist to each (could be one person managing multiple)

### 2. Weekly Monitoring

**Monday Morning:**
- [ ] Run production health checks
- [ ] Review error logs from past week
- [ ] Check any customer support threads

**Daily (5 min check):**
- [ ] No critical errors in past 24 hours?
- [ ] Deployments all successful?
- [ ] Customers progressing through onboarding?

**Friday Afternoon:**
- [ ] Collect weekly metrics (see "Metrics to Track" below)
- [ ] Plan any fixes or improvements for next week

### 3. Metrics to Track

**Adoption Funnel:**
- [ ] Number of signups (cumulative)
- [ ] Number completing email verification
- [ ] Number completing Company Setup (Step 1)
- [ ] Number adding AI systems (Step 2)
- [ ] Number completing Risk Assessment (Step 3)

**Engagement:**
- [ ] Time to completion for each step (target: <30 min total for full onboarding)
- [ ] Re-visit rate (customers returning after Day 1)
- [ ] Feature usage (which systems added, which risk levels assessed)

**Reliability:**
- [ ] Uptime % (target: ≥ 99.5%)
- [ ] Error rate % (target: < 0.1%)
- [ ] Failed email deliveries (target: 0)

**Customer Sentiment:**
- [ ] Support tickets (count, resolution time)
- [ ] Customer feedback (quotes, themes)
- [ ] Net Promoter Score (NPS) if doing surveys

### 4. Issue Escalation Procedure

**If customer hits error:**

1. **Log the issue**
   - Customer email
   - Error message/symptom
   - Time it occurred
   - Steps to reproduce

2. **Check known issues**
   - Is this a known problem? (check GitHub issues)
   - Was this a recent change? (check git log)

3. **Immediate workaround (if exists)**
   - Example: "Try clearing browser cache and signing in again"
   - Document workaround

4. **Create GitHub issue** (if not already open)
   - Title: Descriptive but concise
   - Labels: `bug`, `high-priority` (if customer-blocking)
   - Description: Steps to reproduce, expected vs. actual

5. **Fix timeline**
   - Critical (customer can't use product): Fix within 2 hours
   - High (significantly impacts experience): Fix within 24 hours
   - Medium (minor inconvenience): Fix within 1 week
   - Low (edge case, workaround exists): Fix in next sprint

---

## Production Operations (Ongoing)

### 1. Daily Checklist (2 min)

Every morning, quickly verify:

```bash
# Check deployment status
curl https://euro-ai.vercel.app/api/health

# Should respond with:
# { "status": "healthy", ... }
```

If not healthy:
- [ ] Check Vercel dashboard for deploy failures
- [ ] Check GitHub Actions for CI failures
- [ ] Check Supabase status page for outages

### 2. Weekly Deep Dive (30 min)

Every Friday:

- [ ] Review error logs for patterns
- [ ] Check customer feedback
- [ ] Verify RLS policies are working (spot check: create test user, verify data isolation)
- [ ] Run full staging verification (STAGING-VERIFICATION.md)
- [ ] Update customer metrics spreadsheet

### 3. Monthly Audit (1 hour)

Every month:

- [ ] **Backup verification**
  - Supabase automatic backups are running
  - Test restore process (in staging, not production)

- [ ] **Security audit**
  - No new CVEs in dependencies (check npm audit)
  - No suspicious login attempts
  - API rate limiting working

- [ ] **Performance review**
  - Lighthouse scores stable?
  - Database query times acceptable?
  - Any slow API endpoints?

- [ ] **Compliance check**
  - GDPR practices verified
  - Data retention policies documented
  - Privacy policy up to date

---

## Common Support Scenarios

### Scenario 1: "I'm stuck on email verification"

**Symptoms:** Customer says they didn't receive verification email

**Troubleshooting:**
1. Ask customer to check spam/junk folder
2. Check Supabase logs to see if email was sent
3. If not sent: email auth may not be enabled (check Supabase Auth settings)
4. If sent: email provider may have blocked it (check Supabase logs for reason)

**Fix options:**
- Option A: Have customer request new verification link (if UI supports it)
- Option B: Manually verify in Supabase (admin only): update user.email_confirmed_at to now()
- Option C: Have customer sign up again with different email

### Scenario 2: "My AI systems disappeared"

**Symptoms:** Customer added systems yesterday, now the list is empty

**Troubleshooting:**
1. Verify customer is signed in to correct account
2. Check if they created multiple accounts (have them try alternate emails)
3. Check Supabase: verify workspace_id and user_id match

**Fix:**
- Likely two accounts were created by mistake
- Consolidate data by moving ai_systems records from one workspace to another (SQL)
- Prevent by having customer use password manager

### Scenario 3: "The risk assessment form won't submit"

**Symptoms:** Customer clicks submit button but nothing happens

**Troubleshooting:**
1. Check browser console for JavaScript errors
2. Check Network tab: is POST request being sent? What's the response?
3. Most common: required field not filled (even if hidden/invisible)

**Fix:**
- Ask customer to refresh browser
- Try in incognito/private mode
- If persists: file bug (likely form validation issue)

### Scenario 4: "I can see another customer's data"

**CRITICAL:** This is a data isolation breach

**Immediate actions:**
1. Screenshot evidence
2. Sign out customer immediately
3. Take product offline (if widespread) or restrict affected account
4. File critical GitHub issue
5. Investigate RLS policies

**Investigation:**
- Are RLS policies correctly filtering by workspace_id?
- Is current_user_id being passed correctly to Supabase?
- Did recent change introduce bug?

---

## Success Metrics & KPIs

### Customer Adoption (Track Weekly)

| Metric | Target | Current |
|--------|--------|---------|
| Signup → Email Verify conversion | ≥ 95% | — |
| Email Verify → Company Setup | ≥ 80% | — |
| Company Setup → Add Systems | ≥ 90% | — |
| Add Systems → Risk Assessment | ≥ 75% | — |
| Full onboarding time | < 30 min | — |

### Engagement (Track Weekly)

| Metric | Target | Current |
|--------|--------|---------|
| Day-1 return rate | ≥ 40% | — |
| Day-7 return rate | ≥ 60% | — |
| Avg systems added per customer | ≥ 3 | — |
| Avg assessments per customer | ≥ 2 | — |

### Reliability (Track Daily)

| Metric | Target | Current |
|--------|--------|---------|
| Uptime | ≥ 99.5% | — |
| Error rate | < 0.1% | — |
| 95th percentile response time | < 2 sec | — |

### Customer Satisfaction (Track Monthly)

| Metric | Target | Current |
|--------|--------|---------|
| Support response time | < 4 hours | — |
| Issue resolution time | < 24 hours | — |
| Customer NPS (if surveyed) | ≥ 40 | — |
| Feature request rate | TBD | — |

---

## Escalation Paths

### Critical Issues (Respond in < 30 min)

- Customer can't sign up
- Customer can't verify email
- Data loss or corruption
- Security breach
- Service down

**Action:** Drop everything, investigate, fix or communicate status every 15 min

### High-Priority Issues (Respond in < 2 hours)

- Customer can't complete onboarding
- Risk assessment results incorrect
- Performance severely degraded
- Deployment failure

**Action:** Investigate immediately, create GitHub issue, notify customer

### Medium-Priority Issues (Respond in < 24 hours)

- UI unclear or confusing
- Data takes long to load
- Minor feature not working
- Documentation needs update

**Action:** Create GitHub issue, plan fix in next sprint

---

## Hand-Off to Future Team

When you hire support/CS staff:

1. **Documentation to hand off:**
   - This playbook (you're reading it)
   - CUSTOMER-GUIDES.md (customer-facing)
   - DEPLOYMENT-CHECKLIST.md (infrastructure)
   - GitHub issues (known bugs, feature requests)

2. **Access to grant:**
   - Production Supabase account (read-only initially)
   - Vercel dashboard (monitoring)
   - GitHub (for issue tracking)
   - Customer email address list

3. **Training:**
   - 1-hour walkthrough of onboarding flow
   - 30-min product tour
   - How to use Supabase admin panel
   - How to escalate issues

---

## Launch Readiness Checklist

Before inviting first customer:

- [ ] Infrastructure fully configured (all 4 tasks complete)
- [ ] Staging verification passed (STAGING-VERIFICATION.md)
- [ ] Error monitoring configured
- [ ] Support email address set up
- [ ] Customer guides reviewed and tested
- [ ] FAQ reviewed for common issues
- [ ] Monitoring dashboard accessible
- [ ] Backup procedures documented and tested
- [ ] Response procedures understood by team
- [ ] Customer invitation list prepared

---

**Document Version:** 1.0 (MVP Launch)  
**Last Updated:** 2026-07-10  
**Owner:** Founder / Customer Success Lead  
**Next Review:** After first 5 customers

Once you've invited the first customer, update this document with real timings, common issues, and lessons learned.
