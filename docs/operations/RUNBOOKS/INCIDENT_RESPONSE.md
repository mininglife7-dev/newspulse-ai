# Production Incident Response Runbook

**Type**: Runbook  
**Audience**: On-Call Engineers, Incident Commander  
**Authority**: Governor Ω  
**Status**: Active  
**Last Updated**: 2026-07-16  
**Review Schedule**: After each incident or quarterly  
**Time Estimate**: Varies (triage: 5 min, response: varies)  
**Owner**: Governor Ω

---

## Quick Reference

Step-by-step procedure for detecting, responding to, and recovering from production incidents. Goal: Minimize customer impact while gathering evidence for root cause analysis.

**Define "Incident"**: Any event causing customer service degradation, data integrity issues, or security concerns in production.

**Not an Incident**: Minor performance variations, scheduled maintenance, expected errors in log stream.

---

## Incident Response Procedure

### Phase 1: Detection & Triage (5 min)

**Goal**: Quickly identify if this is a real incident requiring immediate action.

1. **Issue reported**
   - Via monitoring alert (Vercel, Supabase dashboard)
   - Via customer report (Slack, email)
   - Via team member observation (error spike, service down)

2. **Assess impact**
   - **Critical**: Customers cannot use core features (auth, inventory, assessment, evidence)
   - **High**: Features are slow (>2s response time) or frequently erroring (>10% error rate)
   - **Medium**: Features partially degraded or single customer affected
   - **Low**: Minor feature not working, error in logs, no customer-visible impact

3. **Decision point**
   - **If Critical or High**: Proceed to Phase 2 (Incident Response)
   - **If Medium or Low**: Log in monitoring system and proceed to Phase 2 if time permits
   - **If false alarm**: Close alert and continue monitoring

### Phase 2: Incident Declaration (1 min)

**Goal**: Activate incident response procedures.

1. **Declare the incident**
   - Slack: `#incidents` channel post: "@incident-commander INCIDENT [Severity]: [Brief Description]"
   - Example: "@incident-commander INCIDENT CRITICAL: Auth service returning 500 errors (5 min duration)"

2. **Assign roles**
   - **Incident Commander**: Coordinates response (usually on-call engineer or manager)
   - **Technical Lead**: Investigates root cause
   - **Communications Lead**: Updates customers and team

3. **Set timeline**
   - Note incident start time
   - Incident Commander: Set timer for update frequency
     - Critical: Updates every 5 minutes
     - High: Updates every 10 minutes
     - Medium/Low: Updates every 30 minutes

### Phase 3: Investigation (10-30 min)

**Goal**: Find root cause and determine recovery path.

**Technical Lead Actions**:

1. **Check system health**
   ```bash
   # Health endpoints
   curl -s https://newspulse-ai.vercel.app/api/health | jq .
   curl -s https://newspulse-ai.vercel.app/api/health/detailed | jq .
   ```
   - Response time: Should be <100ms, >1s indicates issues
   - Database connection: Should be ✅ healthy
   - Each component: Should report status

2. **Check error logs**
   - Supabase dashboard → Logs tab
   - Filter by: Time of incident, error level
   - Look for patterns: Same endpoint? Same user? Same data?
   - Common causes:
     - Database connection pool exhausted
     - Long-running query blocking others
     - Memory leak in Node process
     - Infinite redirect loop

3. **Check recent deployments**
   ```bash
   git log --oneline main -n 10
   ```
   - Was something deployed right before incident?
   - If yes, likely the cause — consider rollback
   - Vercel dashboard → Deployments tab
   - Check: Build time, start time vs incident time

4. **Check database state**
   - Supabase dashboard → SQL Editor
   - Query: `SELECT COUNT(*) FROM [affected_table] WHERE [incident_conditions]`
   - Look for: Corrupt data, missing data, unexpected large operations
   - If data corruption found: STOP and prepare rollback

5. **Isolate affected feature**
   - Does incident affect all users or specific users/workspaces?
   - If specific workspace: Check their data size, settings, recent activity
   - If specific feature: Check recent changes to that code

### Phase 4: Recovery Decision (5 min)

**Goal**: Choose fastest path to restore service.

**Decision Tree**:

**If cause is recent deployment** → See Rollback section below

**If cause is database issue** → See Database Recovery section below

**If cause is load/performance issue** → See Performance Recovery section below

**If cause is unknown** → 
1. Check if problem is self-healing (traffic reducing, cache clearing)
2. Wait 5 minutes while monitoring
3. If still occurring, escalate to database/platform support

### Phase 5: Execute Recovery

**See specific recovery sections below**

### Phase 6: Verification (5 min)

**Goal**: Confirm service is restored to normal operation.

1. **Run health checks**
   ```bash
   curl -s https://newspulse-ai.vercel.app/api/health | jq .
   ```
   - All components should show healthy
   - Response time <100ms

2. **Run smoke tests**
   - Log in with test account
   - Create workspace (if applicable)
   - Run core user flows
   - Check no errors in browser console

3. **Monitor metrics**
   - Error rate should return to normal (<1%)
   - Response times should be <500ms
   - Database queries executing normally
   - Continue monitoring for 30 minutes

4. **Incident Commander announces**
   - Slack: "✅ INCIDENT RESOLVED: [Description]. Resolution: [What was done]. Duration: [time]"

### Phase 7: Root Cause Analysis (Post-Incident)

**Goal**: Prevent this incident from happening again.

1. **Gather data**
   - Timeline: When incident started, how long, when resolved
   - Scope: Which customers affected, what features
   - Root cause: Technical reason it happened
   - Recovery: What fixed it

2. **Complete postmortem**
   - See `CHECKLISTS/INCIDENT_POSTMORTEM.md`
   - Team reviews within 24 hours
   - Key learning: What should have prevented this?

3. **Close the incident**
   - Create follow-up task if needed (test improvement, config change)
   - Update monitoring to catch this sooner next time
   - Add to `docs/lessons/LEARNING_LOG.md`

---

## Recovery Procedures

### Rollback Recovery

**When to use**: If incident is caused by recent deployment

**Action**:

1. **Verify it's safe to rollback**
   - No data migrations that would fail with old code
   - No breaking database changes
   - If uncertain, ask tech lead first

2. **Rollback to previous deployment**
   - Vercel dashboard → Deployments tab
   - Click on deployment before current one
   - Click "Rollback to this deployment"
   - Confirm the action

3. **Verify rollback succeeded**
   - Wait 2-3 minutes for deployment
   - Check `curl https://newspulse-ai.vercel.app/api/health`
   - Run smoke tests manually

4. **Timeline**
   - Total rollback time: 5-10 minutes
   - Acceptable risk: Low (reverting to known-good state)

### Database Recovery

**When to use**: If incident is caused by database queries, connections, or data issues

**Symptoms**:
- "Cannot acquire connection" errors
- Timeouts in all endpoints
- Specific query returning wrong data
- RLS policies blocking valid queries

**Action**:

1. **Check database connections**
   - Supabase dashboard → Database → Connections
   - Idle connections: Could be thousands (ok, they'll clear)
   - Active connections: Should be <10-20 (high = problem)
   - If too many active: Restart API layer (kills connections)

2. **Kill long-running queries**
   - Supabase dashboard → SQL Editor
   - Run: `SELECT * FROM pg_stat_statements WHERE query_start < now() - interval '5 minutes' ORDER BY duration DESC LIMIT 5`
   - Identify queries blocking others
   - Consider killing if they started before incident

3. **Check RLS policies**
   - If incident affects specific users/workspaces only
   - Query: `SELECT * FROM [table] WHERE workspace_id = '[workspace_id]'`
   - If blocked, check RLS policy — might be misconfigured after recent change

4. **Revert recent migrations**
   - If incident happened after database migration
   - Supabase dashboard → Migrations tab
   - Review migration SQL before reverting
   - Revert with: `npx supabase db reset` (test environment only)
   - For production: Contact Supabase support for help

### Performance Recovery

**When to use**: If incident is slow response times or high error rates without obvious cause

**Symptoms**:
- Response time >2 seconds consistently
- Database query timing out
- 429 Rate Limited errors
- 503 Service Unavailable

**Action**:

1. **Check Vercel metrics**
   - Vercel dashboard → Project → Analytics
   - Response time distribution: Where is slowness?
   - Edge regions: Which regions affected?
   - If specific region slow: Could be infrastructure issue

2. **Check database metrics**
   - Supabase dashboard → Database → Replication
   - Check if database is under memory/CPU load
   - Slow queries: Are there queries taking >5 seconds?
   - If CPU >80%: Reduce traffic or optimize queries

3. **Reduce traffic temporarily** (if peak traffic caused)
   - Contact Vercel/Supabase support for rate limiting options
   - Alternative: Restart API layer (kills in-flight requests, forces reconnect)
   - Expected recovery: 5-10 minutes as requests rebalance

4. **Optimize slow query** (if specific query identified)
   - Get explain plan: `EXPLAIN ANALYZE [query]`
   - Look for: Missing indexes, sequential scans, N+1 patterns
   - Add index if needed and query was slow
   - Test optimization on test database first

---

## Error Handling & Escalation

### If Incident Severity Is Unclear

**Ask**:
- Can customers access main features? (auth, inventory, assessment)
- Are errors happening for all users or specific users?
- How long has it been happening?
- Is customer revenue affected?

**Escalate to Incident Commander** if unsure.

### If Root Cause Not Found In 30 Minutes

**Action**:
1. Is the incident still ongoing? 
   - If yes and affecting customers, rollback last deployment
   - If no, monitor for recurrence
2. Escalate to infrastructure team (Vercel, Supabase support)
3. Continue investigation while service is restored

### If Data Integrity Suspected

**Action**:
1. **STOP all recovery attempts** — Do not take further actions
2. **Pause write operations** — Consider read-only mode if available
3. **Escalate immediately** to tech lead and Founder
4. Document what was affected and when
5. Work with Supabase support on recovery

---

## Verification Checklist

Incident is resolved when:

- [ ] Service health check returns healthy
- [ ] Response times are normal (<500ms)
- [ ] Error rate is normal (<1%)
- [ ] Smoke tests pass (manual user flows)
- [ ] Monitoring shows no new alerts
- [ ] Customers confirm they can use the service
- [ ] Postmortem scheduled within 24 hours

---

## Escalation Contacts

- **Tech Lead**: [Contact info]
- **Vercel Support**: https://vercel.com/support
- **Supabase Support**: https://supabase.com/support
- **Founder**: [Contact info]

---

## Related Documents

- `CHECKLISTS/INCIDENT_POSTMORTEM.md` — Post-incident analysis template
- `PROCEDURES/ROLLBACK.md` — Detailed rollback procedure
- `docs/operations/INDEX.md` — All operational procedures
- `docs/lessons/LEARNING_LOG.md` — Learning from past incidents

---

## Updated By

**Session**: Governor Ω (STAGE 4 Phase 4.2)  
**Date**: 2026-07-16  
**Changes**: Initial creation as part of STAGE 4 Phase 4.2 (Operational Knowledge)
