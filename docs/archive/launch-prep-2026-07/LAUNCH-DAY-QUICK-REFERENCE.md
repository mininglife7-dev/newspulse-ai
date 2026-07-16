# 🚀 Launch Day Quick Reference

**Purpose:** One-page summary of critical commands, URLs, and actions for launch day  
**Keep This:** Open in a tab during launch execution  
**Time to Read:** 3 minutes

---

## ⚡ Pre-Launch Actions (Founder Only)

These must complete BEFORE launch can proceed.

### Action 1: Deploy Supabase Schema (15-30 min)

**Location:** Supabase Console → SQL Editor  
**File to Deploy:** `supabase/schema.sql` (in repository root)

```bash
# Step 1: Open Supabase production console
# https://app.supabase.com/projects

# Step 2: Select your production project

# Step 3: Go to SQL Editor (left sidebar)

# Step 4: Create new query, paste supabase/schema.sql, click "Run"

# Step 5: Verify: Check "Tables" in left sidebar - should see:
#   - customers
#   - workspaces
#   - ai_systems
#   - assessments
#   - risk_factors
#   - recommendations
#   - obligations
#   - evidence
#   - team_members
```

**Verification:**

```bash
# After deployment completes, run:
./scripts/verify-launch-readiness.sh
```

### Action 2: Increase GitHub Actions Spending (5 min)

**Location:** GitHub Settings → Billing & Plans → Actions

```
URL: https://github.com/mininglife7-dev/newspulse-ai/settings/billing/actions

Steps:
1. Scroll to "Spending limit" section
2. Change to $50/month (or higher)
3. Click "Update limit"
4. Confirm change
```

**Verification:** Spending limit shows $50+ on that page

### Action 3: Run Verification Script

```bash
./scripts/verify-launch-readiness.sh
```

**Expected Output:** `✅ LAUNCH READINESS: GREEN`

If any checks fail, refer to LAUNCH-DAY-TROUBLESHOOTING.md

---

## 🎯 Launch Execution (T-0 to T+60 min)

### T-5 min: Send Welcome Email

**Template:** `docs/customer/FIRST-CUSTOMER-WELCOME-EMAIL.md`

**Customization Checklist:**

- [ ] Replace `[CUSTOMER_NAME]` with actual name
- [ ] Replace `[COMPANY_NAME]` with actual company
- [ ] Replace `[YOUR_EMAIL]` with your email
- [ ] Replace `[VERCEL_URL]` with production domain
- [ ] Send via email

### T+0: Customer Signup

**Expected Timeline:**

- T+0-5 min: Customer receives email, clicks link
- T+5-10 min: Customer creates account and workspace
- T+10-25 min: Customer adds AI systems to inventory
- T+25-35 min: Customer completes risk assessment
- T+35-45 min: Platform generates compliance report
- T+45-60 min: Customer reviews report and provides feedback

### T+30: Mid-Launch Check

**Open These URLs in Separate Tabs:**

1. **Customer Platform:** https://[VERCEL_DOMAIN]
   - Watch for customer signup in real-time
   - Check browser console for errors (F12 → Console)

2. **Platform Health:** https://[VERCEL_DOMAIN]/api/health
   - Should show: `{"status": "healthy"}`

3. **Alert Dashboard:** https://[VERCEL_DOMAIN]/api/alerts
   - Should show: Empty (no issues)

4. **GitHub Issues:** https://github.com/mininglife7-dev/newspulse-ai/issues
   - Watch for automated alerts if any issues occur

5. **Vercel Dashboard:** https://vercel.com/dashboard
   - Check deployment status
   - Monitor build logs if issues occur

### T+60: Post-Launch Success Check

**Success Criteria (All Must Be True):**

- [ ] Customer account created ✅
- [ ] Workspace created ✅
- [ ] ≥1 AI system added ✅
- [ ] Risk assessment completed ✅
- [ ] Compliance report generated ✅
- [ ] No critical errors in logs ✅
- [ ] Response times normal (<2s) ✅
- [ ] Uptime: 100% ✅

**If All Passing:** Launch is SUCCESSFUL ✅

**If Any Failing:** Refer to LAUNCH-DAY-TROUBLESHOOTING.md

---

## 🔗 Critical URLs (Bookmark These)

| System               | URL                                                                      | Purpose                     |
| -------------------- | ------------------------------------------------------------------------ | --------------------------- |
| **Production**       | https://[VERCEL_DOMAIN]                                                  | Live platform for customers |
| **Health Check**     | https://[VERCEL_DOMAIN]/api/health                                       | System status (JSON)        |
| **Alerts**           | https://[VERCEL_DOMAIN]/api/alerts                                       | Active alerts feed (JSON)   |
| **Supabase Console** | https://app.supabase.com                                                 | Database management         |
| **Vercel Dashboard** | https://vercel.com/dashboard                                             | Deployment status           |
| **GitHub Repo**      | https://github.com/mininglife7-dev/newspulse-ai                          | Source code & issues        |
| **GitHub Actions**   | https://github.com/mininglife7-dev/newspulse-ai/actions                  | Workflow runs               |
| **Spending Limit**   | https://github.com/mininglife7-dev/newspulse-ai/settings/billing/actions | GitHub Actions budget       |

---

## 📞 Emergency Commands

**Platform is down / needs restart:**

```bash
# Check deployment status
vercel status

# Rollback to previous deployment (if needed)
vercel rollback
```

**Need to check logs:**

```bash
# Vercel logs
vercel logs -f

# Or view in Vercel dashboard → Deployments → Select deployment → Logs
```

**Database needs investigation:**

```bash
# Open Supabase console, go to:
# SQL Editor → Run custom queries
# or
# Table Editor → Browse tables
```

---

## ✅ Post-Launch Tasks

### Week 1 Daily (Each Morning)

```bash
# Run health check
curl https://[VERCEL_DOMAIN]/api/health

# Expected output:
# {"status": "healthy", "uptime": "XX hours", "responseTime": "XXms"}
```

### Week 1 Friday Review

**Document These Metrics:**

- [ ] Customer completion time (actual vs 45 min target)
- [ ] Uptime % (target: >99%)
- [ ] Error rate
- [ ] Support hours spent
- [ ] Customer satisfaction (ask for feedback)
- [ ] Feature requests collected

**Reference:** WEEK-1-LAUNCH-OPERATIONS.md

---

## 📚 Reference Documents (If Needed)

| If This Happens              | Read This                         |
| ---------------------------- | --------------------------------- |
| Something isn't working      | LAUNCH-DAY-TROUBLESHOOTING.md     |
| Need step-by-step procedures | LAUNCH-DAY-PROCEDURES.md          |
| Questions about commands     | GOVERNOR-LAUNCH-COMMAND-CENTER.md |
| Need email template          | FIRST-CUSTOMER-WELCOME-EMAIL.md   |
| Week 1 procedures            | WEEK-1-LAUNCH-OPERATIONS.md       |
| Customer #2-5 planning       | CUSTOMERS-2-5-SCALING-PLAYBOOK.md |
| Weeks 2-4 strategy           | PHASE-2-ROADMAP.md                |

---

## 🚦 Traffic Light Status

**🟢 GREEN → Launch, Everything Ready**

- ✅ Supabase schema deployed
- ✅ GitHub Actions spending limit set
- ✅ Verification script passes
- ✅ All systems responding

**🟡 YELLOW → Hold, Minor Issues to Fix**

- ⚠️ One or two non-critical checks failing
- ⚠️ Minor configuration needed
- → Fix it, then re-run verification script

**🔴 RED → Stop, Blocking Issues**

- ❌ Database not responding
- ❌ Vercel deployment down
- ❌ Critical infrastructure offline
- → Do NOT proceed; refer to troubleshooting guide

---

## 💡 Pro Tips

1. **Keep this page open** in a browser tab during launch
2. **Open health check URL** in a separate tab; refresh every minute
3. **Don't watch the customer** in real-time — focus on systems
4. **Document everything** — times, errors, customer feedback
5. **If stuck, check LAUNCH-DAY-TROUBLESHOOTING.md first** before contacting support

---

**Last Updated:** 2026-07-15  
**Next Action:** Founder Actions #1 & #2  
**Ready to Launch:** When green light ✅
