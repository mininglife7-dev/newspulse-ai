# On-Call Procedures

**Type**: Procedure  
**Audience**: All Engineers, Team Leads  
**Authority**: Governor Ω  
**Status**: Active  
**Last Updated**: 2026-07-16  
**Review Schedule**: Quarterly or after incidents  
**Owner**: Governor Ω

---

## Purpose

Standard procedures for managing on-call engineer rotation, incident response, escalation, and communication.

**When to use**: Before each on-call shift, during incident response  
**Success criteria**: Fast incident acknowledgment, clear escalation paths, effective communication

---

## On-Call Rotation

### Schedule Management

**On-call schedule**:
- Rotates weekly (Monday-Sunday)
- One primary on-call engineer
- One backup (escalation)
- Published: [Link to shared calendar]

**Team members in rotation**:
- [ ] Engineer 1 (experienced)
- [ ] Engineer 2 (intermediate)
- [ ] Engineer 3 (intermediate)
- [ ] Engineer 4 (experienced)
- [ ] Engineer 5 (intermediate)

**Scheduling principle**:
- Balance experienced and intermediate engineers
- Avoid same person more than 1 week per month
- Notify team 1 week before shift

### Before Your Shift

**When assigned** (by previous Friday):

1. **Acknowledge assignment**
   - Email, Slack, or calendar confirmation
   - Reply: "✓ Ready for on-call week of [date]"

2. **Verify setup** (by Sunday)
   ```
   - [ ] Pager configured (PagerDuty or equivalent)
   - [ ] Phone notifications enabled
   - [ ] SMS backup set up
   - [ ] Laptop charged and ready
   - [ ] VPN access working
   - [ ] All credentials accessible
   - [ ] Runbooks reviewed and current
   ```

3. **Review recent incidents**
   - Read postmortems from past month
   - Know: What broke? How was it fixed?
   - Identify patterns (e.g., always database migration issues)

4. **Review known issues**
   - Check issue tracker for anything marked "known issue"
   - Know: How to work around current problems
   - Example: "Feature X has latency issues, restart if needed"

5. **Check system health** (Sunday evening)
   - Run: `curl https://newspulse-ai.vercel.app/api/health`
   - Verify: status = healthy
   - If not: Investigate before shift starts

### During Your Shift

**Availability**:
- Check phone/Slack at least every 30 minutes
- If outside home: Keep phone charged and on
- Check Slack even if no alert received (might be missed)

**Response commitment**:
- CRITICAL: Respond within 5 minutes
- HIGH: Respond within 30 minutes
- MEDIUM: Respond within 2 hours
- LOW: Respond by next business day

**Acknowledging alerts**:
```
When you receive alert:
1. Read alert details
2. Reply on Slack: "🔧 Investigating [alert name]"
3. Check if real or false positive
4. Begin troubleshooting (use runbooks)
5. Update every 30 minutes: "Still investigating..." or "Fixed!"
```

---

## Incident Response Workflow

### Incident Detected

**Alert arrives** via:
- Slack notification
- Email notification
- SMS (critical only)
- Manual discovery (you notice issue)

**First action** (within 5 min for P1):

```
1. Read alert details
   - What service is affected?
   - What is the error?
   - When did it start?

2. Verify it's real
   - Manual test: curl health endpoint
   - Check if customers reporting issues
   - Check if might be false positive

3. Assess severity
   P1: Service down, all users affected → Escalate immediately
   P2: Service degraded, some affected → Investigate
   P3: Minor issue, limited impact → Scheduled fix
   P4: Information only → Document and move on
```

### Investigation Phase (10-30 min)

**Use runbooks**:
- INCIDENT_RESPONSE.md → Incident triage & investigation
- DATABASE_OPERATIONS.md → Database-related issues
- DEPLOYMENT.md → Deployment issues
- MONITORING_AND_ALERTING.md → Alert interpretation

**Gather information**:
```
1. When did it start?
   - Check logs/alerts timeline
   
2. How many customers affected?
   - Check which workspaces having issues
   
3. What changed recently?
   - Recent deployments?
   - Database migrations?
   - Infrastructure changes?
   
4. Is it growing?
   - Error rate increasing?
   - More users affected?
   - Expected to get worse?
```

**Communicate findings**:
- Slack update every 15 minutes: "Found [issue], working on [fix]"
- Example: "Database query slow on evidence table, adding index now"

### Decision Phase (10-30 min)

**Choose action**: Fix forward or rollback?

| Situation | Action |
|-----------|--------|
| Recent deployment, service down | Rollback immediately |
| Known bug in recent code, quick fix | Fix forward |
| Database migration failed | Investigate + rollback if needed |
| Third-party service down | Wait or workaround |
| Performance issue, no errors | Optimize or scale |

**Fix forward example**:
1. Identify problem in code
2. Write fix
3. Test locally (if quick)
4. Merge and deploy (skip review process if P1)
5. Verify fix works in production

**Rollback example**:
1. Use ROLLBACK.md procedures
2. Identify last working commit
3. Revert to that commit
4. Deploy rollback
5. Verify service recovered
6. File issue to investigate root cause

### Execution Phase (5-60 min)

**Implement fix or rollback**:
- Follow relevant runbook (ROLLBACK.md, FIX_FORWARD.md, DATABASE_OPERATIONS.md)
- Focus on speed and safety
- Communicate progress

**Verification**:
- Service responding? `curl health endpoint`
- Error rate normal? Check logs
- Users reporting fixed? Monitor Slack
- All components healthy? Check each system

**Sign off**:
- Alert acknowledged and resolved
- Slack update: "✓ Incident resolved [timestamp]"
- Document: What broke, why, how fixed

### Postmortem Phase (24-48 hours)

**Schedule postmortem** (if P1 or P2):
- When: Within 24 hours of resolution
- Who: On-call engineer, team lead, relevant engineers
- Duration: 60-90 minutes

**Postmortem process**:
- Use template: CHECKLISTS/INCIDENT_POSTMORTEM.md
- Objective: Learn, not blame
- Document: Root cause, action items, improvements

**Track action items**:
- Add to issue tracker
- Assign owners
- Set due dates
- Track until complete

---

## Escalation Procedures

### When to Escalate

**Escalate to backup on-call** when:
- You cannot respond in required time
- Issue is beyond your expertise
- You need help (pair troubleshooting)
- You're unsure what to do

**How to escalate**:
```
1. On Slack, ping: @[backup-on-call]
2. Message: "Need backup! [Brief issue description]"
3. Provide context: Runbook? Investigation started?
4. Both investigate together
```

**Escalate to team lead** when:
- Issue unresolved after 1 hour
- Requires architectural decision
- Impacts customers significantly
- Business decision needed (rollback? Customer notification?)

**How to escalate to team lead**:
```
1. Message team lead on Slack
2. Include: What's broken, what tried, why blocked
3. Provide: Recommendation + time estimate
4. Wait for decision before proceeding
```

**Escalate to founder** (Governor Ω) when:
- Service outage >5 minutes with no known fix
- Customer data loss or security breach
- Requires business decision
- Incident severity forces communication with customers

**How to escalate to founder**:
```
1. Slack @Governor (or designated contact)
2. Include: Status, impact, current action, ETA
3. "URGENT: [Brief title]. [1-2 sentences]. ETA: [time]"
4. Ready to discuss decision
```

### Escalation Example

```
8:15 PM - Alert: Service returning 500 errors
↓
8:20 PM - You investigate, identify database issue
↓
8:30 PM - Database still down, restarting not helping
↓
8:35 PM - Escalate to backup: "Need help, DB unresponsive"
↓
8:40 PM - Both investigating, still unclear
↓
8:45 PM - Escalate to team lead: "DB issue unresolved 30min, consider restore"
↓
8:50 PM - Team lead says: "Restore from yesterday's backup"
↓
9:00 PM - Backup running, ETA 10 minutes
↓
9:10 PM - Restore complete, service recovered
↓
9:15 PM - Update customers via status page
↓
Next day - Postmortem at 2pm
```

---

## Communication Protocols

### Customer Communication

**Do NOT contact customers directly** (unless team lead/founder says to)

**Who communicates**:
- Team lead or founder communicates with customers
- On-call engineer provides: "What's wrong, ETA for fix, impact"
- Team lead composes message and sends

**What to communicate**:
- Simple explanation of issue (avoid jargon)
- How it affects them (feature down? data safe?)
- ETA for fix
- What they should do in meantime
- When they'll be updated again

**Example message** (team lead sends, based on your info):
```
Hi customers,

We're experiencing elevated error rates on assessments 
(started at 8:10 PM UTC). We've identified the issue 
and estimate 15 minutes to resolution. Your data is safe.

We'll update you in 15 minutes.

Thank you for patience,
The EURO AI Team
```

### Internal Communication

**On Slack** (for your team):
- Update every 15 minutes on P1/P2 incidents
- Format: "🔧 Status: [what you're doing]. ETA: [time]"
- When resolved: "✓ RESOLVED at [time]. [2-sentence summary]"

**Example thread**:
```
8:15: 🔧 Alert: Error rate spike. Investigating database.
8:20: 🔧 Found: Slow query on evidence table. Adding index.
8:30: 🔧 Index added, monitoring query performance.
8:35: ✓ RESOLVED at 8:34 PM. Query now <100ms. No data loss.
```

**In postmortem**:
- Focus on facts, not blame
- Example: "PR #123 deployed at 8:05 PM, changed evidence query"
- Not: "Engineer X broke the database"

---

## Handoff Procedures

### End of Shift Handoff

**Before end of shift**:
1. Check for open incidents
   - Any still being investigated?
   - Any just resolved?

2. Brief the incoming on-call engineer:
   ```
   Quick handoff (5 minutes):
   - "Any incidents this week? What happened?"
   - "Any known issues I should watch for?"
   - "Anything unusual in the logs?"
   - "Any flaky tests or intermittent issues?"
   ```

3. Update status page:
   - Close any incident status updates
   - Clear "maintenance in progress" if applicable

4. Leave runbooks & logs accessible:
   - Document any ad-hoc debugging steps
   - Leave browser tabs with dashboards open
   - Note any temporary fixes that need follow-up

### Mid-Shift Handoff (if covering for someone)

**If you need to cover someone's on-call time**:
1. Notify team: "Covering [person]'s on-call for [date]"
2. Ask coverage person: "Anything I should know?"
3. Check recent incidents/issues
4. Be available at expected times

---

## On-Call Toolkit

### Tools You Need Access To

```
☐ VPN access (to company network)
☐ Vercel dashboard login
☐ Supabase dashboard login
☐ GitHub access (to view code, merge PRs)
☐ Slack (for notifications)
☐ Email (for alerts)
☐ Phone (for critical alerts)
☐ Laptop (with development environment set up)
☐ Issue tracker (to file incidents)
☐ Status page (to post customer updates)
```

### Reference Materials

Always have accessible:
- `INCIDENT_RESPONSE.md` — Main incident playbook
- `ROLLBACK.md` — How to rollback
- `DATABASE_OPERATIONS.md` — Database troubleshooting
- `DEPLOYMENT.md` — Deployment procedures
- Recent postmortems (learn from past incidents)
- Team contact list (who to escalate to)
- Customer contact list (if needed for critical incidents)

### Development Environment

Before on-call shift, verify:
```bash
# Can you build?
npm run build

# Can you run tests?
npm test

# Can you type-check?
npm run type-check

# Can you access database?
npm run db:status

# Can you SSH to servers?
ssh -i [key] [server]
```

---

## Common On-Call Scenarios

### Scenario 1: Deployment Failed

**Alert**: Vercel build failed

**Action**:
1. Check build logs in Vercel dashboard
2. Is it a real error or transient?
3. If real error: Identify (missing dependency? type error?)
4. Fix code and deploy again
5. Or: Rollback to previous version

**Time**: 5-15 minutes
**Severity**: Usually P2-P3 (service still on old version)

### Scenario 2: Database Query Slow

**Alert**: Query performance degraded

**Action**:
1. Identify slow query (see DATABASE_OPERATIONS.md)
2. Check if missing index
3. Add index and monitor
4. If still slow: Kill long-running queries or restart database
5. File issue to optimize query

**Time**: 10-30 minutes
**Severity**: P2 (service slow but functional)

### Scenario 3: Service Unresponsive

**Alert**: Health check failing

**Action**:
1. Check health endpoint manually
2. Check database connectivity
3. Check recent deployments
4. If deploy issue: Rollback
5. If database issue: See DATABASE_OPERATIONS.md → Emergency Recovery

**Time**: 5-60 minutes depending on cause
**Severity**: P1 (service down)

### Scenario 4: Error Rate High

**Alert**: >5% of requests returning 5XX

**Action**:
1. Identify which endpoint has errors
2. Check logs for error message
3. Is it code issue (deploy) or infrastructure issue (database)?
4. Fix code: Fix forward or rollback
5. Fix infrastructure: Restart service, scale resources, etc.

**Time**: 15-45 minutes
**Severity**: P1 or P2 depending on scope

---

## Self-Care & Sustainability

### During Your Shift

- Take breaks (go outside for 15 min, eat, move)
- Sleep normally (don't stay up "just in case")
- Communicate if you're too tired to troubleshoot safely
- It's OK to ask for help

### Between Shifts

- Don't check Slack constantly
- Don't work nights/weekends unless your shift
- Trust the on-call engineer to handle issues
- Come back refreshed for next shift

### Burnout Prevention

If you're burning out:
- Tell team lead immediately
- Take a break from on-call rotation
- Automate routine tasks
- Improve runbooks to make incidents faster
- Pair with other engineers to distribute load

---

## On-Call Metrics & Review

### Track These Metrics

Track **per on-call week**:
- [ ] Number of incidents
- [ ] Incidents by severity (P1, P2, P3)
- [ ] Mean time to respond
- [ ] Mean time to resolve
- [ ] Pager alert false positive rate

### Monthly Review

In WEEKLY_OPS_REVIEW.md, note:
- Incidents that week
- Whether on-call procedures helped or hindered
- Ideas for improvement

### Quarterly Review

Review on-call procedures:
- [ ] Are runbooks up-to-date?
- [ ] Are response times good?
- [ ] Is on-call rotation fair?
- [ ] Any patterns (always same issue)?
- [ ] Updates needed to procedures?

---

## Training & Onboarding

### New On-Call Engineer

Before first on-call shift:

1. **Shadowing** (1 week):
   - Follow on-call engineer
   - Watch how they respond to alerts
   - See how they troubleshoot
   - Learn the tools and dashboards

2. **Review materials** (2 hours):
   - Read all runbooks
   - Review recent incidents/postmortems
   - Understand escalation paths
   - Know who to contact for help

3. **Dry run** (with oversight):
   - First on-call shift with experienced engineer available
   - They monitor, don't intervene (unless critical)
   - Debrief after shift

4. **Independent** (with support):
   - Second on-call shift solo
   - Backup engineer notified to stay alert
   - Debrief after shift

---

## Related Documents

- `INCIDENT_RESPONSE.md` — Full incident response procedure
- `ROLLBACK.md` — How to rollback deployments
- `DATABASE_OPERATIONS.md` — Database operations guide
- `CHECKLISTS/INCIDENT_POSTMORTEM.md` — Postmortem template

---

## Updated By

**Session**: Governor Ω (STAGE 4 Phase 4.2)  
**Date**: 2026-07-16  
**Changes**: Initial creation as part of STAGE 4 Phase 4.2 (Operational Knowledge)
