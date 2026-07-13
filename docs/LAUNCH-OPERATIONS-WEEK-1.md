# Cathedral Launch Operations — First Week Playbook
## 2026-09-01 to 2026-09-07

**Purpose:** Ensure smooth customer onboarding and identify critical issues early  
**Audience:** Operations team + Founder  
**Timeline:** 24/7 monitoring, daily stand-ups

---

## Pre-Launch Checklist (Day 0 — 2026-09-01 08:00 UTC)

### 4 Hours Before Launch
- [ ] All systems verified in production
- [ ] Monitoring dashboards operational
- [ ] Support team briefed and on-call
- [ ] Deployment rollback verified
- [ ] Customer support email/Slack ready
- [ ] First pilot customers invited
- [ ] DNS/domains tested and working
- [ ] Email confirmation system tested
- [ ] Feature flags initialized
- [ ] Canary deployment enabled

### 1 Hour Before Launch
- [ ] Final health check of all APIs
- [ ] Database connectivity verified
- [ ] Email service tested (send test confirmation)
- [ ] Team standby in war room
- [ ] Monitoring alerts configured and tested
- [ ] Incident response plan reviewed

### At Launch (2026-09-01 12:00 UTC)
- [ ] Announce availability to pilot customers
- [ ] Monitor signup rate in real-time
- [ ] Verify first emails are sending
- [ ] Check error logs every 5 minutes
- [ ] Respond to customer support requests immediately

---

## Day 1 (2026-09-01) — Launch Day Operations

### Morning (08:00-12:00 UTC)

**15-Min Checks:**
```
✓ API health endpoint responding (should be 200)
✓ Database connection pool active
✓ Error rate < 0.1%
✓ Response time p95 < 200ms
✓ Signup success rate > 95%
```

**Hourly Reports:**
| Metric | Target | Action If Below |
|--------|--------|-----------------|
| Uptime | 100% | Page on-call engineer |
| Signup success | 95%+ | Investigate signup flow |
| Email delivery | 99%+ | Check Supabase email provider |
| API response | <200ms p95 | Monitor database load |
| Error rate | <0.1% | Debug error logs |

### Afternoon (12:00-18:00 UTC)

**Gradual Traffic Ramp:**
- Hour 1-2: 5-10 customer signups
- Hour 3-4: 20-50 customer signups
- Hour 5-6: 50+ customer signups
- Monitor system at each ramp level

**Key Observations:**
- Are signup emails arriving within 30 seconds?
- Are users confirming email successfully?
- Are new users creating workspaces?
- Any 403/500 errors in logs?
- Database query performance stable?

**Incident Response:**
If any metric breaches target:
1. **Immediate action:** Check monitoring dashboard
2. **Diagnose:** Review error logs + metrics
3. **Fix:** Apply known fixes or hotpatch
4. **Verify:** Confirm metric returns to target
5. **Root cause:** Document what happened

---

## Day 2-7 (2026-09-02 to 2026-09-07) — Stabilization Week

### Daily Standups (09:00 UTC)

**Questions to Answer:**
- How many total signups to date?
- Any customer support tickets yet?
- Are feature flags working as expected?
- Database performance stable?
- Canary deployment metrics healthy?
- Any security issues detected?
- Customer satisfaction feedback?

### Daily Monitoring Checklist

**Every 4 Hours:**
```bash
# API health
curl https://newspulse-ai.vercel.app/api/health | jq '.checks'

# Error rate check
# (From Sentry/monitoring dashboard)
# Target: < 0.1% error rate

# Database performance
# (From Supabase dashboard)
# Target: p95 latency < 200ms

# Feature flags status
# Verify all flags are in correct state

# Canary deployment status
# Verify traffic distribution and health metrics
```

### Customer Feedback Loop

**Each morning:**
- [ ] Check support email for new tickets
- [ ] Check Slack for customer messages
- [ ] Review error logs for patterns
- [ ] Compile feedback summary
- [ ] Prioritize urgent issues

**Issue Severity Levels:**

| Severity | Definition | Response Time |
|----------|------------|----------------|
| P1 | System down / data loss | 15 minutes |
| P2 | Feature broken / 50%+ users affected | 1 hour |
| P3 | Partial feature issue / 10% users | 4 hours |
| P4 | UX improvement / minor bug | next business day |

---

## Monitoring Dashboards

### Essential Dashboards (Check Daily)

**1. System Health Dashboard**
```
Uptime:          ██████████ 99.9%
Error Rate:      ██        0.05%
Response Time:   ████      145ms p95
Database:        ██████████ 95% healthy
Signup Success:  ██████████ 98%
```

**2. Customer Dashboard**
```
Total Signups:   127 users
Active Sessions: 34 users
Workspaces:      23 workspaces
Features Used:   [flag_rollout, schema_validator, canary]
Support Tickets: 2 open, 5 closed this week
```

**3. Infrastructure Dashboard**
```
Vercel Deployments:   ██████████ Ready
Supabase:             ██████████ Healthy
Email Service:        ██████████ 99% delivery
Database Backups:     ██████████ Daily active
```

### Alert Thresholds

Configure alerts for these conditions:

```
IF uptime < 99% THEN page on-call
IF error_rate > 0.5% THEN page on-call
IF response_time_p95 > 500ms THEN alert team
IF signup_success < 90% THEN investigate
IF email_delivery < 95% THEN check SMTP
IF database_cpu > 80% THEN monitor closely
IF database_storage > 80% THEN plan scaling
```

---

## Common Issues & Quick Fixes

### Issue: Signups Failing (403 Forbidden)

**Diagnosis:**
```bash
# Check RLS policy
SELECT * FROM auth.users LIMIT 1;

# Check profile creation trigger
SELECT * FROM pg_proc WHERE proname = 'on_auth_user_created';

# Test with direct API
curl -X POST $SUPABASE_URL/auth/v1/signup \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

**Common Causes:**
1. RLS policy too restrictive
2. Profile creation trigger failed
3. Email already exists
4. Password too weak

**Quick Fix:**
```sql
-- If RLS is blocking:
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- If trigger failed:
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

---

### Issue: Emails Not Sending

**Diagnosis:**
```bash
# Check Supabase email logs
# Supabase Dashboard → Authentication → Settings

# Test email endpoint directly
curl -X POST \
  -H "Authorization: Bearer $SUPABASE_SERVICE" \
  "$SUPABASE_URL/functions/v1/send_email" \
  -d '{"email":"test@example.com"}'
```

**Common Causes:**
1. Email rate limit hit (Supabase free: 1/sec)
2. SMTP configuration wrong
3. Email address invalid
4. Authentication token expired

**Quick Fix:**
1. Upgrade Supabase plan if rate-limited
2. Configure custom SMTP (SendGrid, AWS SES, etc.)
3. Verify email address format
4. Rotate authentication tokens

---

### Issue: Slow Database Queries

**Diagnosis:**
```bash
# Check slow query log
# Supabase Dashboard → Statistics → Slow Queries

# Identify heavy queries
SELECT query, calls, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

**Common Causes:**
1. Missing indexes
2. Inefficient queries
3. Table scans on large tables
4. No query optimization

**Quick Fix:**
1. Add indexes: `CREATE INDEX idx_name ON table(column);`
2. Use EXPLAIN ANALYZE to optimize queries
3. Enable query result caching
4. Scale up Supabase plan if needed

---

### Issue: Feature Flag Not Working

**Diagnosis:**
```bash
# Check flag status
curl -H "Authorization: Bearer $SESSION_TOKEN" \
  https://newspulse-ai.vercel.app/api/feature-flags/status/flag-id

# Verify rollout logic
# (Check lib/feature-flag-controller.ts)
```

**Common Causes:**
1. Flag not enabled
2. User not in target segment
3. Rollout percentage misaligned
4. Cache not refreshed

**Quick Fix:**
```bash
# Reset flag state
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://newspulse-ai.vercel.app/api/feature-flags/reset/flag-id
```

---

### Issue: Canary Deployment Stuck

**Diagnosis:**
```bash
# Check canary status
curl -H "Authorization: Bearer $SESSION_TOKEN" \
  https://newspulse-ai.vercel.app/api/canary/status/canary-id

# Check health metrics
curl -H "Authorization: Bearer $SESSION_TOKEN" \
  https://newspulse-ai.vercel.app/api/canary/health/canary-id
```

**Common Causes:**
1. Health check threshold too tight
2. Phase duration expired
3. Consecutive failures triggered
4. Manual pause active

**Quick Fix:**
```bash
# Resume canary
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://newspulse-ai.vercel.app/api/canary/resume/canary-id

# Advance to next phase
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://newspulse-ai.vercel.app/api/canary/advance-phase/canary-id
```

---

## Daily Report Template

**Cathedral Launch Operations Report**

**Date:** 2026-09-XX  
**Period:** 00:00-24:00 UTC  
**Prepared by:** Governor Omega

### Metrics Summary
```
Uptime:              99.9% ✅
Error Rate:          0.05% ✅
API Response Time:   145ms p95 ✅
Signup Success:      98% ✅
Email Delivery:      99% ✅
```

### Customer Metrics
```
New Signups:         [N] users
Active Users:        [N] users
Workspaces Created:  [N]
Support Tickets:     [N] (X resolved, Y open)
Satisfaction:        [feedback summary]
```

### Issues Encountered
```
Issue 1: [Description]
- Severity: [P1/P2/P3/P4]
- Duration: [minutes/hours]
- Root Cause: [analysis]
- Resolution: [what was fixed]
- Prevention: [future actions]
```

### Incidents
```
None | [Incident summary with timeline]
```

### Risk Assessment
```
Current Risk Level: [LOW/MEDIUM/HIGH]
Trending: [improving/stable/degrading]
Action Items: [list any follow-ups]
```

### Next 24-Hour Plan
```
- [Action 1]
- [Action 2]
- [Action 3]
```

---

## Escalation Procedures

### When to Page On-Call Engineer (P1)

- ✅ System down (uptime < 99%)
- ✅ Data loss or corruption
- ✅ Security breach detected
- ✅ All customers unable to sign up
- ✅ Database completely inaccessible

**On-Call Contact:** [TBD by Founder]

### When to Alert Team Lead (P2)

- 🟡 Single feature broken
- 🟡 50%+ users affected
- 🟡 Error rate > 1%
- 🟡 Response time p95 > 500ms

### When to Create Support Ticket (P3/P4)

- 📋 Minor UX issues
- 📋 Single user affected
- 📋 Intermittent problems
- 📋 Enhancement requests

---

## Go/No-Go Criteria (End of Day 1)

**LAUNCH SUCCESSFUL if:**

- ✅ System uptime > 99%
- ✅ Error rate < 0.1%
- ✅ 50+ successful customer signups
- ✅ Email delivery working
- ✅ No critical bugs found
- ✅ All APIs responding normally
- ✅ Database performing well
- ✅ Customer feedback positive

**NO-GO (Requires Pause):**

- ❌ Uptime < 95%
- ❌ Error rate > 1%
- ❌ Signup flow broken
- ❌ Data loss detected
- ❌ Security issue found

---

## End of Week Summary (2026-09-07)

**Review Metrics:**
- Total customers onboarded
- Customer satisfaction scores
- Issues encountered + resolution time
- Performance trends
- Recommendations for next phase

**Success Definition:**
- ✅ 100+ customers actively using Cathedral
- ✅ Uptime maintained > 99%
- ✅ Customer satisfaction > 4.5/5
- ✅ No data loss or security incidents
- ✅ All critical features working
- ✅ Team confident in stability

**Next Phase:**
- Expand to next pilot cohort
- Implement additional features
- Plan production scaling
- Gather roadmap feedback

---

## Document Status

**Status:** READY FOR LAUNCH  
**Effective:** 2026-09-01  
**Owner:** Governor Omega + Operations Team  
**Review:** Daily during launch week

