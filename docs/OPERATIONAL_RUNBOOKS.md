# Operational Runbooks

**Version:** 1.0  
**Last Updated:** 2026-07-15  
**Audience:** Operations, DevOps, Support Team

These runbooks provide step-by-step procedures for common operational scenarios.

---

## 1. Authentication Issues

### Symptom: Users Can't Log In

**Indicators:**
- Multiple support tickets about login failures
- 401 errors in `/api/health`
- GET /api/health returns `{ auth_status: "degraded" }`

**Root Cause Investigation:**

1. Check Supabase auth status
```bash
# Connect to Supabase console
# Settings → Database → Check logs for auth errors
# Look for: "user not found", "invalid credentials", "auth token expired"
```

2. Check if auth endpoint is reachable
```bash
curl -X GET https://[project-ref].supabase.co/auth/v1/health
# Expected: 200 OK
```

3. Check JWT token configuration
```bash
# Verify NEXT_PUBLIC_SUPABASE_ANON_KEY is correct
# Verify SUPABASE_SERVICE_ROLE_KEY is correct
```

**Resolution Steps:**

**Option A: JWT Token Issue**
1. In Supabase console: Settings → API → Copy anon key
2. In Vercel: Update NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable
3. Redeploy application
4. Test login with new token

**Option B: Email/Password Auth Disabled**
1. In Supabase console: Settings → Authentication → Providers
2. Verify Email auth is enabled
3. If disabled: Enable Email/Password provider
4. Test login again

**Option C: Rate Limiting Issue**
1. Check /api/blocking-conditions for rate limit errors
2. If rate limit hit: Wait 15 minutes for window to reset
3. Or restart application to clear in-memory rate limit store

**Rollback:**
- Previous auth key in Vercel version history
- Restore from backup if tokens corrupted

---

### Symptom: Specific User Can't Access Workspace

**Indicators:**
- User logs in successfully
- 409 error on workspace operations
- User sees "No workspace — complete company setup first"

**Root Cause Investigation:**

1. Verify user is in workspace_members table
```sql
SELECT * FROM workspace_members 
WHERE user_id = '[user_id]' 
  AND status = 'active';
```

2. Check membership status
```sql
-- Possible statuses: pending, active, removed
SELECT status FROM workspace_members 
WHERE user_id = '[user_id]';
```

3. Verify workspace exists
```sql
SELECT * FROM workspaces 
WHERE id = '[workspace_id]' 
  AND status = 'active';
```

**Resolution Steps:**

**Option A: User Not Invited Yet**
1. Ask workspace owner to invite user
2. User receives email invitation
3. User clicks link to accept membership
4. status changes from 'pending' → 'active'
5. Retry workspace access

**Option B: User Membership Was Removed**
1. Workspace owner re-invites user
2. Follow standard invite flow

**Option C: User in Wrong Workspace**
1. Check if user is in current_workspace_id in profiles table
2. Update profiles.current_workspace_id if needed
```sql
UPDATE profiles 
SET current_workspace_id = '[correct_workspace_id]'
WHERE id = '[user_id]';
```

---

## 2. Database Performance Issues

### Symptom: Slow API Responses (>1 second median latency)

**Indicators:**
- Users report slow page loads
- GET /api/production-health shows latency > 1000ms p95
- Database query logs show >1 second execution time

**Root Cause Investigation:**

1. Check query performance in Supabase
```sql
-- Supabase Console → Logs → Slow Queries
-- Look for queries taking >1 second
```

2. Check if indexes are missing
```sql
-- For each slow query, identify filtering columns
-- Check if indexes exist on those columns
SELECT * FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename = 'risk_assessments';
```

3. Check row counts
```sql
-- Large tables can cause full table scans
SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Resolution Steps:**

**Option A: Missing Index**
1. Identify filtering column: `WHERE workspace_id = X`
2. Create index:
```sql
CREATE INDEX IF NOT EXISTS idx_table_workspace 
ON public.table_name (workspace_id);
```
3. Verify index is used:
```sql
EXPLAIN ANALYZE 
SELECT * FROM table_name WHERE workspace_id = 'xxx';
-- Should show: "Index Scan" not "Seq Scan"
```

**Option B: Too Many Rows in Table**
1. Check if old data can be archived
2. Consider retention policy (see DATA_RETENTION_POLICY.md)
3. Archive/delete old records:
```sql
-- Move old records to archive table
INSERT INTO archived_assessments 
SELECT * FROM risk_assessments 
WHERE created_at < NOW() - INTERVAL '2 years';

DELETE FROM risk_assessments 
WHERE created_at < NOW() - INTERVAL '2 years';
```

**Option C: Slow RPC Function**
1. Profile the RPC function:
```sql
EXPLAIN ANALYZE 
SELECT * FROM get_obligation_evidence('obligation-id');
```
2. Look for sequential scans or expensive joins
3. Add indexes on foreign key columns
4. Consider caching results

**Monitoring:**
- Daily: Review /api/production-health for latency > 500ms
- Weekly: Review Supabase slow query logs
- Monthly: Review database size and growth trends

---

## 3. Storage Issues

### Symptom: Evidence Upload Fails

**Indicators:**
- POST /api/evidence returns 500 error
- "Failed to upload file" message to user
- Files not visible in storage

**Root Cause Investigation:**

1. Check Supabase Storage bucket
```
Supabase Console → Storage → compliance-evidence bucket
Check: Exists? Has size limit? Policy correct?
```

2. Check storage limits
```
Supabase Console → Storage → Usage
Check: Percentage full? Approaching quota?
```

3. Check RLS policy
```sql
-- Verify bucket policy allows uploads
SELECT * FROM storage.objects 
WHERE bucket_id = 'compliance-evidence' 
LIMIT 1;
```

**Resolution Steps:**

**Option A: Bucket Doesn't Exist**
1. Create bucket in Supabase Console
   - Storage → New Bucket
   - Name: `compliance-evidence`
   - Public: OFF (private)
2. Create RLS policy for uploads
3. Test upload again

**Option B: Storage Quota Exceeded**
1. Review file sizes:
```sql
SELECT file_name, file_size, created_at 
FROM obligation_evidence 
ORDER BY file_size DESC LIMIT 20;
```
2. Delete old/large files:
```sql
-- Delete evidence older than retention period
DELETE FROM obligation_evidence 
WHERE created_at < NOW() - INTERVAL '7 years';
```
3. Upgrade Supabase plan for more storage

**Option C: Permission Denied**
1. Check RLS policy on bucket
2. Verify user can access bucket
3. Verify evidence route has correct `uploaded_by` permissions

---

## 4. Security Incidents

### Symptom: Unusual Authentication Attempts

**Indicators:**
- GET /api/audit-logs?severity=critical shows many attempts
- GET /api/blocking-conditions reports security issues
- Multiple failed login attempts detected

**Root Cause Investigation:**

1. Check audit logs for failed auth
```bash
curl "https://yourapp.com/api/audit-logs?type=critical" \
  -H "Authorization: Bearer $TOKEN"
```

2. Identify attacker IP addresses
```sql
SELECT ip_address, COUNT(*) as attempts, MAX(created_at) as last_attempt
FROM audit_logs 
WHERE action = 'auth.login' 
  AND status = 'failure'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY ip_address 
ORDER BY attempts DESC;
```

3. Check if accounts were compromised
```sql
SELECT user_id, COUNT(*) as failed_attempts 
FROM audit_logs 
WHERE action = 'auth.login' 
  AND status = 'failure'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id 
ORDER BY failed_attempts DESC;
```

**Resolution Steps:**

**Option A: Rate Limit Activation**
1. Automatic: Rate limiter blocks after 5 failed attempts per 15 minutes
2. If still occurring: Increase rate limit strictness (code change required)
3. Notify affected users to change passwords

**Option B: Account Compromise**
1. Force password reset for affected user:
```sql
-- In Supabase auth console, reset user password
-- Go to Users → select user → Reset password
```
2. Notify user via email
3. Clear sessions:
```sql
-- Sessions auto-expire in Supabase, no manual action needed
```

**Option C: IP-Based Attack**
1. If attack from specific IP: Block via WAF/Vercel (contact admin)
2. Monitor /api/blocking-conditions for continued attempts
3. If ongoing: Consider enabling additional auth factors

**Post-Incident:**
1. Review audit logs for scope of potential access
2. Run security scan
3. Update CONTRIBUTOR.md with incident details
4. Schedule post-mortem meeting

---

## 5. Deployment Issues

### Symptom: Deployment Fails on Vercel

**Indicators:**
- PR shows red X on Vercel deployment check
- Error message: "Deployment failed — Environment Variable..."
- Application doesn't deploy after push

**Root Cause Investigation:**

1. Check Vercel error details
   - Click deployment check → View logs
   - Look for: "GITHUB_TOKEN", env var not found, build error

2. Common causes:
   - Missing environment variable
   - Incorrect secret name
   - Type checking error
   - Build timeout

**Resolution Steps:**

**Option A: Missing Secret**
1. If error mentions "GITHUB_TOKEN":
   - Vercel → Project Settings → Environment Variables
   - Add secret: Name `github-token`, Value: [GitHub PAT]
   - Redeploy manually or push new commit

2. If error mentions other secret:
   - Verify secret name in vercel.json matches variable name
   - Check Vercel Settings → Secrets
   - Ensure secret is set correctly

**Option B: Build Error**
1. Check build logs for error line number
2. Fix TypeScript error in code
3. Push new commit to trigger rebuild

**Option C: Build Timeout**
1. Check build steps in vercel.json
2. Optimize build: npm ci with cache
3. If still timing out: Contact Vercel support

**Recovery:**
- Redeploy previous working version from Vercel dashboard
- Or push to main to trigger rebuild

---

## 6. Data Recovery

### Scenario: Accidental Data Deletion

**Situation:** User accidentally deletes critical assessment data

**Recovery Steps:**

1. **Immediate (within 24 hours):**
   - Contact Supabase support
   - Request point-in-time recovery (PITR)
   - Specify time before deletion occurred
   - Supabase can restore within last 7 days

2. **Restore from Backup:**
```bash
# Supabase maintains automated backups
# Recovery typically available within 1-7 days
# Contact: support@supabase.com
```

3. **Manual Recovery:**
```sql
-- If audit logs available, view what was deleted
SELECT * FROM audit_logs 
WHERE action = 'assessment.delete' 
  AND status = 'success'
  AND created_at > NOW() - INTERVAL '24 hours';

-- Request data owner to confirm what was deleted
-- Supabase support can restore from backup
```

**Prevention:**
- Enable audit logging (already implemented)
- Regular backup verification (quarterly)
- Soft deletes for critical tables (already implemented)

---

## 7. Monitoring & Alerts

### Health Check Endpoints

**Monitor these endpoints every 5 minutes:**

```bash
# Overall health
GET /api/health

# Blocking conditions
GET /api/blocking-conditions

# Production health (latency, errors)
GET /api/production-health

# Deployment verification
GET /api/verify-deployment
```

**Alert Thresholds:**

| Metric | Alert Threshold | Action |
|--------|-----------------|--------|
| API Latency p95 | >1000ms | Check database, consider optimization |
| Error Rate | >1% | Review error logs, investigate root cause |
| Auth Failures | >5/15min | Check rate limit, review audit logs |
| Deployment Health | Red | Review build logs, fix errors |
| Database Connectivity | Down | Contact Supabase support |

### Daily Operations Checklist

**Start of Day:**
- [ ] Check /api/health → all systems green
- [ ] Review /api/blocking-conditions → no critical alerts
- [ ] Check error rate trend (should be <0.5%)

**During Day:**
- [ ] Monitor /api/production-health every 2 hours
- [ ] Review error logs for patterns
- [ ] Check audit logs for security events

**End of Day:**
- [ ] Run /api/verify-deployment → should pass
- [ ] Verify backup status (Supabase console)
- [ ] Document any incidents

---

## 8. Escalation Procedures

### Severity Levels

| Level | Examples | Response Time | Owner |
|-------|----------|----------------|-------|
| P1 (Critical) | All users affected, auth down, data loss | 15 min | CTO/VP Eng |
| P2 (High) | Workspace unavailable, data corruption risk | 1 hour | Senior Engineer |
| P3 (Medium) | Single user affected, feature broken | 4 hours | On-call Engineer |
| P4 (Low) | UI issue, non-critical feature | Next business day | Support |

### Escalation Path

1. **Initial:** On-call engineer attempts resolution
2. **30 min no resolution:** Escalate to senior engineer
3. **1 hour no resolution:** Escalate to CTO
4. **2 hours no resolution:** Activate incident management protocol

### Incident Commander Responsibilities

- Declare incident severity
- Assign roles: Commander, Technical Lead, Comms
- Post status updates every 30 minutes
- Track timeline of actions
- Document root cause analysis
- Schedule post-mortem

---

## Quick Reference

**Common Commands:**

```bash
# Check system health
curl https://yourapp.com/api/health

# View rate limiting stats
curl https://yourapp.com/api/blocking-conditions

# Access audit logs (requires auth)
curl -H "Authorization: Bearer $TOKEN" \
  https://yourapp.com/api/audit-logs?type=critical

# Force Vercel redeploy
git commit --allow-empty -m "trigger redeploy"
git push origin main
```

**Contact Information:**
- Supabase Support: support@supabase.com
- Vercel Support: support@vercel.com
- GitHub Support: support@github.com

**Useful Links:**
- Supabase Console: https://app.supabase.com
- Vercel Dashboard: https://vercel.com/dashboard
- GitHub Issues: https://github.com/mininglife7-dev/newspulse-ai/issues

---

**Document Owner:** Operations Team  
**Last Reviewed:** 2026-07-15  
**Next Review:** 2026-08-15
