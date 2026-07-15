# Production Configuration Guide

**Status:** Updated 2026-07-13  
**Commit:** 01265d3

This guide specifies the minimum configuration required to deploy NewsPulse AI to production.

## Configuration Surfaces

Configuration is split across three separate systems. Each system manages its own credentials.

### 1. GitHub Actions (CI/CD Workflows)

**Purpose:** Schema deployment workflow  
**Credentials Required:** 1 secret  
**Location:** Repository → Settings → Secrets and variables → Actions

| Secret                 | Required | Purpose                                            | Source                                              |
| ---------------------- | -------- | -------------------------------------------------- | --------------------------------------------------- |
| `SUPABASE_DB_PASSWORD` | ✅ YES   | PostgreSQL database password for schema deployment | Supabase Dashboard → Settings → Database → Password |

**When Used:**

- Triggered manually via `supabase-schema-deploy.yml` workflow
- NOT used by every push or PR
- Can be configured after first production deployment

### 2. Vercel Production Environment

**Purpose:** Next.js application runtime  
**Credentials Required:** 5 core + optional  
**Location:** Vercel Dashboard → Your Project → Settings → Environment Variables

| Variable                        | Required | Stage           | Value Source                                                              | Notes                                             |
| ------------------------------- | -------- | --------------- | ------------------------------------------------------------------------- | ------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | ✅ YES   | Build + Runtime | Supabase Dashboard → Settings → API → Project URL                         | Client-side; visible in browser                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ YES   | Build + Runtime | Supabase Dashboard → Settings → API → Public key                          | Client-side; visible in browser                   |
| `SUPABASE_SERVICE_ROLE_KEY`     | ✅ YES   | Runtime only    | Supabase Dashboard → Settings → API → Service Role key                    | Server-side only; never exposed                   |
| `NEXT_PUBLIC_APP_URL`           | ✅ YES   | Build + Runtime | Your production domain, e.g. `https://newspulse-ai-production.vercel.app` | Used for CORS, metadata                           |
| `ADMIN_TOKEN`                   | ✅ YES   | Runtime         | Generate: `openssl rand -hex 32`                                          | Protects optional monitoring endpoints            |
| `GITHUB_TOKEN`                  | ❌ NO    | Runtime         | GitHub Personal Access Token                                              | ONLY if using `/api/blocking-conditions` endpoint |
| `GITHUB_OWNER`                  | ❌ NO    | Runtime         | Hardcoded: `mininglife7-dev`                                              | Has fallback; not required                        |
| `GITHUB_REPO`                   | ❌ NO    | Runtime         | Hardcoded: `newspulse-ai`                                                 | Has fallback; not required                        |

**When Each Variable is Used:**

| Variable                      | Endpoint/Feature                                     | Is Launch-Critical?         |
| ----------------------------- | ---------------------------------------------------- | --------------------------- |
| NEXT_PUBLIC_SUPABASE_URL      | Supabase client (browser + server)                   | ✅ YES — core feature       |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase client (browser)                            | ✅ YES — core feature       |
| SUPABASE_SERVICE_ROLE_KEY     | Server-side operations, RLS bypass                   | ✅ YES — core feature       |
| NEXT_PUBLIC_APP_URL           | CORS, metadata endpoints                             | ✅ YES — security           |
| ADMIN_TOKEN                   | Protected monitoring endpoints                       | 🟡 NO — optional monitoring |
| GITHUB_TOKEN                  | `/api/blocking-conditions`, `/api/verify-deployment` | ❌ NO — monitoring only     |

### 3. Supabase Dashboard (Database)

**Purpose:** Managed database backend  
**Credentials Required:** Database URL + credentials (obtained by Founder)  
**Location:** supabase.com → Your Project → Settings

These values are used to:

1. Configure GitHub Actions for schema deployment
2. Populate Vercel environment variables
3. Initialize Supabase SDK in application

No action required here beyond retrieving the credentials for the above systems.

---

## Founder Configuration Checklist

### Step 1: Collect Supabase Credentials (5 min)

Go to: **Supabase Dashboard → Your Project → Settings → API**

Record these values (do not commit them):

1. **Project URL** — looks like `https://xyz.supabase.co`
2. **Project Reference** — the `xyz` part (alphanumeric)
3. **Public API key (anon)** — long JWT string
4. **Service Role key** — long JWT string starting with `eyJh...`

Then go to: **Settings → Database**

5. **Database Password** — click "Show password" or reset if needed

### Step 2: Generate ADMIN_TOKEN (1 min)

From your terminal (locally, NOT in GitHub):

```bash
openssl rand -hex 32
# Example output: a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b
```

Copy this 64-character hex string. You'll need it below.

### Step 3: Configure GitHub Actions Secret (2 min)

Go to: **GitHub → mininglife7-dev/newspulse-ai → Settings → Secrets and variables → Actions**

Click **"New repository secret"**

- **Name:** `SUPABASE_DB_PASSWORD`
- **Value:** (from Step 1, credential #5)
- **Click:** Add secret

### Step 4: Configure Vercel Production Environment (5 min)

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

For **Production** environment, add these 5 variables:

| Name                            | Value                                        | Source                                   |
| ------------------------------- | -------------------------------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Step 1, credential #1                        | Supabase API settings                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Step 1, credential #3                        | Supabase API settings (public key)       |
| `SUPABASE_SERVICE_ROLE_KEY`     | Step 1, credential #4                        | Supabase API settings (service role key) |
| `NEXT_PUBLIC_APP_URL`           | `https://newspulse-ai-production.vercel.app` | Your production URL                      |
| `ADMIN_TOKEN`                   | Step 2 output                                | Generated locally                        |

**Important:** Set each variable for **Production only** (not Preview, not Development).

### Step 5: Trigger New Production Deployment (1 min)

After Vercel variables are set:

1. Go to Vercel → Your Project → Deployments
2. Find the latest deployment (top of list)
3. Click **Redeploy**
4. Wait for deployment to complete
5. Verify it uses your Vercel URL

**Verification:** Check Vercel logs to confirm variables were injected correctly.

### Step 6: Deploy Supabase Schema (Optional, if not already deployed)

Trigger manually:

1. Go to GitHub → mininglife7-dev/newspulse-ai → Actions
2. Select **"Verify GitHub Deployment Secrets"** workflow
3. Click **Run workflow**
4. Confirm `SUPABASE_DB_PASSWORD` is shown as configured
5. Then manually trigger **"Deploy Supabase Schema"** workflow (requires `SUPABASE_DB_PASSWORD`)

---

## No Action Required

✅ `GITHUB_OWNER` — has hardcoded fallback (`mininglife7-dev`)  
✅ `GITHUB_REPO` — has hardcoded fallback (`newspulse-ai`)  
✅ `GITHUB_TOKEN` — only needed if monitoring endpoints are used; can be added later  
✅ `VERCEL_TOKEN` — only needed for cost anomaly detection; can be added later

---

## Verification Steps

After completing all configuration:

### Test 1: Application Loads

```bash
curl https://newspulse-ai-production.vercel.app
# Should return HTML (200 OK)
```

### Test 2: Health Endpoint

```bash
curl https://newspulse-ai-production.vercel.app/api/health
# Should return JSON with status check
```

### Test 3: Supabase Connectivity

Navigate to the application UI and attempt:

1. Sign in with a test account
2. Create a new resource
3. View the dashboard

### Test 4: Monitoring (Optional)

If monitoring endpoints are enabled:

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://newspulse-ai-production.vercel.app/api/alerts
# Should return JSON or 403 if token is wrong
```

---

## Redeployment

If you add or change Vercel environment variables:

1. Variables are NOT automatically applied to running instances
2. Trigger a new production deployment in Vercel
3. New deployment will use the updated variables
4. Test the application again

---

## Troubleshooting

### Application fails to start

**Symptom:** Vercel deployment fails or times out

**Solution:**

- Check Vercel logs for missing environment variables
- Verify all 5 core variables are set in Production environment
- Ensure variables don't have leading/trailing whitespace
- Trigger a new redeploy

### Supabase connection error

**Symptom:** Application loads but database operations fail

**Solution:**

- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct (copy from Supabase, not from memory)
- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` match values in Supabase Dashboard
- Check Supabase project status (not paused, not suspended)
- Trigger a new Vercel redeploy

### Database password incorrect

**Symptom:** Schema deployment workflow fails

**Solution:**

- Verify `SUPABASE_DB_PASSWORD` in GitHub Actions matches the password shown in Supabase Dashboard
- If unsure, reset the password in Supabase Dashboard and update GitHub Actions

### Missing monitoring endpoints

**Symptom:** `/api/blocking-conditions` or `/api/verify-deployment` returns 503

**Solution:**

- These endpoints are optional (monitoring only)
- They require `GITHUB_TOKEN` to be configured in Vercel
- If monitoring is not needed, you can safely ignore 503 errors

---

## Security Best Practices

### Secrets Storage

- ✅ Store `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_TOKEN` only in:
  - Vercel (for runtime)
  - GitHub Actions secrets (if used by workflows)
- ❌ Never commit them to git
- ❌ Never paste them into chat
- ❌ Never log them

### Token Rotation

- Rotate `ADMIN_TOKEN` quarterly or if it may have been exposed
- Rotate Supabase API keys quarterly (generate new keys, update configuration, revoke old keys)
- Rotate `GITHUB_TOKEN` quarterly

### Least Privilege

- If using `GITHUB_TOKEN`, create a new token with minimal permissions:
  - Read-only access to `mininglife7-dev/newspulse-ai`
  - Do NOT use your main personal access token
- If not using GitHub API endpoints, omit `GITHUB_TOKEN` entirely

---

## System Diagram

```
Supabase Dashboard
    ↓
    ├─→ NEXT_PUBLIC_SUPABASE_URL          ┐
    ├─→ NEXT_PUBLIC_SUPABASE_ANON_KEY     ├─→ Vercel Env → Vercel Runtime → Application
    ├─→ SUPABASE_SERVICE_ROLE_KEY         │
    └─→ SUPABASE_DB_PASSWORD              ┘

Local Terminal
    ↓
    └─→ ADMIN_TOKEN (generated)           ──→ Vercel Env → Vercel Runtime

GitHub Actions
    ↓
    └─→ SUPABASE_DB_PASSWORD (GitHub secret) ──→ Schema Deployment Workflow
```

---

## Related Documentation

- `.github/workflows/verify-github-deployment-secrets.yml` — Verifies schema deployment credential
- `.github/workflows/supabase-schema-deploy.yml` — Deploys Supabase schema
- `.github/workflows/ci.yml` — CI/CD checks (runs on all pushes)
- `lib/preflight-checks.ts` — Application startup validation
