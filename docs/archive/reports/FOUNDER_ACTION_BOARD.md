# 🎯 Founder Action Board — Priority Tasks

**Purpose:** Consolidated list of all actions blocking launch, requiring decision, or needed for operations.  
**Status:** Current as of 2026-07-12  
**Audience:** Founder (Lalit)

---

## Execution Summary

**State:** READY TO LAUNCH (2 critical blockers require Founder action)  
**Launch Timeline:** 20-35 minutes to unblock  
**Confidence:** HIGH (all blockers are Founder actions, not engineering surprises)

---

## 🚨 PRIORITY 0: BLOCKING LAUNCH (Do Today — 20-35 minutes)

These MUST be done before first customer can sign up.

### Action #1: Deploy Supabase Schema (15-30 minutes)

**Owner:** You (Founder)  
**Blocking:** Every customer signup fails with 403 error  
**Effort:** 15-30 minutes

**Steps:**

1. Open Supabase dashboard: https://app.supabase.com
2. Select your project
3. Navigate to SQL Editor
4. Copy schema from: `supabase/schema.sql` (in this repo)
5. Paste into Supabase SQL Editor
6. Execute (Run button)
7. Verify success: tables appear in SQL Editor left sidebar

**Verification:**

```bash
curl -X POST https://newspulse-ai.vercel.app/api/workspace \
  -H "Content-Type: application/json" \
  -d '{"company_name":"Test","country":"DE","industry":"tech","employee_count":10}'
```

Should return 200, not 403.

**Why:** Database schema defines tables (workspaces, companies, profiles) and row-level security (RLS) policies that protect multi-tenant data. Without schema, customer writes fail.

**Reference:** docs/infra/SUPABASE-PRODUCTION-SETUP.md (Phase 1)

**Status:** ⏳ PENDING

---

### Action #2: Increase GitHub Actions Spending Limit (5 minutes)

**Owner:** You (Founder)  
**Blocking:** Monitoring workflows can't execute, CI/CD verification disabled  
**Effort:** 5 minutes

**Steps:**

1. Go to: https://github.com/mininglife7-dev/newspulse-ai/settings/billing
2. Click: "Actions" in left sidebar
3. Find: "Spending limit"
4. Set to: $50/month (or higher)
5. Save

**Why:** Monitoring DNA systems (DNS-GOV-001 through DNS-GOV-018) depend on GitHub Actions workflows. When spending limit is exhausted, workflows don't run, alerts don't trigger, and verification fails.

**Verification:** Within 5 minutes, go to Actions tab → should see workflows running green.

**Status:** ⏳ PENDING

---

## ✅ PRIORITY 1: STRATEGIC DECISION (Awaiting Your Review)

### Decision: DNS-GOV-019 Specification (Billing Integration)

**Owner:** You (Founder) — decision required  
**Impact:** Enables revenue model at launch  
**Effort:** 2-3 weeks implementation (if approved)

**What It Is:** Three-tier pricing model:

- **Free:** Core features, unlimited workspaces (current)
- **Pro:** $49/month, advanced analytics, priority support
- **Enterprise:** Custom pricing, dedicated support

**What You Need to Do:**

1. Read: docs/governance/DNS-GOV-019-BILLING-BRIEF.md (executive summary)
2. Read: DNA-REGISTRY.md DNS-GOV-019 section (technical spec)
3. Decide: Do you want billing integrated at launch?

**Decision Options:**

A) **Launch free-only** (Recommended for Phase 1)

- Faster to market (no billing complexity)
- Gather customer feedback before monetizing
- Reduces launch risk
- Can add billing in Phase 2 (2-3 weeks)

B) **Launch with Pro tier**

- Enables revenue from day 1
- Requires Stripe integration (DNS-GOV-019 implementation)
- Adds 2-3 weeks to launch
- More complex customer management

**If Option A (Free-Only):**

- No action needed now, proceed to Priority 2
- DNS-GOV-019 becomes Phase 2 Phase 2 backlog task

**If Option B (Launch with Billing):**

- Approve DNS-GOV-019 spec
- Governor builds billing integration (60-80 hours, 2-3 weeks)
- Delay launch by 2-3 weeks

**Recommendation:** Launch free-only (Option A). Reasons:

1. Get first customer feedback before monetizing
2. Reduce launch complexity and risk
3. Build billing properly in Phase 2 with product-market fit data
4. Customers often prefer "free while you prove value" model

**Status:** ⏳ AWAITING YOUR DECISION

---

## 📋 PRIORITY 2: PRE-LAUNCH SETUP (Complete Before First Customer)

These are best practices to establish before launch, but don't block it.

### Action #3: Run Pre-Customer Verification (5 minutes)

**Owner:** You (Founder)  
**Effort:** 5 minutes  
**What:** Automated script that verifies all systems ready

**Steps:**

```bash
bash scripts/pre-customer-verification.sh --verbose
```

**Expect:** Green checkmarks across all categories. Any red = must fix before launch.

**When:** Morning of first customer launch

**Status:** ⏳ READY (script created)

---

### Action #4: Set Up Monitoring Alerts (10 minutes)

**Owner:** You (Founder)  
**Effort:** 10 minutes  
**What:** Configure notifications for critical issues

**Steps:**

1. Set up Slack app for newspulse-ai GitHub org (Phase 2 nice-to-have)
   OR
   Add monitoring email to your inbox:
   - Verify `/api/alerts` returns data
   - Bookmark: https://newspulse-ai.vercel.app/api/alerts
   - Check it daily

2. Enable Vercel notifications (optional):
   - Vercel Dashboard → Project → Settings → Notifications
   - Alert on failed deployment

3. Subscribe to Supabase status:
   - https://status.supabase.com → Email notifications

**When:** Day before launch

**Status:** ⏳ READY (docs created, automation part of Phase 2)

---

### Action #5: Create First Customer Email (10 minutes)

**Owner:** You (Founder)  
**Effort:** 10 minutes  
**Template:** docs/customer/COMMUNICATION_TEMPLATES.md → WELCOME EMAIL

**Steps:**

1. Copy welcome email template
2. Personalize with customer name, company name
3. Save as draft
4. Send when they're ready to start

**When:** Morning of first customer signup

**Status:** ⏳ READY (templates created)

---

## 📊 PRIORITY 3: OPERATIONAL EXCELLENCE (Phase 2)

These improve operations but don't block launch. Queue for Phase 2.

### Dependency Vulnerability Fixes

**Status:** DEFERRED TO PHASE 2  
**Reason:** Current state stable (551/551 tests pass), fragile dependency tree requires careful migration  
**Effort:** 4-6 hours  
**Impact:** Reduces security risk from 7 known vulnerabilities → 0

**When Phase 2:** After first customer success verified

---

### npm Audit & Dependency Modernization

**Status:** DEFERRED TO PHASE 2  
**Effort:** 3-4 hours  
**Impact:** Ensures long-term maintainability

---

### Public Status Page

**Status:** DEFERRED TO PHASE 2  
**Effort:** 2-3 hours  
**Why:** First customer can check /api/alerts directly for now

---

### Slack Integration for Alerts

**Status:** DEFERRED TO PHASE 2  
**Effort:** 1-2 hours  
**Why:** Email monitoring sufficient for single customer

---

### In-App Support Widget

**Status:** DEFERRED TO PHASE 2  
**Effort:** 4-5 hours  
**Why:** Email support works for Phase 1

---

## ✔️ COMPLETED TASKS (Already Done)

✅ Code verified (551/551 tests, clean build)  
✅ Customer journey simulation (7-step workflow tested)  
✅ Monitoring infrastructure deployed (13 DNA systems)  
✅ Critical issues identified and documented  
✅ Operational playbooks created (438 lines)  
✅ Customer success playbooks created (424 lines)  
✅ Email templates created (10 templates)  
✅ Support system designed (ticket tracking, SLAs)  
✅ Metrics tracking defined (funnel, engagement, retention)  
✅ Incident response runbooks (5 common scenarios)  
✅ Monitoring dashboard quick reference  
✅ Pre-customer verification script

---

## 🗺️ EXECUTION ROADMAP

### Today (Launch Prep, 20-35 min)

- [ ] Deploy Supabase schema (15-30 min)
- [ ] Increase GitHub Actions limit (5 min)
- [ ] Decide on DNS-GOV-019 (billing) — recommend Option A: defer to Phase 2

### Tomorrow (First Customer Onboarding)

- [ ] Run verification script (5 min)
- [ ] Send welcome email
- [ ] Follow FIRST_CUSTOMER_PLAYBOOK.md
- [ ] Monitor /api/alerts for issues

### Week 1

- [ ] Track metrics (signup funnel, engagement)
- [ ] Respond to customer questions
- [ ] Document any friction points

### Week 2+

- [ ] Monitor customer health score
- [ ] Track feature adoption
- [ ] Plan Phase 2 improvements

---

## 🚀 SUCCESS CRITERIA FOR LAUNCH

You're ready when:

✅ Supabase schema deployed and tested  
✅ GitHub Actions spending limit increased  
✅ Verification script passes green  
✅ You've read FIRST_CUSTOMER_PLAYBOOK.md  
✅ You understand incident response procedures  
✅ You can access /api/alerts dashboard

---

## 📞 NEED HELP?

**If verification script fails:**

- Check /tmp/build.log or /tmp/test.log
- Refer to OPERATIONAL_READINESS.md troubleshooting section

**If Supabase schema deploy fails:**

- Check Supabase dashboard → Status
- Verify credentials in .env.local
- Refer to SUPABASE-PRODUCTION-SETUP.md

**If customer reports issue:**

- Check INCIDENT_RESPONSE_RUNBOOKS.md
- Follow support SLA in SUPPORT_TICKET_SYSTEM.md
- Email customer within response time window

**If something unexpected:**

- Check /api/alerts for system status
- Review Vercel logs
- Check Supabase logs
- Contact Supabase support if database issue

---

## 📋 Daily Checklist During Week 1

Each morning (5 minutes):

- [ ] Check /api/alerts → Any critical alerts?
- [ ] Verify deployment status is "Ready"
- [ ] Check Supabase status page → All green?
- [ ] Review customer emails → Any new issues?
- [ ] Spot-check Vercel logs → Any 500 errors?

---

## 🎯 FOUNDER DECISION REQUIRED

**Before proceeding:** Please make these decisions:

1. **Supabase Schema Deployment** — Will you deploy today? (Required to proceed)
   - [ ] Yes, deploying today
   - [ ] Yes, deploying tomorrow
   - [ ] Need help — ping Governor

2. **GitHub Actions Spending Limit** — Will you increase today? (Required to proceed)
   - [ ] Yes, increasing to $50/month today
   - [ ] Need help with GitHub

3. **DNS-GOV-019 Billing** — Approve free-only launch (recommended) or billing integration?
   - [ ] Free-only launch (Phase 2 billing) — RECOMMENDED
   - [ ] Billing at launch (2-3 week delay)
   - [ ] Discuss with Governor

Once you confirm these three decisions, launch is green.

---

**Remember:** You built something remarkable. This is the beginning. Every customer is a teacher — listen carefully to what they need.

🚀
