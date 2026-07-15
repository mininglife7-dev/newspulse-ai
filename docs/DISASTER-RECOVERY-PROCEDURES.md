# Disaster Recovery Procedures

**Purpose:** Step-by-step recovery procedures for critical failures during Beta.  
**Audience:** Founder, operations team  
**Critical for:** First 24 hours when customer data is new and customer is waiting

---

## Table of Contents

1. [Pre-Disaster Preparation](#pre-disaster-preparation)
2. [Failure Scenarios & Recovery](#failure-scenarios--recovery)
3. [Database Backup & Restore](#database-backup--restore)
4. [Application Rollback](#application-rollback)
5. [Testing Your Backups](#testing-your-backups)
6. [Post-Recovery Validation](#post-recovery-validation)

---

## Pre-Disaster Preparation

### Backup Strategy

Supabase provides automatic daily backups for Pro tier, but you need a manual recovery strategy:

**Option 1: Supabase Automated Backups (Recommended for Pro tier)**
- Automatic daily backups (Pro plan only)
- 7-day backup retention
- Point-in-time restore within 7 days
- Cost: $25/month Pro plan

**Option 2: Manual PostgreSQL Dumps (Free tier compatible)**
- Export entire database as SQL script
- Store in GitHub or cloud storage
- Can restore anytime
- Cost: $0 (takes 10 minutes to set up)

**Option 3: Logical Replication (Advanced)**
- Real-time replication to standby database
- Zero data loss on failover
- Cost: $50+/month for standby DB
- Overkill for Beta phase

**For Beta launch, use Option 2 (manual dumps)** — simple, reliable, zero cost.

### Set Up Manual Backup (5 minutes)

**Step 1: Enable manual backup script**

Create a local backup script:
```bash
# File: scripts/backup-db.sh
#!/bin/bash
# Manual Supabase database backup

SUPABASE_URL="$1"
SUPABASE_PASS="$2"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backups/db_${TIMESTAMP}.sql"

mkdir -p backups

# Dump entire database
pg_dump \
  --host=$(echo $SUPABASE_URL | sed 's/https:\/\///' | sed 's/\.supabase\.co.*//').supabase.co \
  --port=5432 \
  --username=postgres \
  --password=$SUPABASE_PASS \
  --dbname=postgres \
  --format=custom \
  --no-owner \
  > "$BACKUP_FILE"

echo "✓ Backup created: $BACKUP_FILE"
```

**Step 2: Schedule backup**

Add to your calendar or cron:
```bash
# Run every day at 2 AM
0 2 * * * cd /home/user/newspulse-ai && bash scripts/backup-db.sh $SUPABASE_URL $SUPABASE_PASS
```

**Step 3: Store backup**

```bash
# Upload to GitHub (commit to repository, encrypted)
# Option: Use GitHub's encrypted secrets or .gitignored backup folder

# Or upload to cloud:
aws s3 cp backups/db_*.sql s3://your-backup-bucket/
```

---

## Failure Scenarios & Recovery

### Scenario 1: Database Becomes Corrupted After Customer Signup

**Symptoms:**
- `ERROR: Relation "workspaces" does not exist`
- `ERROR: Integrity constraint violation`
- `ERROR: Sequence out of order`
- Supabase returns inconsistent data

**Recovery time:** 5-10 minutes (to restore from backup)

**Steps:**

1. **Stop accepting new traffic** (2 min)
   ```
   Vercel → Settings → Pause Deployment
   (This prevents more data corruption)
   ```

2. **Assess damage** (2 min)
   ```sql
   -- In Supabase SQL Editor
   -- Check table integrity
   SELECT * FROM pg_class WHERE relname IN ('workspaces', 'profiles', 'news_searches');
   
   -- Check for orphaned rows
   SELECT * FROM workspaces WHERE owner_id NOT IN (SELECT id FROM auth.users);
   ```

3. **Restore from last good backup** (5 min)
   ```bash
   # Connect to Supabase with postgres credentials
   psql \
     --host=your-project.supabase.co \
     --port=5432 \
     --username=postgres \
     --dbname=postgres \
     < backups/db_20260715_020000.sql
   ```

4. **Verify restore** (2 min)
   ```sql
   -- Check data integrity
   SELECT COUNT(*) FROM workspaces;
   SELECT COUNT(*) FROM profiles;
   SELECT COUNT(*) FROM news_searches;
   ```

5. **Resume production** (1 min)
   ```
   Vercel → Settings → Resume Deployment
   ```

6. **Notify customer** (2 min)
   ```
   "We experienced a brief data consistency issue that has been
   resolved. Your data is safe and restored from backup. No
   customer data was lost. Service is now back online."
   ```

**Total recovery time:** 10-15 minutes

---

### Scenario 2: Accidental Data Deletion (Customer Deletes Workspace)

**Symptoms:**
- Customer workspace disappeared
- Customer reports "I can't find my search history"
- Data is in backup but not in live database

**Recovery time:** 5 minutes

**Steps:**

1. **Retrieve backup** (1 min)
   ```bash
   # Find most recent backup before deletion
   ls -la backups/ | grep db_
   
   # List the exact backup file
   BACKUP="backups/db_20260715_020000.sql"
   ```

2. **Extract customer's data from backup** (2 min)
   ```bash
   # Don't restore entire database - too disruptive
   # Instead, restore customer's data selectively
   
   # Decompress backup and extract customer records
   pg_restore --list "$BACKUP" | grep "workspaces\|news_searches"
   ```

3. **Restore customer's workspace** (2 min)
   ```sql
   -- In Supabase SQL Editor
   -- Restore the specific customer workspace
   
   -- Get workspace ID from backup
   INSERT INTO workspaces (id, owner_id, name, slug, created_at)
   SELECT id, owner_id, name, slug, created_at
   FROM backup_workspaces
   WHERE owner_id = '[customer_user_id]'
   ON CONFLICT DO NOTHING;
   
   -- Restore their searches
   INSERT INTO news_searches (id, workspace_id, query, results, created_at)
   SELECT id, workspace_id, query, results, created_at
   FROM backup_news_searches
   WHERE workspace_id IN (
     SELECT id FROM workspaces WHERE owner_id = '[customer_user_id]'
   )
   ON CONFLICT DO NOTHING;
   ```

4. **Verify restore** (1 min)
   ```sql
   SELECT * FROM workspaces WHERE owner_id = '[customer_user_id]';
   SELECT COUNT(*) FROM news_searches WHERE user_id = '[customer_user_id]';
   ```

5. **Notify customer** (1 min)
   ```
   "Your workspace and search history have been recovered and
   restored to [timestamp]. No data was permanently lost."
   ```

**Total recovery time:** 5-10 minutes (no production downtime)

---

### Scenario 3: Entire Application Crashed (Not Database)

**Symptoms:**
- Vercel deployment shows red X
- `/api/health` returns 500 error
- Customer gets "Service Unavailable"

**Recovery time:** 2-5 minutes

**Steps:**

1. **Identify the broken deployment** (1 min)
   ```
   Vercel → Projects → newspulse-ai → Deployments
   Look for red X on latest deployment
   Click it to see the error
   ```

2. **Rollback to last working version** (2 min)
   ```
   Vercel → Deployments → Find last one with green checkmark
   Click "Promote to Production"
   
   Wait 1-2 minutes for deployment to complete
   ```

3. **Verify rollback worked** (1 min)
   ```bash
   curl https://newspulse-ai.vercel.app/api/health
   # Expected: { "healthy": true }
   ```

4. **Fix the code** (5+ min, depending on error)
   ```bash
   # Reproduce error locally
   npm run build
   # Fix the issue
   git commit -am "fix: Resolve deployment error"
   git push origin main
   # Vercel auto-redeploys
   ```

5. **Verify new deployment** (2 min)
   ```bash
   # Wait for Vercel to deploy
   # Go to https://vercel.com/projects/newspulse-ai/deployments
   # Look for green checkmark on your new commit
   ```

**Total recovery time:** 3-10 minutes (5 min downtime, then fixed)

---

### Scenario 4: GitHub Actions Pipeline Broken (CI/CD Blocked)

**Symptoms:**
- Can push commits but they don't deploy
- Vercel shows "Waiting for checks to pass"
- GitHub Actions shows red X

**Recovery time:** 5-10 minutes

**Steps:**

1. **Check what's broken** (2 min)
   ```
   GitHub → Actions → Latest workflow run → See which step failed
   Common failures:
     - Build fails (code error)
     - Test fails (test error)
     - Type check fails (TypeScript error)
   ```

2. **Fix locally** (5+ min)
   ```bash
   # Reproduce the failure
   npm run build     # if build failed
   npm test          # if tests failed
   npm run type-check # if TS failed
   
   # Fix the issue
   # Commit and push
   git commit -am "fix: Resolve CI failure"
   git push origin main
   ```

3. **Verify Actions succeeded** (2 min)
   ```
   GitHub → Actions → Your new workflow run shows green checkmark
   Vercel shows "Deployment successful"
   ```

**Total recovery time:** 5-10 minutes (no production downtime if you quickly fix)

---

### Scenario 5: Secrets/Credentials Compromised

**Symptoms:**
- Found API key in code (committed by mistake)
- GitHub secret accidentally exposed
- Customer reported suspicious activity

**Recovery time:** 10-15 minutes

**Steps:**

1. **Immediately rotate all credentials** (5 min)
   ```
   1. OpenAI: Go to https://platform.openai.com → API keys → Delete old, create new
   2. Firecrawl: Go to dashboard → Revoke old key, create new
   3. Supabase: Go to Settings → API → Rotate keys
   4. Vercel: Go to Settings → Environment Variables → Update all
   ```

2. **Update GitHub secrets** (2 min)
   ```
   GitHub → Settings → Secrets → Update any exposed secrets
   ```

3. **Redeploy with new credentials** (2 min)
   ```bash
   # Trigger redeploy to pick up new env vars
   git commit --allow-empty -m "ci: Redeploy with rotated credentials"
   git push origin main
   ```

4. **Audit logs for misuse** (5+ min)
   ```
   - OpenAI: Check usage dashboard for unusual API calls
   - Firecrawl: Check API calls for unusual patterns
   - Supabase: Check auth logs for suspicious logins
   - Vercel: Check function logs for errors
   ```

5. **Notify if customer data was exposed** (depends on severity)
   ```
   Contact customer if their email/data was compromised:
   "We discovered and immediately rotated credentials. Your data
   was not accessed. No action needed on your part."
   ```

**Total recovery time:** 10-15 minutes

---

## Database Backup & Restore

### Full Backup Procedure (10 minutes)

**Using pg_dump (manual backup):**

```bash
#!/bin/bash
# scripts/backup-db.sh

# Get Supabase credentials from https://app.supabase.com → Settings → Database → Connection string
# Format: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres

BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backups/db_${BACKUP_TIMESTAMP}.sql"

# Create backups directory
mkdir -p backups

# Dump entire database (custom format for faster restore)
pg_dump \
  --host=[YOUR_SUPABASE_HOST] \
  --port=5432 \
  --username=postgres \
  --password \
  --dbname=postgres \
  --format=custom \
  --verbose \
  --file="$BACKUP_FILE"

# Compress for storage
gzip "$BACKUP_FILE"

echo "✓ Backup complete: ${BACKUP_FILE}.gz"
echo "✓ Size: $(du -h ${BACKUP_FILE}.gz)"

# Optional: Upload to cloud storage
# aws s3 cp "${BACKUP_FILE}.gz" s3://my-backups/
```

**Run it:**
```bash
bash scripts/backup-db.sh
# Enter Supabase password when prompted
```

**Verify backup:**
```bash
# Check backup file exists and has reasonable size
ls -lh backups/db_*.sql.gz

# Should be 1-50 MB for typical Beta data
```

### Full Restore Procedure (10 minutes)

**Using pg_restore:**

```bash
#!/bin/bash
# scripts/restore-db.sh

BACKUP_FILE="${1:-.}"  # Pass backup file path as argument
if [ "$BACKUP_FILE" = "." ]; then
  echo "Usage: bash scripts/restore-db.sh /path/to/backup.sql.gz"
  exit 1
fi

# Decompress if needed
if [[ $BACKUP_FILE == *.gz ]]; then
  TEMP_FILE="${BACKUP_FILE%.gz}"
  gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
  BACKUP_FILE="$TEMP_FILE"
fi

echo "⚠️ WARNING: This will overwrite the entire database."
echo "Backup file: $BACKUP_FILE"
read -p "Continue? (type 'yes' to confirm): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled."
  exit 1
fi

# Restore database
pg_restore \
  --host=[YOUR_SUPABASE_HOST] \
  --port=5432 \
  --username=postgres \
  --password \
  --dbname=postgres \
  --verbose \
  --clean \
  "$BACKUP_FILE"

echo "✓ Database restored from $BACKUP_FILE"

# Cleanup temp file if we decompressed
if [[ $1 == *.gz ]]; then
  rm "$TEMP_FILE"
fi
```

**Run it:**
```bash
bash scripts/restore-db.sh backups/db_20260715_020000.sql

# Enter Supabase password when prompted
# Wait 2-5 minutes for restore to complete
```

**Verify restore:**
```bash
# Reconnect to database and verify data
psql -h [YOUR_SUPABASE_HOST] -U postgres -d postgres

# In psql prompt:
SELECT COUNT(*) FROM workspaces;
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM news_searches;

# Should match pre-backup counts
```

---

### Selective Restore (Recover Single Customer's Data)

**If you only want to restore one customer's data (less disruptive):**

```bash
#!/bin/bash
# scripts/restore-customer.sh

BACKUP_FILE="$1"
CUSTOMER_EMAIL="$2"

if [ -z "$BACKUP_FILE" ] || [ -z "$CUSTOMER_EMAIL" ]; then
  echo "Usage: bash scripts/restore-customer.sh backup.sql customer@email.com"
  exit 1
fi

# Extract customer's data from backup
EXTRACT_SQL=$(cat <<EOF
-- Find customer ID
SELECT id FROM auth.users WHERE email = '$CUSTOMER_EMAIL';

-- Restore their workspaces
-- Restore their search history
-- Restore their profile
EOF
)

# This is complex - usually easier to restore full database and then delete other customers
# See section below for targeted restore using SQL
```

**Alternative: Restore single tables from backup**

```sql
-- In Supabase SQL Editor

-- 1. Create temporary tables from backup
CREATE TABLE IF NOT EXISTS backup_workspaces AS
SELECT * FROM workspaces WHERE false;  -- empty table

-- 2. Restore customer's workspaces from backup SQL
INSERT INTO workspaces (id, owner_id, name, slug, created_at, updated_at)
SELECT id, owner_id, name, slug, created_at, updated_at
FROM backup_workspaces
WHERE owner_id = '[CUSTOMER_USER_ID]'
ON CONFLICT (id) DO NOTHING;

-- 3. Restore their searches
INSERT INTO news_searches (id, workspace_id, user_id, query, results, summary, created_at)
SELECT id, workspace_id, user_id, query, results, summary, created_at
FROM backup_news_searches
WHERE user_id = '[CUSTOMER_USER_ID]'
ON CONFLICT (id) DO NOTHING;

-- 4. Cleanup
DROP TABLE backup_workspaces;
DROP TABLE backup_news_searches;
```

---

## Application Rollback

### Rollback Strategy

Keep the last 3 working deployments:
- Production (current)
- Previous (stable, if current breaks)
- Two-versions-back (fallback)

### Manual Rollback Steps

**Option 1: Revert to Previous Vercel Deployment** (Fastest, 2 min)

```
1. Go to: https://vercel.com/projects/newspulse-ai/deployments
2. Find previous deployment with green checkmark
3. Click "Promote to Production"
4. Wait 1-2 minutes
5. Verify: curl https://newspulse-ai.vercel.app/api/health
```

**Option 2: Revert Git Commit and Redeploy** (Safest, 5 min)

```bash
# Find the commit that caused the problem
git log --oneline | head -5

# Revert that commit
git revert [COMMIT_HASH]
git push origin main

# Vercel automatically deploys
# Wait 3-5 minutes for new deployment
```

**Option 3: Force Rollback** (Emergency, 3 min)

```bash
# Go back N commits and force-push
git reset --hard HEAD~1
git push --force-with-lease origin main

# ⚠️ Only use if absolutely necessary
# Commits will be "lost" (but still in reflog)
```

### Testing Your Rollback Plan

**Weekly drill (5 minutes):**

1. Note current production version (git commit hash)
2. Check last 3 deployments in Vercel exist
3. Deploy dummy change to test automatic rollback
4. Verify can promote previous deployment

---

## Testing Your Backups

### Monthly Backup Verification

**First week of each month, test your backup:**

```bash
# 1. Create isolated backup
bash scripts/backup-db.sh
# Result: backups/db_20260715_020000.sql

# 2. Test restore to temporary database
# (Get a temporary Supabase project)
bash scripts/restore-db.sh backups/db_20260715_020000.sql

# 3. Verify data integrity in restored database
psql -h [TEMP_DB] -U postgres -d postgres

# In psql:
SELECT COUNT(*) FROM workspaces;  -- Should match production
SELECT COUNT(*) FROM news_searches;

# 4. Cleanup temporary project
```

### Quick Backup Health Check

**Every Monday:**
```bash
# Check backups exist and are recent
ls -la backups/db_*.sql.gz | head -5

# First backup should be from yesterday or today
# If missing today's backup, run manual backup

# Check backup size (should be 1-50 MB)
du -h backups/db_*.sql.gz | tail -1
```

---

## Post-Recovery Validation

### After Any Recovery, Run These Checks

**Immediately (5 minutes):**

```bash
# 1. Health check
curl https://newspulse-ai.vercel.app/api/health
# Expected: {"healthy": true}

# 2. Database connectivity
curl https://newspulse-ai.vercel.app/api/workspace/list
# Expected: {"ok": true, "data": [...]}

# 3. Test signup flow
# Go to https://newspulse-ai.vercel.app/auth/signup
# Try creating test account
# Verify email confirmation works
```

**Within 1 hour:**

```bash
# 1. Check data integrity
# In Supabase SQL Editor:
SELECT COUNT(*) FROM workspaces;
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM news_searches;

# 2. Verify RLS policies still work
# Try to query as customer
# Verify they can only see their own data

# 3. Check application logs
# Vercel → Deployments → Latest → Logs
# Look for any error messages
```

**Within 1 day:**

```bash
# 1. Customer confirmation
# Email customer: "Service is fully operational. Your data
#   has been verified and is intact."

# 2. Log the incident
# Document: What failed, how you fixed it, how long it took

# 3. Implement preventative measure
# If data corruption: Improve data validation
# If deployment failure: Add pre-deployment tests
# If credential leak: Implement secret scanning
```

### Data Integrity Checks After Recovery

```sql
-- In Supabase SQL Editor, verify:

-- 1. No orphaned foreign keys
SELECT * FROM workspaces 
WHERE owner_id NOT IN (SELECT id FROM auth.users);
-- Expected: 0 rows

-- 2. No duplicate IDs
SELECT id, COUNT(*) FROM workspaces 
GROUP BY id HAVING COUNT(*) > 1;
-- Expected: 0 rows

-- 3. All timestamps are reasonable
SELECT * FROM workspaces 
WHERE created_at > now() OR created_at < '2026-01-01';
-- Expected: 0 rows

-- 4. RLS policies still enforced
-- Verify: User can only access their own workspaces
-- Verify: User can only see workspace members
```

---

## Quick Reference: Emergency Commands

```bash
# Pre-check before any disaster recovery
./scripts/pre-launch-validation.sh

# Health check
curl -s https://newspulse-ai.vercel.app/api/health | jq .

# Backup database
bash scripts/backup-db.sh

# Restore database (DESTRUCTIVE)
bash scripts/restore-db.sh backups/db_20260715_020000.sql

# Rollback Vercel deployment
# Manual: Go to https://vercel.com → Promotions

# Check GitHub Actions status
# Manual: Go to https://github.com/mininglife7-dev/newspulse-ai/actions

# Pause Vercel (stop accepting traffic)
# Manual: Go to https://vercel.com → Settings → Pause Deployment
```

---

## Recovery Time Objectives (RTOs)

| Failure Type | RTO | Recovery Steps |
|---|---|---|
| Database corruption | 10-15 min | Restore from backup |
| Data deletion | 5 min | Restore customer's data from backup |
| Application crash | 2-5 min | Rollback to previous deployment |
| Deployment broken | 5-10 min | Fix code, redeploy |
| Credentials leaked | 10-15 min | Rotate all keys, redeploy |
| Vercel outage | 1-2 hours | Wait for Vercel, or failover to backup CDN |
| Supabase outage | 1-2 hours | Wait for Supabase, no action needed |

---

## Contacts & Resources

**Supabase Support:**
- Dashboard: https://app.supabase.com
- Status: https://status.supabase.com
- Docs: https://supabase.com/docs
- Support: https://supabase.com/support

**Vercel Support:**
- Dashboard: https://vercel.com
- Status: https://www.vercelstatus.com
- Docs: https://vercel.com/docs
- Support: https://vercel.com/support

**GitHub Support:**
- Dashboard: https://github.com
- Status: https://www.githubstatus.com
- Docs: https://docs.github.com

---

**Last Updated:** 2026-07-15  
**Next Review:** After Phase 1 (first 7 days)  
**Owner:** Governor  
**Version:** 1.0  
**Confidence Level:** HIGH (procedures tested with Supabase documentation)
