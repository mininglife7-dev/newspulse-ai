# Operational Monitoring Runbook — EURO AI

**Purpose:** Daily/weekly/monthly procedures to monitor system health and catch issues early  
**Audience:** Founder, operations team  
**Last Updated:** 2026-07-16  
**Status:** Ready for production launch

---

## Quick Reference: Monitoring Checklist

### Daily (5 minutes)
- [ ] `/api/health` endpoint healthy (green)
- [ ] No error spike in Vercel logs
- [ ] No customer support emails with critical issues
- [ ] Database still responding (via Supabase console quick query)

### Weekly (30 minutes)
- [ ] Review error patterns from logs
- [ ] Check API response time trends
- [ ] Monitor customer usage (assessments created, systems added)
- [ ] Verify backup jobs completed

### Monthly (1 hour)
- [ ] Full system health audit
- [ ] Review infrastructure costs
- [ ] Analyze customer feedback for patterns
- [ ] Plan scaling if needed

---

## Part 1: Daily Monitoring (5 minutes)

**Best time:** 9 AM each morning (before working on features)

### Step 1: Check System Health

**Go to:** https://[app-url]/api/health

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-07-20T09:00:00Z"
}
```

**If you see:**
- ✅ `"status": "healthy"` → All good, continue
- ⚠️ `"status": "degraded"` → Check logs (Step 2)
- ❌ `"status": "unhealthy"` or timeout → **CRITICAL**, escalate immediately (see Section 3)

---

### Step 2: Quick Error Scan

**Go to:** Vercel Dashboard → Deployments → [Latest Deployment] → Logs

**Scan the last 100 log lines for:**
- ❌ `ERROR` or `500` status codes → Check what failed
- ❌ `TimeoutError` or `ECONNREFUSED` → Database/external API issue
- ❌ Repeated errors (same error 5+ times) → Pattern worth investigating
- ✅ Mostly `GET 200`, `POST 201`, no errors → All good

**If you see errors:**
1. Take note of the error
2. Search for it in logs (Ctrl+F)
3. See how many times it occurred
4. Check if customer was affected (correlate with support emails)
5. If high-impact: Escalate to engineering (see Section 3)

**Vercel Logs Quick View:**
```
Click "Filter" → Type "ERROR" → Shows all errors from past 24 hours
Click timestamp → Expands full error details
```

---

### Step 3: Customer Support Check

**Check email inbox for customer issues:**
- Any new support emails overnight?
- Any marked "URGENT"?
- Any common theme (3+ customers same issue)?

**Response actions:**
- **If critical:** Follow Section 3 (Incident Response)
- **If high:** Respond within 2 hours
- **If medium:** Respond within 24 hours
- **If low:** Respond within 1 week (use CUSTOMER-SUPPORT-PLAYBOOK.md)

**Quick email scan (30 sec):**
1. Check unread count
2. Scan subject lines for keywords: "broken", "error", "won't", "urgent"
3. Check senders: Are any repeated (same customer 2+ emails)?
4. Prioritize by keywords

---

### Step 4: Database Quick Check

**Go to:** Supabase Dashboard → SQL Editor

**Run this query:**
```sql
SELECT count(*) as total_users FROM profiles;
SELECT count(*) as total_assessments FROM risk_assessments;
```

**Expected:**
- Users count stable or slowly increasing
- Assessment count slowly increasing (each customer adding assessments)

**If you see:**
- ⚠️ Numbers stopped increasing = customers not using product
- ⚠️ Sudden drop = data might have been deleted
- ✅ Steady growth = customers are active

**Troubleshoot if concerning:**
1. Check if database is responding (query runs successfully)
2. Check if customers logged in (look at dashboard metrics if available)
3. If data mysteriously dropped: Could be cascade delete issue

---

### Daily Summary (5 min)

```markdown
# 2026-07-20 Daily Check ✅

- Health: Healthy ✓
- Errors: 3 minor HTTP 429 (rate limited) — expected under load
- Support: 0 new issues
- Customers: 2 active, 1 assessment created
- Action: None required
```

**If anything is NOT ✅:**
1. Document it
2. Escalate per Section 3 if critical
3. Add to "Monitoring Log" spreadsheet

---

## Part 2: Weekly Monitoring (30 minutes)

**Best time:** Monday 9 AM or Friday 4 PM (end of week review)

### Step 1: Error Pattern Analysis

**Go to:** Vercel Logs → Filter by ERROR

**Run query:** `level:error` (see all errors from past 7 days)

**Analyze:**
1. What types of errors occurred? (Database, API, timeout, validation)
2. How many of each type?
3. Which routes had most errors?
4. Did any specific user trigger many errors?

**Example error breakdown:**
```
Database errors (TimeoutError): 12
Rate limit errors (429): 45
Validation errors (400): 8
Timeout errors: 3
API errors (External): 2
```

**If high error count (>100/week):**
1. Investigate root cause
2. Check if customer-facing
3. Plan fix for next sprint

---

### Step 2: API Performance Trend

**Go to:** Vercel Dashboard → Analytics (if available) OR Logs

**Look for:** Response time trend

**Command:** Search logs for timestamp + `duration` field
```
Example log: "POST /api/risk-assessments duration:245ms"
```

**Aggregate:** Calculate average response time
- API reads (GET): Should be <500ms
- API writes (POST): Should be <1000ms
- Long operations (assessment calculate): Can be 2000ms

**If slow (>1000ms average):**
1. Check database query time (Supabase logs)
2. Check external API calls (Firecrawl? OpenAI?)
3. Check if server under load (spike in requests)
4. May need to optimize or scale

---

### Step 3: Customer Usage Metrics

**Go to:** Supabase SQL Editor

**Run:**
```sql
-- Weekly signup summary
SELECT 
  DATE(created_at) as signup_date,
  COUNT(*) as new_users
FROM profiles
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY signup_date
ORDER BY signup_date DESC;

-- Weekly assessment summary
SELECT 
  DATE(created_at) as assessment_date,
  COUNT(*) as assessments_created
FROM risk_assessments
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY assessment_date
ORDER BY assessment_date DESC;

-- Active customer summary
SELECT 
  COUNT(DISTINCT p.id) as active_users,
  COUNT(DISTINCT w.id) as active_workspaces,
  COUNT(DISTINCT a.id) as total_assessments
FROM profiles p
LEFT JOIN workspaces w ON p.id = w.created_by
LEFT JOIN risk_assessments a ON w.id = a.workspace_id
WHERE p.last_seen >= NOW() - INTERVAL '7 days';
```

**Record:** Put results in "Weekly Metrics" sheet:
| Week | New Users | Assessments | Active Users | Notes |
|------|-----------|-------------|--------------|-------|
| 7/20-7/26 | 3 | 8 | 2 | Slow week |
| 7/27-8/2 | 5 | 15 | 4 | Picked up |

---

### Step 4: Infrastructure Cost Check

**Go to:** Vercel Dashboard → Usage & Billing
**Go to:** Supabase Dashboard → Billing

**Record:**
```
Weekly Costs:
- Vercel: $[X] (should be <$20 if small usage)
- Supabase: $[X] (should be $25/mo base + overage)
- Total: $[X]
```

**Trends:**
- Is cost increasing (means more usage, good)
- Is cost stable (small customer base, expected)
- Is cost spiking (could indicate runaway process or attack)

**If unexpected spike:**
1. Check Vercel function execution time
2. Check Supabase database size
3. Review logs for failed operations (retry storms)

---

### Step 5: Backup Verification

**Go to:** Supabase Dashboard → Backups

**Check:**
- ✅ Latest backup completed successfully (should be auto-daily)
- ✅ Backup size reasonable (should be growing slowly with customer data)
- ✅ Can you browse backup timestamps and sizes

**If backup failed:**
1. Supabase usually alerts via email
2. Contact Supabase support
3. Manually export data as temporary backup:
   ```sql
   -- In Supabase SQL Editor, export query results as CSV
   SELECT * FROM profiles, workspaces, risk_assessments;
   ```

---

### Weekly Summary

```markdown
# Weekly Monitoring Report — Week of 7/20/2026

## Metrics
- New Users: 3
- Active Users: 2
- Assessments: 8
- Total Errors: 67 (mostly rate limits, expected)

## Performance
- Avg API response: 245ms ✓
- Error rate: 0.3% ✓
- Database response: <100ms ✓

## Infrastructure
- Vercel cost: $12
- Supabase cost: $25
- Total: $37

## Issues
- [ ] None — all systems normal

## Action Items
- [ ] Continue monitoring
- [ ] No escalations needed
```

---

## Part 3: Monthly Monitoring (1 hour)

**Best time:** Last Friday of month (4 PM)

### Step 1: Customer Health Check

**Go to:** Dashboard or email records

**For each customer:**
- Last login date: Within past week? (If not, might be churning)
- Features used: Logged in, added systems, created assessments?
- Support interactions: Any complaints? Issues?
- Upcoming actions: Supposed to renew? Decide to upgrade?

**Tracking:**
| Customer | Last Login | Features Used | Status | Action |
|----------|-----------|----------------|--------|--------|
| Acme Corp | 7/18 | Setup, 2 systems, 1 assess | Active | None |
| TechFlow | 7/10 | Setup only, never added systems | At risk | Check in |
| GlobalAI | 7/05 | Setup only, no activity | Churning | Offer help |

**Action:** If customer inactive >7 days, send check-in email (see CUSTOMER-SUPPORT-PLAYBOOK.md)

---

### Step 2: Full Error Analysis

**Compile error patterns for month:**

```
MONTHLY ERROR SUMMARY

Category | Count | % of total | Trend | Severity
---------|-------|------------|-------|----------
Rate limit (429) | 234 | 45% | ↑ Up 10% | Medium (expected)
Database timeout | 12 | 2% | → Stable | High
Validation error | 89 | 17% | → Stable | Low
API timeout | 5 | 1% | ↓ Down | High (good)
Unknown errors | 134 | 25% | ↑ Up 15% | TBD
Total errors | 520 | N/A | — | —

Analysis:
- Rate limiting is expected (more customers = more traffic)
- Database timeouts are rare (good sign of stability)
- Unknown errors increased — investigate
```

**Action:** If unknown errors increased, ask engineering to investigate

---

### Step 3: Performance Analysis

**Collect performance stats for month:**

```sql
-- Performance percentiles (from logs if available)
SELECT 
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY duration) as p50_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration) as p95_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration) as p99_ms,
  MAX(duration) as max_ms
FROM api_logs
WHERE timestamp >= NOW() - INTERVAL '30 days';
```

**Expected:**
- p50 (median): <250ms
- p95 (95th percentile): <1000ms
- p99 (99th percentile): <3000ms
- max: Can be high (slow database query)

**If degrading:**
1. Check database size (maybe needs optimization)
2. Check external API calls (maybe slow)
3. May need to scale up database

---

### Step 4: Cost Trend Analysis

**Over last 3 months:**
```
Month | Vercel | Supabase | Total | Growth
------|--------|----------|-------|--------
May   | $8     | $25      | $33   | —
June  | $10    | $25      | $35   | +6%
July  | $12    | $25      | $37   | +6%

Trend: Slowly increasing (expected with more customers)
Forecast: If +6%/month, by Oct = $45/month

Decision points:
- If <$100/month: Healthy growth
- If >$500/month: May need to scale infrastructure
- If >$1000/month: Scaling costs becoming real expense
```

**Action:** If trending high, plan scaling budget

---

### Step 5: Dependency Audit

**Run:** `npm audit` on main branch

**Command:**
```bash
npm audit --production
# Shows only production vulnerabilities (not dev)
```

**Expected:** 0 vulnerabilities

**If found:**
1. Note severity (critical, high, moderate)
2. Check what package (might be transitive)
3. Run `npm audit fix` to auto-patch
4. If can't auto-fix, plan upgrade for next sprint
5. Document in SECURITY-AUDIT-REPORT.md

---

### Step 6: Uptime Calculation

**Calculate:** System availability for the month

**Formula:**
```
Uptime % = (Total Time - Downtime) / Total Time * 100
```

**Expected:** 99.5%+ (under 21 minutes downtime per month)

**If <99%:**
1. Investigate why
2. Plan stability improvements
3. Communicate with customers if major outage

**Example:**
```
July 2026 Uptime Report:
- Total time: 31 days = 744 hours = 44,640 minutes
- Downtime: 3 minutes (brief Vercel deploy issue)
- Uptime: 44,637 / 44,640 = 99.99% ✓

Status: Excellent
```

---

### Step 7: Capacity Planning

**Estimate:** If current growth continues, will we need to scale?

**Key metrics:**
- Customers added this month: X
- DB size growth: Y GB/month
- Monthly costs: $Z

**Projection (if growth continues):**
```
Scenario: 3 new customers/month, $200 revenue/customer

Current (July): 6 customers, $37 cost, 15% margin
Q4 (Sept): 12 customers, $45 cost, 70% margin
Q1 (Jan): 18 customers, $60 cost, 80% margin

At 18 customers:
- Might need bigger Supabase plan ($99/mo) if DB >10GB
- Might need Vercel Pro if traffic spikes
```

**Action:** If projection shows scaling needed in next quarter, start planning now

---

### Monthly Summary Report

```markdown
# Monthly Monitoring Report — July 2026

## Health Metrics
- Uptime: 99.99% (excellent)
- Avg response time: 245ms (good)
- Error rate: 0.3% (excellent)

## Customer Metrics
- New customers: 3
- Active customers: 5
- Churn: 0 (retention 100%)
- Avg assessments/customer: 2.6

## Infrastructure
- Total cost: $37 (budget: $100)
- Trend: +6% monthly (healthy growth)
- Capacity: Comfortable (3 months before needing scale)

## Issues Fixed
- [ ] Database timeout (1 incident) — investigated, no pattern
- [ ] Rate limiting (234 incidents) — expected with traffic growth

## Upcoming Actions
- [ ] Continue daily monitoring
- [ ] Plan scaling for Q4 if growth continues
- [ ] Schedule SOC2 audit Q3

## Overall Health: ✅ Excellent
```

---

## Part 4: Incident Response Quick Reference

**If something is NOT NORMAL in daily/weekly checks:**

### Critical Issues (Respond in 30 min)

**Symptom:** `/api/health` down or database unreachable

**Steps:**
1. **Diagnose (5 min):**
   - Is Vercel down? Check https://status.vercel.com
   - Is Supabase down? Check Supabase dashboard
   - Is it your code? Check Vercel logs for errors

2. **Communicate (5 min):**
   - If Vercel/Supabase down: Notify customers (status page)
   - If code issue: Start rollback (see LAUNCH-DAY-RUNBOOK.md)

3. **Fix (20 min):**
   - Rollback to previous deploy: Vercel → Promotions → Select previous version
   - Or hotfix and redeploy
   - Verify `/api/health` is green again

4. **Post-Mortem (same day):**
   - Document what happened
   - Add test case to prevent recurrence
   - Update incident log

**Escalation:** Notify engineering immediately

---

### High Issues (Respond in 2 hours)

**Symptom:** Feature broken (e.g., risk assessment won't save)

**Steps:**
1. **Identify scope:** Is it all users or just one?
2. **Reproduce:** Can you make it happen?
3. **Check logs:** Any errors correlating with issue?
4. **Escalate:** Describe to engineering with reproduction steps
5. **Communicate:** Let affected customer know you're investigating

**If workaround exists:** Offer it while engineering fixes

---

### Medium Issues (Respond in 24 hours)

**Symptom:** Slow performance, non-critical feature broken

**Steps:**
1. Gather details (screenshots, error messages)
2. Post in internal issue tracker
3. Schedule for next sprint if not urgent
4. Communicate timeline to customer

---

## Part 5: Monitoring Tools Setup

### Essential Dashboards

**Bookmark these (add to browser toolbar for quick access):**

1. **Health Check:** https://[app-url]/api/health
2. **Vercel Dashboard:** https://vercel.com/dashboard
3. **Supabase Console:** https://app.supabase.com
4. **Error Logs:** Vercel → Deployments → [Latest] → Logs
5. **Email Inbox:** Gmail (for customer issues)

### Monitoring Spreadsheet Template

Create a Google Sheet called "EURO AI Monitoring" with these tabs:

**Tab 1: Daily Checks**
| Date | Time | Health Status | Errors | Support Issues | Notes |
|------|------|-------|--------|--------|--------|
| 7/20 | 9 AM | ✓ Healthy | 3 (429s) | 0 | Normal |
| 7/21 | 9 AM | ✓ Healthy | 5 (429s) | 1 (slow) | Investigate slow |

**Tab 2: Weekly Metrics**
| Week | New Users | Active Users | Assessments | Avg Response | Cost |
|------|-----------|--------------|-------------|--------------|------|
| 7/20-7/26 | 2 | 3 | 5 | 240ms | $8 |
| 7/27-8/2 | 3 | 4 | 8 | 245ms | $9 |

**Tab 3: Incidents**
| Date | Issue | Severity | Resolution | Time to Fix | Root Cause |
|------|-------|----------|-----------|-------------|-----------|
| 7/22 | DB timeout | High | Restarted | 15 min | Connection pool exhausted |

**Tab 4: Monthly Reports**
- Links to full monthly reports (or copy key metrics)

---

## Part 6: When to Escalate to Engineering

**Always escalate if:**
1. `/api/health` returns unhealthy status
2. Database unreachable (can't run queries)
3. Error rate >1% (more than 1 error per 100 requests)
4. Avg response time >1000ms
5. Same error occurs 5+ times in 1 hour
6. Customer feature is completely broken
7. Data is missing or corrupted

**Escalation template:**
```
Subject: INCIDENT — [Brief Description]

Issue: [What's broken]
Severity: [CRITICAL / HIGH / MEDIUM]
Time discovered: [When]
Impact: [How many customers affected]

Symptoms:
- [Symptom 1]
- [Symptom 2]

Evidence:
- Error logs: [Link or paste]
- Screenshot: [Attached]

Affected users:
- [Customer 1]
- [Customer 2]

SLA: [Need fix by: TIME]

Please investigate and provide update within 1 hour.
```

---

## Summary: Your Monitoring Routine

### Daily (5 min)
- [ ] Health check (green)
- [ ] Error scan (no spikes)
- [ ] Email check (no critical)
- [ ] Database check (counts stable)

### Weekly (30 min)
- [ ] Error pattern review
- [ ] Performance trend
- [ ] Usage metrics
- [ ] Cost check
- [ ] Backup verified

### Monthly (1 hour)
- [ ] Customer health
- [ ] Full error analysis
- [ ] Performance stats
- [ ] Cost trend
- [ ] Dependency audit
- [ ] Uptime calculation
- [ ] Capacity planning

### When Escalate
- Health not green
- Errors >1%
- Response >1 sec
- Customer feature broken
- Data missing/corrupted

---

**Operational Monitoring Runbook Complete**  
**Ready for Production Launch**  
**Print or bookmark for daily reference**
