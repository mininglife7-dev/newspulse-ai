# Cathedral Deployment Quick-Start
## When Supabase Credentials Arrive

**Timeline:** 30 minutes total  
**Status:** Ready to execute immediately upon credential receipt  
**Executor:** Governor Omega (autonomous)

---

## STEP 1: Provide Credentials (Founder - 5 min)

Once you have Supabase credentials, create file:

**Path:** `/home/user/newspulse-ai/.env.local`

**Contents:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

**Where to get these values:**
- Log in to https://app.supabase.com
- Select your project
- Go to Settings → API
- Copy the three values shown

---

## STEP 2: Autonomous Deployment (Governor - 25 min)

Once `.env.local` is in place, I will execute:

### Phase 1: Schema Deployment (10 min)
```bash
# Load schema.sql into Supabase SQL Editor
# Execute all schema migrations
# Verify all tables created
```

**Expected output:**
✅ All tables exist  
✅ All indexes created  
✅ RLS policies active  

### Phase 2: Connectivity Test (5 min)
```bash
# Test API connection to Supabase
# Verify health endpoint responds
# Check database is reachable
```

**Expected output:**
✅ `/api/health` returns 200  
✅ Database connection working  
✅ Authentication ready  

### Phase 3: Signup Flow Test (5 min)
```bash
# Test complete customer signup
# Verify email confirmation
# Check profile created
# Validate data isolation
```

**Expected output:**
✅ New user can sign up  
✅ Confirmation email sent  
✅ Profile created in database  
✅ User can access workspace  

### Phase 4: Verification & Documentation (5 min)
```bash
# Produce deployment evidence
# Update deployment status
# Commit configuration
```

**Expected output:**
✅ Deployment evidence attached  
✅ Documentation updated  
✅ Changes committed  

---

## STEP 3: Merge PR #95 (Founder - 2 min)

When Governor reports deployment complete:

1. Go to https://github.com/mininglife7-dev/newspulse-ai/pull/95
2. Click "Ready for review" (if still in draft)
3. Review changes (all 476 tests passing)
4. Click "Merge"

**What gets deployed to main:**
- DNA-012: Schema Migration Validator
- DNA-013: Feature Flag Controller
- DNA-015: Deployment Canary

**Result:** Phase 6+ features live in production ✅

---

## Timeline

| Step | Actor | Duration | Status |
|------|-------|----------|--------|
| Provide credentials | Founder | 5 min | 🔴 WAITING |
| Deploy schema | Governor | 10 min | ⏳ READY |
| Test connectivity | Governor | 5 min | ⏳ READY |
| Test signup flow | Governor | 5 min | ⏳ READY |
| Verify & document | Governor | 5 min | ⏳ READY |
| Merge PR #95 | Founder | 2 min | ⏳ READY |
| **TOTAL** | — | **30 min** | 🔴 BLOCKED |

**Total time to production:** ~30 minutes

---

## What Changes After Deployment

### Immediately Available
✅ Customer signup enabled  
✅ Email authentication working  
✅ Database persistence  
✅ Multi-tenant data isolation  
✅ Feature flags operational  
✅ Canary deployment enabled  

### Next Phase (2026-09-01 Launch)
✅ Accept first customers  
✅ Monitor production metrics  
✅ Execute gradual rollout strategy  
✅ Respond to issues via canary deployment  

---

## Rollback Plan (If Needed)

If anything goes wrong during Supabase deployment:

```bash
# Option 1: Clear schema and retry
# In Supabase → SQL Editor:
# DROP SCHEMA IF EXISTS public CASCADE;
# Then re-run schema.sql

# Option 2: Delete Supabase project and create new one
# Then repeat deployment

# Option 3: Use backup from before deployment
# Contact Supabase support for backup restoration
```

**Risk:** LOW (schema deployment is idempotent and reversible)

---

## Success Criteria

Deployment is successful when **ALL** of these pass:

1. ✅ All tables exist in Supabase
2. ✅ `/api/health` endpoint returns 200
3. ✅ New user can sign up via web app
4. ✅ Confirmation email arrives within 30 seconds
5. ✅ User can log in after confirming email
6. ✅ User can create workspace
7. ✅ Different users cannot see each other's data
8. ✅ Feature flags are responding
9. ✅ Canary deployer is initialized
10. ✅ Monitoring alerts are active

**All 10 met = PRODUCTION READY ✅**

---

## Emergency Contact

If deployment fails or blockers arise:

**Immediate action:** Do NOT retry blindly  
**Report to Founder:** Exact error message + context  
**Governor will:** Diagnose root cause + propose fix

---

**Document Status:** READY FOR DEPLOYMENT  
**Last Updated:** 2026-07-12  
**Maintained By:** Governor Omega

