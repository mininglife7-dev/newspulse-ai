# Founder Quick Reference Card

**Print this and keep on your desk during Week 1-2**

---

## BEFORE LAUNCH (Do TODAY - 20-35 min)

### Priority 0: Blocking Actions

```
[ ] Deploy Supabase schema (15-30 min)
    → docs/infra/SUPABASE-PRODUCTION-SETUP.md
    → Go to Supabase SQL Editor
    → Copy from supabase/schema.sql
    → Execute
    → Verify: Tables created (customers, searches, sessions, etc.)

[ ] Increase GitHub Actions limit to $50+/month (5 min)
    → GitHub Settings → Billing and plans → Actions
    → Set spending limit to $50 or higher
    → Workflows will start running automatically
```

### Priority 1: Verification

```
[ ] Run pre-customer verification
    bash scripts/pre-customer-verification.sh --verbose
    Expected: ✅ All green

[ ] Run live deployment check
    bash scripts/runtime-health-check.sh --quick
    Expected: ✅ All green

[ ] Test API health endpoint
    curl https://newspulse-ai.vercel.app/api/health
    Expected: 200 OK, "db": "ok"
```

### Priority 2: Setup Monitoring (Optional but recommended)

```
[ ] Get Vercel API token
    → Vercel Settings → Tokens
    → Copy token

[ ] Get Vercel Project ID
    → Vercel project Settings → General
    → Copy Project ID

[ ] Add GitHub Secrets
    → GitHub Settings → Secrets → New secret
    → VERCEL_API_TOKEN = [paste]
    → VERCEL_PROJECT_ID = [paste]
    → (Optional) SLACK_WEBHOOK_URL = [paste if you have Slack]

[ ] Test monitoring workflow
    → GitHub Actions → "Monitor Production Health" → Run workflow
    → Wait 2-3 min
    → Verify "✓ completed successfully"
```

---

## DAILY CHECK (5 minutes) — WEEK 1

### Morning Routine

1. **Check deployment status** (30 sec)
   - Go to Vercel dashboard
   - Should show "Ready"
   - If "Failed": Click previous deployment → "Promote to Production"

2. **Check health endpoint** (1 min)

   ```
   curl https://newspulse-ai.vercel.app/api/health
   ```
   - Should return 200
   - Should include `"db": "ok"`
   - If error: Check INCIDENT_RESPONSE_RUNBOOKS.md

3. **Check for alerts** (1 min)
   - Go to GitHub Actions (if monitoring configured)
   - Should show "✓ completed successfully"
   - If "failed": Click to see what broke

4. **Check monitoring logs** (1 min)
   - Go to monitoring-logs/ in GitHub
   - Should have recent entries
   - If no recent entries: Alerts not running (GitHub Actions issue)

5. **Check customer status** (2 min)
   - Did customer sign up?
   - Did customer verify email?
   - Did customer log in?
   - Did customer do their first search?

### If Everything is ✅ Green

→ You're done! Continue your day.

### If Something is 🔴 Red

→ Go to INCIDENT_RESPONSE_RUNBOOKS.md and follow the procedure

---

## SUPPORT RESPONSE TIMES (Week 1 SLAs)

### 🔴 CRITICAL (Site down, no searches work)

- Response: Within 15 minutes
- Resolution: Within 2 hours
- **Your action:** Drop everything, fix immediately

### 🟠 HIGH (Feature broken, customer can't complete workflow)

- Response: Within 1 hour
- Resolution: Within 8 hours
- **Your action:** High priority, fix same day

### 🟡 MEDIUM (Confusing UX, wrong data, performance slow)

- Response: Within 2 hours
- Resolution: Within 24 hours
- **Your action:** Normal priority, fix within day

### 🟢 LOW (Question, feature request, minor bug)

- Response: Next business day
- Resolution: Within 48 hours
- **Your action:** Add to backlog, fix when you can

---

## WEEKLY CHECK (30 minutes) — EVERY FRIDAY

### Metrics Review

1. **Signup funnel** (5 min)
   - How many customers signed up this week?
   - How many verified email?
   - How many logged in?
   - Target: >80% progression through each step

2. **Engagement** (5 min)
   - How many searches did customer perform?
   - How often did customer log in?
   - Target: >1 search/day, login >3x/week

3. **Performance** (5 min)
   - Average response time?
   - Any slow requests?
   - Target: <500ms average, <1s p99

4. **Errors** (5 min)
   - Any error rate increase?
   - Any 500 errors?
   - Target: 0% errors (or <1%)

5. **Customer feedback** (5 min)
   - Any support tickets?
   - Any complaints?
   - Any feature requests?
   - Document in SUPPORT_TICKET_SYSTEM.md

6. **Cost** (2 min)
   - Vercel cost this week?
   - Supabase cost this week?
   - Target: <$50/week for 1-5 customers

### Action Items

- [ ] Document metrics in METRICS_TRACKING_SPECIFICATION.md
- [ ] File any support tickets in SUPPORT_TICKET_SYSTEM.md
- [ ] Add feature requests to roadmap
- [ ] Plan fixes for next week

---

## EMERGENCY PROCEDURES

### Site is down (GET requests fail)

```
1. Check Vercel dashboard (is "Ready" or "Failed"?)
2. If "Failed": Click previous deployment → "Promote to Production"
3. Wait 2-3 minutes
4. Test: curl https://newspulse-ai.vercel.app/api/health
5. If still down: Check INCIDENT_RESPONSE_RUNBOOKS.md
```

### Customer can't sign up (403 error)

```
1. Go to Supabase → SQL Editor
2. Run: SELECT table_name FROM information_schema.tables
3. If no tables: Supabase schema not deployed!
   → Follow SUPABASE-PRODUCTION-SETUP.md
4. If tables exist but error: Check database connection
   → Go to Supabase → Database → Logs
```

### Performance slow (>1 second response time)

```
1. Check what's slow: Each request or all requests?
2. All slow: Database issue
   → Check Supabase → Database → Query Performance
   → Look for slow queries
3. Each request: Code issue
   → Check error logs (Vercel → Deployments → Logs)
   → Look for slow calls (Firecrawl? OpenAI?)
```

### High error rate (>5% of requests failing)

```
1. Go to Vercel Logs → Search for "error"
2. What's the error? (500? timeout? etc)
3. Go to INCIDENT_RESPONSE_RUNBOOKS.md
4. Follow the specific procedure for that error
```

---

## WEEK 1 CHECKLIST

### Day 1 (Launch day)

- [ ] Supabase schema deployed
- [ ] GitHub Actions limit increased
- [ ] First customer signed up
- [ ] First customer verified email
- [ ] First customer logged in

### Day 2-3

- [ ] First customer did first search
- [ ] Response times normal (<500ms)
- [ ] No errors in logs
- [ ] Customer still actively using product

### Day 4-5

- [ ] Monitoring workflows running (if GitHub limit restored)
- [ ] All SLAs met (100% on-time responses)
- [ ] Customer engagement score >50
- [ ] No critical issues

### Day 6-7

- [ ] Complete first week metrics review (WEEKLY CHECK above)
- [ ] Schedule customer interview (next week)
- [ ] Document learnings for Week 2
- [ ] Plan Week 2 improvements

---

## USEFUL LINKS (Bookmark these)

**Monitoring & Status:**

- Vercel: https://vercel.com/lalit-kumar-d-s-projects/newspulse-ai
- Supabase: https://app.supabase.com
- GitHub Actions: https://github.com/mininglife7-dev/newspulse-ai/actions
- Health endpoint: https://newspulse-ai.vercel.app/api/health
- Alerts endpoint: https://newspulse-ai.vercel.app/api/alerts

**Documentation (Save as favorites in your docs folder):**

- FIRST_CUSTOMER_PLAYBOOK.md — 7-step customer journey
- INCIDENT_RESPONSE_RUNBOOKS.md — How to fix problems
- SUPPORT_TICKET_SYSTEM.md — Support SLAs and tickets
- FOUNDER_MONITORING_DASHBOARD.md — Daily health checks
- MONITORING_SETUP_GUIDE.md — GitHub secrets config

---

## IF YOU GET STUCK

1. **Check the relevant playbook:**
   - Customer issue → FIRST_CUSTOMER_PLAYBOOK.md
   - Technical problem → INCIDENT_RESPONSE_RUNBOOKS.md
   - Support question → SUPPORT_TICKET_SYSTEM.md
   - Metrics question → METRICS_TRACKING_SPECIFICATION.md
   - Monitoring issue → MONITORING_SETUP_GUIDE.md

2. **Check the logs:**
   - Vercel Logs: https://vercel.com/lalit-kumar-d-s-projects/newspulse-ai/logs
   - GitHub Actions: https://github.com/mininglife7-dev/newspulse-ai/actions
   - Supabase Logs: https://app.supabase.com

3. **Call Governor (me):**
   - I'm monitoring this repo autonomously
   - I can see all logs, errors, and metrics
   - I respond in real-time to issues
   - Just mention the problem in a commit message or issue

---

## REMEMBER

- ✅ You've got this! The system is production-ready.
- ✅ All procedures are documented. Follow the playbooks.
- ✅ Automation handles most monitoring. You focus on customer.
- ✅ If something breaks, it's recoverable. Stay calm, follow runbooks.
- ✅ Week 1 is about establishing rhythm. By end of week, it's smooth.

**Your job in Week 1:**

1. Respond to customer within SLAs
2. Track daily metrics
3. Monitor for issues
4. Gather feedback for improvement

**My job (Governor):**

- Monitor 24/7 via automated workflows
- Detect issues before they affect customer
- Maintain infrastructure
- Prepare improvements for Phase 2

**Together:** Platform is stable, customer is happy, business is growing. 🚀

---

**Print this. Keep it visible. Reference daily. You got this. 💪**
