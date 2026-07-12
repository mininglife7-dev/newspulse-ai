# Incident Response Runbooks

**For:** Founder (Lalit) - Operational procedures for production incidents  
**Purpose:** Step-by-step guidance during live incident response  
**Status:** Ready for production deployment

---

## Quick Reference: Incident Types

| Type | Symptoms | Action | Recovery | Runbook |
|------|----------|--------|----------|---------|
| **Database Connection** | "Connection refused", "too many connections" | Scale connection pool | 30-60s | [Link](#database-connection-failures) |
| **Deployment Failure** | 500 errors after deploy, "Build failed" | Rollback to previous version | 45s | [Link](#deployment-failures) |
| **API Rate Limit** | "Rate limit exceeded" from OpenAI/Firecrawl | Reduce request rate, queue backoff | 60-120s | [Link](#external-api-rate-limits) |
| **Cascading Failure** | Multiple services erroring, cache issues | Isolate affected service, restart | 45-90s | [Link](#cascading-failures) |
| **Memory/Performance** | High latency, timeouts increasing | Identify memory leak, restart affected service | 30-60s | [Link](#performance-degradation) |
| **Database Deadlock** | Specific queries hanging, locked resources | Kill blocking queries, retry transaction | 10-30s | [Link](#database-deadlocks) |

---

## Runbook 1: Database Connection Failures

**Symptoms:**
- Errors: "Connection refused", "too many connections"
- HTTP 503 errors returning to users
- User impact: 50-100% (entire database access broken)

**Detection Timeline:**
- T+0s: First error from database
- T+2s: Error fingerprinted and detected
- T+5s: Incident created and Founder alerted
- T+10s: Orchestration decision made

**Your Actions:**

### Immediate (T+5-10s)
```bash
# 1. Assess the situation
Dashboard: https://newspulse-ai-production.vercel.app/dashboard?incident=<ID>

# Check what's happening
curl https://newspulse-ai-production.vercel.app/api/metrics?period=5m
# Look for: spike in connection count, long query times
```

### Assessment
- **Is auto-scaling happening?** 
  - System should automatically increase connection pool
  - Wait 30 seconds, check if recovers
- **Are errors still spiking?**
  - If yes, proceed to manual intervention
  - If no, system is self-healing, monitor

### Manual Intervention (if needed after 30s)

```bash
# 1. Check connection pool status
# Login to Supabase Console
# Settings → Database → Connection Pooling
# Current status: Check active connections vs pool size

# 2. Increase pool size (if currently too low)
# Increase from 20 → 40 connections
# Verify: Errors should decrease within 10 seconds

# 3. If still failing, check for long-running queries
# Supabase Console → Monitoring → Queries
# Look for queries taking > 30 seconds
# Kill any long queries: SELECT pg_terminate_backend(pid);

# 4. If still failing, check query patterns
# Are new queries hammering the database?
# Consider reducing rate or adding query queue
```

### Resolution
- ✓ Connection errors stop
- ✓ Response times return to normal (< 100ms p95)
- ✓ User-visible errors clear
- ✓ System returns to healthy state

### After Recovery
- Monitor for next 30 minutes
- Check Supabase metrics for abnormalities
- Review GitHub issue created for prevention (connection pool increase)

---

## Runbook 2: Deployment Failures

**Symptoms:**
- Errors: "Build failed", "Runtime error", "Schema mismatch"
- HTTP 500 errors immediately after deployment
- User impact: 80-100% (new code doesn't work)

**Detection Timeline:**
- T+0s: Deployment goes live, new code executes
- T+2s: First error from new code
- T+5s: Error pattern detected (schema mismatch, missing column)
- T+8s: Incident created and Founder alerted
- T+15s: Orchestration decision: execute-rollback

**Your Actions:**

### Immediate (T+8s)
```bash
# 1. Read the alert
# Email subject should indicate the error:
# "🚨 CRITICAL: Cannot read property 'X' of undefined"
# This tells you what field/column is missing

# 2. Decide: Should we rollback?
# Questions to ask:
# - Does new code depend on new database column?
# - Was the migration deployed alongside code?
# - Can we quickly fix the code (< 2 minutes)?

# If YES to any → ROLLBACK (faster than fix)
# If NO to all → Consider manual fix
```

### Auto-Rollback (Recommended)

System will automatically:
1. Revert to previous deployment (v1.2.3)
2. Old code running again
3. Errors should stop within 15 seconds

**Monitor:**
```bash
# Check status
curl https://newspulse-ai-production.vercel.app/api/health

# Expected response:
# { "status": "healthy", "version": "1.2.3" }

# Timeline:
# T+15s: Old code running
# T+30s: Error rate drops to zero
# T+45s: System back to normal
```

### After Rollback

**What to Do:**
1. Investigation email received within 1 minute
   - Subject: "✅ Incident <ID> resolved in 45s"
   - Contains: root cause analysis
2. GitHub issue auto-created for prevention
   - Title: "[Post-Mortem] CRITICAL: Schema migration incompatible"
   - Labels: hotfix, critical, type: incident-postmortem
3. Code review the fix:
   - Ensure schema and code changes in same PR
   - Add migration test to CI
   - Verify with blue-green deploy

**Prevent Recurrence:**
- Never deploy schema changes separately from code
- Add database schema tests to CI
- Use blue-green deployment for safer rollouts
- Require code review before deploy

---

## Runbook 3: External API Rate Limits

**Symptoms:**
- Errors: "Rate limit exceeded", "429 Too Many Requests"
- Affects: Search feature (Firecrawl API) or summarization (OpenAI)
- User impact: 30-50% (specific features broken)

**Detection Timeline:**
- T+0s: API returns 429 rate limit response
- T+5s: Rate limit error detected and fingerprinted
- T+10s: Incident created and Founder alerted
- T+15s: Orchestration decision: backoff and retry

**Your Actions:**

### Immediate Assessment
```bash
# 1. Which service hit the limit?
# Check alert details:
# - If "Firecrawl": Article fetching feature
# - If "OpenAI": Article summarization feature

# 2. Check request volume
curl https://newspulse-ai-production.vercel.app/api/metrics
# Look for: spike in API calls, high request rate
```

### For OpenAI Rate Limit

**Option A: Reduce Request Rate (Recommended)**
```bash
# System will automatically backoff and retry with exponential delay
# Wait 30 seconds, then retry requests
# Timeline: Should recover within 60 seconds
```

**Option B: Upgrade Plan**
```bash
# If this is recurring issue:
# OpenAI Dashboard → Billing → Upgrade to higher tier
# Takes 5-10 minutes to take effect
# Create GitHub issue: "Upgrade OpenAI plan for increased capacity"
```

### For Firecrawl Rate Limit

**Option A: Batch Requests**
```bash
# System will automatically batch requests and queue them
# Wait for queue to drain (usually < 120 seconds)
# No manual action needed
```

**Option B: Contact Support**
```bash
# If blocking: Contact Firecrawl support
# Request: Higher rate limit or priority queue
# Temporary: Reduce search volume or use cached results
```

### After Recovery
- ✓ API calls succeed
- ✓ Features working normally
- ✓ Monitor for next 30 minutes
- ✓ Check if this is recurring (GitHub issue for capacity planning)

---

## Runbook 4: Cascading Failures

**Symptoms:**
- Multiple unrelated errors appearing simultaneously
- Cache timeouts, database connection errors, API errors
- One service failure spreading to others
- User impact: 80-100% (system wide degradation)

**Detection Timeline:**
- T+0s: One service fails (e.g., cache unavailable)
- T+5s: Other services start failing due to cascading
- T+10s: Pattern detected as cascading failure
- T+15s: Incident created and Founder alerted
- T+20s: Orchestration decision: isolate service, drain queues

**Your Actions:**

### Immediate (T+15s)

**Diagnosis:**
```bash
# 1. Check metrics to find root cause
curl https://newspulse-ai-production.vercel.app/api/metrics?format=text

# Look for:
# - Which service failed first?
# - Are errors spreading to other services?
# - Is one region affected or all?

# 2. Check Vercel deployments
# Dashboard: https://vercel.com/lalit-kumar-d-s-projects/newspulse-ai
# Look for: Recent deployments, any changes?
```

### Intervention

**Option 1: Isolate Affected Service**
```bash
# If specific service is failing (e.g., search):
# Temporarily disable that service
# Redirect users: "Search temporarily unavailable, try again later"
# Other services continue working
# Timeline: Instant isolation, 10-30 minute fix
```

**Option 2: Graceful Degradation**
```bash
# Reduce scope of affected features
# Example: If database connection pool exhausted
#   - Disable non-critical queries
#   - Prioritize user-facing queries
#   - Timeline: Seconds to enable degraded mode
```

**Option 3: Rolling Restart**
```bash
# If cache or memory issue:
# Restart services one-by-one (rolling restart)
# Timeline: 30-60 seconds total
# Users experience: Brief timeout, automatic retry

# System will handle automatically
# Monitor recovery in metrics
```

### After Recovery
- ✓ All services responding
- ✓ Error rate dropped to near-zero
- ✓ Queue drained, backlog processed
- ✓ Monitor for cascading to reoccur

---

## Runbook 5: Performance Degradation

**Symptoms:**
- Response times slow (> 1 second p95)
- Timeouts increasing
- No error messages, but slow
- User impact: 30-60% (experience degradation)

**Detection Timeline:**
- T+0s: Performance starts degrading
- T+10s: Latency spike detected
- T+20s: Incident created and Founder alerted
- T+30s: Orchestration decision: profile and scale

**Your Actions:**

### Assessment
```bash
# 1. Check response time metrics
curl https://newspulse-ai-production.vercel.app/api/metrics

# Look for:
# - p95 latency (what percentile is slow?)
# - Error rate (is it errors or just slow?)
# - Memory usage (Vercel Functions → Memory)
```

### Common Causes & Fixes

**Memory Leak (Function restarting)**
```bash
# Check Vercel logs
# Look for: "Function execution duration exceeded" or "Out of memory"

# Fix: Restart functions
# Vercel will auto-restart on next deploy
# Manual: Redeploy current version

# Timeline: 30-60 seconds to recover
```

**Database Query Performance**
```bash
# Check Supabase monitoring
# Supabase Console → Monitoring → Queries

# Look for: Slow queries (> 500ms)
# Fix: Add index to slow column
# Or: Optimize query (avoid N+1, pagination)

# Timeline: Immediate once query is fixed
```

**High Request Volume**
```bash
# Check request rate in metrics
# If requests/sec > 1000:
#   - Enable caching (should be default)
#   - Scale up Vercel Functions
#   - Consider rate limiting for non-essential APIs

# Timeline: 30-120 seconds depending on root cause
```

### After Recovery
- ✓ Latency back to < 200ms p95
- ✓ No timeout errors
- ✓ Request rate handled smoothly
- ✓ Monitor for recurrence

---

## Runbook 6: Database Deadlocks

**Symptoms:**
- Errors: "Deadlock detected", specific queries hanging
- Only specific operations affected (e.g., only writes stuck)
- Other queries working fine
- User impact: 10-30% (specific actions blocked)

**Detection Timeline:**
- T+0s: Deadlock occurs between concurrent transactions
- T+3s: Timeout from hung query
- T+5s: Error detected
- T+10s: Incident created
- T+20s: Orchestration decision: kill blocking query, retry

**Your Actions:**

### Assessment
```bash
# 1. Check which queries are blocked
# Supabase Console → Monitoring → Queries
# Look for: Queries stuck in "active" state

# 2. Identify blocking transaction
# Query with longest duration is likely culprit
```

### Resolution

**Auto-Resolution (Usually):**
- System will retry transaction
- Deadlock resolves on retry (90% of cases)
- Timeline: 30-60 seconds

**Manual Intervention (if needed):**
```bash
# If deadlock persists > 60 seconds:
# Kill the blocking query
# Supabase: SELECT pg_terminate_backend(pid) WHERE ...

# Timeline:
# - Blocking query killed: instant
# - Other queries resume: 1-5 seconds
# - System recovered: < 30 seconds total
```

### Prevention
- Keep transactions short (< 1 second)
- Access tables in same order (avoid circular locks)
- Use appropriate isolation levels
- Monitor slow queries regularly

---

## Common Remediation Actions

### Action: Rollback Deployment
```bash
# When: Code has critical bug
# Time Required: 15-45 seconds
# Steps:
# 1. Vercel Dashboard → Deployments
# 2. Click previous working deployment
# 3. Click "Promote to Production"
# 4. Verify: /api/health returns healthy
```

### Action: Scale Database Connection Pool
```bash
# When: Connection limit exceeded
# Time Required: 10-20 seconds
# Steps:
# 1. Supabase Console → Settings → Database
# 2. Connection Pooling → Increase max connections (20→40)
# 3. Wait 5 seconds
# 4. Check error rate drops
```

### Action: Increase Vercel Function Memory
```bash
# When: Functions running out of memory
# Time Required: 2 minutes (requires redeploy)
# Steps:
# 1. vercel.json → functions → memory: 3008 (increase from 1024)
# 2. git commit and push
# 3. Vercel auto-deploys
# 4. Monitor for recovery
```

### Action: Enable Feature Flag (Disable Feature)
```bash
# When: Feature causing issues
# Time Required: 1-5 seconds
# Steps:
# 1. Vercel Dashboard → Environment Variables
# 2. Set FEATURE_SEARCH_ENABLED=false
# 3. Redeploy (usually auto if using hot-reload)
# 4. Feature disabled, users see fallback message
```

### Action: Clear Cache
```bash
# When: Stale data causing issues
# Time Required: Instant
# Steps:
# 1. Vercel Dashboard → Functions → Cache
# 2. Clear all caches
# 3. Next requests will rebuild cache
# 4. Monitor for latency spike (rebuilding)
```

---

## When to Escalate to Support

**Contact Vercel:**
- Deployment not working after multiple attempts
- Persistent 5xx errors from Vercel platform
- Database connection issues at infrastructure level
- Resource limits repeatedly hit

**Contact Supabase:**
- Database completely unavailable
- Connection pool exhausted even after scaling
- Query performance degradation at database level
- Data integrity issues

**Contact External Service Providers:**
- OpenAI rate limit issues → OpenAI support
- Firecrawl errors → Firecrawl support

---

## Post-Incident Review

After every incident:

1. **Receive email with:**
   - Incident timeline (detected, remediated, resolved)
   - Root cause analysis
   - Auto-created GitHub issue for prevention

2. **Review GitHub issue:**
   - Understand what caused the incident
   - Identify prevention measures
   - Assign to engineer for fix

3. **Update runbook:**
   - If new incident type discovered
   - If remediation steps changed
   - Add new prevention measure

---

**Status: Ready for Production**

These runbooks will guide you through every common incident type. Each provides immediate assessment and step-by-step remediation procedures.

**For questions or unclear steps:** Review the operational playbook at `/docs/INCIDENT-RESPONSE-PLAYBOOK.md` or the production readiness brief at `/docs/PRODUCTION-READINESS-BRIEF.md`.
