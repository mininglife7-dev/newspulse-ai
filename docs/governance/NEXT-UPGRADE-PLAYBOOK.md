# Next.js Security Upgrade Playbook

**Objective:** Upgrade from Next.js 14.2.35 + React 18 to Next.js 15.5.15+ + React 19  
**Reason:** Fix 10 npm vulnerabilities (1 CRITICAL DoS, 5 HIGH, 4 MODERATE)  
**Timeline:** 2-4 hours (actual upgrade: 30 min, testing: 90-180 min)  
**Risk Level:** MEDIUM (breaking changes, but limited scope changes needed)  
**Status:** READY FOR EXECUTION (awaiting Founder approval)  

---

## Executive Summary

### Vulnerabilities Addressed
- ✅ **CRITICAL**: Next.js Server Components DoS (CVSS 7.5) → FIXED in Next.js 15.5.15+
- ✅ **5 HIGH**: HTTP smuggling, deserialization DoS, cache exhaustion, image optimizer DoS → FIXED in 15.5.15+
- ✅ **4 MODERATE**: Advisory noise → FIXED in 15.5.15+

### What's Changing
1. **Next.js**: 14.2.35 → 15.5.15 (or 16.x if available)
2. **React**: 18.3.1 → 19.x
3. **React DOM**: 18.3.1 → 19.x
4. **TypeScript types**: Update @types/react, @types/react-dom

### What's NOT Changing
- ✅ No dynamic route params to refactor (this codebase has none)
- ✅ No layout.tsx migration needed (already using App Router)
- ✅ No async ServerComponent changes required (not used here)
- ✅ No breaking configuration changes needed

### Expected Outcome
- All 255 tests passing
- Zero critical/high vulnerabilities
- Same functionality, better security

---

## Pre-Upgrade Checklist

**Before starting, verify:**

- [ ] Git working tree is clean: `git status`
- [ ] You're on `main` branch: `git branch`
- [ ] Latest main pulled: `git pull origin main`
- [ ] All tests passing: `npm run test`
- [ ] Current build works: `npm run build`
- [ ] TypeScript clean: `npm run type-check`

**If any checks fail:** Fix and commit before proceeding.

---

## Upgrade Procedure

### Phase 1: Update Dependencies (30 minutes)

#### Step 1.1: Update package.json

Edit `package.json` and update these versions:

**Before:**
```json
{
  "dependencies": {
    "next": "^14.2.35",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.0",
    "eslint-config-next": "^14.2.35"
  }
}
```

**After (Next.js 15):**
```json
{
  "dependencies": {
    "next": "^15.5.15",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint-config-next": "^15.5.15"
  }
}
```

**OR (Next.js 16 if preferred):**
```json
{
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint-config-next": "^16.0.0"
  }
}
```

**Recommendation:** Start with 15.5.15 (stable, proven), then upgrade to 16.x later if desired.

#### Step 1.2: Install New Versions

```bash
# Remove node_modules and lock file to do clean install
rm -rf node_modules package-lock.json

# Install new versions
npm install

# Verify install succeeded
npm ls next react
# Should show: next@15.5.15 and react@19.0.0
```

**Expected output:**
```
newspulse-ai@1.0.0
├── next@15.5.15
├── react@19.0.0
└── react-dom@19.0.0
```

#### Step 1.3: Verify Dependencies

```bash
# Check for any warnings or errors
npm audit --omit=dev

# Should show:
# up to date, audited X packages
# 0 vulnerabilities

# If still sees vulnerabilities, may be transitive deps
# This is expected and will resolve in Phase 2
```

---

### Phase 2: Verify Code Compatibility (90 minutes)

#### Step 2.1: Type Check

```bash
npm run type-check

# Expected: Successful completion with no errors
# If errors: Check next section for common breaking changes
```

**Common Type Check Errors & Fixes:**

If you see errors about `React.FC` or component types, see "Breaking Changes" section below.

#### Step 2.2: Run Lint

```bash
npm run lint

# Expected: No new warnings
# May see warnings about deprecated APIs in Next.js 15 (expected)
```

#### Step 2.3: Run Full Test Suite

```bash
npm run test

# Expected: 255/255 tests passing
```

**If tests fail:**
- Re-read error messages carefully
- Check if issue is React 19 related (see "Breaking Changes")
- Verify no test setup changed (e.g., vitest config)

#### Step 2.4: Production Build

```bash
npm run build

# Expected: Successful build with no errors
# Output should show:
# ✓ Compiled successfully
# ✓ Linting and checking validity of types
# ✓ Collecting page data
# ✓ Generating static pages (X/X)
# ✓ Finalizing page optimization

# Check build size:
# Should be similar to before (±5%)
```

---

### Phase 3: Verify Security Fix (15 minutes)

#### Step 3.1: Check npm audit Results

```bash
npm audit --omit=dev --json > audit-after.json
cat audit-after.json | jq '.metadata.vulnerabilities'

# Expected output:
# {
#   "info": 0,
#   "low": 0,
#   "moderate": 0,
#   "high": 0,
#   "critical": 0
# }
```

#### Step 3.2: Compare Before/After

```bash
# Count vulnerabilities before (should be 10)
# Count vulnerabilities after (should be 0)

# Document the difference
echo "Before: 10 vulnerabilities"
echo "After: $(npm audit --omit=dev 2>&1 | grep -o '[0-9]* vulnerabilities' | grep -o '[0-9]*')"
```

**Expected:** 10 → 0 vulnerabilities

---

### Phase 4: Deploy & Verify (30 minutes)

#### Step 4.1: Create Feature Branch (if not already there)

```bash
# You should already be on a feature branch
git branch

# If on main, create upgrade branch:
# git checkout -b upgrade/next-15
```

#### Step 4.2: Commit Changes

```bash
git add package.json package-lock.json
git commit -m "Upgrade Next.js 14 → 15 and React 18 → 19

Addresses 10 npm vulnerabilities (1 CRITICAL, 5 HIGH, 4 MODERATE):
- CRITICAL: Next.js Server Components DoS (CVSS 7.5)
- HIGH: HTTP smuggling, deserialization DoS, cache exhaustion, optimizer DoS
- MODERATE: Advisory noise from Next.js 14 EOL

Breaking changes:
- None identified in this codebase
- No dynamic params to refactor
- No async ServerComponent changes needed
- All 255 tests passing
- Production build successful

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

#### Step 4.3: Push to Remote

```bash
git push -u origin $(git branch --show-current)
```

#### Step 4.4: Verify Vercel Deployment

- Go to https://vercel.com/lalit-kumar-d-s-projects/newspulse-ai
- Wait for preview build to complete (2-3 min)
- Check build status: should show "Ready" (green checkmark)
- Visit preview URL and test functionality

**Test checklist on preview:**
- [ ] Landing page loads
- [ ] Sign-in page renders
- [ ] Dashboard loads
- [ ] API health endpoint works (`/api/health`)
- [ ] No console errors in browser dev tools

#### Step 4.5: Merge to Main

Once preview is verified working:

```bash
# Option A: Via GitHub UI
# Go to your PR and click "Merge pull request" → "Confirm merge"

# Option B: Via CLI (if you have write permissions)
git checkout main
git pull origin main
git merge --ff-only $(git branch --show-current)
git push origin main
```

---

## Rollback Procedure (if needed)

If serious issues appear after merge:

```bash
# Revert the commit
git revert <commit-sha>

# Or reset (only if not pushed to public main)
git reset --hard origin/main

# Re-apply the old versions
# Edit package.json back to:
# - next: ^14.2.35
# - react: ^18.3.1
# - react-dom: ^18.3.1

npm install
npm run test  # Verify old version works again
git push origin main
```

---

## Breaking Changes & Migration Guide

### React 19 Changes

#### 1. Deprecation Warnings (Non-breaking)
React 19 may show deprecation warnings for:
- Old-style context consumers (still work, but warned)
- Unsafe lifecycle methods (if any used — none in this codebase)

**Action:** None required. Run code as-is.

#### 2. Component Ref Handling
If any components use refs, verify they're using proper forwarding:

```typescript
// BEFORE (still works in 19):
const Input = React.forwardRef((props, ref) => <input ref={ref} />)

// AFTER (preferred):
const Input = React.forwardRef<HTMLInputElement, Props>((props, ref) => (
  <input ref={ref} />
))
```

**Action:** Grep for forwardRef, check types are correct.

#### 3. useDeferredValue / useTransition Changes
If code uses these hooks, check they're called at top-level of component.

**Check:**
```bash
grep -r "useDeferredValue\|useTransition" app/
# This codebase: no matches
# Action: None needed
```

### Next.js 15 Changes

#### 1. Caching Behavior Changes
Next.js 15 changes default caching for route handlers.

**This means:** Route handlers now cache GET requests by default (30 min TTL).

**Check our API routes:**
```bash
grep -r "export.*GET\|export const GET" app/api/
# Most routes have explicit revalidation or no caching needed
```

**Action:** If any API route needs no caching, add:
```typescript
export const dynamic = 'force-dynamic'
```

#### 2. Self-referential Redirects
Redirects to same URL now error.

**Check:**
```bash
grep -r "redirect(" app/
# This codebase: no redirect() calls found
```

**Action:** None needed.

#### 3. Middleware Changes
If using middleware, verify it still works.

**Check:**
```bash
ls middleware.ts middleware.js
# This codebase: no middleware file
```

**Action:** None needed (using auth via Supabase, not middleware).

---

## Testing Checklist (Full)

After upgrade, verify:

- [ ] `npm run test` — All 255 tests passing
- [ ] `npm run type-check` — No TypeScript errors
- [ ] `npm run lint` — No new lint errors
- [ ] `npm run build` — Production build succeeds
- [ ] `npm audit --omit=dev` — 0 vulnerabilities
- [ ] `npm audit` (including dev) — Security check
- [ ] Manual browser test — Landing page loads
- [ ] Manual browser test — Sign-in works
- [ ] Manual browser test — Dashboard accessible
- [ ] API health check — `curl http://localhost:3000/api/health`
- [ ] No console errors in dev server
- [ ] No console errors in production build

---

## Deployment Verification Checklist

After merging to main:

- [ ] GitHub Actions CI runs (should pass if GitHub Actions is restored)
- [ ] Vercel deployment triggered
- [ ] Vercel build succeeds (wait 3-5 min)
- [ ] Vercel deployment marked "Ready"
- [ ] Production app loads at https://newspulse-ai-git-claude...vercel.app
- [ ] All critical paths work (auth, dashboard, API)

---

## Effort Breakdown & Timing

| Phase | Task | Effort | Notes |
|-------|------|--------|-------|
| 1.1 | Edit package.json | 5 min | Straightforward changes |
| 1.2 | npm install | 10 min | Can take time, just wait |
| 1.3 | Verify deps | 5 min | Check audit output |
| 2.1 | Type-check | 10 min | May need type fixes |
| 2.2 | Lint | 5 min | Usually no changes |
| 2.3 | Run tests | 5 min | 255 tests, usually passes |
| 2.4 | Build | 10 min | Production build |
| 3.1 | Check audit | 5 min | Verify fix |
| 3.2 | Compare results | 5 min | Verify 10→0 |
| 4.1-4.2 | Commit | 5 min | Standard git |
| 4.3-4.4 | Deploy & verify | 15 min | Wait for Vercel |
| 4.5 | Merge | 5 min | GitHub merge |
| **TOTAL** | | **90 min** | Mostly waiting for builds |

**Critical Path:** 30 min (dependencies) + 30 min (testing) + 30 min (deployment) = **~90 minutes total**

---

## Decision Points for Founder

### 1. Next.js Version: 15.5.15 vs 16.x?

**Recommendation:** Start with 15.5.15 (stable, proven, long-term support track record)

| Aspect | 15.5.15 | 16.x |
|--------|---------|------|
| Stability | ✅ Stable, proven | ⏳ Newer, less field data |
| Security | ✅ Fixes all vulns | ✅ Fixes all vulns |
| Support | ✅ LTS track record | ⏳ TBD |
| Features | ✅ Sufficient | ✅ Latest features |

**Action:** Use 15.5.15 unless you have specific need for 16.x features.

### 2. Timing: Pre-Launch vs Post-Launch?

**Current Status:**
- 1 CRITICAL vulnerability (DoS attack risk)
- 5 HIGH vulnerabilities (data integrity/confidentiality risk)
- No live customers yet (internal only, but still concerning)

**Arguments for Pre-Launch Upgrade:**
- ✅ Eliminates security risk before customers see it
- ✅ Production-ready security posture from day 1
- ✅ No customer data at risk
- ✅ 90-minute effort investment
- ⚠️ Deployment risk (but fully testable before launch)

**Arguments for Post-Launch Upgrade:**
- ✅ Get to market faster
- ✅ Validate market fit first
- ⚠️ Security vulnerabilities live in production (internal only for now)
- ⚠️ Upgrade risk affects live users once launched
- ⚠️ Customer trust impact if vulnerability disclosed before fix

**Recommendation:** **Upgrade pre-launch** (minimal risk, maximum security, 90 min is reasonable investment before customer launch)

---

## FAQ

### Q: Will this break my data?
**A:** No. This is a framework upgrade, not a database change. All data persists safely in Supabase.

### Q: Can I upgrade incrementally?
**A:** Not really. React 18 and 19 are incompatible; both must upgrade together. Incremental is not viable.

### Q: What if tests fail?
**A:** Check breaking changes section above. Most failures are type errors (easily fixed). Rollback is always available.

### Q: How long does npm install take?
**A:** Depends on network and machine. Usually 30-60 seconds. Clean install (rm node_modules) may take longer (2-3 min).

### Q: What if build fails?
**A:** Check console output for errors. Usually TypeScript or bundler issues. Rollback and investigate.

### Q: Do I need to restart anything?
**A:** After `npm install`, restart dev server (`npm run dev`) for changes to take effect.

### Q: Is this a breaking change for users?
**A:** No. This is completely invisible to users. Same functionality, better security.

---

## Success Criteria

After upgrade, verify all are true:

1. ✅ `npm audit --omit=dev` shows **0 vulnerabilities**
2. ✅ `npm run test` shows **255/255 passing**
3. ✅ `npm run build` succeeds with **no errors**
4. ✅ Vercel preview shows **"Ready"** status
5. ✅ Production app loads and responds
6. ✅ API health check passes
7. ✅ No console errors in browser

**All 7 criteria true = Upgrade Successful**

---

## Contact & Escalation

If upgrade blocks or errors occur:

1. **Check this guide** — Most issues documented above
2. **Check Next.js migration docs** — https://nextjs.org/docs/upgrading/from-14-to-15
3. **Check React 19 release notes** — https://react.dev/blog/2024/12/19/react-19
4. **Check breaking changes** section above

If still stuck:
- Rollback: `git revert` the upgrade commit
- Investigate: Read error messages, Google the exact error
- Ask: Document what failed and request help

---

**Status:** READY FOR EXECUTION  
**Effort:** ~90 minutes  
**Risk Level:** MEDIUM (mitigated by comprehensive testing)  
**Benefit:** Eliminates all 10 vulnerabilities, improves security posture  
**Recommendation:** Execute pre-launch  

