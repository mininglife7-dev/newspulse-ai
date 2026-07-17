# Integration Test Security Lab Setup

**Status:** Path A + B — Isolated Supabase project with GitHub Actions automation

---

## Overview

This document guides setup of an isolated Supabase test project for GDPR Article 17 (Right to Erasure) integration testing. The test environment is bound to a GitHub Environment named `integration-test` with protected secrets.

**Key Safety Properties:**

- ✅ Isolated test project (not production)
- ✅ No customer or demonstration data
- ✅ Credentials stored as GitHub Environment secrets (not in repository)
- ✅ Secrets never exposed in logs, artifacts, or PR comments
- ✅ RLS enforcement verified with real user identities
- ✅ Service-role key remains server-side only

---

## Phase 1: Create Isolated Supabase Test Project

### Step 1.1: Create New Supabase Organization (Optional but Recommended)

For maximum isolation, create a dedicated test organization:

1. Go to https://supabase.com/dashboard
2. Click your profile → Organizations
3. Click "New Organization"
4. Name: `newspulse-ai-testing`
5. Click "Create organization"

### Step 1.2: Create Test Project

1. Go to https://supabase.com/dashboard
2. In target organization, click "New Project"
3. **Project Name:** `newspulse-ai-security-lab`
4. **Database Password:** Generate secure password (store temporarily)
5. **Region:** Frankfurt (match production) or isolated region if preferred
6. **Pricing Plan:** Free tier OK for testing
7. Click "Create new project"
8. **Wait 2-3 minutes** for initialization

### Step 1.3: Verify Project is Empty

Once ready, access the SQL Editor:

1. Go to project dashboard
2. Click SQL Editor (left sidebar)
3. Click "New Query"
4. Run:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public';
   ```
5. **Result should be empty or contain only Supabase system tables**

If it contains `auth`, `storage`, or `realtime` tables, delete them or use a different project.

---

## Phase 2: Retrieve and Store Credentials

### Step 2.1: Extract API Keys

1. Go to **Settings → API → Project URL**
   - Copy the full URL (e.g., `https://xxxxx.supabase.co`)
   - This is your `TEST_SUPABASE_URL`

2. Go to **Settings → API → Project API Keys**
   - **"Publishable key"** (starts with `sb_publishable_`)
   - This is your `TEST_SUPABASE_ANON_KEY`
   - **"Secret key"** (starts with `sb_secret_`)
   - This is your `TEST_SUPABASE_SERVICE_ROLE_KEY`

3. (Optional) Go to **Settings → Database → Connection info**
   - PostgreSQL URI
   - This is your `TEST_SUPABASE_DB_URL`

### Step 2.2: Create GitHub Environment

1. Go to repository: https://github.com/mininglife7-dev/newspulse-ai
2. Click **Settings** (repo settings, not account)
3. Left sidebar → **Environments**
4. Click **New environment**
5. **Name:** `integration-test`
6. Click **Configure environment**

### Step 2.3: Add Protected Branch Requirement

**Important:** Restrict secret access to authorized branches only.

1. In integration-test environment, scroll to **Deployment branches**
2. Select **"Selected branches"**
3. Click **Add deployment branch rule**
4. Pattern: `release/alpha-gdpr-integration`
5. Click **Add rule**

### Step 2.4: Add Secrets to Environment

1. In integration-test environment, click **Add secret**
2. Add each secret (repeat for all 4):

   **Secret 1: TEST_SUPABASE_URL**
   - Name: `TEST_SUPABASE_URL`
   - Value: `https://xxxxx.supabase.co` (from Step 2.1)
   - Click **Add secret**

   **Secret 2: TEST_SUPABASE_ANON_KEY**
   - Name: `TEST_SUPABASE_ANON_KEY`
   - Value: `sb_publishable_xxxxx` (from Step 2.1)
   - Click **Add secret**

   **Secret 3: TEST_SUPABASE_SERVICE_ROLE_KEY**
   - Name: `TEST_SUPABASE_SERVICE_ROLE_KEY`
   - Value: `sb_secret_xxxxx` (from Step 2.1)
   - Click **Add secret**

   **Secret 4: TEST_SUPABASE_DB_URL** (optional, for direct migrations)
   - Name: `TEST_SUPABASE_DB_URL`
   - Value: `postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres`
   - Click **Add secret**

---

## Phase 3: Prepare Test Database Schema

### Step 3.1: Apply Base Schema (If Needed)

If the test project needs the authoritative base schema:

**Option A: Using Supabase CLI**

```bash
# Connect to test project
supabase link --project-ref xxxxx

# Push all migrations
supabase migration list
supabase db push
```

**Option B: Using psql directly**

```bash
# Set connection string
export PGPASSWORD="your-test-db-password"

# Apply migrations in order
psql -h db.xxxxx.supabase.co -U postgres \
  -d postgres \
  -f supabase/migrations/001_base_schema.sql

# Apply more migrations as needed
psql -h db.xxxxx.supabase.co -U postgres \
  -d postgres \
  -f supabase/migrations/002_workspaces.sql
```

### Step 3.2: Apply PR #176 Migrations

Apply the account deletion request migrations:

```bash
# Using psql
psql -h db.xxxxx.supabase.co -U postgres \
  -d postgres \
  -f supabase/migrations/20260717_account_deletion_request.sql

psql -h db.xxxxx.supabase.co -U postgres \
  -d postgres \
  -f supabase/migrations/20260717_workspace_deletion_request.sql
```

### Step 3.3: Verify Tables and RLS

```bash
# Verify tables exist
psql -h db.xxxxx.supabase.co -U postgres -d postgres -c \
  "SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name LIKE '%deletion%';"

# Verify RLS is enabled
psql -h db.xxxxx.supabase.co -U postgres -d postgres -c \
  "SELECT tablename, rowsecurity FROM pg_tables
   WHERE tablename LIKE '%deletion%';"

# Verify policies exist
psql -h db.xxxxx.supabase.co -U postgres -d postgres -c \
  "SELECT tablename, policyname FROM pg_policies
   WHERE tablename LIKE '%deletion%';"
```

### Step 3.4: Seed Test Data

Run the provided seed script:

```bash
# Generate seed SQL
bash scripts/setup-integration-test-db.sh

# Apply seed data
psql -h db.xxxxx.supabase.co -U postgres \
  -d postgres \
  -f /tmp/seed-test-data.sql
```

**Seeded Identities:**

- Alice: `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` (owner of Workspace A)
- Bob: `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb` (admin of Workspace A)
- Carol: `cccccccc-cccc-cccc-cccc-cccccccccccc` (member of Workspace A)
- Dave: `dddddddd-dddd-dddd-dddd-dddddddddddd` (owner of Workspace B)

**Seeded Workspaces:**

- Workspace A: `aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa` (Alice owner, Bob admin, Carol member)
- Workspace B: `dddddddd-2222-2222-2222-dddddddddddd` (Dave owner, no members)

---

## Phase 4: Verify Credential Format Compatibility

Before running tests, verify that your Supabase project uses the correct API key format.

### Modern Format (Recommended)

- `NEXT_PUBLIC_SUPABASE_URL`: Full project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Publishable key (starts with `sb_publishable_`)
- `SUPABASE_SERVICE_ROLE_KEY`: Secret key (starts with `sb_secret_`)

### Legacy Format

- `NEXT_PUBLIC_SUPABASE_URL`: Full project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon JWT token (long encoded string)
- `SUPABASE_SERVICE_ROLE_KEY`: service_role JWT token (long encoded string)

**To check your project's format:**

1. Go to Supabase Dashboard → Settings → API
2. Look at the key values
3. If they start with `sb_`, you have modern format ✅
4. If they're long encoded strings, you have legacy JWT format

The tests support both formats automatically via the Supabase client library.

---

## Phase 5: Run Integration Tests

### Option A: Manual Test Run (Local)

1. Set environment variables locally:

   ```bash
   export TEST_SUPABASE_URL="https://xxxxx.supabase.co"
   export TEST_SUPABASE_ANON_KEY="sb_publishable_xxxxx"
   export TEST_SUPABASE_SERVICE_ROLE_KEY="sb_secret_xxxxx"
   export TEST_APP_URL="http://localhost:3000"
   ```

2. Start the application (if testing routes):

   ```bash
   npm run dev
   ```

3. Run integration tests:
   ```bash
   npm run test:integration -- tests/api/account-deletion-integration.test.ts
   ```

### Option B: GitHub Actions (Automated)

1. Trigger workflow manually:
   - Go to repository → Actions
   - Select **"Integration Test Security Lab"**
   - Click **"Run workflow"**
   - Select branch: `release/alpha-gdpr-integration`
   - Click **"Run workflow"**

2. GitHub Actions will:
   - Use secrets from `integration-test` environment
   - Run all integration tests
   - Verify RLS enforcement
   - Verify secret safety
   - Post results as PR comment

---

## Phase 6: Verify RLS with Multiple Identities

The integration tests verify RLS using direct Supabase REST API calls with different authorization headers.

### Manual RLS Verification

To verify RLS manually before running full test suite:

```bash
# As service role (bypasses RLS - admin access)
curl -H "Authorization: Bearer $TEST_SUPABASE_SERVICE_ROLE_KEY" \
  "$TEST_SUPABASE_URL/rest/v1/account_deletion_request?select=*"
# Result: Returns all deletion requests (RLS bypassed)

# As Alice (user session - RLS enforced)
curl -H "Authorization: Bearer $ALICE_USER_JWT" \
  "$TEST_SUPABASE_URL/rest/v1/account_deletion_request?select=*"
# Result: Returns only Alice's deletion requests (RLS enforced)

# As Dave (user session - RLS enforced, different workspace)
curl -H "Authorization: Bearer $DAVE_USER_JWT" \
  "$TEST_SUPABASE_URL/rest/v1/account_deletion_request?select=*"
# Result: Returns only Dave's deletion requests (RLS enforced)

# Anonymous (no auth - RLS blocks)
curl "$TEST_SUPABASE_URL/rest/v1/account_deletion_request?select=*"
# Result: 401 Unauthorized (RLS blocks unauthenticated access)
```

---

## Test Coverage

The full integration test suite verifies:

### Authentication Tests (5 tests)

- ✅ 401 on unauthenticated request
- ✅ 401 on incorrect password
- ✅ 401 on missing password
- ✅ 400 on incorrect confirmation code
- ✅ 400 on incorrect confirmation phrase

### Account Deletion Safety (5 tests)

- ✅ Alice BLOCKED while owning Workspace A with members
- ✅ Dave ALLOWED (owns Workspace B with no members)
- ✅ Workspace A remains intact
- ✅ Bob and Carol retain access
- ✅ No immediate auth-user deletion

### Grace Period & Cancellation (3 tests)

- ✅ Valid request creates 30-day scheduled deletion
- ✅ Duplicate requests handled safely
- ✅ Cancellation works within grace period

### RLS Isolation (4 tests)

- ✅ Alice reads only her deletion requests
- ✅ Dave cannot read Alice's records
- ✅ Workspace A records invisible to Workspace B users
- ✅ Anonymous users blocked from deletion tables

### Workspace Deletion Safety (3 tests)

- ✅ Non-owner cannot request deletion
- ✅ Legal hold blocks deletion
- ✅ Retention requirement blocks deletion

### Export Isolation (3 tests)

- ✅ Personal export includes only Alice's data
- ✅ Organization evidence excluded
- ✅ Other users' personal information excluded

### Migration & Security (3 tests)

- ✅ Migration applies cleanly
- ✅ Migration replay is idempotent
- ✅ Service-role key absent from bundles

**Total: 13 real database integration tests**

---

## Cleanup and Destruction

### After Testing

To clean up test data:

```bash
# Delete test data
psql -h db.xxxxx.supabase.co -U postgres -d postgres << 'SQL'
DELETE FROM public.workspace_members
WHERE workspace_id IN ('aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa', 'dddddddd-2222-2222-2222-dddddddddddd');

DELETE FROM public.workspaces
WHERE id IN ('aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa', 'dddddddd-2222-2222-2222-dddddddddddd');

DELETE FROM public.account_deletion_request
WHERE user_id IN (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'dddddddd-dddd-dddd-dddd-dddddddddddd'
);
SQL
```

### Destroying Test Project (Optional)

To completely remove the test project:

1. Go to Supabase Dashboard → Settings → Danger Zone
2. Click **"Delete project"**
3. Confirm by typing project name
4. **Remove GitHub Environment secrets after project deletion**

---

## Security Checklist

**Before running tests:**

- ☐ Test project URL does NOT contain "production" or "customer"
- ☐ Test project is in test organization (not production org)
- ☐ Test project is empty (no customer data)
- ☐ Credentials stored as GitHub Environment secrets (not hardcoded)
- ☐ Secrets are not shared in chat, logs, or PR comments
- ☐ Deployment branch restriction limits execution to `release/alpha-gdpr-integration`

**After tests:**

- ☐ Test data cleaned up
- ☐ No test credentials committed to repository
- ☐ GitHub Environment secrets remain secured
- ☐ PR #176 remains Draft (not merged)

---

## Troubleshooting

### Issue: "BLOCKED: TEST_SUPABASE_URL contains 'production'"

**Solution:** Verify you're using the test project URL, not production.

### Issue: "API connectivity failed (HTTP 401)"

**Solution:** Check that TEST_SUPABASE_SERVICE_ROLE_KEY is correct (starts with `sb_secret_`).

### Issue: RLS policies not applied

**Solution:** Verify migrations applied successfully:

```bash
psql -h db.xxxxx.supabase.co -U postgres -d postgres -c \
  "SELECT * FROM pg_policies WHERE tablename = 'account_deletion_request';"
```

### Issue: Tests skip because USE_REAL_DB is false

**Solution:** Ensure all environment variables are set and non-empty:

```bash
echo "TEST_SUPABASE_URL: $TEST_SUPABASE_URL"
echo "TEST_SUPABASE_SERVICE_ROLE_KEY length: ${#TEST_SUPABASE_SERVICE_ROLE_KEY}"
echo "TEST_SUPABASE_ANON_KEY length: ${#TEST_SUPABASE_ANON_KEY}"
```

---

## Next Steps

1. **Create isolated Supabase test project** (Phases 1-2)
2. **Apply migrations and seed data** (Phase 3)
3. **Store credentials in GitHub Environment** (Phase 2)
4. **Run integration tests** (Phase 5)
5. **Review results and RLS verification** (Phase 6)
6. **Update PR #176 with evidence report** (After all tests pass)

---

**Governor awaiting integration test results and final evidence report.**
