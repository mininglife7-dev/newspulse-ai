# Database Operations Runbook

**Type**: Runbook  
**Audience**: Database Administrators, DevOps Engineers, Backend Leads  
**Authority**: Governor Ω  
**Status**: Active  
**Last Updated**: 2026-07-16  
**Review Schedule**: After each schema migration or quarterly  
**Time Estimate**: Varies by operation  
**Owner**: Governor Ω

---

## Quick Reference

Database operations for Supabase PostgreSQL (EU-hosted). Used for migrations, backups, recovery, and troubleshooting.

**Emergency**: If database is down, see Emergency Recovery section.

---

## Migrations (Schema Changes)

### Creating a Migration

When you need to change the database schema (add table, add column, change type, etc.):

**Step 1: Create migration file**

```bash
npx supabase migration new add_evidence_linking
```

This creates: `supabase/migrations/TIMESTAMP_add_evidence_linking.sql`

**Step 2: Write SQL migration**

```sql
-- Add column to evidence table
ALTER TABLE evidence ADD COLUMN obligation_id UUID REFERENCES obligations(id);

-- Add RLS policy for workspace isolation
CREATE POLICY "Workspace isolation for evidence-obligation link"
  ON evidence
  USING (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid);
```

**Best practices**:

- Make migrations small (one logical change per file)
- Include comments explaining WHY
- Test on local database first
- Never use DROP CASCADE (can lose data)
- Always include RLS policies for new tables

**Step 3: Test locally**

```bash
# Reset local database and run migration
npx supabase db reset

# Verify changes
npx supabase db push
```

**Step 4: Deploy to production**

```bash
# Commit migration
git add supabase/migrations/
git commit -m "migration: add evidence-obligation linking"

# Push to main
git push origin main

# Vercel automatically runs migrations during deployment
```

### Rollback Migration

If migration broke something:

```bash
# Revert the migration file (undo the SQL)
# Edit the migration file, REMOVE the changes

# Or create a new "undo" migration
npx supabase migration new undo_evidence_linking

# Add SQL to undo the changes
-- DROP COLUMN evidence.obligation_id;
-- DROP POLICY "..." ON evidence;

# Test and deploy
```

---

## Backups & Recovery

### Automatic Backups

Supabase automatically backs up your database:

- Daily backups retained 7 days
- Weekly backups retained 4 weeks
- Location: EU (compliant with data residency)

**View backups**:

- Supabase dashboard → Database → Backups tab
- Shows: Timestamp, size, retention period

### Manual Backup

Before major operations:

```bash
# Export full database
pg_dump postgresql://[user]:[password]@[host]:5432/[db] > backup.sql

# Or use Supabase CLI
npx supabase db pull  # Downloads schema
```

### Recovery from Backup

**If data is corrupted or lost**:

1. **Assess damage**
   - How much data affected?
   - How long ago did it happen?
   - Which tables affected?

2. **Choose restore method**

   **Option A: Restore from Supabase backup** (full database)
   - Supabase dashboard → Database → Backups
   - Click backup timestamp
   - Click "Restore"
   - Warning: This reverts ENTIRE database to that point in time
   - All changes since backup are lost

   **Option B: Restore specific table** (surgical)
   - Requires backup dump file
   - Use: `psql -d [database] < backup.sql`
   - Can target specific tables/data ranges

   **Option C: Manual fix** (if data issue small)
   - UPDATE/DELETE statements to correct data
   - Requires exact knowledge of what's wrong
   - High risk if not done carefully

3. **Execute recovery**
   - Back up current database FIRST
   - Test recovery on staging database first
   - Execute recovery
   - Verify data integrity
   - Announce recovery completion

---

## Performance Tuning

### Check Slow Queries

```sql
-- View slowest queries (requires pg_stat_statements)
SELECT query, calls, mean_time, max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

**If query takes >1 second**:

- Add index on WHERE/JOIN columns
- Check for N+1 queries (fetching in loop)
- Look for missing WHERE clause (scanning entire table)

### Add Index

```sql
-- Add index for fast lookups
CREATE INDEX idx_evidence_obligation_id
  ON evidence(obligation_id);

-- For composite queries
CREATE INDEX idx_evidence_status_workspace
  ON evidence(workspace_id, status);

-- For WHERE clauses
CREATE INDEX idx_assessments_completed
  ON assessments(workspace_id)
  WHERE status = 'completed';
```

**Index naming**: `idx_[table]_[columns]`

### Monitor Performance

Supabase dashboard → Database → Monitoring:

- CPU usage: Should stay <80%
- Memory: Should not spike
- Active connections: <20 normal
- Query time: Check for slowness

**If high CPU**:

1. Identify slow query (see above)
2. Add index or optimize query
3. Monitor again

**If memory high**:

1. Check for connection leaks
2. Kill long-running queries
3. Restart database if needed

---

## Connection Management

### Check Active Connections

```sql
SELECT usename, count(*) FROM pg_stat_activity GROUP BY usename;
```

### Kill Long-Running Query

```sql
-- Find long-running query
SELECT pid, duration, query FROM pg_stat_activity
WHERE duration > interval '5 minutes';

-- Kill it
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
WHERE pid = [PID];
```

### Connection Pool Issues

Symptoms: "Cannot acquire connection" errors

**Action**:

1. Check active connections (see above)
2. If stuck: Kill old connections
3. Restart API layer (kills all connections)
4. Verify pool health

---

## Row Level Security (RLS) Management

### Check RLS Status

```sql
-- View RLS policies for a table
SELECT * FROM pg_policies WHERE tablename = 'evidence';

-- Check if RLS is enabled
SELECT relname, relrowsecurity FROM pg_class
WHERE relname IN ('evidence', 'obligations', 'assessments');
```

### Add RLS Policy

```sql
-- Enable RLS on table
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;

-- Add policy for workspace isolation
CREATE POLICY "Users can only access their workspace" ON evidence
  FOR SELECT
  USING (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid);

CREATE POLICY "Users can only modify their workspace" ON evidence
  FOR UPDATE
  USING (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid)
  WITH CHECK (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid);
```

### Verify RLS Enforcement

Test that data is properly isolated:

```sql
-- As user_id from workspace 1
SELECT * FROM evidence WHERE workspace_id = 'workspace-2-id';
-- Should return: no rows (unless RLS is broken)

-- If returns rows: RLS is broken! Emergency!
```

---

## Emergency Recovery

### Database Down (Complete Outage)

**Symptoms**: Cannot connect, all queries timeout, 503 errors

**Action**:

1. **Verify it's down**

   ```bash
   curl -s https://newspulse-ai.vercel.app/api/health | jq .
   ```
   - If database component: ❌ Status down

2. **Check Supabase status**
   - Visit: https://status.supabase.com
   - Is there an incident? If yes, wait for Supabase to fix

3. **Restart database** (if not Supabase issue)
   - Supabase dashboard → Database → Restart
   - Takes 2-5 minutes
   - All connections are killed and reconnected

4. **If restart doesn't work**
   - Contact Supabase support immediately
   - Provide: Error messages, timeline, affected operations
   - Have: Database ID, project name ready

5. **Restore from backup** (if data corruption)
   - See Backup & Recovery section above
   - Restore to point just before corruption

### Data Corruption (Suspect Bad Data)

**Symptoms**: Validation errors, illogical data values, missing references

**Action**:

1. **Identify affected data**
   - Query to find bad records
   - Example: `SELECT * FROM evidence WHERE obligation_id IS NULL;`

2. **Assess scope**
   - How many records affected?
   - How old is corruption?
   - Can we isolate to specific workspace?

3. **Choose fix**
   - If few records: Manual UPDATE/DELETE
   - If many records: Restore from backup
   - If critical: Contact Supabase support

4. **Implement fix**
   - Test fix on staging first
   - Execute fix with before/after verification
   - Announce completion

### Connection Pool Exhausted

**Symptoms**: "Cannot acquire connection" errors, service hangs

**Action**:

1. **Check connections**

   ```sql
   SELECT count(*) FROM pg_stat_activity;
   ```
   - Normal: <20 connections
   - Problem: >50 connections

2. **Kill old/idle connections**

   ```sql
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity
   WHERE state = 'idle' AND query_start < now() - interval '30 minutes';
   ```

3. **Restart API layer**
   - This kills all connections and forces reconnect
   - Vercel: Trigger new deployment (or restart)
   - Takes 2-3 minutes

4. **Monitor recovery**
   - Verify connection count drops
   - Check health endpoint: `/api/health`
   - Should show database: ✅ healthy

---

## Maintenance Tasks

### Weekly

- [ ] Check database size: `SELECT pg_database_size('newspulse_ai');`
- [ ] Monitor slow queries (see Performance Tuning above)
- [ ] Verify RLS policies are working (test queries from different workspaces)

### Monthly

- [ ] Review backups exist and are recent
- [ ] Check connection pool health
- [ ] Review disk usage (Supabase dashboard)
- [ ] Verify replication lag is <1 second (if replicated)

### Quarterly

- [ ] Review unused indexes: `SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;`
- [ ] Update migration documentation
- [ ] Audit RLS policies for completeness
- [ ] Review old backups and retention

---

## Common Issues & Fixes

### Cannot Create Table

**Error**: `permission denied` or `schema authorization`

**Fix**: Ensure you're connected as owner user, not read-only user

### Slow Queries After Update

**Cause**: Statistics out of date

**Fix**: `ANALYZE;` — rebuilds query planner statistics

### RLS Not Blocking Access

**Cause**: Policy disabled or incorrect

**Fix**:

1. Verify RLS enabled: `ALTER TABLE [table] ENABLE ROW LEVEL SECURITY;`
2. Check policy: `SELECT * FROM pg_policies WHERE tablename = '[table]';`
3. Test from different workspace

### Foreign Key Constraint Violations

**Cause**: Referenced record deleted or changed

**Fix**:

1. Identify violating records
2. Update them to valid reference or delete them
3. Recreate valid relationships

---

## Related Documents

- `CHECKLISTS/MONTHLY_COMPLIANCE_AUDIT.md` — Database verification checklist
- `docs/engineering/DATABASE_SCHEMA.md` — Current schema documentation
- `docs/governance/ENGINEERING_STANDARDS.md` — RLS enforcement standards
- `PROCEDURES/ROLLBACK.md` — Rollback procedures (database migrations section)

---

## Updated By

**Session**: Governor Ω (STAGE 4 Phase 4.2)  
**Date**: 2026-07-16  
**Changes**: Initial creation as part of STAGE 4 Phase 4.2 (Operational Knowledge)
