# Post-Deployment Environment Variables Setup

**Purpose:** Enable full CEIS (Cathedral Evolution Intelligence System) and optional AI features after database schema deployment  
**Timeline:** 10-15 minutes  
**Impact:** RISK-006 Mitigation  
**Urgency:** Medium (not blocking first customer, but enables full platform capabilities)

---

## Overview

After the Supabase schema is deployed, three environment variables can be optionally configured to enable CEIS and AI features. These are NOT required for basic platform operation, but they unlock:

- **CEIS_CRON_SECRET:** EU AI Act compliance tracking automation (recommended for first customer)
- **OPENAI_API_KEY:** Enhanced risk assessment analysis (optional, adds intelligence to reports)
- **FIRECRAWL_API_KEY:** Real-time web data extraction for risk monitoring (optional, advanced feature)

---

## Required: CEIS_CRON_SECRET

**What:** Secret key for automated CEIS compliance checks  
**Impact:** Enables scheduled compliance monitoring and audit trail generation  
**Required for:** First customer launch (EU AI Act compliance)  
**Where to set:** Vercel Environment Variables (production)

### Setup Steps

**Step 1: Generate Secret**

On your local machine, generate a strong random secret:

```bash
# Option A: Using OpenSSL
openssl rand -base64 32

# Option B: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option C: Using Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Example output:** `+ZeQ3s8fK9mX7pL2vB4nJ+qY6wR8dT3h1cG5vM9pK==`

**Step 2: Add to Vercel**

1. Go to: https://vercel.com/dashboard
2. Select your EURO AI project
3. Go to: **Settings → Environment Variables**
4. Click: **Add New Variable**
5. Fill in:
   - **Name:** `CEIS_CRON_SECRET`
   - **Value:** [paste the secret from Step 1]
   - **Environment:** Select **Production** (and Staging if using)
6. Click: **Save**

**Step 3: Redeploy**

To pick up the new environment variable:
1. Go to: **Deployments**
2. Click the ellipsis (...) on the latest deployment
3. Select: **Redeploy**
4. Wait for deployment to complete (~2-3 minutes)

**Verification:**

After redeployment, the CEIS cron scheduler will activate automatically:
- Check `/api/alerts` endpoint for any CEIS-related messages
- CEIS compliance checks will run on schedule (default: every 24 hours)
- Audit trail will be recorded in `ceis_audit` table

---

## Optional: OPENAI_API_KEY

**What:** OpenAI API key for enhanced risk assessment  
**Impact:** Improves risk assessment analysis and report quality  
**Required for:** Optional (nice-to-have for first customer)  
**Where to set:** Vercel Environment Variables (production)

### Setup Steps

**Step 1: Obtain OpenAI API Key**

1. Go to: https://platform.openai.com/api-keys
2. Log in with your OpenAI account (create one if needed)
3. Click: **Create new secret key**
4. Copy the key (starts with `sk-...`)

**Step 2: Add to Vercel**

1. Go to: https://vercel.com/dashboard
2. Select your EURO AI project
3. Go to: **Settings → Environment Variables**
4. Click: **Add New Variable**
5. Fill in:
   - **Name:** `OPENAI_API_KEY`
   - **Value:** `sk-...` (paste the key from Step 1)
   - **Environment:** Select **Production**
6. Click: **Save**

**Step 3: Redeploy**

1. Go to: **Deployments**
2. Click the ellipsis (...) on the latest deployment
3. Select: **Redeploy**
4. Wait for deployment to complete

**Note:** This is optional. The platform works without it; with it, risk assessments include AI-powered analysis.

---

## Optional: FIRECRAWL_API_KEY

**What:** Firecrawl API key for real-time web data extraction  
**Impact:** Enables automatic monitoring of customer websites for AI system information  
**Required for:** Optional (advanced feature)  
**Where to set:** Vercel Environment Variables (production)

### Setup Steps

**Step 1: Obtain Firecrawl API Key**

1. Go to: https://firecrawl.dev (or your Firecrawl instance)
2. Sign up / Log in
3. Go to: **Dashboard → API Keys**
4. Copy your API key

**Step 2: Add to Vercel**

1. Go to: https://vercel.com/dashboard
2. Select your EURO AI project
3. Go to: **Settings → Environment Variables**
4. Click: **Add New Variable**
5. Fill in:
   - **Name:** `FIRECRAWL_API_KEY`
   - **Value:** [paste the key from Step 1]
   - **Environment:** Select **Production**
6. Click: **Save**

**Step 3: Redeploy**

1. Go to: **Deployments**
2. Click the ellipsis (...) on the latest deployment
3. Select: **Redeploy**
4. Wait for deployment to complete

**Note:** This is optional and advanced. Skip if not planning web-based risk monitoring.

---

## Environment Variable Reference

| Variable | Required | Source | Notes |
|----------|----------|--------|-------|
| `CEIS_CRON_SECRET` | ✅ Yes (for first customer) | Generated locally | 32-character base64 string |
| `OPENAI_API_KEY` | ⚠️ Optional | OpenAI Platform | Starts with `sk-` |
| `FIRECRAWL_API_KEY` | ⚠️ Optional | Firecrawl Dashboard | Advanced feature only |

---

## Configuration Checklist

### For First Customer Launch

- [ ] Generate `CEIS_CRON_SECRET` locally
- [ ] Add `CEIS_CRON_SECRET` to Vercel environment variables (production)
- [ ] Redeploy to production
- [ ] Verify `/api/alerts` shows no CEIS errors
- [ ] Test CEIS compliance tracking with first customer

### Optional (Can Be Done Later)

- [ ] [ ] Generate OpenAI API key (optional enhancement)
- [ ] [ ] Add `OPENAI_API_KEY` to Vercel (optional)
- [ ] [ ] Generate Firecrawl API key (optional advanced feature)
- [ ] [ ] Add `FIRECRAWL_API_KEY` to Vercel (optional)
- [ ] [ ] Redeploy if adding either optional key

---

## Troubleshooting

### CEIS Functionality Not Working

**Symptom:** Compliance tracking not activating or audit trail not appearing

**Diagnosis:**
1. Check Vercel environment variables: Is `CEIS_CRON_SECRET` set?
2. Check deployment: Did the redeploy complete successfully?
3. Check logs: Look for CEIS-related errors in `/api/alerts`

**Resolution:**
1. Verify environment variable was saved to production
2. Trigger redeploy again (sometimes doesn't pick up on first try)
3. Wait 1-2 minutes for scheduler to activate

### OpenAI Features Not Available

**Symptom:** Risk assessment analysis is basic/limited

**Diagnosis:**
1. Is `OPENAI_API_KEY` set in Vercel?
2. Is the API key valid (hasn't been revoked)?
3. Is there sufficient API credit in OpenAI account?

**Resolution:**
1. Verify OpenAI key is in Vercel production environment
2. Check OpenAI account balance at platform.openai.com
3. Redeploy if key was just added

---

## Impact Summary

| Feature | Without Variable | With Variable |
|---------|------------------|---------------|
| **Basic signup/login** | ✅ Works | ✅ Works |
| **Workspace creation** | ✅ Works | ✅ Works |
| **Risk assessment** | ✅ Basic | ✅ Enhanced (with AI) |
| **CEIS compliance tracking** | ❌ Disabled | ✅ Enabled |
| **Audit trail** | ❌ Limited | ✅ Complete |
| **Web monitoring** | ❌ Disabled | ✅ Enabled (with Firecrawl) |

---

## Timeline

**Recommended:** Set `CEIS_CRON_SECRET` before first customer signup (10 min)  
**Optional:** Add API keys anytime after launch as needed (5-10 min each)

---

## Questions?

Refer to:
- CEIS Documentation: `docs/CEIS-FEATURES.md`
- Vercel Environment Setup: `docs/infra/VERCEL-SETUP.md`
- API Keys Management: `docs/infra/API-KEYS.md`

---

**Setup by:** Governor Ω  
**Document created:** 2026-07-16  
**Risk mitigated:** RISK-006 (Post-deploy env vars)
