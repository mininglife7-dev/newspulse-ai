# 🗺️ Phase 2 Roadmap (Weeks 2-4)

**Purpose:** Strategic product and operational plan for weeks 2-4 of customer launch  
**Timeline:** Week 2 (Day 8-14) through Week 4 (Day 22-28)  
**Owner:** Founder (Lalit)  
**Input:** Customer #1 learnings + feedback from customers #2-3

---

## 🎯 Phase 2 Objectives

| Week       | Focus                                   | Goal                                             | Success Metric                                |
| ---------- | --------------------------------------- | ------------------------------------------------ | --------------------------------------------- |
| **Week 2** | Stabilize ops; gather customer feedback | 2 customers onboarded; learn what works/breaks   | Completion rate >85%, Satisfaction >4/5       |
| **Week 3** | Iterate on feedback; validate market    | 3-4 customers onboarded; 2+ feature improvements | Faster onboarding time; improved satisfaction |
| **Week 4** | Plan scaling; make hiring decision      | 5 customers live; roadmap for 10+                | Go/No-Go for next phase                       |

---

## 📋 Week 2: Stabilize & Learn

**Operational Focus (60% of time):**

### Daily Operations

- [ ] Morning: 5-min health check (production, alerts, overnight logs)
- [ ] Midday: Check customer #2 progress (first signup of Week 2)
- [ ] Evening: Log metrics using WEEK-1-LAUNCH-OPERATIONS.md template

### Customer Support

- [ ] Customer #1: Weekly check-in (Day 8-9)
  - "How's it going? Any questions or feedback?"
  - Document feature requests
- [ ] Customer #2: Daily monitoring (Days 1-7 of their journey)
  - Same as customer #1 launch day tracking
- [ ] Response SLAs: Critical (15 min), High (1 hour), Medium (4 hours)

**Product Focus (40% of time):**

### Must-Fix Issues

Anything that blocks customer signup or assessment:

- [ ] RLS policy blocking (if occurred)
- [ ] Email confirmation not sending (if occurred)
- [ ] Assessment submission failing (if occurred)

### High-Priority Improvements (if customers request)

Based on customer #1 feedback, prioritize:

1. **If confusion during onboarding:** Improve UI/copy
2. **If PDF report issues:** Fix report generation
3. **If assessment too long:** Simplify questions

### Deferred (Week 3+)

- Nice-to-have features (add to backlog)
- UI polish (cosmetic improvements)
- Advanced features (defer to Phase 3)

**Week 2 Deliverables:**

✅ Customers #1-2 onboarded successfully  
✅ Customer feedback documented (features + friction)  
✅ Any critical bugs fixed  
✅ Learnings from customer #1 incorporated into customer #2 experience  
✅ 3-5 product improvement ideas identified

---

## 📋 Week 3: Iterate & Validate

**Operational Focus (50% of time):**

### Customer Expansion

- [ ] Onboard customer #3 (Monday)
- [ ] Onboard customer #4 (Wednesday or Thursday)
- [ ] Interview customers #1-2 (end of week)
  - Use template from CUSTOMERS-2-5-SCALING-PLAYBOOK.md
  - Capture what worked, what didn't, feature requests

### Weekly Review (Friday)

- [ ] Compile metrics from customers #1-3
- [ ] Identify patterns (what causes friction for multiple customers?)
- [ ] Assess: Ready for customer #4-5?

**Product Focus (50% of time):**

### Feature Prioritization

**Rule:** Only build if 2+ customers requested

Document each request:

```
Feature: [NAME]
Requested by: [Customer A], [Customer B]
Problem it solves: [PROBLEM]
Estimated effort: [1-3 days]
Priority: [HIGH/MEDIUM/LOW]
```

### Week 3 Development Plan

**High Priority (If 2+ customers requested):**

- [ ] Feature A: [Estimated 1-2 days]
- [ ] Feature B: [Estimated 1-2 days]

**Medium Priority (Build if time permits):**

- [ ] Feature C: [Estimated 2-3 days]

**Low Priority (Backlog for Phase 3):**

- [ ] Feature D: [Estimated 3+ days]

### Testing Requirements

- Before shipping any feature: Test with customer who requested it
- Verify: Solves their problem, doesn't break existing features
- Get feedback: "Does this work for you?"

**Week 3 Deliverables:**

✅ Customers #1-4 onboarded  
✅ 1-2 customer-requested features shipped  
✅ Customer interviews completed (feedback captured)  
✅ Patterns identified (what causes issues, what customers love)  
✅ Data collected to inform Phase 3+ roadmap

---

## 📋 Week 4: Plan & Decide

**Operational Focus (40% of time):**

### Customer Onboarding

- [ ] Onboard customer #5 (early in week)
- [ ] Monitor customers #1-5 for stability
- [ ] Continue daily health checks + weekly review

### Financial Checkpoint

- [ ] Calculate customer acquisition cost (time spent per customer)
- [ ] Estimate monthly revenue (if/when pricing implemented)
- [ ] Review spending: Vercel, Supabase, GitHub Actions
- [ ] Assess: Sustainable growth model?

**Product Focus (30% of time):**

### Finish Week 3 Features

- [ ] Polish any in-progress features
- [ ] Get final customer feedback
- [ ] Deploy to production

### Prepare Phase 3 Roadmap

- [ ] Compile all feature requests from customers #1-5
- [ ] Identify top 3 feature priorities for Phase 3
- [ ] Estimate effort + sequencing

**Strategic Focus (30% of time):**

### Go/No-Go Decision

**By end of Week 4, assess (Friday):**

**Success Metrics:**

- [ ] Uptime: >99% (or at least no major outages)
- [ ] Customer satisfaction: >4/5 average (5 customers)
- [ ] Completion rate: >85% (of customers finishing onboarding)
- [ ] Support burden: <2 hours/day (manageable solo)
- [ ] Revenue potential: Clear path to $X/month (if pricing set)

**Decision Framework:**

```
READY TO SCALE (All YES)
- [ ] YES: Customers are happy (>4/5 satisfaction)
- [ ] YES: Onboarding is repeatable (<45 min per customer)
- [ ] YES: System is stable (>99% uptime)
- [ ] YES: Feature feedback is clear (top 3 priorities defined)
- [ ] YES: Can support 10+ customers solo (or ready to hire)

→ PROCEED: Invite customers #6-10; hire first support person

---

ALMOST READY (Some YES, some maybe)
- [ ] MAYBE: One feature blocker; needs 1 week to fix
- [ ] MAYBE: Support taking >3 hours/day; need to optimize
- [ ] MAYBE: One customer unhappy; need to resolve

→ PROCEED WITH CAUTION: Fix blocking issue; continue scaling slowly
→ TIMELINE: Decide again in 1 week if issues resolved

---

NOT READY (Any NO)
- [ ] NO: Customer satisfaction <4/5
- [ ] NO: System downtime >1%
- [ ] NO: Onboarding taking >60 min (too slow)
- [ ] NO: Support unsustainable (>4 hours/day)
- [ ] NO: No clear feature roadmap

→ PAUSE SCALING: Focus on product/ops improvements
→ TIMELINE: 1-2 weeks to stabilize, then restart scaling
```

**Week 4 Deliverables:**

✅ Customers #1-5 onboarded and assessed  
✅ Go/No-Go decision made with clear rationale  
✅ Feature roadmap for Phase 3 defined  
✅ Hiring decision made (if needed)  
✅ Strategic plan documented for Week 5+

---

## 🚀 Feature Prioritization Framework

**When customers request features, use this framework:**

### Step 1: Understand the Problem

- **Customer:** Who is asking?
- **Problem:** What do they need?
- **Impact:** How bad is it? (blocks them, nice-to-have, future)
- **Frequency:** Is this 1 customer or a pattern?

### Step 2: Prioritize by Pattern

**Tier 1 (Build Now):**

- Requested by 2+ customers OR
- Blocks customer from using platform
- Effort: 1-2 days
- Impact: High (enables new workflows)

**Tier 2 (Build Next):**

- Requested by 1 customer but valuable to others OR
- Nice-to-have but high impact (saves customer time)
- Effort: 2-3 days
- Impact: Medium

**Tier 3 (Backlog):**

- One-off request OR
- Low impact (cosmetic) OR
- Effort: >3 days
- Impact: Low

### Step 3: Implementation

**For Tier 1 features:**

1. Build (1-2 days)
2. Test with requesting customer (0.5 day)
3. Deploy to production
4. Get customer feedback (same day)
5. Fix any issues (0.5 day)
6. Mark as launched

**Timeline:** Features go from request to live in ~3-5 days

### Step 4: Track Outcomes

Document in "Feature Delivery Log":

```
Feature: [NAME]
Requested: [Customer Name] (Date)
Shipped: [Date]
Customer Reaction: [Feedback]
Other Customers Using: [Y/N] (count if yes)
Success: [YES/NO] (solved problem?)
```

---

## 📊 Success Metrics (Week 2-4)

**Track Weekly:**

| Metric                  | Week 2  | Week 3  | Week 4  | Target   |
| ----------------------- | ------- | ------- | ------- | -------- |
| **Customers Onboarded** | 2       | 4       | 5       | >4       |
| **Avg Completion Time** | ___ min | ___ min | ___ min | <45      |
| **Avg Satisfaction**    | ___.0/5 | ___.0/5 | ___.0/5 | >4.0     |
| **Uptime**              | __%     | __%     | __%     | >99%     |
| **Support Hours/Day**   | ___     | ___     | ___     | <3       |
| **Features Shipped**    | 1-2     | 1-2     | 1-2     | >3 total |
| **Customer Churn**      | 0%      | 0%      | 0%      | 0%       |

---

## 💼 Hiring Decision Framework (Week 4)

**By end of Week 4, decide: Do you need to hire?**

### Support Hire Criteria (First role)

**Hire if:**

- ✅ Spending >4 hours/day on support
- ✅ 5+ customers demanding same-day responses
- ✅ Missing product work due to support load
- ✅ Revenue >$2k/month (can afford $2-3k/month salary)

**Wait if:**

- ❌ Spending <2 hours/day on support
- ❌ 5 customers manageable solo
- ❌ Can batch support into "office hours"
- ❌ Revenue <$2k/month

### If Hiring, Start Recruiting (Week 4-5)

Target: Customer success person (part-time)

- Responsibilities: Customer onboarding, support, feedback collection
- Hours: 10-15 hours/week (or 20-30 hours if full-time)
- Salary: $2-3k/month (part-time) or $4-6k/month (full-time)
- Hiring timeline: 2-3 weeks

**While recruiting:**

- Use Zapier/Make to automate welcome email sending
- Create customer onboarding checklist (shared doc)
- Document support procedures in wiki

---

## 🛠️ Technical Debt (Track for Phase 3)

**During Weeks 2-4, log any technical debt:**

- [ ] Performance issue: [Description]
- [ ] Bug that doesn't block: [Description]
- [ ] Code cleanup: [Description]
- [ ] Documentation gap: [Description]

**Rule:** If it doesn't block customers, defer to Phase 3

**Phase 3 will allocate:** 20% of time to technical debt, 80% to features

---

## 📝 Week-by-Week Checklist

### Week 2 (Days 8-14)

**Monday:**

- [ ] Review customer #1 full-week data
- [ ] Invite customer #2 to platform

**Tuesday-Thursday:**

- [ ] Daily health checks
- [ ] Support customer #1 if questions
- [ ] Monitor customer #2 onboarding

**Friday:**

- [ ] Weekly review:
  - Uptime ___%, Error rate __%, Support __hrs
  - Customers #1: [Status], #2: [Status]
  - Learnings: [3 things]
- [ ] Plan Week 3

### Week 3 (Days 15-21)

**Monday:**

- [ ] Onboard customer #3

**Wednesday:**

- [ ] Onboard customer #4 (or Thursday if needed)

**Friday:**

- [ ] Customer interviews:
  - [ ] Interview customer #1 (30 min)
  - [ ] Interview customer #2 (30 min)
- [ ] Weekly review: Same format as Week 2
- [ ] Document feature requests (prioritize)
- [ ] Plan Week 4

### Week 4 (Days 22-28)

**Monday:**

- [ ] Onboard customer #5

**Tuesday-Thursday:**

- [ ] Daily health checks
- [ ] Work on Tier 1 features from request list
- [ ] Customer support as needed

**Friday:**

- [ ] Final weekly review (Week 1-4 summary)
- [ ] Make Go/No-Go decision
- [ ] Document decision + rationale
- [ ] Plan Phase 3 (Week 5+)

---

## 🎓 Decision Points & Branch Logic

### End of Week 2

**Question:** Is customer #1 satisfied? (>4/5 rating)

**YES** → Continue to customer #3  
**NO** → Investigate: What went wrong?

- Missing feature?
- Performance issue?
- Support problem?
- Unrealistic expectations?

**Action:** Fix issue before inviting more customers

---

### End of Week 3

**Question:** Are customers completing onboarding in <45 minutes?

**YES** → Process is scalable; continue  
**NO** → Why are they slow?

- Confusing UI?
- Too many questions?
- Technical issue?

**Action:** Optimize onboarding path; retest with customer #4-5

---

### End of Week 4

**Question:** Can you manage 5+ customers solo?

**YES** → Ready to scale to 10-20 customers  
**NO** → When can you be ready?

- Need to hire support? (2-3 weeks)
- Need to automate tasks? (1-2 weeks)
- Need to improve product? (1-2 weeks)

**Action:** Define what's needed to scale; commit to timeline

---

## 📊 Dashboard to Create (Optional)

If you want visibility without manual tracking:

**Simple Google Sheet:**

- Columns: Customer, Signup Date, Completion Date, Satisfaction, Features Used, Support Requests, Referral Likelihood
- Updates: Weekly (end of Friday)
- View: Rolling 4-week window

**Or use Airtable:**

- Base: Customers
- Table 1: Customer profiles (name, company, contact)
- Table 2: Journey tracking (signup, completion, satisfaction)
- Table 3: Feature requests (who asked, when shipped)
- Views: By customer, by week, by feature

---

## 🎯 Success Stories to Watch For

These indicate product-market fit emerging:

✅ **Customer stays engaged** (multiple logins/week)  
✅ **Customer asks "can we also...?"** (expansion requests)  
✅ **Customer invites teammate** (team expansion)  
✅ **Customer mentions us to others** (unprompted referral)  
✅ **Customer creates multiple assessments** (increased usage)

If seeing 2+ of these by Week 4 → Strong signal for scaling

---

## ⚠️ Warning Signs to Monitor

🚨 **Immediate action needed if:**

- Customer satisfaction <3/5 (something is broken)
- Uptime <98% (stability issue)
- Support >5 hours/day (unsustainable)
- Customer churn (anyone unhappy leaving)

🟡 **Pay attention to:**

- Completion time increasing (onboarding getting harder)
- Same question from 2+ customers (documentation gap)
- Feature requests all similar (market signal)

---

## 📌 Key Reminders

**During Phase 2, prioritize:**

1. **Customer success first** (happy customers matter more than features)
2. **Collect feedback constantly** (every interaction is data)
3. **Ship fast** (get features in front of customers quickly)
4. **Document learnings** (so you remember for Phase 3)
5. **Stay healthy** (this is a marathon, not a sprint)

**Do NOT:**

- ❌ Build features nobody asked for
- ❌ Spend time on cosmetics (UI polish can wait)
- ❌ Promise features you can't deliver
- ❌ Ignore customer feedback (they know what they need)
- ❌ Overcommit and burn out (pace yourself)

---

## 🚀 By End of Week 4, You'll Know:

✅ If product-market fit is real (customers are happy, engaged, expanding)  
✅ If your customer acquisition process works (5 customers onboarded smoothly)  
✅ What features customers actually want (documented in priority order)  
✅ If you can scale solo or need help (support hours analyzed)  
✅ What to build next (Phase 3 roadmap defined)

This is the most important month. Every interaction teaches you something.

Good luck. 🎯
