# 📅 Week 1 Launch Operations Guide

**Purpose:** Daily procedures and success metrics for the critical first week of customer launch  
**Duration:** Day 1 (Launch) through Day 7  
**Owner:** Founder (Lalit)  
**Support:** Governor (autonomous monitoring + alert response)

---

## 🎯 Week 1 Success Criteria

By end of Day 7, the platform should demonstrate:

- ✅ **Customer Journey Complete:** First customer onboarded through report generation
- ✅ **System Uptime:** 99.9%+ (max 4 seconds downtime for entire week)
- ✅ **Response Times:** 95% of requests <1 second, 99% <2 seconds
- ✅ **Error Rate:** <1% (no critical errors)
- ✅ **Customer Satisfaction:** Positive feedback or no issues reported
- ✅ **Knowledge Captured:** Learnings documented for customer #2

---

## 📋 Daily Checklist (5 minutes each morning)

Run every day at same time (suggest 9 AM):

```bash
# 1. Check production health
curl https://your-vercel-app.vercel.app/api/health
# Expected: {"ok": true, "status": "healthy", "db": "ok"}

# 2. Check active alerts
curl https://your-vercel-app.vercel.app/api/alerts
# Expected: No critical/high severity items

# 3. Review monitoring logs (if GitHub Actions spending restored)
# Check: https://github.com/mininglife7-dev/newspulse-ai/actions
# Look for: "monitor-production-health" workflow status
```

**If anything is red:** See "Incident Response" section below

---

## 📅 Day-by-Day Procedures

### DAY 1 (Launch Day): T-0 to T+24h

**Objective:** First customer signs up and completes onboarding

**Morning (Before Customer Launch):**

- [ ] Founder actions complete (schema deployed, spending limit increased)
- [ ] Verification script passed: `./scripts/verify-launch-readiness.sh`
- [ ] All monitoring dashboards open in browser tabs
- [ ] Have GOVERNOR-LAUNCH-COMMAND-CENTER.md and LAUNCH-DAY-TROUBLESHOOTING.md ready

**Midday (Launch T-0):**

- [ ] Send welcome email to first customer using FIRST-CUSTOMER-WELCOME-EMAIL.md template
- [ ] Note send time (for metrics tracking)
- [ ] Begin real-time monitoring (30 min monitoring window)

**Customer Journey Tracking (T+0 to T+60 min):**

| Milestone            | Expected Time | Status | Notes                              |
| -------------------- | ------------- | ------ | ---------------------------------- |
| Email opens          | Immediate     | ⏳     | Check if customer opens email      |
| Account signup       | 5-15 min      | ⏳     | Check Supabase auth.users          |
| Email confirmed      | 10-20 min     | ⏳     | Check email_confirmed_at timestamp |
| Workspace created    | 20-30 min     | ⏳     | Check workspaces table             |
| First AI system      | 30-40 min     | ⏳     | Check ai_systems table             |
| Assessment completed | 40-50 min     | ⏳     | Check assessments table            |
| Report generated     | 50-60 min     | ⏳     | Check reports table                |

**Evening (T+60 to T+24h):**

- [ ] Document launch results (use template below)
- [ ] Verify system still healthy (run daily check)
- [ ] Send customer success message if journey complete
- [ ] If customer stuck: Reach out with support

**Daily Summary Template:**

```markdown
## Day 1 Launch Results

**Timeline:**

- Email sent: [TIME]
- Account created: [TIME]
- Email confirmed: [TIME]
- First action: [TIME/ACTION]
- Journey complete: [TIME] ✅ or PENDING

**System Health:**

- Uptime: 100% ✅
- Error rate: 0% ✅
- Response time: [Ms] ✅
- No alerts: ✅

**Customer Status:**

- Email received: ✅/❌
- Account verified: ✅/❌
- Workspace created: ✅/❌
- Journey complete: ✅/❌/PENDING

**Issues Encountered:** [None] or [List]

**Actions Taken:** [List or N/A]

**Next Steps:** [Continue monitoring] / [Reach out to customer]
```

---

### DAY 2-3: Stabilization & Early Feedback

**Objective:** Confirm system is stable; gather early customer feedback

**Morning (Daily Check):**

- [ ] Daily health check (5 min) — see "Daily Checklist" above
- [ ] Review previous day's logs
- [ ] Check for any overnight alerts

**Midday:**

- [ ] Send customer check-in message if they haven't contacted you
  - Template: "How is [Platform Name] working for you so far?"
- [ ] Encourage them to add more AI systems if first one complete
- [ ] Offer to help with any questions

**Evening:**

- [ ] Log daily metrics (see template below)
- [ ] Review customer interactions
- [ ] Document any feedback received

**Daily Metrics Log:**

```markdown
## Day [N] Metrics

**System Health:**

- Uptime: [%]
- Error rate: [%]
- P95 latency: [Ms]
- Critical alerts: [0] or [LIST]

**Customer Activity:**

- Logins today: [N]
- Actions taken: [LIST]
- Pages visited: [LIST]
- Support requests: [0] or [LIST]

**Feedback Received:**

- What worked well: [...]
- What was confusing: [...]
- Feature requests: [...]

**Observations:**

- [Any patterns, issues, or positive signals]

**Next Day Actions:**

- [Any follow-ups needed]
```

---

### DAY 4: Mid-Week Review

**Objective:** Assess 4-day performance; plan for next customer

**Morning:**

- [ ] Weekly deep-dive health check (15 min instead of 5)
  - Check Vercel dashboard for deployment metrics
  - Review Supabase query performance
  - Check GitHub Actions logs (if spending restored)
  - Review /api/alerts for aggregated errors

**Afternoon:**

- [ ] Compile 4-day summary:
  - Total uptime: ____%
  - Total errors: ____%
  - Customer satisfaction: [High/Medium/Low]
  - Major incidents: [None] or [List]

- [ ] Review learnings for customer #2:
  - What went smooth: [...]
  - What caused friction: [...]
  - What to improve: [...]

**Template: 4-Day Summary**

```markdown
## Days 1-4 Summary

**Platform Performance:**

- Total uptime: [%] (Target: >99.9%)
- Total errors: [count] ([%] of requests)
- Average response time: [Ms]
- P95 latency: [Ms]
- Incidents: [0] or [LIST]

**Customer Journey:**

- Status: [COMPLETE] / [IN_PROGRESS] / [BLOCKED]
- Completion time: [Minutes] from signup to report
- Engagement score: [Low/Medium/High]
- Satisfaction: [Positive/Neutral/Negative] based on feedback

**Top Learnings:**

1. [What worked well and should repeat]
2. [What caused friction and needs improvement]
3. [What surprised you positively or negatively]

**For Customer #2 (Next Week):**

- Improved onboarding: [CHANGE]
- Documentation update: [CHANGE]
- Feature priority: [TOP 3 REQUESTS]

**Readiness for Customer #2:** [YES/ALMOST/NO + reason]
```

---

### DAY 5-6: Customer Expansion

**Objective:** Prepare for second customer; continue supporting first

**Day 5 (Thursday):**

- [ ] Morning: Daily health check
- [ ] Afternoon: Invite 2nd customer (if 1st customer happy)
  - Use FIRST-CUSTOMER-WELCOME-EMAIL.md template (customize)
  - Note: Can be slightly different based on customer type
- [ ] If customer #1 complete: Celebrate + ask for testimonial

**Day 6 (Friday):**

- [ ] Morning: Daily health check
- [ ] **Weekly Review (30 min):** Comprehensive assessment
  - See "Weekly Review Checklist" below
- [ ] Customer #2 onboarding: Monitor similar to Day 1
- [ ] Customer #1: Check in on progress with more systems/reports

---

### DAY 7: Week 1 Retrospective

**Objective:** Document Week 1 results; plan for Week 2+

**Morning:**

- [ ] Daily health check
- [ ] Verify: All success criteria met (see top of this document)

**Afternoon:**

- [ ] **Complete Week 1 Retrospective** (1 hour)
  - Use template below
  - Document for future reference
  - Identify patterns and learnings

**Evening:**

- [ ] Update FOUNDER_BRIEF.md with Week 1 results
- [ ] Plan Week 2 focus
- [ ] Celebrate success! 🎉

**Template: Week 1 Retrospective**

```markdown
## Week 1 Retrospective

**Dates:** [Date] through [Date]

**Launch Status:**

- Customer #1 complete: ✅/❌
- Customer #1 satisfaction: [High/Medium/Low]
- Customer #2 invited: ✅/❌
- Customer #2 status: [Onboarding/Complete/Not started]

**Platform Performance (Week 1):**

- Total uptime: [%]
- Average response time: [Ms]
- Error rate: [%]
- Critical incidents: [0] or [LIST with duration]
- SLA violations: [0] or [LIST]

**What Went Well:**

1. [SUCCESS - explain why it worked]
2. [SUCCESS - explain why it worked]
3. [SUCCESS - explain why it worked]

**What Could Improve:**

1. [FRICTION - explain impact + fix for next customer]
2. [FRICTION - explain impact + fix for next customer]
3. [FRICTION - explain impact + fix for next customer]

**Surprises (Positive or Negative):**

- [SURPRISE - Customer did X, which we didn't expect]
- [SURPRISE - System handled Y really well/poorly]
- [SURPRISE - Customer feedback on Z]

**Team/Process Improvements:**

- [Monitoring could be better by doing X]
- [Support response could improve by doing Y]
- [Documentation needs clarity on Z]

**Financial Health:**

- Vercel spending: $[amount] (budget: $15/mo)
- Supabase spending: $[amount] (budget: $30/mo)
- GitHub Actions: $[amount] (budget: $50/mo)
- Total: $[amount] (budget: $100/mo)

**Customer Feedback Summary:**

- Top request #1: [FEATURE]
- Top request #2: [FEATURE]
- Top issue #1: [ISSUE]
- Quote: "[Customer quote about experience]"

**Week 1 Success Rating:** [5/5] ⭐ (Excellent)

**Next Week Priorities:**

1. [Priority for Week 2]
2. [Priority for Week 2]
3. [Priority for Week 2]

**Ready for Week 2:** YES ✅ / NO (because: [reason])
```

---

## 🆘 Incident Response During Week 1

### "Customer can't sign up" (403 Forbidden)

**Diagnosis (2 min):**

1. Check browser console (F12) for error
2. Check /api/alerts for system errors
3. Likely cause: RLS policy not working

**Fix (5-10 min):**

1. Go to Supabase → SQL Editor
2. Test RLS policy:
   ```sql
   SELECT * FROM workspaces
   WHERE created_by = auth.uid()
   LIMIT 1;
   ```
3. If error: Check policy syntax
4. Workaround: Create account manually in Supabase; send customer password reset link

See: LAUNCH-DAY-TROUBLESHOOTING.md → "Permission Issues"

### "High error rate" (>1%)

**Diagnosis (2 min):**

1. Check /api/alerts — see error count
2. Check Supabase logs — look for pattern
3. Most likely: Recent code change or database issue

**Fix (5-15 min):**

1. If recent deployment: Rollback in Vercel
2. If database: Contact Supabase support
3. Verify: Error rate drops below 1%

See: LAUNCH-DAY-TROUBLESHOOTING.md → "High Error Rate"

### "System slow" (response >2s)

**Diagnosis (2 min):**

1. Test: `time curl https://your-vercel-app.vercel.app/api/health`
2. If >2s: Database query issue
3. Check Supabase performance dashboard

**Fix (10-30 min):**

1. Identify slow query in Supabase
2. Add missing index or optimize query
3. Test: Response time drops

See: LAUNCH-DAY-TROUBLESHOOTING.md → "Performance Issues"

### "Customer can't upload file" or other feature issue

**Diagnosis (5 min):**

1. Try the action yourself
2. Check browser console for errors
3. Check /api/alerts for system alerts

**Action (5-30 min):**

1. If reproducible: File as bug, prioritize for Week 2
2. If one-off: Investigate customer's environment
3. Workaround: Offer alternative method
4. Keep customer informed

**Communication:** "We're investigating. This is our top priority. Expect update in [timeframe]."

---

## 📊 Weekly Review Checklist (Day 5 or 6)

**Duration:** 30 minutes  
**Frequency:** Every Friday during weeks 1-4

**System Health (5 min):**

- [ ] Uptime: _____% (target >99.9%)
- [ ] Error rate: ____% (target <1%)
- [ ] P95 latency: ____Ms (target <1000ms)
- [ ] Critical incidents: ____ (target 0)

**Customer Success (10 min):**

- [ ] Customer #1: Status ________
  - [ ] Journey complete
  - [ ] Using actively
  - [ ] Satisfaction level: [High/Medium/Low]
- [ ] Customer #2 (if invited): Status ________
- [ ] Feature requests captured: ____ (count)
- [ ] Support issues resolved: ____ (count)

**Team/Operations (5 min):**

- [ ] Spending on budget: ✅ or ❌
  - Vercel: $___/15 (budget)
  - Supabase: $___/30 (budget)
  - GitHub: $___/50 (budget)
- [ ] Documentation needs update: ✅ or ❌
  - What: ________
- [ ] Monitoring working: ✅ or ❌
  - Issues: ________

**Learnings (5 min):**

- [ ] Documented 3 learnings from the week
- [ ] Identified improvements for next customer
- [ ] Updated runbooks if incidents occurred

**Next Week Plan (5 min):**

- [ ] Top 3 priorities defined
- [ ] Customer #2 ready to onboard: ✅ or ❌
- [ ] Any scaling needs: YES or NO

---

## 📞 Support Response SLAs (Week 1)

**Critical Issues (System Down, Data Loss):**

- **Response Time:** 15 minutes
- **Resolution Target:** 1 hour
- **Escalation:** If stuck >30 min, contact Supabase/Vercel support
- **Communication:** Update customer every 15 min

**High Priority (Feature Broken, Can't Complete Task):**

- **Response Time:** 1 hour
- **Resolution Target:** 4 hours or next business day
- **Communication:** Acknowledge same day, update with progress

**Medium Priority (UI Issue, Confusing, Performance Slow):**

- **Response Time:** 2 hours
- **Resolution Target:** Next business day
- **Communication:** Email acknowledgment same day

**Low Priority (Feedback, Feature Request, Small Bug):**

- **Response Time:** 1 business day
- **Resolution Target:** Next week or Phase 2 roadmap
- **Communication:** Email with explanation and timeline

**Customer Communication Template:**

```
Subject: Re: [Issue Title]

Hi [Customer Name],

Thanks for reporting this. We're treating it as [PRIORITY LEVEL] priority.

Here's what we're doing:
- Investigating: [What we're checking]
- Timeline: We expect [to understand/fix] this by [TIME]
- Next update: [TIME] (or sooner if resolved)

In the meantime, [WORKAROUND] (if applicable)

Questions? Reply directly—we read every message.

[Your Name]
```

---

## 🎯 Customer Success Strategy

### "Reach Out" Cadence

**Day 1 (Evening):** Congratulations message

```
Awesome! You're live on [Platform Name].

How was the onboarding? Anything confusing?

I'd love to hear what works—and what doesn't.

[Your Name]
```

**Day 3:** Feature education

```
Quick tip: You can add multiple AI systems to track
different tools. This helps when you have different
risk profiles across your organization.

Want to add another one? Reply and I'll walk you through it.

[Your Name]
```

**Day 5:** Expansion

```
You've got [N] systems tracked. Ready to add more or
invite your team?

I can set up team access in 10 minutes.

[Your Name]
```

**Day 7:** Retrospective

```
Week 1 done! You've generated [N] reports and tracked [X] systems.

Feedback time:
- What's working great?
- What's confusing?
- What would help you most?

[Your Name]
```

### Success Signals (Watch For)

✅ **Very Positive:**

- Customer adds more AI systems (engagement)
- Customer invites teammates (expansion)
- Customer provides positive feedback
- Customer uses reports for actual decision-making

⚠️ **Neutral (Monitor):**

- Customer creates account but doesn't finish first assessment
- Customer logs in but doesn't take actions
- No feedback (neither positive nor negative)

🚨 **Negative (Intervene):**

- Customer gets stuck during onboarding
- Customer reports errors or bugs
- Customer doesn't respond to check-ins
- Customer mentions considering alternatives

---

## 📝 Documentation to Keep Updated

**During Week 1, update these if anything changes:**

1. **FOUNDER_BRIEF.md** — Add "Week 1 Results" section
2. **LAUNCH-DAY-TROUBLESHOOTING.md** — Add new issues encountered
3. **docs/customer/FIRST-CUSTOMER-PLAYBOOK.md** — Update with real timing
4. **Personal notes** — Document surprises and learnings

---

## ✅ Week 1 Completion Checklist

**System Ready:**

- [ ] Uptime >99.9% (at least 99%)
- [ ] Error rate <1% (maintained)
- [ ] No critical incidents
- [ ] Response times <1s (P95)

**Customer Success:**

- [ ] First customer journey complete (account → report)
- [ ] Customer satisfaction positive or neutral
- [ ] No unresolved critical issues
- [ ] Customer #2 invited successfully (or ready to invite)

**Knowledge Captured:**

- [ ] Week 1 retrospective completed
- [ ] 3+ learnings documented
- [ ] Improvements identified for customer #2
- [ ] Runbooks updated with real procedures

**Ready for Week 2:**

- [ ] [ ] YES — Continue with customer #2+ and normal operations
- [ ] [ ] ALMOST — One more day of monitoring, then proceed
- [ ] [ ] NO — Major issue needs resolution before expanding

---

## 🎓 Resources (Cross-References)

- **Daily Incident Help:** LAUNCH-DAY-TROUBLESHOOTING.md
- **Customer Onboarding:** docs/customer/FIRST-CUSTOMER-PLAYBOOK.md
- **Launch Day Reference:** GOVERNOR-LAUNCH-COMMAND-CENTER.md
- **Status Summary:** FOUNDER_BRIEF.md

---

## 🚀 You've Got This

Week 1 is about proving the platform works for a real customer. It's not about perfection—it's about learning fast and supporting that customer to success.

If something breaks: Fix it. Document it. Move on.  
If customer gets stuck: Help them. Note the friction. Improve for next customer.  
If system holds up: Celebrate it. You built something that works.

By Day 7, you'll have the confidence and data to scale to customers #2-5.

Good luck. Governor is monitoring. 🎯
