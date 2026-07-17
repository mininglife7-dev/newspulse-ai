# Founder Monitoring Dashboard — Quick Reference

**Purpose:** Monitor EURO AI production health without technical overhead.

**Daily Check (2 minutes):**

```bash
# Check alerts
curl https://newspulse-ai.vercel.app/api/alerts | jq '.alerts[] | select(.severity == "critical")'

# Check deployment status
curl https://newspulse-ai.vercel.app/api/verify-deployment | jq .

# Check health
curl https://newspulse-ai.vercel.app/api/health | jq .
```

Expected output: All return `"ok": true` or `"status": "ready"`

---

## Dashboard URLs (Bookmark These)

| Dashboard             | URL                                                      | Check For                 |
| --------------------- | -------------------------------------------------------- | ------------------------- |
| **Vercel Deployment** | https://vercel.com/lalit-kumar-d-s-projects/newspulse-ai | Status: "Ready"           |
| **Vercel Analytics**  | https://vercel.com/dashboard/analytics                   | Uptime >99%, errors <1%   |
| **Supabase Health**   | https://app.supabase.com → [Project] → Status            | All green                 |
| **GitHub Actions**    | https://github.com/mininglife7-dev/newspulse-ai/actions  | Latest workflow: ✅ or ⚠️ |
| **Alerts Hub**        | https://newspulse-ai.vercel.app/api/alerts               | No critical alerts        |

---

## Daily Checklist (Morning, 5 min)

- [ ] Open Vercel dashboard → Production deployment status = "Ready"?
- [ ] Open Supabase → Project status all green?
- [ ] Check /api/alerts → Any critical alerts?
- [ ] Check /api/production-health → All endpoints "ok"?
- [ ] Scan emails → Any customer issues overnight?
- [ ] Check GitHub → Latest PR merged successfully?

If **any red flag**, open INCIDENT_RESPONSE.md (below).

---

## Weekly Deep Dive (Friday, 15 min)

| Check          | Where                        | Action                                 |
| -------------- | ---------------------------- | -------------------------------------- |
| Uptime         | Vercel Analytics             | Target: >99.9%                         |
| Error rate     | /api/error-rate              | Target: <1%                            |
| Performance    | /api/performance-baseline    | Watch for >1.5x baseline latency       |
| Security       | /api/security-scan           | Update npm if critical vulnerabilities |
| Costs          | Vercel + Supabase dashboards | Alert if >$50/month total              |
| Customer usage | /api/customer-retention      | Are customers active and engaged?      |
| Knowledge log  | /api/knowledge               | Any patterns or risks recorded?        |

---

## Key Metrics at a Glance

**System Health:**

```
✅ Vercel uptime:    99.95%
✅ Supabase uptime:  99.99%
✅ Error rate:       0.2%
✅ Avg response time: 234ms
```

**Customer Metrics:**

```
📊 Active workspaces:  [NUMBER]
📊 Avg daily users:    [NUMBER]
📊 Feature adoption:   [PERCENT]%
📊 Customer health:    [AVG_SCORE]/100
```

**Operational:**

```
💾 Database size:     [SIZE] GB
💾 Backup status:     ✅ Daily
📈 Cost this month:   $[AMOUNT]
⚠️  Vulnerabilities:  7 (4 moderate, 2 high, 1 critical)
```

---

## When Something Looks Wrong

**Red flag: "Ready" → "Failed" on Vercel**

1. Check what changed: `git log --oneline -5`
2. Check Vercel build logs: Click "Failed" deployment → View logs
3. If recent deploy caused it: Use rollback procedure (see OPERATIONAL_READINESS.md)

**Red flag: /api/alerts shows critical**

1. Read the alert message
2. Check which system failed (DNS-GOV-001 through DNS-GOV-018)
3. Follow incident response playbook below

**Red flag: Error rate >5%**

1. Check Vercel function logs: https://vercel.com/[project]/functions
2. Identify error pattern (signup failing? API timeout? Database?)
3. Correlate with any recent changes
4. Rollback if within last hour, or escalate

**Red flag: Supabase status = "Degraded"**

1. Check status page: https://status.supabase.com
2. If supabase-wide outage: Customer impact, but you can't fix it (wait for Supabase)
3. If project-specific: Check Supabase dashboard → Resource usage
4. May need to contact Supabase support

---

## Quick Incident Response (See full playbook in OPERATIONAL_READINESS.md)

| Symptom                       | Likely Cause                     | Action                                          |
| ----------------------------- | -------------------------------- | ----------------------------------------------- |
| Signup failing, 403 error     | Supabase schema not deployed     | Deploy schema (SUPABASE-PRODUCTION-SETUP.md)    |
| All APIs returning 500        | Database connection failed       | Check Supabase health + restart connection pool |
| Page loads slow (>5s)         | Heavy load or query inefficiency | Check Vercel analytics, may need to scale       |
| Email not sending             | Supabase email config            | Check Email auth enabled in Supabase settings   |
| Monitoring alerts not working | GitHub Actions spending limit    | Increase spending limit (Priority 2 action)     |
| Customer reports data missing | Database issue                   | Check Supabase backups, restore if needed       |

---

## Communicating with Customers During Issues

**For short outages (<10 min):**
→ No need to notify (probably resolved before they notice)

**For medium outages (10-60 min):**
→ Send status email (see COMMUNICATION_TEMPLATES.md #10)
→ Include: What happened, when we fixed it, next steps

**For long outages (>1 hour):**
→ Email immediately with ETA
→ Update every 30 minutes
→ Post-mortem email when resolved
→ Include: Root cause, how we prevent it next time

**For data loss / security issue:**
→ Email immediately (no delays)
→ Explain impact clearly
→ Outline mitigation steps
→ Offer direct support

---

## Automation Ideas (Phase 2)

These would reduce manual monitoring overhead:

- [ ] Slack alerts when /api/alerts detects critical issue
- [ ] Daily email digest of metrics (uptime, errors, costs)
- [ ] Auto-rollback on error rate >15% (if safe)
- [ ] SMS alert for critical system down (outages only)
- [ ] Weekly email: "Your governance status this week"

---

## Success Indicators

You're doing great if:

✅ Zero critical production issues in first month  
✅ Customer signup-to-active rate >80%  
✅ Error rate <1%  
✅ API response time <500ms  
✅ Uptime >99.9%  
✅ Customer support response time <2 hours  
✅ Zero customer data loss incidents

---

## Emergency Contacts

| Service          | Status Page           | Support             |
| ---------------- | --------------------- | ------------------- |
| Vercel           | status.vercel.com     | Support dashboard   |
| Supabase         | status.supabase.com   | In-app support chat |
| GitHub           | status.github.com     | Issue tracker       |
| CloudFlare (CDN) | status.cloudflare.com | Dashboard           |

---

**Pro Tip:** Bookmark the Alerts Hub and check it first thing every morning. It will tell you everything you need to know.

**Pro Tip 2:** Keep OPERATIONAL_READINESS.md open in a browser tab for quick reference during incidents.

**Pro Tip 3:** Document every outage/issue in /api/knowledge so you learn patterns over time.

You've got this! 🚀
