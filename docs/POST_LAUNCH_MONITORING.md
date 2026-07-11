# Post-Launch Monitoring Checklist

**Purpose:** Daily and weekly tasks to ensure successful launch and healthy production  
**Audience:** Founder, operations team  
**Timeline:** First 30 days post-launch  

---

## Launch Day (T+0)

### Morning (Before Enabling Signup)

**1 hour before go-live:**

- [ ] Verify Supabase schema deployed and working
- [ ] Confirm email auth provider enabled in Supabase
- [ ] Test signup flow end-to-end with test account
- [ ] Check `/api/health` endpoint returns healthy
- [ ] Monitor `/api/production-health` for 5 minutes
- [ ] Verify Vercel deployment is live
- [ ] Enable customer signup (toggle in app config)

**Monitoring during launch:**

- [ ] Check `/api/error-rate` — target: < 1%
- [ ] Monitor Vercel logs for any errors
- [ ] Watch for spike in requests (expected)
- [ ] Alert on any 5xx server errors

### Afternoon (First 4 Hours)

Every 15 minutes:

- [ ] `/api/health` — should return healthy
- [ ] `/api/production-health` — all checks passing
- [ ] `/api/error-rate` — should remain < 1%
- [ ] Vercel dashboard — no deployment issues

Every hour:

- [ ] `/api/alerts` — check for any critical alerts
- [ ] `/api/blocking-conditions` — check for external blockers
- [ ] Review first customer signups (if any)
- [ ] Spot check database for successful entries

### Evening (After Business Hours)

- [ ] Final health check sweep
- [ ] Document any issues encountered
- [ ] Review logs for patterns
- [ ] Verify monitoring crons are running
- [ ] Prepare for potential overnight issues

### First Night (Monitor During Sleep)

**Automated monitoring:**
- Vercel crons continue checking health every 5-15 minutes
- Set up phone alerts for critical issues
- Have rollback procedure ready in case of emergency

**Recommended:** Sleep near phone in case of critical alerts

---

## Day 1 (T+1)

### Morning Checklist (Before Checking Emails)

- [ ] Check overnight logs for errors
- [ ] Verify no failed deployments
- [ ] Confirm all overnight signups succeeded
- [ ] Check `/api/production-health` — all healthy?
- [ ] Review `/api/error-rate` — still < 1%?

### Throughout Day

**Every 30 minutes:**
- [ ] Check monitoring dashboard
- [ ] Spot check database
- [ ] Review error logs

**Hourly:**
- [ ] Test signup flow manually
- [ ] Verify workspace creation works
- [ ] Test AI system registration
- [ ] Check dashboard access

**Key metrics to track:**
- New signups: [Expected: X/day]
- Workspace creation rate: [Expected: X%]
- Error rate: [Expected: < 1%]
- Response times: [Expected: < 1s]
- Uptime: [Expected: 99%+]

### Evening Debrief

- [ ] Count total signups for day
- [ ] Identify any patterns in errors
- [ ] Note any customer support requests
- [ ] Document what went well
- [ ] Identify what could improve
- [ ] Prepare for Day 2

---

## Week 1 (Days 1-7)

### Daily Checklist

**Morning (10 AM):**
- [ ] Review overnight error logs
- [ ] Check signup count and growth rate
- [ ] Verify all monitoring endpoints healthy
- [ ] Review `/api/error-rate` for trends
- [ ] Check Vercel analytics

**Afternoon (2 PM):**
- [ ] Manual test of all critical flows
- [ ] Spot check database data quality
- [ ] Review any customer support emails
- [ ] Check Supabase performance metrics

**Evening (5 PM):**
- [ ] Summary of day's metrics
- [ ] Note any issues for next day
- [ ] Prepare rollback procedure if needed
- [ ] Document any decisions made

### Key Metrics to Monitor

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Uptime | 99%+ | < 95% |
| Error Rate | < 1% | > 5% |
| Response Time | < 1s | > 3s |
| Signup Success Rate | > 95% | < 85% |
| Email Delivery | 99%+ | < 90% |
| Database Query Time | < 200ms | > 500ms |
| Vercel Function Duration | < 2s | > 5s |

### Weekly Metrics (Friday Review)

- [ ] Total new signups: ___
- [ ] Total workspaces created: ___
- [ ] Total AI systems registered: ___
- [ ] Average error rate: ___
- [ ] Peak traffic time: ___
- [ ] Most used features: ___
- [ ] Top support questions: ___
- [ ] Any critical incidents: ___

### Week 1 Verification Checklist

By end of week 1, verify:

- [ ] 100+ signups or first 10 paying customers
- [ ] 80%+ of signups successfully create workspace
- [ ] Email verification working reliably
- [ ] No data loss or corruption
- [ ] RLS policies enforcing data isolation
- [ ] Error rate stable and < 1%
- [ ] All monitoring crons working
- [ ] No security alerts from OWASP scan

---

## Weeks 2-4 (Post-Launch Stabilization)

### Twice-Daily Checklist

**Morning (10 AM):**
- [ ] `/api/production-health` — all healthy?
- [ ] `/api/error-rate` — trend check
- [ ] Signup count trajectory
- [ ] Database performance

**Evening (5 PM):**
- [ ] Repeat morning checklist
- [ ] Note any concerning trends
- [ ] Prepare for next day

### Weekly Deep Dive (Every Friday)

**Performance:**
- [ ] Vercel analytics review
- [ ] Supabase performance metrics
- [ ] Bundle size check
- [ ] Slow query identification

**Customer Engagement:**
- [ ] Count active users
- [ ] Track feature usage
- [ ] Collect feedback themes
- [ ] Identify support patterns

**Security:**
- [ ] Review auth logs for anomalies
- [ ] Check for failed login attempts
- [ ] Verify no unauthorized data access
- [ ] Review rate limit hits

**Infrastructure:**
- [ ] Database connection pool status
- [ ] Vercel function performance
- [ ] CDN cache hit rates
- [ ] Storage usage growth

### Monthly Review (End of Week 4)

**Business Metrics:**
- [ ] Total signups: ___
- [ ] Active workspaces: ___
- [ ] Churn rate: ___
- [ ] Support tickets: ___
- [ ] Conversion to paying: ___

**Technical Health:**
- [ ] Uptime: ___
- [ ] Average error rate: ___
- [ ] P95 response time: ___
- [ ] Database size: ___

**Customer Satisfaction:**
- [ ] NPS score: ___
- [ ] Common complaints: ___
- [ ] Requested features: ___
- [ ] Positive feedback: ___

**Actions for Next Month:**
- [ ] Priority #1: ___
- [ ] Priority #2: ___
- [ ] Priority #3: ___

---

## Critical Issues & Escalation

### Issue: High Error Rate (> 5%)

**Immediate action:**
1. Check `/api/error-rate` for which endpoint is failing
2. Review Vercel logs for error details
3. Check Supabase monitor for database issues
4. If recent deployment: consider rollback

**Investigation:**
- Is it a specific endpoint or all endpoints?
- Did it correlate with a deployment?
- Are database queries timing out?
- Is external API (GitHub, Firecrawl) failing?

**Resolution:**
- Fix: Apply patch and re-deploy
- Rollback: Revert last deployment if uncertain
- Scale: Increase Supabase/Vercel resources if needed

### Issue: Signup Failures

**Immediate action:**
1. Test signup flow manually
2. Check email auth provider in Supabase
3. Review error logs for specific failure
4. Test email verification link

**Common causes:**
- Email provider misconfigured
- Email delivery failing (check spam)
- Database constraint violated
- Rate limiting triggered

### Issue: Slow Performance (> 3s)

**Immediate action:**
1. Check database query time (Supabase monitor)
2. Review Vercel function duration
3. Check for high traffic spike
4. Review recent code changes

**Investigation:**
- Is it consistent or intermittent?
- Which endpoint is slow?
- What's the resource usage (CPU, memory)?
- Any N+1 queries?

**Resolution:**
- Add database index
- Optimize query
- Cache responses
- Scale infrastructure

### Issue: Data Isolation Breach

**Immediate action:**
1. Stop accepting new requests (optional)
2. Verify RLS policies are active
3. Review audit logs
4. Identify affected data/users

**Notification:**
- Document exactly what happened
- Notify affected customers
- Explain remediation steps
- Offer compensation if warranted

---

## Rollback Procedure (If Needed)

### When to Rollback

- Critical bug blocking core functionality
- Security vulnerability discovered
- Data loss or corruption
- Widespread customer reports of breakage

### How to Rollback

**Option 1: Revert last commit**
```bash
git revert HEAD --no-edit
git push origin main
# Vercel redeploys in 2-5 minutes
```

**Option 2: Reset to known good**
```bash
git reset --hard <good-commit-sha>
git push origin main --force-with-lease
# Vercel redeploys in 2-5 minutes
```

**Option 3: Via Vercel UI**
1. Vercel dashboard → Deployments
2. Find previous working deployment
3. Click "Redeploy"
4. Confirm

### After Rollback

1. Monitor `/api/production-health` for 10 minutes
2. Verify error rate returns to normal
3. Check customer-facing features work
4. Investigate root cause
5. Create fix in new branch
6. Re-test thoroughly
7. Re-deploy with confidence

---

## Success Indicators (By Milestone)

### Day 1 Success
- ✅ No critical errors
- ✅ Signup flow works end-to-end
- ✅ Email verification working
- ✅ Workspace creation succeeds
- ✅ Error rate < 1%
- ✅ Uptime > 99%

### Week 1 Success
- ✅ 100+ signups (or key customer acquired)
- ✅ 80%+ workspace creation rate
- ✅ Consistent error rate < 1%
- ✅ No data loss incidents
- ✅ Customer feedback positive
- ✅ No security incidents

### Month 1 Success
- ✅ Sustained growth (X signups/day)
- ✅ Stable uptime (99%+)
- ✅ Predictable error patterns
- ✅ Customer satisfaction high (NPS > 40)
- ✅ Recurring customers emerging
- ✅ System handles peak load

---

## Emergency Contacts

**Founder:** [Name, Phone, Email]  
**Ops Lead:** [Name, Phone, Email]  
**Dev On-Call:** [Name, Phone, Email]  

**Escalation:**
1. First: Check monitoring endpoints
2. Second: Review logs and rollback if critical
3. Third: Contact dev on-call
4. Fourth: Contact founder if revenue-threatening

---

## Monitoring Dashboard Quick Links

- **Vercel Dashboard:** https://vercel.com/mininglife7-dev/newspulse-ai
- **Supabase Dashboard:** https://app.supabase.com
- **Production Health:** https://newspulse-ai.vercel.app/api/production-health
- **Error Rate:** https://newspulse-ai.vercel.app/api/error-rate
- **Alerts:** https://newspulse-ai.vercel.app/api/alerts
- **Deployment Verification:** https://newspulse-ai.vercel.app/api/verify-deployment

---

## Notes & Observations

**Day 1 Observations:**
- [Space for handwritten notes during launch]

**Week 1 Findings:**
- [Space for key patterns and insights]

**Month 1 Lessons:**
- [Space for post-launch retrospective]

---

**Prepared by:** Governor  
**Date:** 2026-07-11  
**Review Date:** 2026-08-11 (post-launch retrospective)

