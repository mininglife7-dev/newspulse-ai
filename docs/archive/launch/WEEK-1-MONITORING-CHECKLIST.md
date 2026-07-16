# ✅ Week 1 Monitoring Checklist

**Purpose:** Daily checklist to ensure platform stability and customer success in Week 1  
**Use:** Print or open daily; check off items each morning  
**Time Required:** 5-10 minutes per day

---

## 📋 Daily Monitoring (Every Morning)

**Time to Complete:** 5 minutes  
**When to Do:** First thing in the morning (9 AM)

### ✓ System Health Checks

- [ ] **Platform Up?** Visit https://[VERCEL_DOMAIN]
  - Expected: Page loads in <2 seconds
  - If fails: Check Vercel dashboard for deployment status

- [ ] **API Health?** Visit https://[VERCEL_DOMAIN]/api/health
  - Expected: `{"status": "healthy"}`
  - If fails: Check Vercel logs → Deployments → Logs

- [ ] **Alerts Feed?** Visit https://[VERCEL_DOMAIN]/api/alerts
  - Expected: Empty object `{}` (no alerts)
  - If has alerts: Check GitHub issues for automated reports

- [ ] **Database Connected?**
  - Run: `curl -s https://[VERCEL_DOMAIN]/api/health | grep status`
  - Expected: `healthy`
  - If fails: Check Supabase console for connection issues

### ✓ Deployment Status

- [ ] **Latest Deployment Running?**
  - Open: https://vercel.com/dashboard
  - Check: Latest deployment shows "Ready" (not "Building" or "Failed")
  - If not ready: Click deployment → View logs for error details

- [ ] **Build Duration Reasonable?**
  - Check: Last build took <5 minutes
  - If >5 min: May indicate performance regression; investigate in logs

- [ ] **No Recent Errors?**
  - Open: Vercel dashboard → Functions → Recent errors
  - Expected: 0 errors
  - If errors present: Click to view details

### ✓ GitHub Actions

- [ ] **Workflows Running?**
  - Open: https://github.com/mininglife7-dev/newspulse-ai/actions
  - Check: Recent workflow runs show green checkmarks
  - If red X: Click workflow to see failure details

- [ ] **Spending Still Available?**
  - Open: https://github.com/mininglife7-dev/newspulse-ai/settings/billing/actions
  - Check: Spending limit is $50+/month
  - Check: Used amount is reasonable (<20% of limit)

### ✓ Customer Status

- [ ] **Customer Activity?**
  - Open: Supabase console → Table Editor → customers
  - Check: Last activity timestamp (should be recent if customer is active)
  - If no recent activity: May need to follow up with customer

---

## 📊 Twice-Weekly Checks (Monday & Thursday)

**Time to Complete:** 15 minutes  
**When to Do:** Mid-morning (10 AM)

### ✓ Performance Metrics

Document these in a spreadsheet or notes file:

- [ ] **Response Times**

  ```bash
  # Run this from terminal:
  time curl https://[VERCEL_DOMAIN]

  Record: Real time taken (should be <2 seconds)
  ```

- [ ] **Error Rate**
  - Open: Vercel dashboard → Logs
  - Count: 5xx errors in last 24 hours (should be 0)
  - Count: 4xx errors (expected some, but not >10)

- [ ] **Database Performance**
  - Open: Supabase console → Logs
  - Check: Any slow queries (>1 second)?
  - Check: Connection pool usage reasonable?

- [ ] **Browser Console Errors**
  - Visit: https://[VERCEL_DOMAIN]
  - Press: F12 → Console tab
  - Expected: No red error messages
  - If errors: Document them for investigation

### ✓ Customer Feedback Check

- [ ] **Any Support Emails?**
  - Check inbox for messages from customer
  - Note: Response time vs SLA (critical: 15 min, high: 1 hour)
  - Mark: Which SLA tier applies

- [ ] **Customer Satisfaction Status**
  - Review: What's the customer's sentiment?
  - Flag: Any blockers mentioned?
  - Action: Follow up if not responded in SLA

- [ ] **Feature Requests Logged?**
  - If customer mentioned new features, document in spreadsheet
  - Add to: PHASE-2-ROADMAP.md feature request log

### ✓ Infrastructure Status

- [ ] **DNS Resolving?**

  ```bash
  nslookup [VERCEL_DOMAIN]
  # Should return IP address without errors
  ```

- [ ] **HTTPS Certificate Valid?**
  - Open: https://[VERCEL_DOMAIN]
  - Check: Browser shows green lock icon (not warning)
  - If warning: Check Vercel SSL settings

---

## 📈 Weekly Review (Every Friday)

**Time to Complete:** 30 minutes  
**When to Do:** End of day Friday (4 PM)

### ✓ Compile Weekly Metrics

Create a document/spreadsheet with:

```
Week 1 Summary (Day 1-7)

UPTIME
- Uptime %: ____%  (target: >99%)
- Downtime incidents: ____
- Longest outage: ___ minutes

PERFORMANCE
- Avg response time: ___ ms (target: <2000ms)
- 95th percentile: ___ ms
- Max response time: ___ ms

ERRORS
- 5xx errors (server): ____
- 4xx errors (client): ____
- Network errors: ____
- Database errors: ____

CUSTOMER JOURNEY
- Completion time: ___ min (target: <45 min)
- Signup to report: ___ min
- Blockers encountered: [list any]
- Customer satisfaction: _____/5

SUPPORT LOAD
- Emails received: ____
- Avg response time: ___ min (target: <60 min for high priority)
- Issues resolved: ____
- Escalations needed: ____

FEATURE REQUESTS
- Total requests: ____
- Features requested 2+ times: [list]
- High priority features: [list]
```

### ✓ Identify Patterns

- [ ] **Common Issues?**
  - Did customer get stuck at same point twice?
  - If yes: Document the step number and error message

- [ ] **Performance Trends?**
  - Is response time getting faster or slower?
  - If slower: May indicate growing data volume or resource issue

- [ ] **Customer Engagement?**
  - Is customer asking more questions?
  - Is customer using platform daily?
  - Did customer complete assessment successfully?

### ✓ Risk Assessment

Rate each risk:

| Risk                      | Severity                     | Evidence   | Action |
| ------------------------- | ---------------------------- | ---------- | ------ |
| **Uptime**                | 🟢 Low / 🟡 Medium / 🔴 High | (metric)   | (plan) |
| **Performance**           | 🟢 / 🟡 / 🔴                 | (metric)   | (plan) |
| **Customer Satisfaction** | 🟢 / 🟡 / 🔴                 | (feedback) | (plan) |
| **Support Burden**        | 🟢 / 🟡 / 🔴                 | (hours)    | (plan) |

### ✓ Update Status

- [ ] **Update FOUNDER_BRIEF.md**
  - Document: Week 1 summary
  - Add: Key learnings
  - Add: What to improve before customer #2

- [ ] **Update PHASE-2-ROADMAP.md**
  - Add: Customer #1 feature requests to backlog
  - Update: Customer #1 satisfaction rating

- [ ] **Create Customer #1 Learnings Doc**
  - File: `docs/customer/CUSTOMER-1-LEARNINGS.md`
  - Include: What worked, what didn't, recommendations for customer #2

---

## 🚨 Critical Incident Response

**If You See Any Red Flags:**

### 🔴 Platform Down (Site not loading)

1. [ ] Open Vercel dashboard → Deployments
2. [ ] Check if deployment shows "Ready"
3. [ ] If not ready: Click deployment → Logs → Find error
4. [ ] If error is clear: Try to fix (usually code/config issue)
5. [ ] If stuck: Contact Vercel support (support@vercel.com)
6. [ ] Document: Incident time, duration, root cause, resolution

### 🔴 Database Unreachable

1. [ ] Open Supabase console
2. [ ] Check: Database status (should show "Healthy")
3. [ ] Check: Connection count (if maxed out: scale up)
4. [ ] If down: Contact Supabase support (support@supabase.io)
5. [ ] Document: Incident details

### 🔴 Customer Reports Issue

1. [ ] Respond within SLA (critical: 15 min, high: 1 hour)
2. [ ] Ask: What exactly happened? What do you see?
3. [ ] Try to reproduce: Follow their exact steps
4. [ ] Check logs: Vercel + Supabase for error details
5. [ ] If found: Fix and test before reporting back
6. [ ] Document: Issue description, root cause, solution time

### 🔴 Error Rate Spiking

1. [ ] Check Vercel logs for pattern
2. [ ] Is it 5xx (server) or 4xx (client)?
3. [ ] If 5xx: Check Supabase connection, API code, database
4. [ ] If 4xx: Likely client bug; check browser console
5. [ ] If production code: Prepare rollback (previous deployment)
6. [ ] Document: Error pattern, cause, fix applied

---

## 📝 Daily Log Template

Copy this template and fill daily:

```markdown
## Week 1 — Day [X] Daily Log

**Date:** 2026-07-[XX]  
**Time:** [Morning check at 9 AM]

### Morning Health Check (5 min)

- Platform up: YES / NO
- API health: HEALTHY / DEGRADED / DOWN
- Database: CONNECTED / DISCONNECTED
- Deployment: READY / BUILDING / FAILED
- Latest logs: ✅ CLEAN / ⚠️ [N] ERRORS / 🔴 CRITICAL ERROR

### Customer Status

- Last activity: [time ago]
- Status: ACTIVE / DORMANT / BLOCKED
- Any support tickets: YES / NO
- Response time to date: ___ min

### Issues Found

- [Issue 1: description]
  - Impact: [severity]
  - Action taken: [what I did]
  - Status: RESOLVED / INVESTIGATING / ESCALATED

### Metrics

- Uptime: ___% (cumulative this week)
- Avg response time: ___ ms
- Error count: ____
- Support hours: ___ hr

### Notes

[Any observations, concerns, or things to investigate further]
```

---

## 🎯 Success Indicators (By End of Week)

- ✅ Customer completed full journey (signup → report)
- ✅ Zero critical outages (uptime >99%)
- ✅ <5 total errors encountered
- ✅ Customer satisfaction >4/5
- ✅ All support tickets resolved within SLA
- ✅ No performance degradation
- ✅ Zero database connectivity issues
- ✅ Documentation of learnings complete

**If All Met:** Week 1 SUCCESSFUL 🎉  
**If Any Unmet:** Continue monitoring, document reason, plan fix

---

## 📞 Quick Escalation Matrix

| Issue                  | Response Time | Escalate To       | Contact             |
| ---------------------- | ------------- | ----------------- | ------------------- |
| Platform down          | Immediate     | Vercel            | support@vercel.com  |
| Database down          | Immediate     | Supabase          | support@supabase.io |
| Customer critical      | 15 minutes    | Response required | Direct email/call   |
| Customer high priority | 1 hour        | Response required | Email within 1 hour |
| Performance degrading  | 4 hours       | Monitor closely   | Investigate logs    |
| Minor issue            | 1 day         | Can batch         | Group with others   |

---

## 💾 Monitoring Tools Needed

**Local Setup (Run Once):**

```bash
# Create monitoring directory
mkdir -p ~/monitoring/week-1

# Create daily check script
cat > ~/monitoring/week-1/daily-check.sh << 'EOF'
#!/bin/bash
echo "📋 Week 1 Daily Check - $(date)"
curl -s https://[VERCEL_DOMAIN]/api/health
curl -s https://[VERCEL_DOMAIN]/api/alerts
echo "✅ Check complete"
EOF

chmod +x ~/monitoring/week-1/daily-check.sh

# Run daily
./monitoring/week-1/daily-check.sh
```

**Bookmarks to Create:**

1. Vercel Dashboard: https://vercel.com/dashboard
2. Supabase Console: https://app.supabase.com
3. GitHub Issues: https://github.com/mininglife7-dev/newspulse-ai/issues
4. GitHub Actions: https://github.com/mininglife7-dev/newspulse-ai/actions

---

**Print This Page and Keep Nearby During Week 1**  
**Review Every Morning at 9 AM**  
**Summary Review Every Friday at 4 PM**

Ready? Week 1 starts now! 🚀
