# GOVERNOR AUTONOMOUS OPERATING MANUAL
**Version:** 1.0  
**Part of:** GOVERNOR EXECUTION FABRIC v1  
**Date:** 2026-07-16

---

## FOR: Founder / Executive Authority
## RE: Operating Governor Ω in Production
## TIME TO READ: 10 minutes

---

## WHAT IS GOVERNOR?

Governor Execution Fabric v1 is an autonomous engineering operating system. It handles your technical work (code pushes, deployments, database migrations, testing) completely independently while you focus on strategy and product decisions.

**In Plain English:** Governor is like having a perfect senior engineer who never sleeps, never forgets, and automatically escalates decisions that need you.

---

## HOW GOVERNOR WORKS

### The Autonomous Loop

Every day, Governor continuously:

1. **Observes** — What needs to be done? (PRs, issues, monitoring alerts, failed builds)
2. **Understands** — What's the best approach? (Analysis, planning)
3. **Plans** — How to break it down? (Task decomposition)
4. **Executes** — Do the work (code, deploy, test)
5. **Verifies** — Did it work? (Tests, health checks, verification)
6. **Learns** — What went well? What can improve?
7. **Improves** — Optimize and repeat

This loop runs continuously, without waiting for you.

### When Governor Escalates to You

Governor is **autonomous** for most technical decisions, but **escalates** decisions that affect:

- **Money** (spending, cost optimization decisions)
- **Customers** (product changes, commitments, launch decisions)
- **Legal** (compliance, contracts, data handling)
- **Secrets** (creating/rotating credentials, changing passwords)
- **Destructive operations** (deleting data, rolling back production)
- **Strategy** (product vision, technology choices, hiring)

**Escalations are rare.** Governor handles 95%+ of work autonomously.

---

## YOUR DAILY INTERACTION

### Morning: 5-Minute Status Check

```bash
# Check Governor status
curl http://governor-api/status

# Expected output:
{
  "status": "healthy",
  "missions_completed_today": 12,
  "tasks_autonomous": 47,
  "tasks_escalated": 1,
  "pending_approvals": 1,
  "alerts": []
}
```

### When Governor Needs You

**Approval Notifications** arrive via:
- Email (for critical decisions)
- Slack (for routine approvals)
- Dashboard (always available)

**Typical approval:**
```
🔔 Approval Needed

Action: Deploy to production
Branch: main
Commit: a1b2c3d (Fix: parser race condition)
Tests: ✅ All passing
CI: ✅ Green
Risk: Low (bugfix only)

Approve? [Yes] [No] [Details]
```

**Time to approve:** <1 minute (just click Yes/No, no explanation needed)

### Routine Approvals

These happen ~1-2 times per week:

- Deploy after main branch push (30 seconds to approve)
- Rotate credentials (5 seconds to approve)
- Set environment variable (10 seconds to approve)

---

## COMMON OPERATIONS

### Launch a New Feature

**What you do:**
1. Write product spec
2. Create GitHub issue with spec
3. Tell Governor: "Launch feature X"

**What Governor does:**
1. Breaks feature into tasks
2. Opens PRs for implementation
3. Runs tests continuously
4. Deploys to staging
5. Gets your approval to deploy to production
6. Monitors for issues
7. Reports back on metrics

**Your involvement:** ~10 minutes total (mostly upfront briefing)

### Fix a Production Bug

**What you do:**
1. Identify the bug
2. Tell Governor: "Fix production issue X"

**What Governor does:**
1. Analyzes logs to find root cause
2. Writes a fix
3. Tests locally
4. Runs full test suite
5. Deploys to staging
6. Verifies fix works
7. Asks your approval to deploy to production
8. Deploys and monitors

**Your involvement:** ~2 minutes (approve deployment)

### Investigate a Production Alert

**What you do:**
1. See alert in Slack
2. Tell Governor: "Investigate alert X"

**What Governor does:**
1. Collects logs
2. Analyzes patterns
3. Identifies root cause
4. Proposes fix or escalates if manual action needed
5. Reports findings

**Your involvement:** ~5 minutes (review findings, approve fix)

---

## APPROVAL WORKFLOW

### The Approval Interface

When Governor needs approval:

```
┌─────────────────────────────────────────┐
│         GOVERNOR APPROVAL               │
├─────────────────────────────────────────┤
│                                         │
│ Action:     Deploy to production        │
│ Branch:     main @ a1b2c3d             │
│ Changes:    3 files, +50 -30           │
│                                         │
│ CI Status:  ✅ PASSING                 │
│ Tests:      ✅ 248/248 passing          │
│ Security:   ✅ No vulnerabilities       │
│                                         │
│ Risk Level: 🟢 LOW                     │
│ Type:       Bugfix only                │
│                                         │
│ Reasoning:                              │
│ This is a targeted fix for the parser   │
│ race condition identified in #1234.     │
│ All tests pass, no risky changes.       │
│                                         │
│                                         │
│           [✅ APPROVE]  [❌ DENY]       │
│                                         │
│           [📋 View Details]             │
│                                         │
└─────────────────────────────────────────┘
```

### Approval Decision Rules

| Action | Auto-Approve? | Your Role |
|--------|---------------|-----------|
| Push tested code | ✅ | Nothing |
| Deploy after CI pass | ✅ | Nothing (1-click if needed) |
| Create PR | ✅ | Nothing |
| Fix failing test | ✅ | Nothing |
| **Deploy with CI fail** | ❌ | Approve or reject (risky) |
| **Set secret** | ❌ | Approve only |
| **Rotate credential** | ❌ | Approve only |
| **Delete code/data** | ❌ | Approve or reject |
| **Production rollback** | ❌ | Approve only |

---

## READING THE GOVERNANCE DASHBOARD

### Main Dashboard

```
GOVERNOR STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 Missions (This Week)
   ✅ Completed: 47
   ⚠️  Escalated: 3
   ❌ Failed: 1
   Autonomous Rate: 94%

📊 Tasks (Today)
   ✅ Autonomous: 23
   ⏳ Waiting Approval: 1
   ⚠️  Blocked: 0

🚀 Deployments (This Month)
   Production: 5
   Staging: 12
   Average Time: 2.3 min

🔧 System Health
   Uptime: 99.97%
   API: Healthy
   Database: Healthy
   Vault: Healthy
```

### Audit Trail

```
Recent Actions (Last 24 Hours)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

12:34 UTC ✅ Deployed v1.2.3 to production
         Branch: main @ a1b2c3d
         Status: Healthy
         
11:22 UTC ✅ Merged PR #42 (Fix: parser race)
         Approver: Founder
         Tests: All passing

10:15 UTC ✅ Created backup pre-deploy-2026-07-16
         Database: EU
         Size: 2.3GB

09:00 UTC ⚠️  Escalated: Rotate SECRET key
         Status: Approved by Founder at 09:03

...
```

---

## CRITICAL ALERTS

Governor alerts you immediately for:

**🔴 CRITICAL:**
- Production API down
- Database failure
- Security breach detected
- Unauthorized access attempt
- Data corruption detected

**🟠 WARNING:**
- High error rate (>5%)
- Performance degradation
- Credential about to expire
- Disk space low
- Multiple deployment failures

**🟡 INFO:**
- Deployment started
- Credential rotated
- Backup completed
- New error type detected

---

## WHAT NOT TO DO

### ❌ Don't Manually Deploy

If you deploy manually and Governor doesn't know:
- Governor may try to deploy while you're deploying
- Audit trail breaks
- Verification doesn't happen
- Recovery is harder

**✅ Instead:** Tell Governor to deploy, it handles everything.

### ❌ Don't Manually Rotate Secrets

If you rotate a secret without Governor:
- Governor still has the old secret
- Services break
- Audit trail breaks

**✅ Instead:** Ask Governor to rotate, it updates everything.

### ❌ Don't Approve Unknown Actions

If you see an approval and don't understand it:
- Click [📋 Details]
- Read the reasoning
- Still confused? Click [❌ DENY] and ask Governor to explain

**✅ Never approve what you don't understand.**

### ❌ Don't Ignore Alerts

Alerts mean something needs attention. If Governor can't handle it:
- Escalates to you
- Tells you exactly what's needed
- Waits for your decision

**✅ Check alerts daily, especially critical ones.**

---

## TROUBLESHOOTING

### Governor Seems Stuck

**Signs:**
- No new missions completed
- Dashboard shows "status: waiting"
- No approvals requested

**What to do:**
1. Check Governor health: `curl http://governor-api/health`
2. Check recent logs: `curl http://governor-api/logs?limit=100`
3. If unhealthy, restart: `systemctl restart governor`
4. Contact Governor team if persists

### Governor Is Spamming Alerts

**Signs:**
- Too many notifications
- Alerts seem repetitive

**What to do:**
1. Go to Dashboard → Alerts → Settings
2. Adjust alert thresholds
3. Mute temporary alerts
4. Tell Governor: "Investigate alert noise"

### Governor Got It Wrong

**Signs:**
- Wrong deployment
- Wrong decision made
- Failed to understand requirement

**What to do:**
1. Click [❌ DENY] on the approval
2. Add context: "This needs manual review because..."
3. Governor learns and adjusts next time
4. Still broken? Escalate to Governor team

### Need Governor to Stop

**Emergency stop:**
```bash
# Pause all missions
curl -X POST http://governor-api/control/pause

# Resume when ready
curl -X POST http://governor-api/control/resume
```

---

## MONTHLY GOVERNANCE

### Weekly (30 minutes)

- Review mission summary
- Check autonomous rate (should be 90%+)
- Review escalations (should be <5)
- Verify no security incidents

### Monthly (1 hour)

- Review governance audit log
- Check credential rotation status
- Update risk register if needed
- Provide feedback on Governor's decisions

### Quarterly (2 hours)

- Review permission changes
- Audit approval decisions
- Performance retrospective
- Plan next quarter's capabilities

---

## EXPANDING GOVERNOR'S CAPABILITIES

### Add New Integration

**Example:** Integrate with Slack for notifications

**What you do:**
1. Tell Governor: "Add Slack integration"

**What Governor does:**
1. Develops Slack module
2. Tests with staging workspace
3. Gets your approval
4. Deploys to production
5. Starts sending notifications

**Your involvement:** 5 minutes (approve integration)

### Add New Tool

**Example:** Integrate with AWS for infrastructure

**What you do:**
1. Tell Governor: "Add AWS CLI support"

**What Governor does:**
1. Develops AWS module
2. Adds to tool registry
3. Tests with safe operations first
4. Documents capabilities
5. Waits for your approval

**Your involvement:** 10 minutes (review + approve)

---

## ESCALATION SCENARIOS

### Scenario 1: Security Incident

```
🚨 CRITICAL ALERT

Security: Unauthorized access detected

Source IP: 192.0.2.1
Target: Production database
Time: 14:32 UTC
Status: Access denied (RLS enforced)

Governor Recommendation:
1. Rotate database credentials
2. Review access logs (last 24h)
3. Update firewall rules
4. Send security alert to team

Action Required:
[ Approve All ] [ Approve Selective ] [ Details ]
```

**What to do:**
- Click [Details] to understand full context
- Click [Approve All] if comfortable with recommendations
- Governor executes immediately, monitors for issues
- Reports back on incident resolution

### Scenario 2: Production Degradation

```
⚠️  ALERT: Production Performance Degraded

Metric: API Response Time
Before: p99 = 145ms
Now: p99 = 892ms
Change: +6x spike

Root Cause Analysis:
- New code causing N+1 queries (likely)
- Database connection pool exhausted (possible)
- Increase in traffic (ruled out: traffic normal)

Governor Recommendation:
1. Revert to previous deployment
2. Investigate queries (separate task)
3. Retest before next deploy

Action Required:
[ Approve Rollback ] [ Investigate ] [ Ignore Alert ]
```

**What to do:**
- Click [Approve Rollback] to immediately restore service
- Once stable, tell Governor: "Investigate the query issue"
- Governor roots it out and proposes fix

### Scenario 3: Feature Launch Decision

```
📋 FEATURE READY FOR LAUNCH

Feature: Multi-tenant workspaces
Status: Code complete, tested, ready for production

Verification:
✅ All tests passing (248/248)
✅ Security audit passed
✅ Performance tests within SLA
✅ Database migration verified
✅ Rollback plan documented

Metrics Impact (Projected):
- Load time: no change (<1%)
- Error rate: no increase
- Database latency: +2% (acceptable)

Governor Recommendation:
Deploy to production at 8 AM UTC
(quietest traffic window, rollback ready)

Timeline:
- Deployment: 2-3 minutes
- Monitoring: 30 minutes post-deploy

Go? [ YES ] [ NO ] [ STAGING FIRST ]
```

**What to do:**
- Review the metrics and verification
- If confident: Click [YES]
- If want to test first: Click [STAGING FIRST]
- Governor executes and reports results

---

## EMERGENCY PROCEDURES

### Production Is Down

**Priority 1:**

```
1. Governor detects production down
2. Governor immediately:
   - Rolls back to last known good
   - Sends you CRITICAL alert
   - Starts investigation
3. You receive alert, confirm rollback OK
4. Governor executes rollback, monitors recovery
5. You click ✅ when stable
6. Governor investigates root cause offline
```

**Your action:** Just confirm rollback (1 click)

### Data Loss Incident

**Priority 1:**

```
1. Governor detects data anomaly
2. Governor:
   - STOPS all writes immediately
   - Reverts to last backup
   - Investigates cause
   - Sends you CRITICAL alert
3. You decide: Confirm recovery or manual audit
4. Governor executes recovery
```

**Your action:** Confirm recovery decision

### Credential Compromise

**Priority 1:**

```
1. Suspicious access pattern detected
2. Governor:
   - Revokes compromised credential
   - Rotates all related secrets
   - Blocks attacker IP
   - Sends you CRITICAL alert
3. You review incident details
4. Governor monitors for follow-up attacks
```

**Your action:** Review and approve response

---

## GETTING HELP

### Governor Support Channels

**Urgent (Response: <5 min):**
- Critical alerts channel: `#governor-critical`
- Direct: `governor-support@company.com`

**Standard (Response: <1 hour):**
- Slack: `#governor-help`
- Dashboard: Help → Contact Support

**Questions:**
- FAQ: `docs/governor/FAQ.md`
- Troubleshooting: `docs/governor/TROUBLESHOOTING.md`
- Architecture: `docs/governor/GOVERNOR-EXECUTION-FABRIC-v1-ARCHITECTURE.md`

---

## QUICK REFERENCE

### Governor Commands (Slack/Email)

```
@Governor [command]

Common commands:
- "Deploy main to production" → Deploy latest
- "Investigate alert X" → Root cause analysis
- "Rotate GitHub token" → Credential rotation
- "What failed?" → Show failed tasks
- "Status" → Quick health check
- "Help" → Show available commands
```

### Dashboard Quick Links

- **Status:** `http://governor-api/dashboard`
- **Missions:** `http://governor-api/missions`
- **Audit Log:** `http://governor-api/audit`
- **Alerts:** `http://governor-api/alerts`
- **Approvals:** `http://governor-api/approvals`

### Key Metrics You Should Know

- **Autonomous Rate:** Should be 90%+ (% of tasks Governor handles alone)
- **MTTR:** Should be <15 min (mean time to repair)
- **Success Rate:** Should be 95%+ (% of tasks that complete successfully)
- **Deployment Frequency:** Track over time (should increase)

---

## FINAL WORD

Governor is built on the principle that **you should focus on what matters** (strategy, products, customers) **while Governor handles the logistics** (deployments, testing, monitoring).

If Governor does something unexpected:
- It's usually right (it learns from everything)
- But if unsure, deny approval and ask for details
- Governor learns and improves each iteration

**Your job is to:** 
1. Point Governor at problems
2. Make strategic decisions
3. Review escalations
4. Watch the metrics

**Governor's job is to:** Do the rest.

---

## FEEDBACK

Found an issue? Have a suggestion?

```bash
# Report issue
@Governor "I found a bug: [description]"

# Request feature
@Governor "Can you add [capability]?"

# Give feedback
@Governor "That deployment was [too slow / risky / perfect]"
```

Governor learns from your feedback and improves.

---

**Document Status:** PRODUCTION-READY  
**Last Updated:** 2026-07-16  
**For Questions:** governors@company.com

🚀 **Governor is autonomous. You focus on strategy. We'll handle the engineering.**
