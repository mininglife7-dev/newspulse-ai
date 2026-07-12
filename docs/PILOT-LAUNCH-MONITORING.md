# Pilot Launch Monitoring Guide
**Duration:** 48 hours (5–10% traffic)  
**Success Criteria:** All metrics healthy, no cascading failures, MTTD < 30s, MTTR < 120s  
**Your Role:** Active monitoring, approving each traffic increase

---

## Overview

This guide explains what to monitor during the pilot phase and how to interpret the metrics. The system is self-healing (auto-remediation), but you remain the decision-maker for traffic increases.

---

## Pre-Launch Checklist (Day 1, Before 5–10% Traffic)

**Complete these steps before routing any production traffic:**

```
☐ All prerequisites complete:
  ☐ GitHub Actions enabled and billing set
  ☐ Supabase schema deployed with all 6 tables visible
  ☐ All 7 environment variables set in Vercel
  
☐ Production deployment successful:
  ☐ New deployment showing "Ready" in Vercel dashboard
  ☐ /api/health endpoint returns { "status": "healthy" }
  ☐ /api/metrics endpoint returns JSON with incident count
  
☐ External cron job configured:
  ☐ EasyCron or cron.is job created
  ☐ URL: https://newspulse-ai-production.vercel.app/api/production-error-collection/cron?cron_secret=<YOUR_SECRET>
  ☐ Interval: Every 60 seconds
  ☐ Status: Active/Enabled
  
☐ Email alert test:
  ☐ Send test alert: curl -X POST https://newspulse-ai-production.vercel.app/api/test-alert -H "Content-Type: application/json" -d '{"severity": "critical", "description": "Test alert"}'
  ☐ Test email arrives at your inbox within 2 minutes
  ☐ Check spam folder if not in inbox
  
☐ Supabase verification:
  ☐ Log into Supabase → newspulse-ai project
  ☐ SQL Editor → Run: SELECT COUNT(*) FROM incidents;
  ☐ Should return 0 (no incidents yet)
```

---

## What To Monitor: 4 Key Dashboards

### Dashboard 1: Vercel Metrics
**Where:** [Vercel Dashboard → Deployments](https://vercel.com/lalit-kumar-d-s-projects/newspulse-ai)

**What to watch:**
- **Deployment status:** Should be "Ready"
- **Error rate:** Should remain < 0.1% (essentially zero errors)
- **Response time:** p95 latency should stay < 500ms
- **Function invocations:** Should see requests every 60 seconds from cron job

**Healthy indicators:**
- ✓ No spike in error rate
- ✓ Response times stable
- ✓ No out-of-memory errors in logs
- ✓ No timeout errors (Vercel function runtime)

**Red flags:**
- ✗ Error rate suddenly spikes
- ✗ Functions timing out
- ✗ Response times slow (> 1 second)
- ✗ Memory errors appearing

**Action if unhealthy:**
- Check logs: `vercel logs newspulse-ai --follow`
- If code issue: Can rollback or apply hotfix
- If infrastructure: Contact Vercel support

---

### Dashboard 2: Supabase Incident Log
**Where:** [Supabase Dashboard → SQL Editor](https://supabase.com/dashboard)

**Run these queries every 15 minutes:**

```sql
-- Check incident collection working
SELECT COUNT(*) as total_incidents FROM incidents;

-- See latest incidents
SELECT id, detected_at, category, severity, impact_percentage, status 
FROM incidents 
ORDER BY detected_at DESC 
LIMIT 10;

-- Check error patterns being learned
SELECT error_pattern, occurrence_count, last_seen_at 
FROM error_patterns 
ORDER BY occurrence_count DESC 
LIMIT 5;

-- Verify alerts being sent
SELECT COUNT(*) as alerts_sent FROM alerts;

-- Check remediation decisions
SELECT category, orchestration_action, success_count, fail_count 
FROM orchestrations 
GROUP BY category, orchestration_action;
```

**Healthy indicators:**
- ✓ incident_count staying at 0 (no errors in production)
- ✓ error_patterns table empty (no repeating errors)
- ✓ alerts_sent = 0 (no false alarms)

**Red flags:**
- ✗ Incident count growing rapidly
- ✗ Same error_pattern appearing repeatedly
- ✗ Alert count high with no corresponding incidents
- ✗ Orchestration failures (fail_count > 0)

**Action if unhealthy:**
- If many incidents: Production is experiencing errors (investigate)
- If many false alerts: Adjust fingerprinting logic
- If orchestration failures: May need manual remediation

---

### Dashboard 3: Real-Time Metrics Endpoint
**Where:** Periodically call your metrics endpoint

```bash
# Check every 5 minutes during active monitoring
curl https://newspulse-ai-production.vercel.app/api/metrics?format=text

# Or get JSON for programmatic checking
curl https://newspulse-ai-production.vercel.app/api/metrics?format=json | jq .
```

**Key metrics to track:**

```
MTTD (Mean Time To Detect)
  Current: Should be 0 if no incidents
  When incidents occur: Should be < 30 seconds (SLA target)
  
MTTR (Mean Time To Recover)
  Current: Should be 0 if no incidents
  When incidents occur: Should be < 120 seconds (SLA target)
  
Success Rate
  Target: > 90% (most incidents auto-remediate)
  If < 90%: Some incidents not resolving, may need investigation
  
False Positive Rate
  Target: < 5%
  If > 5%: Fingerprinting needs tuning
  
Alert Delivery Rate
  Target: 100% (you always get notified)
  If < 100%: Email/Slack provider issue
```

**Healthy indicators:**
- ✓ incidentCount: 0 (no production errors)
- ✓ successRate: 100% (all auto-remediations working)
- ✓ alertDeliveryRate: 100% (all alerts reach you)
- ✓ falsePositiveRate: 0% (no noise)

**Red flags:**
- ✗ incidentCount > 5: Production experiencing errors
- ✗ successRate < 80%: Auto-remediation not working well
- ✗ alertDeliveryRate < 100%: You're missing alerts
- ✗ falsePositiveRate > 10%: System is noisy

---

### Dashboard 4: GitHub Issues
**Where:** [GitHub Repository → Issues](https://github.com/mininglife7-dev/newspulse-ai/issues)

**What to watch:**
- New issues created with label `incident-postmortem`
- Issue titles and descriptions
- Prevention measures suggested

**Healthy indicators:**
- ✓ No incident-postmortem issues (no incidents)
- ✓ If issues exist, they describe real production problems
- ✓ Prevention suggestions are actionable

**Red flags:**
- ✗ Many postmortem issues with false patterns
- ✗ Same incident repeating (prevention measures not working)
- ✗ GitHub integration failing (no issues created when incidents occur)

**Action if unhealthy:**
- Review incident details: Are they real or false?
- If false: Adjust error fingerprinting in lib/error-tracking.ts
- If real: May need to apply prevention measures or hotfixes

---

## Pilot Launch Timeline

### Hour 0–2: Initial 5–10% Traffic
**Focus:** System startup, first incidents (if any)

**Every 5 minutes:**
- [ ] Check Vercel metrics (error rate, response time)
- [ ] Check Supabase incident count
- [ ] Verify cron job running (one request every 60s in logs)
- [ ] Confirm email alerts working (if any incidents)

**After 2 hours, if healthy:**
- Error rate: 0%
- No cascading failures
- Cron job running reliably
- Email alerts functional (if needed)

**Decision point:** Can we increase to 20% traffic?

---

### Hour 2–8: Early Adopters Phase (20% Traffic)
**Focus:** Scaling up with more incidents (if any)

**Every 10 minutes:**
- [ ] Supabase query: Check incident and alert counts
- [ ] Metrics endpoint: Confirm MTTD/MTTR targets (if incidents)
- [ ] GitHub issues: Verify postmortem issues created (if incidents)
- [ ] Vercel logs: Spot-check for errors

**After 6 hours, if healthy:**
- Incident count stable (not growing)
- Success rate > 90% (remediations working)
- MTTD < 30s (detection fast enough)
- MTTR < 120s (recovery fast enough)
- No cascading failures

**Decision point:** Can we increase to 50% traffic?

---

### Hour 8–24: Main Rollout (50% Traffic)
**Focus:** Normal operation at scale

**Every 15 minutes:**
- [ ] Quick metrics check: `curl .../api/metrics?format=text`
- [ ] Supabase incident count trend (should be stable)
- [ ] GitHub issues created (postmortem labels)

**After 16 hours, if healthy:**
- All SLA targets met
- No unexpected behaviors
- Performance stable
- No false positive spike

**Decision point:** Can we go to 100% (full rollout)?

---

### Hour 24–48: Full Production (100% Traffic)
**Focus:** Confirm system handles production load

**Every 30 minutes:**
- [ ] Metrics endpoint for summary
- [ ] Supabase for incident trends
- [ ] GitHub for prevention issues

**After 48 hours:**
- ✓ System stable at production scale
- ✓ All SLA targets consistently met
- ✓ No cascading failures
- ✓ Alert delivery reliable
- ✓ Auto-remediation working

**Final decision:** Production rollout successful. System ready for ongoing monitoring.

---

## Approval Gates (Traffic Increases)

Before increasing traffic at each stage, approve if ALL criteria met:

```
☐ Error rate unchanged from baseline (< 0.1%)
☐ No increase in timeouts or 5xx errors
☐ Incident detection working (if errors occur)
☐ Alert delivery confirmed (test alert arrives)
☐ Supabase queries returning data
☐ GitHub issues creating properly (if incidents)
☐ No unexpected memory/CPU usage
☐ Metrics targets on track (MTTD < 30s, MTTR < 120s)
☐ No cascading failures observed
☐ Founder comfort level: ✓ Yes, I'm confident in the next increase
```

If ANY criterion not met: **HOLD** and investigate before increasing traffic.

---

## Emergency Rollback (< 5 minutes)

If something goes wrong at any stage:

```bash
# Option 1: Disable cron job (stops all incident detection)
# Visit EasyCron.com or cron.is dashboard
# Delete or disable the job
# Result: System stops collecting errors, stops remediating
# Impact: Zero (no automated incident response running)

# Option 2: Reduce traffic to incident response
# Via Vercel: Go to Deployments → Move traffic to stable deployment
# Keep normal NewsPulse AI running at 100%
# Incident response runs at 0%

# Option 3: Full deployment rollback
vercel rollback
# Reverts to previous working deployment
# Takes < 2 minutes
```

**After rollback:**
1. System stops all automation
2. No cascading failures
3. No data loss
4. Can investigate and relaunch anytime

---

## What Success Looks Like

After 48 hours of pilot:

| Metric | Target | Reality |
|--------|--------|---------|
| Production error rate | < 0.1% | < 0.1% ✓ |
| MTTD (if incidents) | < 30s | < 30s ✓ |
| MTTR (if incidents) | < 120s | < 120s ✓ |
| Alert delivery | 100% | 100% ✓ |
| Remediation success | > 90% | > 90% ✓ |
| False positives | < 5% | < 5% ✓ |
| No cascading failures | Yes | Yes ✓ |
| Supabase logging | Working | Working ✓ |
| GitHub issues | Working | Working ✓ |
| Email/Slack alerts | Working | Working ✓ |

**Result:** ✓ Production incident response ready for 100% rollout

---

## Monitoring Checklist

Print this or bookmark it for easy reference during pilot launch:

```
EVERY 5 MINUTES (Hour 0–2, 5–10% traffic)
☐ Vercel error rate check
☐ Response time check
☐ Cron job running? (check logs)

EVERY 10 MINUTES (Hour 2–8, 20% traffic)
☐ Supabase: SELECT COUNT(*) FROM incidents;
☐ Metrics: curl .../api/metrics?format=text
☐ GitHub issues created?

EVERY 15 MINUTES (Hour 8–24, 50% traffic)
☐ Metrics summary
☐ Supabase incident trend
☐ Performance baseline

EVERY 30 MINUTES (Hour 24–48, 100% traffic)
☐ Metrics check
☐ Supabase trend
☐ GitHub issues

APPROVAL GATES (Before each traffic increase)
☐ All criteria met? Yes ☐ No ☐
☐ Founder approval: Yes ☐ No ☐
☐ Proceed: Yes ☐ Hold ☐
```

---

## Troubleshooting During Pilot

### Problem: No incidents detected (good sign!)
**Cause:** Production is running smoothly, no errors  
**Action:** Normal. Continue monitoring. If any real production errors occur, they should trigger incident detection.

### Problem: Many incidents detected (investigate)
**Cause:** Production experiencing errors  
**Action:**
1. Check Vercel logs for error details
2. Determine if errors are real or false positives
3. If real: Apply hotfix or manual remediation
4. If false positive: Adjust fingerprinting in lib/error-tracking.ts

### Problem: Alerts not arriving
**Cause:** Email/Slack provider issue or configuration error  
**Action:**
1. Check EMAIL_PROVIDER in Vercel environment
2. Verify SENDGRID_API_KEY or AWS credentials
3. Test: `curl -X POST .../api/test-alert`
4. Check spam folder for emails
5. If Slack: Verify webhook URL is valid

### Problem: Remediation not working (MTTR > 120s)
**Cause:** Orchestration engine not executing actions  
**Action:**
1. Check Supabase: `SELECT * FROM orchestrations ORDER BY created_at DESC LIMIT 5;`
2. Look at remediation actions and their status
3. Check Vercel logs for orchestration errors
4. May need to investigate specific remediation engine (rollback, scaling, etc.)

### Problem: Cascading failures detected
**Cause:** One service failure spreading to others  
**Action:**
1. IMMEDIATE: Reduce traffic to incident response
2. Check Vercel logs for root cause
3. May need to manually intervene
4. Hold traffic increase until root cause fixed

### Problem: False positive rate > 5%
**Cause:** Fingerprinting too broad, grouping unrelated errors  
**Action:**
1. Review error patterns in Supabase
2. Check GitHub issues created (false positives?)
3. Adjust fingerprinting logic: lib/error-tracking.ts → normalizeError()
4. Re-deploy and monitor

---

## When To Contact Vercel/Supabase

- **Vercel:** Deployment issues, function timeouts, resource limits
- **Supabase:** Database connection issues, query slowness, disk space
- **SendGrid/AWS:** Email delivery failures

All contact info in [incident runbooks](./INCIDENT-RUNBOOKS.md).

---

## Success Criteria Summary

**After 48 hours of pilot launch, you should see:**

1. **Zero automation failures** — All systems working
2. **Reliable incident detection** — When errors occur, detected < 30s
3. **Quick remediation** — Incidents recover < 120s
4. **100% alert delivery** — You're always notified
5. **Low false positives** — < 5% of alerts are noise
6. **GitHub issues tracking** — Prevention measures created
7. **Metrics dashboard visible** — Real-time data available
8. **No cascading failures** — One failure doesn't trigger others

**If all above true:** ✓ Ready to move to 100% production rollout.

---

**Status: Ready for Pilot Launch**

Once prerequisites approved and deployed, use this guide to monitor the first 48 hours. All systems are self-healing; your role is decision-maker for traffic increases and emergency rollback authority.

Questions during pilot? Check [incident runbooks](./INCIDENT-RUNBOOKS.md) for remediation procedures.
