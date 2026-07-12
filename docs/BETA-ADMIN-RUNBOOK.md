# NewsPulse AI — Beta Program Administrator Runbook

**Document Type:** Internal Operations Guide  
**Phase:** Beta Pilot Program  
**Last Updated:** 2026-07-12  
**Audience:** Founder, DevOps team, support staff

---

## Executive Summary

This runbook covers day-to-day operations during the Beta pilot program (July 12 - August 15, 2026). It includes:
- Daily monitoring checklist
- Customer onboarding procedures
- Common troubleshooting scenarios
- Escalation paths
- Phase transition procedures

**Key Contacts:**
- **On-Call Engineer:** [Set during deployment]
- **Support Lead:** [Set during deployment]
- **Founder (Final Authority):** Lalit

---

## Part 1: Daily Operations Checklist

### Morning Check (08:00 UTC Daily)

**Before First Customer Comes Online:**

1. **Check System Health**
   ```bash
   # SSH into monitoring dashboard or check
   curl https://newspulse-ai.vercel.app/api/health
   # Expected: {"healthy": true, "uptime": "...", "database": "connected"}
   ```
   - Look for: Database connected, latency <1s
   - If not: See "Service Down" section below

2. **Review Overnight Alerts**
   - Check `/api/alerts` endpoint for any critical alerts
   - Look for: Error rates >5%, latency >2s, failed deployments
   - Action: Email on-call if critical alert was triggered

3. **Check GitHub Actions Status**
   - Go to: https://github.com/mininglife7-dev/newspulse-ai/actions
   - Look for: All recent runs should be green (passing)
   - If red: Check commit and error message (usually dependency or lint issues)
   - Action: Notify developer or fix automatically if clear

4. **Monitor Deployment Status**
   - Vercel dashboard: https://vercel.com/newspulse-ai
   - Look for: Latest deployment shows "Ready" status
   - Look for: Build time <10s, no failed deployments overnight
   - If failed: Rollback to previous version (see Incident Response)

5. **Check Customer Access**
   - Try signup flow yourself:
     - Go to /auth/signup
     - Enter test email like `beta-test-<timestamp>@newspulse-ai.com`
     - Verify email link arrives (check inbox)
     - Complete workspace creation
   - Look for: All steps complete within 2 minutes
   - If failed: Immediately trigger P1 incident protocol

6. **Review Cost Anomalies**
   - Check Vercel dashboard for yesterday's spend
   - Expected: <$10/day in early Beta (scales with usage)
   - Alert threshold: >$50/day (indicates unexpected consumption)
   - Action: If over threshold, check for runaway jobs or abuse

### Afternoon Check (14:00 UTC Daily)

**Mid-Day Health Verification:**

1. **Count Active Customers**
   - Query Supabase: `SELECT COUNT(*) FROM workspaces WHERE created_at > NOW() - interval '24 hours'`
   - Log: "New workspaces created today: X"
   - Look for: Steady growth (no sudden drops)

2. **Check Error Rates**
   - Query logs: Count 5xx errors in past 24 hours
   - Expected: <1% of all requests
   - If >5%: Investigate which endpoint and trigger incident response

3. **Review Search Performance**
   - Check slowest searches from last 24 hours
   - Expected: 95th percentile <60 seconds
   - If any >90s: Investigate query patterns or external API health

4. **Database Connection Health**
   - Supabase dashboard → Logs
   - Look for: No "connection refused" or "pool exhausted" errors
   - If found: Check if unusually high concurrent traffic, scale if needed

### Evening Wrap-Up (18:00 UTC Daily)

**Before Handoff to Next Shift (or Overnight):**

1. **Generate Daily Summary**
   ```
   Date: YYYY-MM-DD
   New customers: X
   Total searches: Y
   Error rate: Z%
   Uptime: 99.X%
   Issues: [list or "none"]
   ```

2. **Document Any Issues**
   - Create incident record if >P2
   - Assign owner for follow-up
   - Schedule next check

3. **Test Rollback Procedure**
   - Weekly test (not daily): Trigger a rollback
   - Verify: Old version deploys successfully
   - Verify: All systems come online

---

## Part 2: Customer Onboarding

### Before Customer Signs Up

**Preparation (Founder or support staff):**

1. **Prepare Verification Email Domain**
   - Supabase → Email auth → Confirm SMTP is sending from your domain
   - Verify: test@newspulse-ai.com receives verification emails
   - Document any custom domain issues

2. **Prepare Support Account**
   - Create account: support@newspulse-ai.com
   - Role: Owner/Admin access for all workspaces
   - Use for: Testing customer workflows, troubleshooting

3. **Prepare FAQ and Canned Responses**
   - Keep templates for common questions
   - Store in shared doc: "Beta Support Templates"
   - Covers: Signup issues, search problems, export requests

### During First Customer Signup

**Same-Day Onboarding:**

1. **Receive Signup Notification**
   - Alert system sends: "New workspace created: [Customer Name]"
   - Record in spreadsheet: Customer name, email, workspace ID, signup time

2. **Verify Successful Signup**
   - Query Supabase: `SELECT * FROM workspaces WHERE owner_id = '...'`
   - Confirm: Profile created, all tables populated

3. **Send Welcome Email**
   - Template: "Welcome to NewsPulse AI Beta"
   - Include: Link to onboarding guide (BETA-CUSTOMER-ONBOARDING.md)
   - Include: Link to beta-support@newspulse-ai.com
   - Include: Feedback survey (Google Form or Typeform)

4. **Add to Customer List**
   - Spreadsheet: "Beta-Customers.xlsx"
   - Columns: Name, Email, Company, Signup Date, Status, Issues
   - Use for: Weekly check-ins, churn tracking, phase transitions

### After First Week

**Week-1 Retention Check:**

1. **Check Active Usage**
   - Query: `SELECT COUNT(*) FROM news_searches WHERE user_id IN (beta_customer_ids) AND created_at > NOW() - interval '7 days'`
   - Expected: At least 1-2 searches per customer
   - If zero: Send proactive support email: "How is NewsPulse working for you?"

2. **Collect Feedback**
   - Send survey: "5-minute feedback on Beta experience"
   - Focus on: Ease of signup, search quality, performance
   - Expected response: >50% (Beta customers are engaged)

3. **Track Satisfaction**
   - Create scoring: "Happy" (feedback positive), "Neutral", "At-risk" (issues)
   - Identify at-risk customers for immediate support
   - At-risk response time: <4 hours

---

## Part 3: Troubleshooting by Scenario

### Scenario: Customer Can't Sign Up

**Diagnosis:**

1. Ask customer: "What error do you see?"
   - If "Email not sent": Jump to "Email Delivery Issues"
   - If "Can't create workspace": Jump to "Database Issues"
   - If "Can't log in": Jump to "Session Issues"

2. Test yourself with same email domain:
   ```bash
   # Try signing up with your own email + customer's domain
   # If it works for you but not them, it's account-specific
   ```

**Fix - Email Delivery:**

If customer never receives verification email:

```bash
# Check email logs in Supabase
# Supabase → Email auth → Logs
# Look for: Failed SMTP sends, bounced addresses

# If bounced: Customer email is invalid (typo or closed account)
# If no log: Verification email never sent (bug)
```

Action:
- Ask customer to confirm email address is correct
- Manual fix: Create user directly in Supabase (last resort)
- Contact support: Send them direct signup link

**Fix - Workspace Creation:**

If signup succeeds but workspace creation fails:

```bash
# Check database for orphaned users
# Query: SELECT * FROM auth.users WHERE email = 'customer@example.com'
# If exists but no profile: Database trigger failed

# Logs: Check Vercel function logs
# Look for: "workspace insert failed" errors
```

Action:
- Manually create workspace in Supabase
- Assign ownership to user
- Retry after customer clears browser cache

**Fix - Session Issues:**

If customer signs up but can't stay logged in:

```bash
# Check cookies in browser DevTools
# Look for: "auth-token" cookie, HttpOnly flag, Secure flag

# Likely issue: Cookie session expired (normal after 24h)
# Customer should sign in again
```

### Scenario: Search Results Are Slow (>60s)

**Diagnosis:**

1. **Check External API Health**
   - Firecrawl status: Check dashboard or health endpoint
   - OpenAI status: Check status.openai.com
   - If either is down: That's your bottleneck

2. **Check Our Backend**
   ```bash
   # Vercel → Functions → Logs
   # Look for: Which step takes longest?
   # - Firecrawl request: 10-30s normal
   # - OpenAI summarization: 5-15s per batch
   # - Database write: <1s normal
   ```

3. **Check Database Performance**
   - Query: Check Supabase query stats
   - Look for: Long-running queries (>5s)
   - If found: Add index to columns in WHERE clause

**Fix - External API Slow:**

```bash
# Check API response time directly
curl -w "Time: %{time_total}s" https://api.firecrawl.dev/v1/search?q=test
curl -w "Time: %{time_total}s" https://api.openai.com/v1/completions ...
```

If external API is slow:
- This is expected during their peak hours
- Implement circuit breaker (already in code)
- Return graceful error to customer: "Service busy, try again in 1 minute"

**Fix - Our Backend Slow:**

If our code is the bottleneck:
1. Check recent deployments: Did we just push code?
2. Rollback to previous version (see Incident Response)
3. Investigate in new PR before re-deploying

### Scenario: High Error Rate (>5%)

**Immediate Actions:**

1. **Check Type of Errors**
   ```bash
   # Vercel logs, filter by status code
   # Count 400s (client errors) vs 500s (server errors)
   ```

2. **If Mostly 500 Errors:**
   - System is broken, proceed to "Service Down" section
   - Rollback immediately

3. **If Mostly 400 Errors:**
   - Customers sending malformed requests (usually not critical)
   - Monitor but don't rollback
   - Check if we can improve error message to help them

4. **If 429 (Rate Limit):**
   - We're hitting external API limits
   - Check Firecrawl and OpenAI usage
   - May need to implement queuing or temporary throttle

### Scenario: Service Down (Can't Reach Vercel)

**Immediate Actions (First 5 Minutes):**

1. **Verify Downtime**
   ```bash
   # Try multiple endpoints
   curl https://newspulse-ai.vercel.app/api/health
   curl https://newspulse-ai.vercel.app/
   
   # Try from multiple networks (phone 4G, different ISP if possible)
   ```

2. **Check Vercel Status**
   - https://www.vercel.com/status
   - Look for: Platform incidents affecting our deployment

3. **Check GitHub Actions**
   - If recent deployment just completed, it might be booting
   - Wait 30-60 seconds and try again

4. **If Still Down After 1 Minute:**
   - Notify Founder immediately
   - Begin incident response (see below)

**Incident Response - Service Down:**

```
1. Create incident: Time: [NOW], Status: "Service Down"
2. Notify: On-call engineer (phone), Founder (email + phone)
3. Actions:
   a) Check Vercel deployment dashboard
   b) If latest deployment failed: Trigger rollback
   c) If rollback failed: Contact Vercel support
   d) Communicate to customers: Email + status page
4. Update status page every 5 minutes
5. When restored: Root cause analysis
```

**Communication Template:**

```
Subject: NewsPulse AI Service Incident [Resolved]

We experienced a service outage from [START] to [END] UTC.
Impact: Customers could not access the platform.
Root cause: [Deployment failure / External service / Other]
Resolution: Rolled back to stable version
Duration: [X minutes]
Status: RESOLVED - All systems operational

We apologize for the disruption. Monitoring has been enhanced 
to prevent similar incidents.

— NewsPulse Operations Team
```

---

## Part 4: Database Maintenance

### Backup Verification (Daily)

**Automated Backups** (configured in Supabase):

- Supabase performs hourly backups automatically
- Backups retained for 7 days
- Verify: Supabase dashboard → Backups tab shows recent snapshots

**Manual Backup Test** (Weekly):

```bash
# Export production data to JSON (for manual audit)
# Supabase SQL Editor → Run query:
SELECT json_agg(row_to_json(t.*))
FROM (
  SELECT * FROM workspaces LIMIT 100
) t;
```

### Cleanup Operations (Weekly)

**Remove Test Data:**

```bash
# Delete test workspaces created during testing
DELETE FROM workspaces 
WHERE created_at < NOW() - interval '7 days' 
AND owner_id IN (SELECT user_id FROM auth.users WHERE email LIKE '%test%');
```

**Archive Old Searches** (if needed):

```bash
-- Only after customer feedback if storage becomes issue
-- Create archive table first, then:
INSERT INTO news_searches_archive 
SELECT * FROM news_searches WHERE created_at < NOW() - interval '30 days';
```

### Performance Tuning (Bi-weekly)

**Add Indexes to Slow Queries:**

```sql
-- After identifying slow queries, add indexes
CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX idx_news_searches_created ON news_searches(created_at);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
```

**Analyze Query Plans:**

```bash
# In Supabase SQL Editor, run EXPLAIN for slow queries
EXPLAIN ANALYZE SELECT * FROM news_searches WHERE created_at > NOW() - interval '24 hours';
```

---

## Part 5: Escalation Matrix

### When to Escalate

| Severity | Issue | Action | Timeline |
|----------|-------|--------|----------|
| **P1-Critical** | Service down or 50%+ error rate | Page on-call engineer + Founder | Immediate |
| **P2-High** | >5% error rate, single customer can't search | Email on-call, Founder | <1 hour |
| **P3-Medium** | Slow searches (>90s), single customer issue | Support ticket, investigate | <4 hours |
| **P4-Low** | Minor UI issue, documentation request | Support email, no urgency | <24 hours |

### Escalation Chain

**P1 (Critical):**
1. Page on-call engineer
2. Email Founder with "CRITICAL:" prefix
3. Update status page
4. Conference call if persists >10 minutes

**P2 (High):**
1. Email on-call + Founder
2. Begin investigation
3. Target resolution: 1 hour

**P3 (Medium):**
1. Create support ticket
2. Investigate next business day
3. May be accepted as "known limitation" in Beta

**P4 (Low):**
1. Log in issue tracker
2. Schedule for next sprint
3. Can wait until next update

---

## Part 6: Customer Communication

### Status Page Updates

**What to Post When:**

| Event | Post? | Message |
|-------|-------|---------|
| Planned maintenance | Yes | "Maintenance window: [Time], expected impact: [X minutes]" |
| Outage starts | Yes | "Service degradation detected, we're investigating" |
| Outage resolved | Yes | "Service restored. Root cause: [X], monitoring enhanced" |
| Performance issue | Yes (if >30 min) | "Performance degradation: searches taking longer than normal" |
| New feature | Yes | "New feature available: [feature name]" |

**Status Page Tools:**
- Statuspage.io (recommended)
- GitHub Pages (free alternative)
- Manual email updates (minimum)

### Weekly Customer Digest

**Send Every Friday:**

```
Weekly NewsPulse AI Beta Update
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This Week's Metrics:
- 47 new workspaces created
- 312 searches completed
- 0 critical incidents
- 99.98% uptime

What We Fixed:
- [Issue 1]: Resolved search results appearing in wrong order
- [Issue 2]: Improved error messages for invalid searches

What's Coming Next Week:
- Performance optimization for bulk searches
- UI improvements to result display

Customer Feedback:
- "Love the summary feature!" — Company A
- "Searches could be faster" — Company B (working on it!)

Questions? Reply to this email or visit our support portal.

— NewsPulse Team
```

---

## Part 7: Phase Transitions

### Transition: Alpha → Beta (Phase 0 to Phase 1)

**Date: July 12, 2026**

**Checklist:**

- [ ] All deployment gates satisfied (schema, CI/CD, monitoring, ops)
- [ ] Production systems online and healthy for 4+ hours
- [ ] Documentation complete (FOUNDER-DEPLOYMENT-CHECKLIST, OPERATIONS-RUNBOOK)
- [ ] Support email and contact info configured
- [ ] First 5 customers invited

**Go-Live Procedures:**

1. Verify all systems health (as per Morning Check above)
2. Send announcement email to first 5 customers
3. Monitor closely (every 15 min) for first 2 hours
4. Be available for support during their first use

### Transition: Beta Phase 1 → Phase 2 (July 19)

**Expansion to 50+ Customers**

**Pre-Expansion Checklist:**

- [ ] Phase 1 metrics reviewed (uptime, error rate, customer satisfaction)
- [ ] All P1/P2 issues from Phase 1 resolved
- [ ] Performance baseline established (latency, throughput)
- [ ] Support process proven (response time, resolution rate)
- [ ] Cost monitoring active (no unexpected spending)

**Phase 2 Preparation:**

1. Notify existing 5 customers: "Phase 2 begins, invite up to 10 more users"
2. Increase monitoring/alerting thresholds
3. Prepare for 10x traffic growth
4. Test database scaling (if needed)
5. Update runbook with learnings from Phase 1

### Transition: Beta → GA (August 16)

**End of Beta Program**

**Sign-Off Checklist:**

- [ ] >100 customers signed up
- [ ] 99.9%+ uptime over 30 days
- [ ] All critical features working
- [ ] Pricing/plans finalized
- [ ] Billing system ready

**GA Preparation:**

1. Launch public marketing
2. Convert Beta customers to free/paid plans
3. Switch to standard support SLA
4. Archive Beta documentation

---

## Part 8: Useful Commands & Queries

### Supabase Queries

```sql
-- Count active users
SELECT COUNT(*) as total_users FROM auth.users;

-- Find customers by signup date
SELECT email, created_at FROM auth.users 
WHERE created_at > NOW() - interval '24 hours'
ORDER BY created_at DESC;

-- Get workspace activity
SELECT w.name, COUNT(s.id) as search_count, MAX(s.created_at) as last_search
FROM workspaces w
LEFT JOIN news_searches s ON w.id = s.workspace_id
GROUP BY w.id
ORDER BY last_search DESC;

-- Find slow searches
SELECT id, workspace_id, query, response_time_ms
FROM news_searches
WHERE response_time_ms > 90000
ORDER BY response_time_ms DESC
LIMIT 10;
```

### Vercel Commands

```bash
# Deploy specific branch
vercel deploy --prod --token $VERCEL_TOKEN

# View logs
vercel logs --follow

# Rollback to previous deployment
vercel rollback
```

### Health Checks

```bash
# Check service health
curl -s https://newspulse-ai.vercel.app/api/health | jq

# Check GitHub Actions
curl -s https://api.github.com/repos/mininglife7-dev/newspulse-ai/actions/runs \
  -H "Authorization: token $GITHUB_TOKEN" | jq '.workflow_runs[0:5]'

# Check Supabase connection
curl -s -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  https://your-project.supabase.co/rest/v1/workspaces?limit=1
```

---

## Contact Information

**Internal Contacts:**

- **On-Call Engineer:** [Name] — [Phone] — [Email]
- **Support Lead:** [Name] — [Email]
- **Founder:** Lalit — [Email] — [Phone]

**External Contacts:**

- **Vercel Support:** https://vercel.com/support
- **Supabase Support:** https://supabase.com/support
- **Firecrawl Support:** https://firecrawl.dev
- **OpenAI Support:** https://help.openai.com

---

## Appendix: Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Connection refused" | Database down | Check Supabase status, restart if needed |
| "Timeout" | Firecrawl slow | Retry, or implement circuit breaker |
| "Invalid token" | Session expired | Customer should sign in again |
| "Rate limit" | Too many API requests | Implement queue or increase limits |
| "Workspace not found" | RLS policy blocking | Check user's workspace membership |

---

**Last Updated:** 2026-07-12  
**Next Review:** 2026-07-19 (Phase 1 → Phase 2 transition)  
**Version:** 1.0
