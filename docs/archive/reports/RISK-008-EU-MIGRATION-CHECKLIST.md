# RISK-008 EU Data Residency Migration Checklist

**Mission:** Migrate EURO AI from Tokyo Supabase project to EU-hosted Supabase project  
**Status:** PHASE 1 PREPARATION COMPLETE  
**Date Started:** 2026-07-16 09:45 UTC  
**Founder Decision:** APPROVED (Option B — require EU residency)

---

## CURRENT STATE (TOKYO PROJECT)

### Production Project Details

| Attribute             | Value                                            |
| --------------------- | ------------------------------------------------ |
| **Project Reference** | `yrroytwfdrafvajdfkog`                           |
| **Region**            | AWS ap-northeast-1 (Tokyo)                       |
| **Project URL**       | `https://yrroytwfdrafvajdfkog.supabase.co`       |
| **Session Pooler**    | `aws-0-ap-northeast-1.pooler.supabase.co:5432`   |
| **Status**            | ✅ PRODUCTION LIVE                               |
| **Deployment Runs**   | 29479537494 (07:20 UTC), 29479962355 (07:28 UTC) |

### Schema Inventory (Tokyo)

| Component    | Count                      | Status      |
| ------------ | -------------------------- | ----------- |
| Base Tables  | 22                         | ✅ Deployed |
| Indexes      | 62                         | ✅ Deployed |
| RLS Policies | 43                         | ✅ Active   |
| Functions    | 3                          | ✅ Deployed |
| Triggers     | 1 (`on_auth_user_created`) | ✅ Deployed |
| CEIS Tables  | 5 (`ceis_*`)               | ✅ Deployed |

### Schema Files (to be migrated)

```
supabase/schema.sql              965 lines (base application schema)
supabase/ceis-schema.sql         111 lines (EU AI Act compliance tables)
supabase/POST_DEPLOYMENT_VERIFICATION.sql
supabase/SECURITY_TESTS.sql
supabase/CEIS_POST_DEPLOYMENT_VERIFICATION.sql
supabase/PREFLIGHT_CHECK.sql
```

### Deployment Workflow (current)

**File:** `.github/workflows/supabase-schema-deploy.yml`  
**Trigger:** Manual (`workflow_dispatch`)  
**Jobs:**

1. Pre-deployment validation
2. Schema deployment (base + CEIS)
3. Post-deployment verification
4. Security tests
5. CEIS hard verification (ON_ERROR_STOP=1)

**Connection Methods Supported:**

- SUPABASE_DB_URL (Session Pooler URI — preferred)
- SUPABASE_DB_PASSWORD (Direct connection — fallback)

---

## PHASE 2 — FOUNDER CREDENTIAL PROVISION

### Required from Founder (when ready)

After EU Supabase project is created in Supabase dashboard, provide ONLY:

```
1. New EU Supabase Project Reference
   Example: euprojectref123xyz (20 characters)

2. New Session Pooler Connection String
   Format: postgresql://user:password@eu-pooler.supabase.co:5432/postgres
   Source: Supabase Dashboard → Settings → Database → Connection string (Session pooler)

3. New Service Role Key
   Format: eyJhbGc... (long JWT)
   Source: Supabase Dashboard → Settings → API → Service role key

4. New Anonymous/Publishable Key
   Format: eyJhbGc... (long JWT)
   Source: Supabase Dashboard → Settings → API → Publishable key (new format, starts with sb_publishable_)

5. Project URL
   Format: https://euprojectref123xyz.supabase.co
   Derived from: project reference above
```

---

## PHASE 3 — CONFIGURATION

### GitHub Secrets to Update (CI Deployment)

| Secret Name            | Source                                  | Notes                              |
| ---------------------- | --------------------------------------- | ---------------------------------- |
| `SUPABASE_DB_URL`      | New EU Session Pooler connection string | Primary connection method          |
| `SUPABASE_DB_PASSWORD` | Keep from Tokyo (fallback only)         | Will not be used if DB_URL present |
| `SUPABASE_PROJECT_ID`  | New EU project reference                | Optional (defaults to public ref)  |

### GitHub Variables to Update (Application)

| Variable Name                   | Source                                               | Notes                      |
| ------------------------------- | ---------------------------------------------------- | -------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | New project URL (`https://euprojectref.supabase.co`) | Public — shipped in client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | New anonymous key                                    | Public — shipped in client |

### Vercel Environment Variables to Update (Application Runtime)

| Variable Name                   | Source                   | Notes                               |
| ------------------------------- | ------------------------ | ----------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY`     | New service role key     | Server-only — bypasses RLS          |
| `NEXT_PUBLIC_SUPABASE_URL`      | New project URL          | Public                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | New anonymous key        | Public                              |
| `SUPABASE_DB_URL` (optional)    | EU Session Pooler string | For direct schema migrations (rare) |

### .env.local Template (if local testing needed)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://euprojectref123xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## PHASE 4 — DEPLOYMENT EXECUTION

### Deployment Workflow Trigger

**Prerequisite:** All GitHub Secrets + Variables updated (Phase 3)

**Action:** Manually trigger GitHub Actions workflow

```bash
# Trigger via GitHub UI:
# 1. Go to repository → Actions → Deploy Supabase Schema
# 2. Click "Run workflow"
# 3. Select environment: "production"
# 4. Click "Run workflow"
```

**Expected Workflow Steps:**

1. ✅ Preflight validation (schema files present)
2. ✅ Extract & verify EU project ID from vars/secrets
3. ✅ Verify SUPABASE_DB_URL credential
4. ✅ Connect to EU database
5. ✅ Deploy base schema (supabase/schema.sql)
6. ✅ Deploy CEIS schema (supabase/ceis-schema.sql)
7. ✅ Verify deployment (POST_DEPLOYMENT_VERIFICATION.sql)
8. ✅ Verify CEIS (CEIS_POST_DEPLOYMENT_VERIFICATION.sql with ON_ERROR_STOP=1)
9. ✅ Run security tests

**Expected Output Indicators:**

```
✅ Schema deployed successfully
✅ CEIS schema deployed successfully
✅ Deployment verification passed
✅ CEIS verification passed (5 tables, RLS enabled)
✅ Security tests passed
```

---

## PHASE 5 — VALIDATION CHECKLIST

### Database Objects (must verify)

- [ ] 22 tables exist (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public')
- [ ] 62 indexes exist
- [ ] 43 RLS policies exist and active
- [ ] 1 trigger exists (on_auth_user_created on auth.users)
- [ ] 3 functions exist
- [ ] 5 CEIS tables exist (ceis_audit, ceis_recommendations, etc.)

### Security Verification (must pass)

- [ ] Multi-tenant isolation (Tenant A cannot read Tenant B)
- [ ] Anonymous access blocked (unauth users cannot read profiles)
- [ ] Service role access works (HERCULES can read all data)
- [ ] CRUD operations verified (INSERT/SELECT/UPDATE/DELETE)
- [ ] Workspace membership enforcement active
- [ ] RLS policies all active (ON_ERROR_STOP hard verification)
- [ ] CEIS endpoint auth configured (fail-closed)

---

## PHASE 6 — APPLICATION E2E TESTING

### Manual Smoke Tests (5-10 minutes)

- [ ] Application loads without errors
- [ ] Registration page accessible
- [ ] Email verification flow works
- [ ] Login with test account succeeds
- [ ] Workspace creation succeeds
- [ ] Can add AI system to inventory
- [ ] Risk assessment runs successfully
- [ ] Report generation works
- [ ] CEIS compliance tracking functional
- [ ] Team access controls enforced

### Test Accounts Created

| Email                   | Status      | Purpose                   |
| ----------------------- | ----------- | ------------------------- |
| test-user-1@example.com | [ ] Created | Basic workflow            |
| test-user-2@example.com | [ ] Created | Multi-tenant verification |
| test-admin@example.com  | [ ] Created | Admin operations          |

---

## PHASE 7 — PRODUCTION READINESS REPORT

### Output Document

**File:** `SUPABASE-EU-DEPLOYMENT-VERIFICATION-REPORT.md` (generated after Phase 5)

**Must Include:**

- [ ] Executive summary
- [ ] Deployment evidence (workflow run ID, timestamp)
- [ ] Validation results (all 15 gates GREEN)
- [ ] Security test results (100% pass)
- [ ] Known issues (none expected, or documented)
- [ ] GO / NO-GO recommendation
- [ ] Risk assessment (data residency NOW SATISFIED)
- [ ] Next actions (customer launch sequence)

### Recommendation Levels

- [ ] **GO** — All systems verified GREEN; ready for first customer
- [ ] **CONDITIONAL GO** — Most systems verified; minor issues documented
- [ ] **NO-GO** — Critical issues found; recommend rework

---

## ROLLBACK PATH

If EU deployment fails and we need to rollback to Tokyo:

### Emergency Rollback (5 minutes)

1. **In GitHub:** Update secrets/variables back to Tokyo values
   - `SUPABASE_DB_URL` → Tokyo Session Pooler URI
   - `NEXT_PUBLIC_SUPABASE_URL` → Tokyo project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Tokyo anon key
   - `SUPABASE_SERVICE_ROLE_KEY` → Tokyo service role key

2. **In Vercel:** Revert environment variables to Tokyo values (5 minutes)

3. **Verify Application:** Test login/workspace creation (2-3 minutes)

4. **No Data Loss:** Tokyo database remains untouched during EU deployment

### Data Migration Path (if needed later)

- Export Tokyo database (Supabase Backup feature)
- Reimport to EU project (if divergence occurs)
- Cost: near-zero at early stage (pre-customer data)

---

## RISKS & MITIGATIONS

| Risk                          | Mitigation                                                            |
| ----------------------------- | --------------------------------------------------------------------- |
| **New project ref breaks CI** | Workflow defaults to public ref if secret missing; override with var  |
| **RLS policies don't copy**   | Deployment uses idempotent schema.sql — will recreate correctly       |
| **Auth trigger doesn't fire** | Workflow verifies trigger present (pg_trigger.tgname detection)       |
| **CEIS tables missing**       | Hard verification with ON_ERROR_STOP=1 prevents partial deploys       |
| **Security tests fail**       | If fail, investigation required before production declaration         |
| **Network timeout**           | Workflow has 15-min timeout; Session Pooler more reliable than direct |

---

## SIGN-OFF CHECKLIST

**Preparation Complete:**

- [x] Current state documented (Tokyo project yrroytwfdrafvajdfkog)
- [x] Schema inventory recorded (22 tables, 62 indexes, 43 policies)
- [x] Deployment workflow verified (supabase-schema-deploy.yml)
- [x] Migration checklist created
- [x] Rollback path documented
- [x] Founder credentials requested

**Awaiting:**

- [ ] Founder provides EU project credentials (Phase 2)
- [ ] Governor updates GitHub Secrets + Variables (Phase 3)
- [ ] Workflow execution against EU project (Phase 4)
- [ ] Validation & security tests pass (Phase 5)
- [ ] E2E application testing passes (Phase 6)
- [ ] Final GO/NO-GO report generated (Phase 7)

---

**Mission Leader:** Governor Ω  
**Mission Objective:** Migrate to EU Supabase by 2026-07-16 end of day  
**Confidence Level:** HIGH (workflow proven, schema stable, rollback simple)
