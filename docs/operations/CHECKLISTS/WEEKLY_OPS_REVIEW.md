# Weekly Ops Review Checklist

**Type**: Checklist  
**Audience**: Operations, DevOps, Backend Engineers  
**Authority**: Governor Ω  
**Status**: Active  
**Last Updated**: 2026-07-16  
**Review Schedule**: Before each weekly review meeting  
**Time Estimate**: 30-45 minutes  
**Owner**: Governor Ω

---

## Purpose

Routine weekly review of system health, performance, security, and operational metrics. Identifies emerging issues, tracks trends, and ensures production stability.

**When to use**: Every Monday morning or scheduled weekly ops meeting  
**Success criteria**: All checks completed, issues logged, trends identified

---

## System Health (10 min)

### Service Status

- [ ] Health endpoint responding

  ```bash
  curl -s https://newspulse-ai.vercel.app/api/health | jq .
  ```

  Expected: `status: healthy`, all components ✅

- [ ] Vercel deployment status
  - No failed deployments in past 7 days
  - No ongoing incidents
  - Check: Vercel dashboard → Deployments

- [ ] Database connectivity
  - Supabase dashboard → Database → Monitoring
  - Connection count: <20 (normal), no spikes
  - Response time: <100ms for queries

- [ ] Error rate
  - Application logs: <1% error rate
  - No repeated error patterns
  - No 503/500 spikes

---

## Performance Review (10 min)

### Page Load Times

Review metrics from previous 7 days:

| Page       | Target | Actual | Status |
| ---------- | ------ | ------ | ------ |
| Login      | <2s    | __     | ☐      |
| Workspace  | <2s    | __     | ☐      |
| Inventory  | <3s    | __     | ☐      |
| Assessment | <3s    | __     | ☐      |
| Evidence   | <3s    | __     | ☐      |

- [ ] All pages within target
- [ ] No degradation from last week
- [ ] P95 latency (worst 5% of users) acceptable

### Database Performance

- [ ] Query performance stable
  - Average query time: <100ms
  - No N+1 query patterns detected
  - No missing indexes identified

- [ ] CPU usage healthy
  - Peak CPU: <80%
  - No sustained high CPU periods
  - No connection leaks

### Resource Usage

- [ ] Memory leaks checked
  - Memory usage stable over time
  - No growing heap dumps
  - Chromatic/frontend memory stable

---

## Uptime & Reliability (5 min)

- [ ] Uptime: >99.5% for past 7 days
  - Target: ≥99.5% (max 3.5 minutes downtime)
  - Current: __%

- [ ] No unplanned outages
  - Any incidents? Document in INCIDENT_RESPONSE.md if occurred

- [ ] Automated backups running
  - Daily backup completed: ☐
  - Weekly backup completed: ☐
  - Location: EU (verified)

---

## Security Review (5 min)

### Authentication & Authorization

- [ ] No unauthorized access attempts
  - Check logs for failed auth patterns
  - No brute force attempts detected

- [ ] Session management working
  - Sessions expiring correctly
  - No session hijacking attempts
  - Logout clearing cookies properly

### Data & RLS

- [ ] Row Level Security policies enforced
  - Test workspace isolation (manually or via tests)
  - No cross-workspace data leaks
  - RLS policies enabled on all tables

- [ ] Input validation working
  - No injection attempts detected
  - XSS protection active
  - CSRF tokens present on forms

### Infrastructure Security

- [ ] HTTPS/TLS active on all endpoints
  - Certificate valid and not expiring soon
  - No mixed HTTP/HTTPS issues
  - SSL/TLS grade: A or A+ (ssllabs.com if checked)

---

## User Activity & Engagement (5 min)

### Customer Metrics

- [ ] Active workspaces (count): __
- [ ] Active users (past 7 days): __
- [ ] New signups: __
- [ ] Churn: __ (if any)

### Feature Usage

- [ ] Most used features:
  1. __
  2. __
  3. __

- [ ] Underused features (may need investigation): __

- [ ] Error-prone flows (more errors than normal): __

---

## Incident & Alert Review (5 min)

### Recent Alerts

- [ ] All alerts from past 7 days reviewed
- [ ] False positives identified and silenced
- [ ] Legitimate alerts investigated

### Incident Log

- [ ] Any incidents in past week? (Yes/No)
- [ ] If yes, was postmortem completed within 24h? ☐
- [ ] Action items from incidents tracked? ☐

### On-Call Handoff

- [ ] No unresolved P1 issues
- [ ] All P2 issues have owners
- [ ] P3 issues documented for future sprints

---

## Dependencies & Third Parties (5 min)

### Supabase

- [ ] Status page: Any issues reported? No ☐
- [ ] Database capacity: <80% (Supabase dashboard)
- [ ] Authentication service: Operational

### Vercel

- [ ] Deployment pipeline working
- [ ] API rate limits not approached
- [ ] No account alerts

### External Services

- [ ] Any email delivery issues? No ☐
- [ ] API integrations responding normally
- [ ] Monitoring/observability tools working

---

## Logs & Monitoring Review (5 min)

### Application Logs

- [ ] Reviewed logs from past 7 days
- [ ] No unexpected patterns
- [ ] Common errors (if any):
  1. __
  2. __

**Action**: If patterns identified, open issue for investigation

### Monitoring Dashboard

- [ ] All graphs stable and expected
- [ ] No anomalies in traffic patterns
- [ ] Resource utilization normal

---

## Documentation Status (5 min)

### Runbooks & Checklists

- [ ] All runbooks up-to-date with recent changes? Yes ☐
- [ ] Procedures documented for recent operations? Yes ☐
- [ ] Incident response procedures tested? (monthly)

### Knowledge System

- [ ] Documentation reflects current state
- [ ] No broken links in ops docs
- [ ] Owner contacts still correct

---

## Issues Found & Action Items

### Critical Issues (P1)

Must fix immediately:

| Issue | Owner | Due Date | Status |
| ----- | ----- | -------- | ------ |
|       |       |          |        |

### High Priority Issues (P2)

Fix this week:

| Issue | Owner | Due Date | Status |
| ----- | ----- | -------- | ------ |
|       |       |          |        |

### Backlog Items (P3)

Fix when time allows:

| Issue | Owner | Suggested | Status |
| ----- | ----- | --------- | ------ |
|       |       |           |        |

---

## Trends & Observations

### What's Getting Better?

- __
- __

### What Needs Attention?

- __
- __

### Upcoming Changes to Monitor

- [ ] Scheduled maintenance: None ☐ or __ on __
- [ ] Customer launches: __ on __
- [ ] Major changes deployed: __ on __

---

## Sign-Off

- [ ] Review completed by: __________ on __________
- [ ] Issues documented
- [ ] Action items assigned
- [ ] Follow-up meeting scheduled (if needed): __________

---

## Quick Reference

| Check                | Time       | Status |
| -------------------- | ---------- | ------ |
| System Health        | 10min      | ☐      |
| Performance          | 10min      | ☐      |
| Uptime & Reliability | 5min       | ☐      |
| Security             | 5min       | ☐      |
| User Activity        | 5min       | ☐      |
| Incidents & Alerts   | 5min       | ☐      |
| Dependencies         | 5min       | ☐      |
| Logs & Monitoring    | 5min       | ☐      |
| Documentation        | 5min       | ☐      |
| **TOTAL**            | **~50min** | **☐**  |

---

## Related Documents

- `RUNBOOKS/INCIDENT_RESPONSE.md` — How to handle incidents when found
- `RUNBOOKS/DATABASE_OPERATIONS.md` — Database performance tuning
- `CHECKLISTS/POST_DEPLOYMENT_VERIFICATION.md` — After-deployment checks
- `CHECKLISTS/MONTHLY_COMPLIANCE_AUDIT.md` — Deeper monthly review

---

## Updated By

**Session**: Governor Ω (STAGE 4 Phase 4.2)  
**Date**: 2026-07-16  
**Changes**: Initial creation as part of STAGE 4 Phase 4.2 (Operational Knowledge)
