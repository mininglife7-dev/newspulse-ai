# Feature Request Triage Framework — EURO AI

**Purpose:** Evaluate customer feature requests systematically and make confident prioritization decisions  
**Audience:** Founder, product team  
**Last Updated:** 2026-07-16  
**Status:** Ready for customer pilot

---

## Quick Reference: Triage Scorecard

When a customer requests a feature, score it on these 5 dimensions:

| Factor | Low (0) | Medium (5) | High (10) | Your Score |
|--------|---------|----------|----------|------------|
| **Customer Count** | 1 customer asks | 2-3 customers ask | 4+ customers OR founding customer | __ |
| **Impact on Use** | Nice-to-have | Removes friction | Blocks workflow | __ |
| **Effort Required** | >2 weeks | 1-2 weeks | <1 week | __ |
| **Strategic Alignment** | Off-roadmap | Complementary | Roadmap priority | __ |
| **Revenue Impact** | No revenue tied | 1-2 customers influenced | Locks in revenue/prevents churn | __ |

**Total Score:** Add them up → __ / 50

**Decision:**
- **40-50:** Priority this sprint (implement within 1 week)
- **25-40:** Add to backlog (implement within 4 weeks)
- **10-25:** Interesting but defer (add to Phase 2-3)
- **<10:** Politely decline or suggest alternative

---

## Part 1: Initial Evaluation Framework

### Step 1: Understand the Request

**When customer says:** "Can you add X?"

**Before scoring, make sure you understand:**
1. **What is X?** (Be specific: "export as PDF" not "better reports")
2. **Why do they want it?** (Use case: "I need to share with legal team")
3. **How urgent?** ("Nice to have" vs "blocks me from using EURO AI")
4. **Are others asking?** ("We've had 3 customers ask" vs "just you")

**Clarifying questions:**
- "How would this help your workflow?"
- "Who needs this? Just you or your team?"
- "Can you work around it today?"
- "Are other customers asking for this?"
- "When do you need it?"

---

### Step 2: Score Each Dimension

#### Dimension 1: Customer Count (0-10)

**How many customers want this?**

| Score | Definition | Example |
|-------|-----------|---------|
| **0** | Only 1 customer asking | "Just us, unique to our setup" |
| **5** | 2-3 customers asking | "TechFlow and GlobalAI both asked" |
| **10** | 4+ customers OR founding customer | "4 customers + our founding customer, must-have" |

**Why it matters:** If 4+ customers ask for something, it's a real need. If 1 customer asks, it might be their edge case.

**Scoring logic:**
- Founding customers: Weight 2x (higher value)
- Paying customers: Weight 1.5x vs free trial
- Similar requests: Count as 1 (e.g., 3 people asking "export PDF" = 1 request)

---

#### Dimension 2: Impact on Use (0-10)

**How much does this feature enable/unblock the customer?**

| Score | Definition | Example |
|-------|-----------|---------|
| **0** | Nice-to-have, doesn't change workflow | "Would be cool to have dark mode" |
| **5** | Removes friction, improves workflow | "Export would save us 10 min/week copy-pasting" |
| **10** | Blocks entire workflow without it | "Can't share assessments with team = unusable" |

**Scoring logic:**
- Ask: "Can they use EURO AI without this?"
- If yes → Impact is low (nice-to-have)
- If no → Impact is high (workflow-blocking)

---

#### Dimension 3: Effort Required (0-10)

**How much work is it to build?**

Inverse scoring: **Easier = higher score** (easier things get done faster)

| Effort | Score | Example |
|--------|-------|---------|
| **<4 hours** | **10** | "Add a new field to the form" |
| **4-8 hours** | **7** | "Build export to CSV endpoint" |
| **1-2 days** | **5** | "Add team member management UI" |
| **2-5 days** | **2** | "Build custom questionnaire builder" |
| **>1 week** | **0** | "Build full integrations marketplace" |

**Estimation guidelines:**
- Simple UI change: 1-2 hours
- New API endpoint: 2-4 hours
- Database schema change: 2-4 hours
- Full feature (UI + API + DB): 2-5 days

---

#### Dimension 4: Strategic Alignment (0-10)

**Does this align with our roadmap?**

| Score | Definition | Example |
|-------|-----------|---------|
| **0** | Off-roadmap, different product | "Build a CMS" (not compliance) |
| **5** | Complementary to roadmap | "Dark mode" (nice, not planned) |
| **10** | Explicit roadmap priority | "Team management" (Q3 roadmap) |

**Roadmap priorities (copy from TECHNICAL-ROADMAP-90DAYS.md):**
- **Q2 (Now):** EU AI Act questionnaire, risk assessment, evidence tracking
- **Q3:** Team management, custom questionnaires, email notifications
- **Q4:** Integrations, advanced reporting, customer dashboard
- **Phase 2+:** Custom compliance frameworks, AI-powered recommendations

**Scoring logic:**
- Is this already on the roadmap? → 10
- Does it complement the roadmap? → 5
- Is it different product? → 0

---

#### Dimension 5: Revenue Impact (0-10)

**Does this affect revenue or retention?**

| Score | Definition | Example |
|-------|-----------|---------|
| **0** | No revenue impact | "Better UI styling" |
| **5** | 1-2 customers consider it | "Customer said it would help, nice-to-have" |
| **10** | Locks in revenue or prevents churn | "Customer won't renew without team management" |

**Scoring logic:**
- Ask: "Would you churn if we don't build this?"
- If yes → Score 10 (retention blocker)
- If "nice to have" → Score 5 (quality-of-life)
- If "doesn't matter" → Score 0

---

### Step 3: Decision Matrix

**After scoring, look up decision:**

```
TOTAL SCORE DECISION MATRIX

40-50 (High Impact, Quick Win)
├─ Decision: BUILD NOW
├─ Timeline: This sprint (implement within 1 week)
├─ Example: Customer asks for export, high impact, 4 hour job
└─ Action: Commit to customer, prioritize over other work

25-40 (Good Addition, Plan Ahead)
├─ Decision: ADD TO BACKLOG
├─ Timeline: Next sprint (implement within 4 weeks)
├─ Example: Team management (Q3 roadmap, takes 3 days)
└─ Action: "We're prioritizing this for Q3, thanks for requesting"

10-25 (Interesting, But Not Priority)
├─ Decision: PHASE 2-3 (nice-to-have)
├─ Timeline: Later (Quarter 4 or beyond)
├─ Example: "Build Slack integration", 5 days work, 2 customers
└─ Action: "Great idea, on our Phase 2 roadmap. Let's revisit in Q4."

<10 (Out of Scope or Too Much Work)
├─ Decision: POLITELY DECLINE or SUGGEST ALTERNATIVE
├─ Timeline: Not planned
├─ Example: "Build custom AI model", 4 weeks, only 1 customer
└─ Action: "Interesting, but out of scope for our core product"
```

---

## Part 2: Response Templates

### "Build Now" (40-50 score)

```
Hi [Customer],

Love the feature request for [feature]. We've had [X] customers ask for this.

[Impact]: This will [improve your workflow / enable X use case].

**Decision:** We're building this for you! ETA: [1-2 weeks]

Here's what we'll deliver:
[Specific description of feature]

[Optional] During build, we'll keep you updated with progress. 

Thanks for helping shape EURO AI!

Best,
[Your Name]
```

---

### "Add to Backlog" (25-40 score)

```
Hi [Customer],

Great suggestion for [feature]. We've had [X] customers ask for this.

**Decision:** This is on our Q3 roadmap (next quarter). We're prioritizing it after [current features].

Why we're prioritizing it:
[Brief reason: high impact, multiple customers ask, strategic alignment]

**Timeline:** Should be ready in [Month]. I'll send you an update when we start.

In the meantime, [workaround if exists] can help you unblock.

Looking forward to shipping this!

Best,
[Your Name]
```

---

### "Phase 2-3" (10-25 score)

```
Hi [Customer],

Thanks for the feature request for [feature]. Interesting idea!

**Decision:** We're adding this to our Phase 2 roadmap (Q4 2026+). We have some higher-priority items we're working on first.

We'll definitely consider this when we start Phase 2 planning. If more customers ask for it, we'll prioritize it sooner.

In the meantime, is there anything else we can do to help?

Best,
[Your Name]
```

---

### "Polite Decline" (<10 score)

```
Hi [Customer],

Thanks for the suggestion for [feature].

While we appreciate the idea, it's outside our core focus for EURO AI. We're specifically building for [EU AI Act compliance / risk assessment / etc.], and [feature] goes beyond that scope.

[Optional workaround]: In the meantime, you could [alternative approach].

Is there anything else we can help with?

Best,
[Your Name]
```

---

## Part 3: Tracking Feature Requests

### Feature Request Log (Google Sheet)

Create a spreadsheet to track all requests:

```
FEATURE REQUEST TRACKER

| Date | Customer | Feature | Impact | Effort | Alignment | Revenue | Score | Decision | Status |
|------|----------|---------|--------|--------|-----------|---------|-------|----------|--------|
| 7/20 | Acme | Export PDF | 7 | 8 | 7 | 8 | 30 | Backlog | Tracking |
| 7/21 | TechFlow | Dark mode | 3 | 9 | 2 | 0 | 14 | Decline | — |
| 7/22 | GlobalAI | Team mgmt | 10 | 4 | 10 | 9 | 33 | Q3 plan | Tracking |
| 7/23 | Acme | Custom Q's | 8 | 3 | 8 | 7 | 26 | Q3 plan | Tracking |
```

**Why track:**
- See patterns (3 customers ask for X = real need)
- Measure if decisions were right (did they churn?)
- Guide roadmap (what's most-requested?)
- Build customer confidence ("We're tracking your request")

---

### Pattern Analysis (Weekly)

**Every Friday, review requests from the week:**

```
WEEKLY FEATURE REVIEW

Requests received: 4
New patterns identified:
- 2 customers asked for export (PDF, CSV)
- 2 customers asked for team management
- 1 customer asked for custom questionnaire

Action:
- Export → Move to Q3 (higher priority)
- Team mgmt → Confirmed Q3 priority
- Custom Q's → Confirmed Q3 priority

Customer sentiment:
- Overall positive (requests = engagement)
- No churn threats from lack of features
```

---

## Part 4: Handling Difficult Requests

### "We need this to keep using EURO AI" (Churn threat)

**Decision: Prioritize immediately**

**Response:**
```
Hi [Customer],

I understand [feature] is critical for your team.

Options:
1. We can build [feature] in [1-2 weeks] — highest priority
2. [Workaround] can help you get started while we build
3. We can schedule a call to discuss alternative solutions

What's most helpful right now?

Best,
[Your Name]
```

**Action:**
- Score it (probably high)
- Commit timeline
- Make it high priority
- Update roadmap if needed
- Send weekly progress updates

---

### "This should be standard, not optional"

**Customer says:** "Every compliance tool has X, why don't you?"

**Response:**
```
Hi [Customer],

Good question. Here's why we didn't build [feature] first:

[Reason]:
- Most customers can [workaround]
- We prioritized [more-used feature]
- Small customer base means we focus on core features

**But you've convinced us it should be standard.** We're moving it to [Q3/Q4].

Thanks for the feedback!

Best,
[Your Name]
```

---

### "Can you build this custom just for us?"

**Customer asks:** "Can you add a custom questionnaire for our industry?"

**Response options:**

**Option A: Suggest standard approach**
```
Hi [Customer],

Great idea! Instead of custom dev work, we're building [standard feature] in Q3 that will let you create custom questionnaires yourself.

Timeline: [Month]. In the meantime, you can [modify existing questionnaire manually].

Worth waiting for?

Best,
```

**Option B: Offer as consulting service (post-MVP)**
```
Hi [Customer],

Custom development is outside our scope for now. However, after we launch the MVP, we can discuss a professional services engagement.

For now: [Workaround].

Let's revisit this in Q3!

Best,
```

---

## Part 5: Communication Strategy

### Keeping Customers Updated

**When you commit to a feature, customers expect updates:**

**Commit format:**
```
We're building [feature] for you!

Timeline: [Specific month/date]
What you'll get: [Specific description]

I'll send you progress updates [weekly/bi-weekly].
```

**Weekly update (5 min email):**
```
Subject: [Feature] Progress Update #1

Hi [Customer],

Quick update on [feature]:

**This week:** [We did X]
**Next week:** [We'll do Y]

On track for [date] launch!

Questions? Reply anytime.

Best,
```

---

## Part 6: Special Situations

### "Everyone wants this"

**If 5+ customers ask for same feature:**

**Action:**
1. **Move to top priority** (even if off-roadmap)
2. **Announce as committed feature:**
   ```
   "We've heard from [X] customers — [feature] is now 
   officially on our Q3 roadmap. Thank you for the feedback!"
   ```
3. **Accelerate timeline** if possible
4. **Keep all requesters updated** together (reduces support overhead)

---

### "Competitive pressure"

**Customer says:** "Competitor X has this, why don't you?"

**Response:**
```
Hi [Customer],

Good question. Here's how we compare to [Competitor]:

Competitor X strengths:
- [Feature A]
- [Feature B]

EURO AI strengths:
- [Our advantage 1]
- [Our advantage 2]

We're building [feature] in Q3 to close this gap.

Which features matter most to you?

Best,
```

**Action:**
- Don't get defensive
- Acknowledge competitors
- Focus on our unique value
- Commit to timeline

---

## Summary: Your Triage Process

1. **Customer requests feature:** Note it in Feature Request Log
2. **Understand request:** Ask clarifying questions
3. **Score it:** Rate on 5 dimensions (customer count, impact, effort, alignment, revenue)
4. **Decide:** Use score to make decision (Build now / Backlog / Phase 2 / Decline)
5. **Respond:** Use appropriate template
6. **Track it:** Add to Feature Request Log
7. **Update customer:** Weekly progress updates if committed
8. **Analyze patterns:** Weekly review of all requests
9. **Celebrate:** When feature ships, credit the customer who requested it

---

## Decision Checklist

Before committing to a feature, verify:

- [ ] You understand the request (specific, not vague)
- [ ] You understand the use case (why they want it)
- [ ] You've asked if others want it (single customer vs. pattern)
- [ ] You've checked roadmap alignment
- [ ] You've estimated effort (not guessed)
- [ ] You've considered revenue impact
- [ ] You've scored it using the framework
- [ ] You've decided based on score
- [ ] You've communicated decision to customer
- [ ] You've added to Feature Request Log
- [ ] You've set expectations (timeline, what you'll build)

---

## Common Pitfalls to Avoid

❌ **Don't:** Commit to features without scoring  
✅ **Do:** Use the 5-dimension scoring framework

❌ **Don't:** Say "maybe, we'll think about it"  
✅ **Do:** Give a clear decision (Now / Q3 / Phase 2 / No)

❌ **Don't:** Build features just because one customer asks  
✅ **Do:** Check if others want it first (pattern = real need)

❌ **Don't:** Forget to update customer on progress  
✅ **Do:** Send weekly updates if you committed

❌ **Don't:** Let feature requests pile up undecided  
✅ **Do:** Decide and respond within 48 hours

---

**Feature Request Triage Framework Complete**  
**Ready for Customer Pilot**  
**Use this framework every time a customer says "Can you add...?"**

---

## Appendix: Sample Requests & Scores

### Example 1: Team Member Invitations

**Customer:** Acme Corp  
**Request:** "Our team needs to invite other people to the workspace"  
**Impact:** "We want to share the risk assessment with our legal team"

**Scoring:**
- Customer count: 10 (founding customer, critical feature)
- Impact: 10 (blocks team collaboration)
- Effort: 4 (UI + API + permissions, ~3 days)
- Alignment: 10 (explicitly on Q3 roadmap)
- Revenue: 9 (customer won't renew without this)
- **Total: 43**

**Decision:** Build in Q3 (next quarter, committed feature)

**Response:**
```
Hi Acme,

Team member invitations is critical! We have it on our Q3 roadmap.

**Committed feature:** You can invite team members and set permissions (Admin/Editor/Viewer)

**Timeline:** September 2026

We're building this for you + 3 other customers. I'll send weekly updates.

Thanks for prioritizing this!
```

---

### Example 2: Dark Mode

**Customer:** TechFlow  
**Request:** "Can you add dark mode? It's easier on my eyes"

**Scoring:**
- Customer count: 1 (just this customer)
- Impact: 3 (nice-to-have, not workflow-blocking)
- Effort: 8 (UI change only, ~6 hours)
- Alignment: 2 (off-roadmap, cosmetic feature)
- Revenue: 0 (they didn't mention it affects renewal)
- **Total: 14**

**Decision:** Phase 2-3 (nice-to-have, defer)

**Response:**
```
Hi TechFlow,

Dark mode is a great idea! It's on our Phase 2 roadmap.

For now, you can:
- Use your browser's dark mode extension
- Try your OS dark mode setting (some browsers respect it)

We'll add native dark mode support in Q4. Thanks for the suggestion!
```

---

### Example 3: PDF Export

**Customer:** GlobalAI  
**Request:** "Can we export assessments as PDF? We need to share with stakeholders"  
**Also requested by:** Acme, TechFlow (3 customers total)

**Scoring:**
- Customer count: 8 (3 customers asking)
- Impact: 7 (removes friction, saves manual work)
- Effort: 7 (API + PDF library, ~8 hours)
- Alignment: 8 (complements roadmap, evidence tracking)
- Revenue: 6 (helps with stakeholder buy-in, affects renewals)
- **Total: 36**

**Decision:** Q3 backlog (schedule for next quarter)

**Response:**
```
Hi GlobalAI,

Export to PDF is popular — we've had 3 customers ask!

**Decision:** We're building this for Q3 (next quarter).

**What you'll get:**
- Export assessment as PDF
- Include company name, risk score, recommendations
- Email-ready format

**Timeline:** September 2026

I'll send you updates as we build. This will be huge for stakeholder presentations!

Best,
```

---

End of Framework
