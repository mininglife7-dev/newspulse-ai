# 🚀 Launch Day Procedures

**Timeline:** Day of first customer signup  
**Duration:** ~2 hours total (mostly hands-off monitoring)  
**Owner:** Founder  
**Support:** Governor (autonomous monitoring)

---

## Pre-Launch (T-60 minutes)

### 1. Final System Check (5 min)

```bash
# Verify all systems green
./scripts/verify-launch-readiness.sh
```

Expected output: All checks ✅ PASS

If any check fails:

- See: `docs/governance/FOUNDER_QUICK_REFERENCE.md` (troubleshooting)
- Do NOT proceed to launch if database check fails

### 2. Verify Monitoring Active (5 min)

- [ ] GitHub Actions workflows enabled
  - URL: https://github.com/mininglife7-dev/newspulse-ai/actions
  - Should see recent successful runs

- [ ] Alerts configured
  - Slack notifications ready (if configured)
  - Email alerts enabled
  - GitHub issues auto-creation active

- [ ] Health endpoint accessible
  - URL: https://your-vercel-app.vercel.app/api/health
  - Should return `"status": "healthy"`

### 3. Email System Ready (5 min)

- [ ] SendGrid API key configured (in `.env.local`)
- [ ] Test email can be sent (optional dry-run)
- [ ] Customer email template prepared:
  - See: `docs/customer/COMMUNICATION_TEMPLATES.md`
  - Customize with customer name/details

---

## Launch (T-0 minutes)

### Step 1: Send Welcome Email (2 min)

**To:** First customer email address  
**Subject:** Welcome to [Platform Name]  
**Template:** `docs/customer/COMMUNICATION_TEMPLATES.md` → "Welcome Email"

**Content checklist:**

- [ ] Customer name personalized
- [ ] Signup link or credentials included
- [ ] First step instructions clear
- [ ] Support contact information provided

**Copy-paste template:**

```
Subject: Welcome to [Platform Name] — Your AI Governance Platform

Hello [Customer Name],

You're invited to join [Company Name] as our first pilot customer for [Platform Name].

Getting started:
1. Sign up: https://your-vercel-app.vercel.app/auth/signin
2. Create workspace with your company details
3. Add your first AI system to inventory
4. Run risk assessment (5-10 min)
5. Generate compliance report

Questions? Reply to this email or contact: [support email]

Best regards,
[Founder Name]
[Company]
```

### Step 2: Open Monitoring Dashboard (1 min)

**Monitor in real-time:**

1. **Production Health:**
   - URL: https://your-vercel-app.vercel.app/api/health
   - Refresh every 30 seconds
   - Alert if `"status"` ≠ `"healthy"`

2. **GitHub Actions:**
   - URL: https://github.com/mininglife7-dev/newspulse-ai/actions
   - Watch for workflow runs
   - Alert if any run fails

3. **Application Logs:**
   - URL: https://your-vercel-app.vercel.app (open in browser)
   - Open browser DevTools console
   - Watch for errors
   - Alert on console errors

4. **Alerts Hub:**
   - URL: https://your-vercel-app.vercel.app/api/alerts
   - Returns JSON of any system issues
   - Alert if critical/high severity items appear

### Step 3: Monitor First Customer Journey (20-30 min)

**Watch for customer actions:**

1. **Email opened** (watch for re-engagement)
   - Manual check: Ask customer or wait for activity log

2. **Account created**
   - Check: Supabase `users` table has new entry
   - Verify: Email confirmed (if verification required)

3. **Workspace created**
   - Check: `workspaces` table has new entry
   - Verify: Customer can see workspace in UI

4. **First AI system added**
   - Check: `ai_systems` table populated
   - Success indicator: System appears in inventory

5. **Risk assessment started**
   - Check: Assessment questions load
   - Verify: Can submit assessment

6. **Compliance report generated**
   - Check: Report PDF downloads
   - Verify: Customer receives report

7. **First support contact (if any)**
   - Check: Support email or Slack
   - Note: Response time (should be <1 hour per SLA)

**Automated monitoring:**

- Governor monitors health checks every 5 min
- Alerts you if system degrades
- GitHub Actions failures trigger GitHub issues

---

## Mid-Launch (T+30 minutes)

### Check Customer Engagement

**Every 15 minutes, verify:**

1. **System is up**

   ```bash
   curl https://your-vercel-app.vercel.app/api/health
   ```

   Should return: `"ok": true`

2. **Database responsive**
   - Check Supabase dashboard for query performance
   - Alert if P95 latency > 1 second

3. **No errors accumulating**
   - Check `/api/alerts`
   - Alert if error count > 10 in 5 min

4. **Monitoring workflows active**
   - Check GitHub Actions page
   - At least one workflow should have run

### Customer Communication

**If customer hasn't signed up after 15 min:**

1. Check email delivery (Supabase auth emails)
2. Verify SendGrid configuration
3. Send follow-up manual email with direct signup link

**If customer gets stuck:**

1. Check logs for error messages
2. Reference troubleshooting in `docs/governance/FOUNDER_QUICK_REFERENCE.md`
3. Provide live support with step-by-step guidance

---

## Post-Launch (T+60 minutes)

### Success Criteria Met?

**Go-Live Metrics:**

- [ ] Customer account created
- [ ] At least one AI system added to inventory
- [ ] Risk assessment completed
- [ ] Compliance report generated
- [ ] No critical errors in monitoring
- [ ] System uptime: 100% (no downtime alerts)

**If all ✅:** Proceed to weekly monitoring

**If any ❌:**

1. Diagnose issue using troubleshooting guide
2. Apply fix (see runbooks in `docs/infra/`)
3. Retry verification
4. If issue persists: Contact Supabase/Vercel support

### Document Launch Results

**Create launch record:**

```
Launch Date: [Date/Time]
Customer: [Name]
First Action Time: [Time]
Time to First System: [Minutes]
Time to First Assessment: [Minutes]
Time to First Report: [Minutes]
Issues Encountered: [List or "None"]
Resolution: [If issues occurred]
Customer Satisfaction: [Based on support interactions]
```

Save to: `docs/launch-records/` (create directory)

---

## Ongoing Monitoring (Week 1)

### Daily Checklist (5 min per day)

**Every morning:**

```bash
# Check health
curl https://your-vercel-app.vercel.app/api/health

# Review alerts
curl https://your-vercel-app.vercel.app/api/alerts

# Check workflows
# https://github.com/mininglife7-dev/newspulse-ai/actions
```

**Daily thresholds:**

- Uptime: >99.9% (max 4 sec downtime per day)
- Error rate: <1%
- P95 latency: <1 second
- No critical alerts

### Weekly Review (30 min)

**Every Friday:**

1. Aggregate metrics from `monitoring-logs/`
2. Review customer interactions and support tickets
3. Check GitHub Actions spending (should be $0-5/week)
4. Document any issues or improvements needed
5. Plan next week's operational focus

---

## Emergency Procedures

### System Down (Production Alert)

**If `/api/health` returns 503 or error:**

1. **Check status:** https://status.vercel.com
2. **If Vercel issue:**
   - Wait for Vercel to recover
   - No action needed

3. **If application issue:**
   - Check: Recent deployments (did something break?)
   - Action: Click "Rollback" on Vercel to previous version
   - Verify: `/api/health` returns 200

4. **If database issue:**
   - Check: Supabase status
   - Action: Review Supabase error logs
   - Recovery: Restore from backup if data corrupted

See: `docs/governance/FOUNDER_QUICK_REFERENCE.md` for full procedures

### High Error Rate (>5% in 5 min)

**Indicators:**

- `/api/alerts` shows many error items
- GitHub Actions `aggregate-errors` workflow triggered
- GitHub issue auto-created

**Response:**

1. Identify error pattern (use `/api/error-tracking`)
2. Check recent code changes (did we deploy a bug?)
3. If recent deploy caused it: Rollback
4. If other issue: Check logs, apply fix, redeploy
5. Verify error rate drops below 1%

### Database Performance Degradation (P95 > 5s)

**Indicators:**

- Health check latency increases
- Customer complaints about slowness
- GitHub `track-performance-baseline` alerts

**Response:**

1. Check Supabase query analytics
2. Identify slow queries
3. Look for missing indexes or bad queries
4. Apply fix (add index, optimize query)
5. Monitor for 30 min to confirm improvement

---

## First Customer Escalation

### If Customer Can't Sign Up

1. **Check email:**
   - Verify Supabase auth email sent
   - Check spam folder
   - If email not sent: Check SendGrid API key

2. **Manual workaround:**
   - Create account directly in Supabase (admin)
   - Send customer temporary password
   - Have them reset password on first login

3. **Permanent fix:**
   - Debug auth flow
   - Test email delivery
   - Redeploy if code fix needed

### If Customer Reports Slow Performance

1. **Reproduce:**
   - Try the action they reported
   - Check if you see same slowness

2. **Diagnose:**
   - Check Supabase performance dashboard
   - Look for query performance issues
   - Check Vercel server metrics

3. **Resolve:**
   - Optimize queries (add indexes)
   - Scale if needed
   - Monitor for improvement

### If Customer Requests Feature

1. **Document:**
   - Record feature request
   - Note customer use case
   - Add to `docs/governance/PHASE-3-CANDIDATES.md`

2. **Respond:**
   - Thank them for feedback
   - Explain current scope
   - Commit to roadmap review timing
   - Set expectations for timing

---

## Success Metrics (Week 1)

| Metric                    | Target        | Actual   | Status   |
| ------------------------- | ------------- | -------- | -------- |
| **Uptime**                | >99.9%        | ___%     | ✅/⚠️/❌ |
| **Error Rate**            | <1%           | __%      | ✅/⚠️/❌ |
| **P95 Latency**           | <1s           | __ms     | ✅/⚠️/❌ |
| **Customer Journey**      | 100% complete | ✅/⚠️/❌ | ✅/⚠️/❌ |
| **Support Response**      | <1 hr         | __min    | ✅/⚠️/❌ |
| **Customer Satisfaction** | Positive      | _____    | ✅/⚠️/❌ |

---

## Notes for Future Launches

After this first customer, document what went well and what to improve for customer #2:

- [ ] Smoothest part of process: _____________
- [ ] Hardest part: _____________
- [ ] Customer questions: _____________
- [ ] Unexpected issues: _____________
- [ ] Improvement for next time: _____________

---

**Good luck! 🚀 You've got this.**

All systems are ready. Trust the work that's been done.

Governor will be monitoring automatically. Focus on the customer experience.
