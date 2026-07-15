# Extended Troubleshooting Procedures

**Version:** 1.0  
**Last Updated:** 2026-07-15  
**Audience:** Operations, Engineering Support, DevOps

Detailed troubleshooting procedures for common issues beyond the scope of OPERATIONAL_RUNBOOKS.md.

---

## 1. Performance Debugging

### Symptom: Endpoint Consistently Slow (p95 > 1000ms)

**Investigation Steps:**

1. **Identify which endpoint is slow**
```bash
# Get performance statistics
curl https://yourapp.com/api/performance-profile?type=stats

# Sample response shows slowest endpoints:
# GET /api/assessment-history: avg 2341ms (p95: 4521ms)
# POST /api/search: avg 2840ms (p95: 5204ms)
```

2. **Collect slow request profiles**
```bash
# Get profiles slower than 2 seconds
curl "https://yourapp.com/api/performance-profile?type=stats&minDurationMs=2000&limit=10"

# Examine individual slow request
curl "https://yourapp.com/api/performance-profile?type=profile&requestId=req-abc123"

# Response shows metric breakdown:
# { totalDurationMs: 4521,
#   metrics: [
#     { name: 'database-query', durationMs: 3200, percentOfTotal: 71% },
#     { name: 'data-transform', durationMs: 800, percentOfTotal: 18% },
#     { name: 'response-build', durationMs: 521, percentOfTotal: 11% }
#   ]
# }
```

3. **Check database query performance**

If database-query is the bottleneck (>70% of time):
```sql
-- Enable query logging in Supabase
-- Navigate to: Supabase Console → Logs → Database

-- Find slow queries
SELECT query, duration_ms, called_time 
FROM pg_stat_statements 
WHERE mean_time > 500 
ORDER BY mean_time DESC 
LIMIT 10;

-- Analyze query execution plan
EXPLAIN ANALYZE 
SELECT * FROM risk_assessments 
WHERE workspace_id = 'xyz' 
AND status = 'pending';

-- Look for: Sequential Scan (inefficient) vs Index Scan (efficient)
-- If Sequential Scan: missing index
```

4. **Check for missing indexes**
```sql
-- Identify columns in WHERE clauses of slow queries
-- Example: WHERE workspace_id = X AND status = Y

-- Check if indexes exist
SELECT * FROM pg_indexes 
WHERE tablename = 'risk_assessments' 
AND indexname LIKE '%workspace%';

-- If missing, create index
CREATE INDEX idx_assessments_workspace_status 
ON public.risk_assessments (workspace_id, status);

-- Verify index is used
EXPLAIN ANALYZE 
SELECT * FROM risk_assessments 
WHERE workspace_id = 'xyz' AND status = 'pending';
-- Should show: Index Scan (fast)
```

5. **Check row count and table bloat**
```sql
-- Large tables = slow full table scans
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- For tables > 1GB, consider:
-- 1. Archiving old data (see DATA_RETENTION_POLICY.md)
-- 2. Partitioning (if > 100M rows)
-- 3. Caching frequently-accessed data
```

**Resolution:**
- Missing index: `CREATE INDEX ...` (typically improves performance 10-100x)
- Table bloat: Archive old rows, vacuum analyze
- Query inefficiency: Rewrite query to use indexes
- External API: Slow third-party service (Firecrawl, OpenAI) — add caching

---

### Symptom: Intermittent Slowness (Performance Varies)

**Investigation Steps:**

1. **Check database connection pool**
```bash
# Supabase Console → Settings → Database
# Check: Active connections vs max connections
# If approaching max: increase pool size or investigate long-running queries

SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE state = 'active';
```

2. **Check for long-running queries blocking others**
```sql
-- Find queries running > 30 seconds
SELECT pid, usename, query, query_start, state_change
FROM pg_stat_activity
WHERE query_start < now() - interval '30 seconds'
AND state != 'idle';

-- Kill blocking query if necessary
SELECT pg_terminate_backend(pid);
```

3. **Check cache effectiveness**
```bash
# If API has caching layer:
# - Monitor cache hit rate
# - Verify cache keys are correct
# - Check for cache stampede (simultaneous misses)

# Example: Redis cache inspection
redis-cli INFO stats
# Look for: hits vs misses ratio (should be > 90% hits)
```

4. **Check external API rate limits**
```bash
# If calling Firecrawl or OpenAI:
curl -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
  https://api.firecrawl.dev/v1/health

# Check rate limit headers in response
# X-RateLimit-Limit: requests per minute
# X-RateLimit-Remaining: remaining requests
# X-RateLimit-Reset: when limit resets
```

**Resolution:**
- Connection pool exhaustion: Increase pool size, terminate idle connections
- Blocking queries: Kill long-running queries, optimize query
- Cache miss storms: Increase cache TTL, add fallback caching
- Rate limits: Implement request queuing, add backoff/retry logic

---

## 2. Database Troubleshooting

### Symptom: Database Connection Failures

**Investigation Steps:**

1. **Check database status**
```bash
# Supabase Console → Database → Status
curl -X GET https://[project-ref].supabase.co/health
```

2. **Verify connection string**
```bash
# Check environment variables
echo $SUPABASE_DB_URL

# Connection string format:
# postgres://user:password@db.supabase.co:5432/postgres

# Test connection
psql $SUPABASE_DB_URL -c "SELECT version();"
```

3. **Check connection pool saturation**
```sql
-- How many connections are in use?
SELECT datname, count(*) as connections
FROM pg_stat_activity
GROUP BY datname
ORDER BY count(*) DESC;

-- Max connections setting
SHOW max_connections;
-- Default: 100 (Supabase) → increase if needed
```

4. **Check for connection leaks**
```sql
-- Idle connections lasting > 5 minutes
SELECT pid, usename, query, state, query_start
FROM pg_stat_activity
WHERE state = 'idle in transaction'
AND query_start < now() - interval '5 minutes';

-- These are problematic: terminate them
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity
WHERE state = 'idle in transaction'
AND query_start < now() - interval '5 minutes';
```

**Resolution:**
- Database down: Check Supabase status, contact support
- Connection refused: Verify connection string, IP whitelist, credentials
- Connection pool exhausted: Increase pool size, fix connection leaks
- Slow connection: Network latency — check from different region

---

### Symptom: Query Errors After Schema Migration

**Investigation Steps:**

1. **Verify migration was applied**
```sql
-- Check migration status
SELECT * FROM schema_migrations 
ORDER BY version DESC 
LIMIT 5;
```

2. **Check for syntax errors in migration**
```bash
# Review migration file
cat supabase/migrations/[filename].sql

# Run migration locally for testing
psql $DATABASE_URL -f supabase/migrations/[filename].sql
```

3. **Verify schema changes**
```sql
-- Check if table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'new_table';

-- Check if column exists
SELECT * FROM information_schema.columns 
WHERE table_name = 'table_name' 
AND column_name = 'new_column';

-- Check indexes created
SELECT * FROM pg_indexes 
WHERE tablename = 'table_name';
```

4. **Check RLS policies**
```sql
-- Verify policies exist on table
SELECT * FROM pg_policies 
WHERE tablename = 'table_name';

-- Test RLS by querying as different user
SET ROLE authenticated;
SELECT COUNT(*) FROM table_name;
```

**Resolution:**
- Migration not applied: Check Supabase console, re-apply migration
- Syntax error: Fix SQL and re-deploy
- RLS blocking queries: Verify policies match requirements
- Missing permissions: Grant necessary privileges

---

## 3. Data Issues

### Symptom: Inconsistent or Missing Data

**Investigation Steps:**

1. **Check data presence**
```sql
-- Count records
SELECT COUNT(*) FROM assessments 
WHERE workspace_id = 'abc123';

-- Look for expected records
SELECT * FROM assessments 
WHERE workspace_id = 'abc123' 
ORDER BY created_at DESC 
LIMIT 10;
```

2. **Check for NULL values**
```sql
-- Find records with unexpected NULLs
SELECT id, status, created_at 
FROM assessments 
WHERE workspace_id = 'abc123' 
AND status IS NULL 
LIMIT 10;
```

3. **Check audit trail**
```sql
-- See what happened to the data
SELECT action, status, changes 
FROM audit_logs 
WHERE resource_type = 'assessment' 
AND resource_id = 'assessment-id' 
ORDER BY created_at DESC;

-- Example: see if record was deleted
SELECT * FROM audit_logs 
WHERE action = 'assessment.delete' 
AND resource_id = 'assessment-id';
```

4. **Check for concurrency issues**
```sql
-- Find conflicting updates
SELECT * FROM assessments 
WHERE workspace_id = 'abc123' 
AND updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;

-- Check for row-level locks
SELECT * FROM pg_locks 
WHERE locktype = 'relation' 
AND database = (SELECT oid FROM pg_database WHERE datname = 'postgres');
```

**Resolution:**
- Data never inserted: Check API request, verify permissions
- Data deleted: Restore from Supabase backup (within 7 days)
- Stale data: Cache issue — clear cache, verify database
- Concurrency conflict: Add optimistic locking, implement conflict resolution

---

## 4. API Request Issues

### Symptom: 400 Bad Request Errors

**Investigation Steps:**

1. **Log the request**
```bash
# Capture full request
curl -v -X POST https://yourapp.com/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"test"}'

# Check request headers and body
```

2. **Check request validation**
```typescript
// Example from code: What validation is applied?
// POST /api/search expects:
// - query: string (required, max 1000 chars)
// - limit: number (optional, default 50, max 500)

// Invalid request:
curl -X POST https://yourapp.com/api/search \
  -H "Content-Type: application/json" \
  -d '{}' // Missing required 'query'

// Expected response: 400 Bad Request with error details
```

3. **Check authentication**
```bash
# Missing auth header
curl https://yourapp.com/api/audit-logs
# Returns: 401 Unauthorized

# Invalid auth
curl -H "Authorization: Bearer invalid_token" \
  https://yourapp.com/api/audit-logs
# Returns: 401 Unauthorized

# Correct auth
curl -H "Authorization: Bearer valid_token" \
  https://yourapp.com/api/audit-logs
# Returns: 200 OK
```

**Resolution:**
- Missing field: Include required request fields
- Invalid format: Check field types (string vs number vs boolean)
- Missing auth: Include Authorization header with valid token
- Expired token: Refresh session token

### Symptom: 500 Internal Server Error

**Investigation Steps:**

1. **Check application logs**
```bash
# Vercel deployment logs
# Navigate to: Vercel Dashboard → Deployments → Select deployment → Logs

# Look for: Uncaught exception, database error, external API timeout
```

2. **Check error message details**
```bash
# API error response
curl https://yourapp.com/api/search?query=test 2>&1

# Should include error message:
# { "ok": false, "error": "Internal server error" }
```

3. **Enable debugging**
```bash
# Set environment variable
DEBUG=* npm run dev

# Run request again to capture full error trace
```

4. **Check rate limiting**
```bash
# If getting 429 Too Many Requests
curl https://yourapp.com/api/blocking-conditions

# Check if rate limit is hit
# Adjust rate limit configuration or wait for window reset
```

**Resolution:**
- Uncaught exception: Fix code bug, deploy fix
- Database error: Check database status, verify connection
- External API timeout: Implement timeout, add retry logic
- Rate limited: Wait 15 minutes or restart server

---

## 5. Memory & Resource Issues

### Symptom: High Memory Usage

**Investigation Steps:**

1. **Check profiler memory usage**
```bash
curl https://yourapp.com/api/performance-profile?type=state

# Response:
# { activeProfiles: 150, completedProfiles: 987, totalMemoryEstimate: "12.5MB" }
```

2. **Identify memory leaks**
- Large objects held in closures
- Event listeners not cleaned up
- Circular references preventing garbage collection

3. **Check request log size**
```bash
# If request-logger is consuming memory:
# - Reduce max log size (default: 500)
# - Clear old logs more frequently
# - Archive to database instead of in-memory
```

**Resolution:**
- Profiler memory: Clear old profiles, reduce history size
- Memory leak: Find and fix leak in code
- Large caches: Implement eviction policy, reduce TTL

### Symptom: Timeout Errors

**Investigation Steps:**

1. **Check request duration**
```bash
# Get slow requests
curl "https://yourapp.com/api/performance-profile?type=slow&minDurationMs=3000"

# Identify which step times out
curl "https://yourapp.com/api/performance-profile?type=profile&requestId=req-123"
```

2. **Identify timeout source**
- Database query (check slow query logs)
- External API (Firecrawl, OpenAI)
- Network latency
- Processing bottleneck

3. **Set appropriate timeouts**
```typescript
// Example timeout configuration
const TIMEOUT_MS = 30000; // 30 seconds
const FIRECRAWL_TIMEOUT_MS = 20000; // External API limit
const DB_QUERY_TIMEOUT_MS = 5000; // Database limit

// Implement with Promise.race
const resultPromise = databaseQuery();
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Query timeout')), DB_QUERY_TIMEOUT_MS)
);

await Promise.race([resultPromise, timeoutPromise]);
```

**Resolution:**
- Slow database: Add index, archive data, optimize query
- Slow external API: Add retry logic, implement caching
- Processing slow: Profile code, optimize algorithm
- Network slow: Check region, implement compression

---

## 6. Security Issues

### Symptom: Unusual Account Activity

**Investigation Steps:**

1. **Check audit logs for user**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://yourapp.com/api/audit-logs?type=logs&user_id=user-123&limit=100"
```

2. **Look for suspicious patterns**
```sql
-- Multiple failed login attempts
SELECT user_id, COUNT(*) as failures 
FROM audit_logs 
WHERE action = 'auth.login' 
AND status = 'failure'
AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id 
ORDER BY failures DESC;

-- Unusual access times
SELECT * FROM audit_logs 
WHERE user_id = 'suspect-user' 
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at;
```

3. **Check IP address history**
```bash
# Compare access IPs
curl -H "Authorization: Bearer $TOKEN" \
  "https://yourapp.com/api/audit-logs?type=logs&user_id=user-123&limit=50" \
  | jq '.logs[] | {timestamp: .created_at, ip: .ip_address}'
```

4. **Review data modifications**
```bash
# What did this user change?
curl -H "Authorization: Bearer $TOKEN" \
  "https://yourapp.com/api/audit-logs?type=logs&user_id=suspect-user" \
  | jq '.logs[] | select(.action | startswith("assessment") or startswith("obligation"))'
```

**Resolution:**
- Force password reset
- Revoke sessions
- Review what data was accessed/modified
- Restore data if compromised
- Enable additional auth factors

---

## Quick Diagnostic Checklist

**When system is slow:**
- [ ] Check /api/production-health (P95 latency, error rate)
- [ ] Check /api/request-logs?type=stats (which endpoint slow?)
- [ ] Get slow request profile (which step slow?)
- [ ] Check database slow query logs
- [ ] Verify indexes on filtered columns
- [ ] Check for missing data or connection issues

**When data is missing:**
- [ ] Check audit_logs for delete events
- [ ] Verify row-level security (RLS) policies
- [ ] Check for concurrent modifications
- [ ] Restore from Supabase backup if needed
- [ ] Check for NULL values in critical fields

**When users report errors:**
- [ ] Check /api/blocking-conditions (rate limit? security issue?)
- [ ] Check Vercel deployment logs
- [ ] Check audit_logs for user's actions
- [ ] Verify authentication token valid
- [ ] Test request manually with curl

---

**Document Owner:** Engineering Support  
**Last Updated:** 2026-07-15  
**Next Review:** 2026-08-15
