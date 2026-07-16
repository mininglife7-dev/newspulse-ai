# Phase 3: Staging Configuration Checklist

**Purpose:** Configure credentials and environment variables required for Phase 3 staging validation.

**Timeline:** Configure now (takes ~15 minutes), validation executes when setup complete.

**Critical Rule:** Never paste credentials into chat. Credentials must be entered by Founder directly into approved secure storage (GitHub Secrets, GitHub Variables, Vercel Environment Variables).

---

## Required Configuration (For Staging Only)

### 1. Supabase Staging Project Setup

**Action Required:** Provision a Supabase staging project (separate from production).

**Why separate:** Staging database is isolated; data from staging cannot reach production under any circumstances.

**Steps:**

1. Log in to https://supabase.com
2. Create new project or reuse existing staging project
3. Note down: **Project URL** and **Anon Key** and **Service Role Key**
4. Don't share keys in messages — use secure storage below

**Scope:** Staging only (never use production URLs/keys for staging config)

---

### 2. GitHub Secrets (For CI/CD Workflows)

**Configuration Location:**

- Go to: Repository → Settings → Secrets and variables → Actions
- **NEVER** use Repository Secrets for tests that read from public artifacts
- **Always use Repository Secrets** for sensitive values

**Add these secrets** (Founder only, via GitHub UI):

| Secret Name                         | Value                             | Source                                 | Used By                           | Visibility   |
| ----------------------------------- | --------------------------------- | -------------------------------------- | --------------------------------- | ------------ |
| `SUPABASE_STAGING_URL`              | Your Supabase staging project URL | Supabase project settings              | CI workflows, integration tests   | ❌ Secret    |
| `SUPABASE_STAGING_ANON_KEY`         | Staging anon key (public-safe)    | Supabase project → Settings → API Keys | Integration tests, preview builds | ✅ Variable* |
| `SUPABASE_STAGING_SERVICE_ROLE_KEY` | Staging service role key (admin)  | Supabase project → Settings → API Keys | Admin test operations, backfill   | ❌ Secret    |

*Note: `SUPABASE_STAGING_ANON_KEY` is technically public-safe (used by browser clients), but store it as a Secret here to keep all staging config in one place.

**Manual Entry Instructions:**

```bash
# Via GitHub CLI (if available):
gh secret set SUPABASE_STAGING_URL --body "https://your-project-ref.supabase.co"
gh secret set SUPABASE_STAGING_ANON_KEY --body "eyJhbGciOiJIUzI1..."
gh secret set SUPABASE_STAGING_SERVICE_ROLE_KEY --body "eyJhbGciOiJIUzI1..."

# OR via GitHub Web UI (recommended):
# 1. Go to Settings → Secrets and variables → Actions
# 2. Click "New repository secret"
# 3. Enter Name: SUPABASE_STAGING_URL
# 4. Paste staging project URL
# 5. Click "Add secret"
# (Repeat for the 3 values above)
```

**Verification:**

```bash
# In workflows, these are accessible as:
env.SUPABASE_STAGING_URL
env.SUPABASE_STAGING_ANON_KEY
env.SUPABASE_STAGING_SERVICE_ROLE_KEY
```

---

### 3. GitHub Variables (Optional, For Non-Sensitive Config)

**Configuration Location:** Settings → Secrets and variables → Variables

**Store here** (public values, readable from Actions):

- (None required for this phase)

---

### 4. Vercel Environment Variables (For Preview & Production Deployments)

**Configuration Location:** Vercel Dashboard → Project Settings → Environment Variables

**Why separate:** Vercel builds and deployments need credentials accessible during build, without checking them into git.

**Add these environment variables:**

| Variable                        | Value                | Environment                        | Scope        | Type      |
| ------------------------------- | -------------------- | ---------------------------------- | ------------ | --------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Staging URL          | Preview + Staging (not Production) | Staging only | Reference |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Staging anon key     | Preview + Staging (not Production) | Staging only | Reference |
| `SUPABASE_SERVICE_ROLE_KEY`     | Staging service role | Development (serverless)           | Staging only | Secret    |

**Manual Entry Instructions:**

```
1. Go to: https://vercel.com/dashboard
2. Select: newspulse-ai project
3. Go to: Settings → Environment Variables
4. Add:
   - Name: NEXT_PUBLIC_SUPABASE_URL
   - Value: https://your-project-ref.supabase.co
   - Environments: Preview + Development (NOT Production)
   - Click "Add"

5. Repeat for NEXT_PUBLIC_SUPABASE_ANON_KEY (same environments)
6. Repeat for SUPABASE_SERVICE_ROLE_KEY (same environments, marked as Secret)
```

**Critical:** Do NOT add these to Production environment. Production credentials must be separate and only available to production deployments.

---

### 5. Local Development (`.env.local`)

**File:** `.env.local` (NOT committed, .gitignore'd)

**Create locally** (for running integration tests on your machine):

```bash
# Copy the template
cp .env.local.template .env.local

# Edit with your staging credentials:
# NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
# SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1...
# SUPABASE_STAGING_URL=https://your-project-ref.supabase.co
# SUPABASE_STAGING_ANON_KEY=eyJhbGciOiJIUzI1...
# SUPABASE_STAGING_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1...

# Then run integration tests:
npm run test -- integration-staging
```

**Note:** This file is local-only. Never commit `.env.local`.

---

## Staging Test Accounts Setup

**Required:** Create 2-3 test user accounts in Supabase staging auth for validation.

### Test User 1: Owner/Admin

- **Email:** `staging-owner@example.com`
- **Password:** [Strong random password, stored securely]
- **Expected Role:** Owner of first test workspace
- **Used For:** Workspace creation, team member invitations, admin operations

### Test User 2: Member

- **Email:** `staging-member@example.com`
- **Password:** [Strong random password, stored securely]
- **Expected Role:** Regular workspace member
- **Used For:** Member invitation acceptance, permission testing

### Test User 3: Viewer (Optional)

- **Email:** `staging-viewer@example.com`
- **Password:** [Strong random password, stored securely]
- **Expected Role:** Read-only workspace member
- **Used For:** Read-only access validation, role-based restrictions

**How to Create:**

1. Log into Supabase staging → Authentication → Users
2. Click "Create new user"
3. Enter email, password, confirm
4. Users are immediately available for auth tests

---

## Configuration Verification Checklist

Use this checklist to verify setup is complete before running integration tests:

### GitHub Secrets (Settings → Secrets and variables → Actions)

- [ ] `SUPABASE_STAGING_URL` present (displays as "●●●●●●●●")
- [ ] `SUPABASE_STAGING_ANON_KEY` present (displays as "●●●●●●●●")
- [ ] `SUPABASE_STAGING_SERVICE_ROLE_KEY` present (displays as "●●●●●●●●")
- [ ] No typos in secret names (case-sensitive)

### Vercel Environment Variables (Project Settings → Environment Variables)

- [ ] `NEXT_PUBLIC_SUPABASE_URL` set for Preview + Development
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set for Preview + Development
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set for Development only (marked Secret)
- [ ] Production environment does NOT have these variables
- [ ] Each variable shows checkmarks for its configured environments

### Local `.env.local` (If testing locally)

- [ ] `.env.local` file exists and is .gitignore'd
- [ ] Contains 6 environment variables (SUPABASE_STAGING_* and NEXT_PUBLIC_*)
- [ ] File is NOT staged/committed to git

### Supabase Staging Database

- [ ] Project created and running
- [ ] Database is accessible (test connection from Supabase dashboard)
- [ ] 3+ test user accounts created in Auth
- [ ] Sample data (optional): Pre-populate a few test workspaces for validation

### Connectivity Test

**Quick verification:**

```bash
# From branch root:
curl -I "https://your-project-ref.supabase.co/rest/v1/"

# Should return 401 Unauthorized (proves API is reachable)
# If it times out or returns 0, check:
# 1. Project URL is correct
# 2. Supabase project is running (not paused)
# 3. Network is not blocking the connection
```

---

## What Happens After Configuration

1. **GitHub Actions** will have access to staging credentials
2. **Vercel Preview Builds** will connect to staging database
3. **Integration Tests** (`tests/integration-staging.test.ts`) will run against staging
4. **Local Validation** (`npm run test -- integration-staging`) can be run by you

**Result:** Staging validation suite executes, producing GO/NO-GO report for production.

---

## Troubleshooting

### "Integration tests still skipped"

- Verify `SUPABASE_STAGING_URL` and `SUPABASE_STAGING_ANON_KEY` are set in GitHub Secrets
- Re-run workflow or push a new commit to trigger fresh build

### "401 Unauthorized when running integration tests"

- Verify staging project is running (Supabase dashboard → Project settings)
- Verify anon key and URL are correct (no trailing slashes, exact copy)
- Test key manually: `curl -H "Authorization: Bearer $KEY" https://project-url/rest/v1/`

### "Timeout connecting to Supabase"

- Check network policy (if behind corporate proxy)
- Verify Supabase project region is accessible
- Check Supabase status page: https://status.supabase.com

### "Test users not created"

- Go to Supabase → Authentication → Users
- Click "Create new user"
- Verify email format and strong password

---

## Security Reminders

✅ **DO:**

- Store credentials in GitHub Secrets (never in git)
- Use separate staging URL/keys (never share with production)
- Rotate test account passwords regularly
- Log out of Supabase dashboard after configuration

❌ **DON'T:**

- Paste credentials into chat or messages
- Commit `.env.local` to git
- Use production database for staging tests
- Share staging credentials with third parties
- Store credentials in code comments or docs

---

## Next Steps

**After configuration is complete:**

1. Run `npm run test -- integration-staging` locally (or wait for CI)
2. Follow procedures in `docs/STAGING_VALIDATION_CHECKLIST.md`
3. Produce GO/NO-GO report with evidence
4. Only after staging passes: proceed to production

**Estimated duration:** 2-3 hours for full staging validation

**Timeline:**

- Configuration (now): 15 minutes
- Staging validation: 2-3 hours
- Production approval: same day or next day

---

_This document is a checklist for manual credential configuration. Update this file when procedures change, but never commit actual credentials._
