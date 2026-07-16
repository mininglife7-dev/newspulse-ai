# GitHub Secrets Configuration

This document describes all GitHub Actions secrets required for production deployment.

## Quick Setup

1. Go to your repository: https://github.com/mininglife7-dev/newspulse-ai
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Add each secret below

## Required Secrets for Production

### Supabase Credentials

**Variable:** `NEXT_PUBLIC_SUPABASE_URL`

- **Description:** Your Supabase project URL
- **Value:** `https://[project-ref].supabase.co`
- **Where to get:** Supabase Dashboard → Settings → API → URL
- **Scope:** Both production and staging

**Variable:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`

- **Description:** Anonymous API key for client-side queries
- **Value:** [Copy from Supabase dashboard]
- **Where to get:** Supabase Dashboard → Settings → API → Project API keys
- **Scope:** Both production and staging

**Variable:** `SUPABASE_SERVICE_ROLE_KEY`

- **Description:** Service role key for server-side operations and RLS bypass
- **Value:** [Copy from Supabase dashboard]
- **Where to get:** Supabase Dashboard → Settings → API → Project API keys
- **Scope:** Production only
- **Important:** Never expose in client-side code

**Variable:** `SUPABASE_PROJECT_ID`

- **Description:** Supabase project reference identifier
- **Value:** [project-ref] (the part before .supabase.co)
- **Where to get:** Supabase URL or Supabase Dashboard
- **Scope:** Both production and staging

**Variable:** `SUPABASE_DB_URL` ⭐ RECOMMENDED for schema deployment

- **Description:** Full PostgreSQL Session Pooler connection string used by the schema deployment workflow. Required for all Supabase projects on the Free plan (no IPv4 add-on), because GitHub Actions runners are IPv4-only but newer Supabase projects only expose IPv6 for direct connections.
- **Value:** `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres`
- **Where to get:** Supabase Dashboard → Settings → Database → **Connection string** → **Session pooler** tab (port 5432)
- **Scope:** Production only (schema deployment workflow)
- **Important:** Fill in your actual database password in the URI before saving. When this secret is set, `SUPABASE_DB_PASSWORD` is not needed by the workflow.

**Variable:** `SUPABASE_DB_PASSWORD`

- **Description:** PostgreSQL database password (fallback for direct connections — only works when the Supabase IPv4 add-on is enabled). Prefer `SUPABASE_DB_URL` above.
- **Value:** [Obtain from Supabase Dashboard]
- **Where to get:** Supabase Dashboard → Settings → Database → Password (show password)
- **Scope:** Production only (needed for schema deployment workflow)
- **Important:** Only used by GitHub Actions deploy workflow, never by application. Direct connections to `db.{ref}.supabase.co:5432` fail on newer Supabase projects without the paid IPv4 add-on — set `SUPABASE_DB_URL` instead.

### GitHub Integration

**Variable:** `GITHUB_OWNER`

- **Description:** GitHub repository owner
- **Value:** `mininglife7-dev`
- **Scope:** Both production and staging

**Variable:** `GITHUB_REPO`

- **Description:** GitHub repository name
- **Value:** `newspulse-ai`
- **Scope:** Both production and staging

### Deployment Configuration

**Variable:** `NEXT_PUBLIC_APP_URL`

- **Description:** Production application URL
- **Value:** `https://newspulse-ai-production.vercel.app` (or your custom domain)
- **Where to get:** Vercel project settings
- **Scope:** Production only

**Variable:** `ADMIN_TOKEN`

- **Description:** Admin authentication token for privileged endpoints
- **Value:** Generate with: `openssl rand -hex 32`
- **Scope:** Production only
- **Important:** Never commit this token; generate fresh for production

### Optional: Deployment Tools

**Variable:** `SUPABASE_API_TOKEN` (optional)

- **Description:** Supabase Management API token (for advanced integrations)
- **Where to get:** Supabase Dashboard → Account → API tokens → Generate new token
- **Scope:** For advanced workflows only

## Setup Steps

### Step 1: Get Supabase Credentials

1. Visit https://supabase.com and log in
2. Open your project (or create one if needed)
3. Click **Settings** (bottom left)
4. Click **API**
5. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Project Reference** (UUID before .supabase.co) → `SUPABASE_PROJECT_ID`
   - **Anonymous public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Service role secret** → `SUPABASE_SERVICE_ROLE_KEY`
   - In Settings → **Database** tab:
     - **Connection string → Session pooler** (port 5432) → `SUPABASE_DB_URL` ⭐ (fill in your password in the URI)
     - **Database password** → `SUPABASE_DB_PASSWORD` (fallback; prefer SUPABASE_DB_URL)

### Step 2: Generate Admin Token

From your terminal (local, not in GitHub Actions):

```bash
openssl rand -hex 32
# Example output: a1b2c3d4e5f6...
# Copy this value → ADMIN_TOKEN in GitHub secrets
```

### Step 3: Configure GitHub Secrets

1. Go to https://github.com/mininglife7-dev/newspulse-ai
2. Click **Settings**
3. Click **Secrets and variables** in the sidebar
4. Click **Actions**
5. Click **New repository secret**
6. Add each secret from the table above

### Step 4: Verify Configuration

After adding secrets:

1. Go to **Actions** tab
2. Select **Verify Production Configuration**
3. Click **Run workflow**
4. Check output to confirm all secrets are accessible

## Sensitive Secrets vs Public Variables

- **Secrets** (sensitive): Service role keys, database password, admin token
- **Variables** (public): Project URLs, app URLs, repository names

Always add sensitive values as Secrets, not as Variables.

## Production Deployment Flow

1. **Prerequisite:** Supabase schema deployed (via `supabase-schema-deploy.yml` workflow)
2. **Push code:** `git push origin main`
3. **Vercel deploys:** Automatic via GitHub integration
4. **Application starts:** Preflight checks verify all prerequisites
5. **Customer access:** Application is live at `NEXT_PUBLIC_APP_URL`

## Troubleshooting

**Error: "Access token not provided"**

- Check that `SUPABASE_API_TOKEN` or `SUPABASE_DB_PASSWORD` is configured
- Verify credentials are correct

**Error: "Failed to connect to Supabase database" / "no IPv4 address"**

- Your Supabase project uses IPv6-only for direct connections (Free plan without IPv4 add-on).
  GitHub Actions runners are IPv4-only, so `SUPABASE_DB_PASSWORD` alone will not work.
- **Fix:** Set `SUPABASE_DB_URL` to the Session Pooler connection string:
  1. Supabase Dashboard → Settings → Database → Connection string → Session pooler tab (port 5432)
  2. Copy the URI and fill in your password
  3. Add as GitHub secret `SUPABASE_DB_URL`

**Error: "Cannot connect to Supabase"**

- Verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_PROJECT_ID` are correct
- Check Supabase project status at https://supabase.com

**Error: "ADMIN_TOKEN not configured"**

- Generate new token: `openssl rand -hex 32`
- Add to GitHub secrets as `ADMIN_TOKEN`

## Rotation

For production:

- **API Keys:** Rotate quarterly via Supabase Dashboard
- **Database Password:** Rotate via Supabase → Settings → Database
- **ADMIN_TOKEN:** Generate new token before rotation, update GitHub secrets, verify in production, then remove old token

## Security Best Practices

1. ✅ All secrets stored in GitHub Actions Secrets
2. ✅ Secrets never logged in workflows
3. ✅ Service role key never sent to client
4. ✅ Database password only used in authenticated GitHub Actions
5. ✅ Each environment (dev/staging/production) uses separate credentials
6. ✅ Rotate credentials quarterly
7. ✅ Never copy secrets to `.env.local` permanently in production

## Questions?

Review `.github/workflows/supabase-schema-deploy.yml` and `verify-production-config.yml` for implementation details.
