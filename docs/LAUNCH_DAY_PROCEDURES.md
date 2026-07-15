# Launch Day Procedures (Hour-by-Hour)

**Purpose:** Detailed minute-by-minute checklist for launch day to ensure smooth go-live  
**Audience:** Founder, Governor/Chief of Staff, operations team  
**Version:** 1.0  
**Valid From:** After Supabase deployment  
**Duration:** Day 1 (24 hours)

---

## Pre-Launch Checklist (T-1 Hour)

### System Verification (45 min before launch)

**Infrastructure Status:**
- [ ] Verify Vercel dashboard shows green (all checks passing)
- [ ] Check Supabase dashboard (all services operational)
- [ ] Run `/api/health` endpoint manually (should return 200 OK)
- [ ] Run `/api/production-health` endpoint (should show all green)
- [ ] Check error logs in Vercel (should be empty or minimal)

**Database Status:**
- [ ] Verify all 9 tables created in Supabase
- [ ] Verify all RLS policies enabled
- [ ] Verify email auth provider enabled
- [ ] Test signup flow in staging (create test account)
- [ ] Test workspace creation (create test workspace)

**Monitoring Setup:**
- [ ] Verify crons are enabled in Vercel
- [ ] Check `/api/health` cron runs (check recent invocations)
- [ ] Check `/api/production-health` cron runs
- [ ] Check `/api/error-rate` cron runs
- [ ] Verify alerts are configured

**Communication:**
- [ ] Draft customer launch announcement email (ready to send)
- [ ] Prepare Slack message if using Slack
- [ ] Set up email monitoring (watch for bounces)

### Team Standup (15 min before launch)

**Attendees:** Founder, Governor

**Agenda:**
1. Confirm all checks passed (5 min)
2. Review escalation procedures (3 min)
3. Confirm monitoring will be active (2 min)
4. Go/No-Go decision (5 min)

**Go/No-Go Decision:**
- [ ] All pre-launch checks PASS → **GO**
- [ ] Any check FAILS → **HOLD** (investigate and fix)

---

## T+0: Launch Hour (First 60 Minutes)

### T+0:00 - Enable Customer Signup

**Action:** Flip the switch to allow customer signup

**Steps:**
```bash
# Option 1: Update environment variable (if using feature flag)
# In Vercel dashboard: Update NEXT_PUBLIC_SIGNUP_ENABLED=true
# This requires redeploy

# Option 2: Database feature flag
UPDATE company_settings SET signup_enabled = true WHERE id = 1;

# Option 3: No flag (signup always enabled)
# If using this approach, just confirm signup is working
```

**Verification (T+0:05):**
- [ ] Try signup flow: Create test account with new email
- [ ] Receive verification email within 1 minute
- [ ] Click verification link
- [ ] Confirm account is verified
- [ ] Login succeeds
- [ ] Dashboard appears (no workspace yet)

**If signup fails:**
- Stop: Disable signup
- Investigate error logs
- Fix and re-test
- Only re-enable after fix verified

### T+0:15 - Send Launch Announcement

**Action:** Notify customer base that service is live

**Email Template:**
```
Subject: NewsPulse AI is live! 🚀

Hi [Customer],

We're excited to announce that NewsPulse AI is now available for everyone.

Sign up here: https://[your-domain].vercel.app/

What you can do:
- Register your account in <2 minutes
- Create a workspace for your organization
- Add your AI systems and start compliance tracking
- Dashboard shows your governance status at a glance

Resources:
- Getting started guide: [link to docs/CUSTOMER_ONBOARDING.md]
- API docs: [link to docs/API_REFERENCE.md]
- Support: mininglife7@gmail.com

This is the start of better AI governance. Welcome aboard!

Best,
[Your Name]
```

**Where to send:**
- [ ] Email: Batch send to all beta/waitlist emails
- [ ] Slack (if applicable): Share link in #announcements
- [ ] LinkedIn: Post launch announcement
- [ ] Twitter: Tweet launch news

### T+0:30 - Monitor First Signups

**Action:** Watch system during first wave of signups

**Monitoring (check every 2 minutes):**
- [ ] Check Vercel dashboard for any errors
- [ ] Spot-check `/api/production-health` (should all green)
- [ ] Look for 5xx errors in logs (should be 0)
- [ ] Monitor error rate: `/api/error-rate`
- [ ] Database connections healthy?

**What to look for:**
- Verify signups are succeeding (not failing with errors)
- Watch email delivery (are verification emails arriving?)
- Check dashboard loads (not timing out?)
- Monitor response times (should be <1 second)

**If issues appear:**
- [ ] Check specific error in logs
- [ ] If widespread: Disable signup temporarily
- [ ] Investigate root cause
- [ ] Fix and test in staging
- [ ] Re-enable signup

**Expected metrics at T+0:30:**
- Signups: 0-5 (depends on announcement reach)
- Error rate: <1%
- Response time: <500ms p95
- Uptime: 100%

### T+0:45 - Verify RLS Security

**Action:** Quick spot-check that data isolation is working

**Procedure:**
1. Create 2 test accounts (user-a@test.com, user-b@test.com)
2. User A: Create workspace "Company A"
3. User A: Add AI system "System A1"
4. User B: Create workspace "Company B"
5. User B: Add AI system "System B1"
6. Verify User A cannot see User B's workspace
   - Query: `SELECT * FROM workspaces WHERE owner_id = <user-b-id>`
   - Result: Should return 0 rows (RLS blocks it)
7. Verify User A cannot see User B's systems
   - Query: `SELECT * FROM ai_systems WHERE company_id = <company-b-id>`
   - Result: Should return 0 rows (RLS blocks it)

**If isolation is broken:**
- CRITICAL: Disable signup
- Escalate to Founder immediately
- Do NOT continue without fixing this
- Check RLS policies in Supabase
- See `docs/RLS_POLICY_AUDIT.md` for debugging

---

## T+1 to T+4: First Four Hours

### T+1:00 - First Stability Check

**Actions (one time at T+1:00):**
- [ ] Run full system health check: `/api/production-health`
- [ ] Verify all checks passing
- [ ] Check database connection count (should be <10)
- [ ] Verify no alert conditions triggered
- [ ] Review error logs (should be minimal)

**Metrics to record:**
- Total signups so far: _____
- Error rate: _____%
- Avg response time: ____ ms
- Uptime: ____%

### T+1:30 - Verify Email Delivery

**Action:** Check that verification emails are working

**Procedure:**
- [ ] Create test account with new email
- [ ] Receive verification email within 30 seconds
- [ ] Email is in inbox (not spam)
- [ ] Link in email works
- [ ] Can login after verification

**If emails not delivering:**
- Check Supabase Auth settings
- Verify email provider is configured
- Check email logs in Supabase dashboard
- If critical: Notify customers via email/social media

### T+2:00 - Response Time Check

**Action:** Measure actual response times under real load

**Check (via Vercel dashboard):**
- [ ] Deployment → Analytics → Response time
- [ ] Should show p50: <200ms, p95: <500ms, p99: <1000ms
- [ ] No 5xx errors
- [ ] <1% 4xx errors (expected for invalid input)

**If slow:**
- Review which endpoint is slow
- Check database connection count
- Verify no long-running queries
- May need to optimize or scale

### T+3:00 - Customer Support Readiness

**Actions:**
- [ ] Monitor support email (mininglife7@gmail.com)
- [ ] Respond to any support requests within 1 hour
- [ ] Track common issues/questions
- [ ] Prepare FAQ responses
- [ ] Escalate bugs to development

**Expected support patterns:**
- "How do I sign up?" → Point to docs
- "Verification email not received" → Resend link or whitelist domain
- "How do I create a workspace?" → Guide through onboarding
- "Is this free?" → Answer per your business model

### T+4:00 - End of First 4 Hours Summary

**Record metrics:**
- Total signups: ____
- Total errors: ____ (should be <1% of requests)
- Customer support tickets: ____
- Bugs found: ____
- Security issues: 0 (if not 0, ESCALATE immediately)

**Review:**
- [ ] System stable?
- [ ] Signups working?
- [ ] Data isolation verified?
- [ ] Performance acceptable?

**Go/No-Go for continuing:** ✅ GO / ❌ STOP

---

## T+4 to T+12: Daytime Operations

### Hourly Checks (T+5, T+6, ... T+11)

**Every hour at :00:**
- [ ] Check `/api/production-health` (should be all green)
- [ ] Review error logs for anomalies
- [ ] Verify uptime >99%
- [ ] Check database metrics

**Every 2 hours at :00 and :30:**
- [ ] Check support email for new tickets
- [ ] Respond to urgent issues
- [ ] Track new signup rate
- [ ] Note any patterns

### T+8:00 - Halfway Point

**Assessment:**
- [ ] How many signups so far? ____
- [ ] Any critical issues? (List: _______________)
- [ ] Performance: Good / OK / Degrading
- [ ] Team morale: High / Normal / Stressed

**If critical issues found:**
- Pause new signups if needed
- Focus on fixing most critical issue
- Re-enable signup after fix verified
- Resume normal monitoring

### T+10:00 - Feature Usage Check

**Action:** Verify customers are actually using the product

**Expected patterns:**
- ✅ Signups continue (at least 1-2/hour)
- ✅ Workspace creation succeeds
- ✅ AI systems being registered
- ⚠️ If dashboard load failing: investigate
- ⚠️ If workspace creation rate dropped: check for bugs

**If usage patterns wrong:**
- [ ] Check application logs for errors
- [ ] Verify no hidden bugs in UX flow
- [ ] Consider if customers don't understand product
- [ ] May need to improve onboarding docs

---

## T+12 to T+24: Evening & Night Operations

### T+12:00 - Half-Day Review

**Assessment (Document):**
- Signups to this point: ____
- Error rate: ____%
- Critical issues found: 0 / 1 / 2+ (describe: _______)
- Performance: Excellent / Good / OK / Degrading
- Customer satisfaction: Based on feedback so far

**Actions:**
- [ ] Email summary to stakeholders
- [ ] Celebrate first 12 hours! 🎉
- [ ] Prepare for potential overnight issues

### T+12 to T+24: Night Operations

**Frequency of checks:**
- Hour 12-14: Every 30 minutes
- Hour 14-20: Every hour
- Hour 20-24: Every 2 hours

**What to monitor:**
- [ ] Health endpoints (every check)
- [ ] Error logs (every check)
- [ ] Support email (check every hour)
- [ ] Database metrics (every check)

**Expected during night:**
- Fewer new signups (depends on timezone)
- System should be stable
- No new bugs expected (just variations of Day 1 issues)

### T+20:00 - Evening Status Update

**Email to Founder/Team:**
```
Subject: Launch Day Update - Hour 20

Signups: X total (Y new since last update)
Performance: Stable
Issues: None / Minor / Major (describe)
Next steps: Continue monitoring

Highlights:
- [Positive note about customer feedback]
- [Any interesting insight]

Status: On track / Needs attention / Critical
```

### T+24:00 - First 24-Hour Complete

**Actions:**
- [ ] Final health check: `/api/production-health` ✅
- [ ] Verify uptime >99%: __%
- [ ] Verify error rate <1%: __%
- [ ] Total signups: ____
- [ ] Critical issues: 0 / 1 / 2+

**Document:**
- [ ] Create Day 1 incident log
- [ ] List all bugs found (even minor ones)
- [ ] List all resolved issues
- [ ] Lessons learned for Day 2
- [ ] Any process improvements

---

## Post-Launch: Days 2-7

### Daily Standup (Every Morning)

**Time:** 10 AM UTC (every day for first week)

**Attendees:** Founder, Governor

**Agenda (15 minutes):**
1. Overnight summary (5 min)
   - Signups: X
   - Any errors?
   - Support tickets: Y
2. Today's focus (5 min)
   - What's priority?
   - Any concerns?
3. Next 24 hours (5 min)
   - Monitoring plan
   - On-call assignment

### Daily Metrics to Record

**Every morning document:**
- Total signups (cumulative): ____
- New signups (last 24h): ____
- Error rate (last 24h): ____%
- Uptime (last 24h): ___%
- Support tickets: ____
- Bugs found/fixed: ____
- Customer feedback (summary): _______________

### Weekly Retrospective (Day 7)

**Time:** Friday afternoon

**Attendees:** Founder, Governor, anyone else involved

**Agenda (30 minutes):**
1. Launch success metrics
2. Issues encountered and how we handled them
3. What went well
4. What could be improved
5. Recommendations for next phase

**Output:** Document in docs/LAUNCH_RETROSPECTIVE.md

---

## Success Criteria

### Day 1 Success (Hours 0-24)

- ✅ Signup flow works (test completes in <5 seconds)
- ✅ Email verification works
- ✅ Workspace creation works
- ✅ Dashboard loads (<3 seconds)
- ✅ Error rate <1%
- ✅ Uptime >99%
- ✅ No data isolation breaches
- ✅ No 5xx errors
- ✅ RLS policies enforced

**If all ✅: LAUNCH SUCCESSFUL**

### Week 1 Success (Days 1-7)

- ✅ 50+ signups
- ✅ 10+ active workspaces
- ✅ Average response time stable
- ✅ Error rate stays <1%
- ✅ No critical security issues
- ✅ Support response time <4 hours
- ✅ Customer retention >90% (still active day 7)

**If all ✅: LAUNCH STABLE**

---

## Escalation Contact

**On-call for Day 1:**
- Governor: 24/7 available
- Founder: Available for critical issues

**Escalation Path:**
- Minor issue: Governor handles
- Uncertain fix: Governor + Founder discuss
- Critical issue: Founder decides
- Security issue: Immediate escalation

**Emergency Contact:**
- Email: mininglife7@gmail.com
- Phone: [Add as needed]

---

## Rollback Procedure (If Needed)

**If critical issue found and cannot be fixed within 1 hour:**

```bash
# Option 1: Revert last commit
git revert HEAD
git push -f origin main

# Option 2: Disable signup feature
# Update environment variable: NEXT_PUBLIC_SIGNUP_ENABLED=false
# Redeploy

# Option 3: Complete rollback to previous working version
git checkout <commit-hash>
git push -f origin main
```

**After rollback:**
- [ ] Verify system is stable
- [ ] Investigate root cause
- [ ] Fix issue
- [ ] Re-enable after fix verified
- [ ] Test in staging first

---

## Post-Mortem Template (If Issues Found)

**Create file: docs/INCIDENTS/YYYY-MM-DD-incident-name.md**

```markdown
# Incident Report: [Issue Name]

## Timeline
- T+HH:MM - Issue detected
- T+HH:MM - Root cause identified
- T+HH:MM - Fix deployed
- T+HH:MM - System recovered

## Impact
- Duration: X minutes
- Users affected: X
- Data loss: None / [Details]

## Root Cause
[What caused the issue]

## Resolution
[How we fixed it]

## Prevention
[How we prevent recurrence]

## Follow-up
- [ ] Add test to prevent recurrence
- [ ] Update documentation
- [ ] Review similar code for same issue
```

---

## Document Control

**Created by:** Governor  
**Approved by:** [Founder - pending]  
**Valid from:** After Supabase deployment  
**Last updated:** 2026-07-15  

---

**This is the definitive launch day playbook. Follow step-by-step, no deviations without Founder approval.**
