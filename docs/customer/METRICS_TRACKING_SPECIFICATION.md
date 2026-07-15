# Customer Metrics Tracking Specification

**Purpose:** Define what metrics to track during first customer onboarding and beyond.  
**Audience:** Founder, Customer Success Team  
**Usage:** Reference during Week 1 and ongoing customer engagement

---

## Overview

Track these metrics from signup through day 30. Patterns reveal product-market fit, reveal friction, and guide roadmap priorities.

---

## Week 1: Onboarding Funnel

Track every step of the customer journey. Funnel drop-off identifies friction.

### Signup Funnel

| Metric | Target | How to Measure | Acceptable Range |
|---|---|---|---|
| **Page Views** | Signup page seen | Check Vercel Analytics or browser history | 1+ page views = interest confirmed |
| **Form Starts** | Customer fills email field | Check browser console, log events | >80% of page views |
| **Form Submissions** | Customer clicks "Sign Up" | Supabase auth logs | >90% of form starts |
| **Email Sent** | Verification email generated | Supabase auth logs | 100% of submissions |
| **Email Opened** | Customer checks inbox | Email tracking (if available) | >70% of sent |
| **Email Verified** | Clicks confirmation link | Supabase `email_confirmed_at` timestamp | >80% of sent |
| **Signup Success Rate** | Email confirmed | (verified / submitted) × 100 | >80% success |

**Interpretation:**
- If >10% drop before form submit → Signup form has friction (unclear, confusing, or slow)
- If >20% drop at email verification → Email delivery issue or customer confusion
- If <70% verified → May need to resend link, improve email instructions, or check spam folder

**Action:** If funnel drops below targets, contact customer with specific help:
- Form friction: "Is the signup form unclear? I can walk you through it."
- Email verification: "Did you get the verification email? Let me resend it or help troubleshoot."

---

### Login & Setup Funnel

| Metric | Target | How to Measure | Note |
|---|---|---|---|
| **Login Attempts** | Customer returns to signin | Supabase session logs | Should be 1 (email verified → direct login) |
| **Login Success** | Session created | Supabase `sessions` table | 100% if credentials correct |
| **Workspace Created** | POST /api/workspace succeeds | Supabase `workspaces` table | Should be 1 |
| **Company Set Up** | Form completed | Supabase `companies` table | Should be 1 |
| **Dashboard Access** | First dashboard view | Browser console + Vercel logs | 1+ view = product seen |

**Expected Timeline:**
- Signup → Email verification: <5 min
- Email verified → First login: <30 min (customer checking email)
- Login → Workspace creation: <5 min (usually immediate)
- Workspace created → Dashboard view: <1 min

If customer takes >1 hour from signup to workspace creation, follow up: "Are you getting stuck anywhere? I can help."

---

## Week 1: Engagement Metrics

### Feature Adoption

| Feature | Metric | Target | How to Measure |
|---|---|---|---|
| **Dashboard** | Views per day | ≥1 | Vercel logs: GET /dashboard |
| **Search** | Searches performed | ≥1 | POST /api/search calls |
| **History** | History page viewed | ≥1 | GET /dashboard → history tab |
| **Metrics** | Metrics viewed | ≥1 | API calls to analytics endpoints |

**Target:** Customer uses ≥3 features in Week 1 = strong product-market fit signal

**If customer uses 0 features in first 3 days:**
- Send feature education email (template in COMMUNICATION_TEMPLATES.md)
- If still unused after 7 days → Reach out: "What would be most helpful? Can I show you around?"

---

### Session Depth

| Metric | Target | Measure | Interpretation |
|---|---|---|---|
| **Time on Dashboard** | ≥5 min/session | Browser DevTools → Network timing | <2 min = too quick, probably confused |
| **Pages Visited/Session** | ≥2 | Vercel logs: unique routes | 1 page = didn't explore |
| **Repeat Sessions** | ≥2 in Week 1 | (day 2 login logged) | 1 session = no return interest |
| **Session Duration Trend** | Increasing | Track per day | Increasing = getting more value |

**Red Flags:**
- Session < 1 min → Likely error or navigation confusion
- 0 repeat sessions by day 3 → Product not compelling, follow up
- Each session same length → Routine task, not exploration (potential but not exciting)

---

## Week 2-4: Retention & Behavior

### Engagement Scoring

Track these daily; plot on a simple graph.

| Dimension | Scoring | Healthy | At Risk |
|---|---|---|---|
| **Login Frequency** | Days active / 7 days | ≥4 days/week | <2 days/week |
| **Feature Adoption** | Features used / total available | ≥50% | <25% |
| **Time per Session** | Avg session duration | >5 min | <2 min |
| **Weekly Usage Trend** | Compare week 1 vs week 2 | Increasing | Decreasing |

**Calculation (simple 0-100 score):**
```
engagement_score = (
  (login_frequency / 7) * 25 +     // 25 points for frequency
  (features_used / total) * 25 +   // 25 points for breadth
  (avg_time / 10_min) * 25 +       // 25 points for depth (capped at 10 min)
  (trend / 100) * 25               // 25 points for trend (0-100%)
)
```

**Week 2 Target:** engagement_score ≥50 = staying engaged  
**Red Flag:** engagement_score <30 after 14 days = escalate (reach out to customer)

---

## Technical Metrics

### Performance

| Metric | Target | How to Measure | Red Flag |
|---|---|---|---|
| **Page Load Time** | <2 sec | Vercel Analytics | >5 sec = customer frustration |
| **API Response Time** | <500ms | GET /api/health latency | >2 sec = likely Supabase slow |
| **Error Rate** | 0% | Supabase + Vercel error logs | >1% = investigate |
| **Database Query Latency** | <200ms | Supabase query logs | >1 sec = needs index |

### Reliability

| Metric | Target | How to Measure |
|---|---|---|---|
| **Uptime** | 99.9%+ | Vercel + Supabase status pages |
| **Failed Requests** | 0 | Vercel error logs |
| **Database Downtime** | 0 | Supabase status |

**If you see any red flags:**
1. Check /api/alerts for system status
2. Review Vercel logs for errors
3. Check Supabase dashboard for query performance
4. If customer-facing error, proactively email: "We experienced a brief issue. It's resolved now."

---

## Customer Satisfaction Signals

### Indirect Signals (Watch for These)

| Signal | Means | Action |
|---|---|---|
| Customer replies to welcome email | Interest, engagement | Warm follow-up (use COMMUNICATION_TEMPLATES.md) |
| Asks questions about features | Learning, exploring | Detailed answer, share docs/tutorials |
| Reports a bug | Detail-oriented, invested | Quick fix + thank you |
| Asks "When will X feature...?" | Wants more value | Note for roadmap, share timeline |
| Goes silent (no activity 3+ days) | Lost interest or stuck | Friendly re-engagement (churn recovery email) |
| Shares product with team | High satisfaction | Encourage team adoption, offer team features |

### Email Response Rate

| Scenario | Target Response Time | Goal |
|---|---|---|
| Founder welcome email → customer reply | <24 hours | Shows interest, start dialogue |
| Customer question → Founder reply | <2 hours | Builds trust, shows responsiveness |
| Customer bug report → Founder investigation | <1 hour | Demonstrates care for their issues |

---

## Success Criteria: First 30 Days

### Week 1 Milestones (Days 1-7)

- [ ] Customer signs up, creates account
- [ ] Email verification succeeds
- [ ] Customer logs in
- [ ] Customer creates workspace
- [ ] Customer views dashboard
- [ ] Customer uses ≥3 features
- [ ] Zero critical errors
- [ ] Performance acceptable (<2s page load)

### Week 2 Milestones (Days 8-14)

- [ ] Customer returns (day 2, 4, 7 logins)
- [ ] Engagement score ≥50
- [ ] Feature usage increasing or stable
- [ ] Zero data loss incidents
- [ ] Customer responds to feature education email

### Week 3-4 Milestones (Days 15-30)

- [ ] Customer still active (at least weekly)
- [ ] Usage pattern stabilizing (routine behavior)
- [ ] Positive feedback or engagement signals
- [ ] No support escalations
- [ ] Considering team member invitations (Phase 2 feature)

### Launch Success Definition

✅ **PASS:** Customer completes all Week 1 milestones + maintains activity into Week 2+  
⚠️ **AT RISK:** Customer reaches Week 2 with engagement_score <40  
❌ **FAIL:** Customer goes silent after Day 1, or reports critical bugs

---

## Daily Check-in Template (Spend 5 minutes)

**Each morning:**

```
[ ] Check /api/alerts → Any critical issues overnight?
[ ] Verify Vercel deployment status → Still "Ready"?
[ ] Check Supabase status → All green?
[ ] Review customer email → Any new questions/issues?
[ ] Spot-check Vercel logs → Any 500 errors?

[ ] If customer active today → What features used?
[ ] Note observations in KNOWLEDGE_LOG.md for patterns
```

**Weekly summary (Friday, 15 min):**

```
Week 1 Summary:
- Signup funnel: [X]% complete
- Week 1 engagement score: [0-100]
- Features adopted: [X] of [total]
- Performance: Page load [Xms], errors [X]
- Customer feedback: [satisfaction level]

Action items for next week:
- [ ] [Item 1]
- [ ] [Item 2]

Status: ON TRACK / AT RISK / INTERVENTION NEEDED
```

---

## Tools & Integration (Phase 2)

In production, automate this:

- **Supabase:** Query usage, engagement, feature adoption (in real-time)
- **Vercel:** Pull performance metrics, error rates, uptime data
- **Email:** Track open rates, reply times (if using email provider API)
- **Slack:** Daily digest of customer engagement metrics + alerts
- **Custom Dashboard:** Real-time view of engagement score, funnel, key metrics

For now: Manual observation + spreadsheet = sufficient for first customer.

---

## Data Privacy Note

All customer metrics tracked in Supabase as part of normal product operation. Do NOT collect beyond what the application naturally logs (e.g., don't track keystroke timing, screen recordings, or location). Notify customer of your monitoring practices in privacy policy (comes in Phase 2).

---

## Reference

- Signup/Onboarding playbook: FIRST_CUSTOMER_PLAYBOOK.md
- Support response templates: COMMUNICATION_TEMPLATES.md
- Incident response: INCIDENT_RESPONSE_RUNBOOKS.md
- Operational procedures: OPERATIONAL_READINESS.md

---

**Remember:** These metrics are diagnostic tools. The real measure is: "Would this customer recommend us to a colleague?" If yes → healthy. If no → investigate why.
