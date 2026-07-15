# PHASE 2C: RUNTIME VERIFICATION CHECKLIST
**Status:** Not Executed (Requires Deployed Instance + Supabase Access)  
**Date:** 2026-07-15  
**Environment Required:** Staging/Preview Vercel Deployment + Supabase Project  

---

## OBJECTIVE

Execute the complete customer journey using disposable test data and verify:
1. Registration → Email verification → Login → Workspace creation → Dashboard
2. AI Inventory → Evidence/Obligations → Export
3. Logout → Re-login persistence
4. Failure scenarios (missing auth, invalid tokens, cross-workspace access, partial failures)

---

## PREREQUISITES

### Environment Setup (Not Yet Done)

- [ ] Vercel project linked to GitHub (auto-deploy active)
- [ ] Supabase project created and configured
- [ ] `.env.local` populated with Supabase credentials:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Database schema deployed: `npm run supabase:deploy` or manual SQL run
- [ ] Local dev server running: `npm run dev`
- [ ] OR preview deployment at `https://<branch>.vercel.app` available
- [ ] Browser DevTools open (Network tab, Console for logs)

### Test Data

- [ ] Disposable email addresses available (use temporary email service if needed)
  - Primary test: `test-customer-20260715-primary@example.com`
  - Team member: `test-customer-20260715-team@example.com`
  - Invasion test: `test-customer-20260715-invasion@example.com`

---

## TEST PLAN

### PHASE 2C.1: REGISTRATION & EMAIL VERIFICATION

#### Test 1.1: Successful Registration

**Action:**
1. Navigate to `/auth/signup`
2. Fill form:
   - Email: `test-customer-20260715-primary@example.com`
   - Password: `TestPassword123!`
   - Repeat: `TestPassword123!`
   - First Name: `Test`
   - Last Name: `Customer`
   - Agree to terms (checkbox)
3. Click "Sign up"

**Expected Behavior:**
- [ ] Form submission succeeds (no validation errors)
- [ ] Redirect to `/auth/verify-email?email=...`
- [ ] Page displays: "Verify your email"
- [ ] Email received in inbox within 5 minutes

**Evidence Capture:**
- [ ] Screenshot of verify-email page
- [ ] Email with verification link
- [ ] Browser Network tab: POST /api/auth/signup (check response)
- [ ] Database: SELECT * FROM auth.users WHERE email = 'test-...' (verify user created)
- [ ] Database: SELECT * FROM profiles WHERE id = (user.id) (verify profile created by trigger)

**Pass/Fail:** _____

---

#### Test 1.2: Email Verification Link Handling

**Action:**
1. Click verification link in email
2. Browser should redirect automatically

**Expected Behavior:**
- [ ] Email link lands on `/auth/confirm?code=...` or `?token_hash=...`
- [ ] Page exchanges code → session created
- [ ] Redirect to `/dashboard` (automatic)
- [ ] User logged in (session cookie exists)

**Evidence Capture:**
- [ ] Screenshot of `/dashboard` after redirect
- [ ] Browser DevTools: Application → Cookies → Verify `sb-access-token` + `sb-refresh-token` exist
- [ ] Browser Console: No errors
- [ ] Network tab: GET /auth/confirm (verify 200 response)

**Pass/Fail:** _____

---

### PHASE 2C.2: FIRST LOGIN & DASHBOARD

#### Test 2.1: Dashboard State (No Workspace Yet)

**Action:**
1. Already on `/dashboard` after email verification

**Expected Behavior:**
- [ ] Page displays: "Welcome, Test"
- [ ] "Company Setup" step shows as uncompleted (number "1")
- [ ] Text says "Tell us about your organization and its AI use"
- [ ] Link points to `/workspace/setup`
- [ ] "AI Inventory" and "Risk Assessment" steps show as locked (grayed out)
- [ ] "What you can do next" section shows company setup as available

**Evidence Capture:**
- [ ] Screenshot of dashboard (no workspace state)
- [ ] Browser Console: No 409 errors
- [ ] Network tab: GET /api/ai-systems returns 409 "No workspace yet"

**Pass/Fail:** _____

---

### PHASE 2C.3: WORKSPACE CREATION

#### Test 3.1: Workspace Setup Form Validation

**Action:**
1. Click "Company Setup" link → Navigate to `/workspace/setup`
2. Try submitting empty form (all fields blank)

**Expected Behavior:**
- [ ] Form validation error: "Please fill in required fields"
- [ ] Form does not submit to API
- [ ] User stays on `/workspace/setup`

**Evidence Capture:**
- [ ] Screenshot of validation error
- [ ] Network tab: No POST request made

**Pass/Fail:** _____

---

#### Test 3.2: Successful Workspace Creation

**Action:**
1. Fill workspace setup form:
   - Company Name: `Test Corp 2026`
   - Legal Name: `Test Corp GmbH`
   - Country: `DE`
   - Industry: `Technology`
   - Employees: (leave blank)
   - Website: (leave blank)
   - Description: `Test customer for Phase 2 audit`
2. Click "Continue"

**Expected Behavior:**
- [ ] Loading state shows "Saving..."
- [ ] Success page displays: "Company profile created! Redirecting to dashboard..."
- [ ] After 2 seconds, redirect to `/dashboard`
- [ ] Dashboard now shows workspace info

**Evidence Capture:**
- [ ] Screenshot of success page
- [ ] Network tab: POST /api/workspace → Response 200 with { ok: true, workspace: {...}, companyId: "..." }
- [ ] Database: SELECT * FROM workspaces WHERE owner_id = (user.id) (verify workspace created)
- [ ] Database: SELECT * FROM workspace_members WHERE user_id = (user.id) (verify membership with role='owner', status='active')
- [ ] Database: SELECT * FROM companies WHERE workspace_id = (workspace.id) (verify company profile)

**Pass/Fail:** _____

---

#### Test 3.3: Dashboard State (Workspace Exists)

**Action:**
1. After redirect, on `/dashboard`

**Expected Behavior:**
- [ ] "Company Setup" step now shows checkmark (completed)
- [ ] Workspace name displayed: "Test Corp 2026"
- [ ] Workspace slug shown (e.g., "test-corp-2026-xyz123")
- [ ] "AI Inventory" step now unlocked (clickable)
- [ ] "Risk Assessment" step still locked ("coming soon")

**Evidence Capture:**
- [ ] Screenshot of dashboard (workspace state)

**Pass/Fail:** _____

---

### PHASE 2C.4: AI INVENTORY

#### Test 4.1: Load Inventory (Empty)

**Action:**
1. Click "AI Inventory" link → Navigate to `/inventory`

**Expected Behavior:**
- [ ] Page loads: "AI Systems Inventory"
- [ ] Text: "No systems registered yet"
- [ ] "Add AI system" button visible and enabled
- [ ] Network request: GET /api/ai-systems → 200 with { ok: true, systems: [] }

**Evidence Capture:**
- [ ] Screenshot of inventory page
- [ ] Network tab: GET /api/ai-systems response

**Pass/Fail:** _____

---

#### Test 4.2: Add AI System

**Action:**
1. Click "Add AI system" button
2. Form appears; fill:
   - Name: `Test LLM System`
   - Type: `Large Language Model`
   - Vendor: `OpenAI`
   - Purpose: `Customer support chatbot`
   - Status: `active`
3. Click "Save system"

**Expected Behavior:**
- [ ] Loading state shows "Saving…"
- [ ] System appears in list below form
- [ ] Form clears
- [ ] Inventory count updates to "1 system registered"

**Evidence Capture:**
- [ ] Screenshot of inventory with system listed
- [ ] Network tab: POST /api/ai-systems → 200 with { ok: true, system: {...} }
- [ ] Database: SELECT * FROM ai_systems WHERE workspace_id = (workspace.id) (verify system created)

**Pass/Fail:** _____

---

### PHASE 2C.5: EVIDENCE & OBLIGATIONS (API-LEVEL)

#### Test 5.1: Create Evidence Record

**Action:**
1. Open DevTools, switch to Console
2. Execute:
   ```javascript
   fetch('/api/evidence', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       company_id: 'COMPANY_UUID_FROM_TEST_3',
       obligation_id: null,
       title: 'Test Evidence: BOM Documentation',
       description: 'AI Bill of Materials for LLM system',
       file_type: 'pdf',
       file_size: 1024000
     })
   }).then(r => r.json()).then(d => console.log(d))
   ```

**Expected Behavior:**
- [ ] API responds with 200
- [ ] Response: { ok: true, evidence: {...}, message: "..." }
- [ ] Evidence record has status='submitted'

**Evidence Capture:**
- [ ] Browser Console output
- [ ] Database: SELECT * FROM evidence WHERE workspace_id = (workspace.id)

**Pass/Fail:** _____

---

#### Test 5.2: Create Obligation Record

**Action:**
1. In Console, execute:
   ```javascript
   fetch('/api/obligations', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       company_id: 'COMPANY_UUID_FROM_TEST_3',
       title: 'EU AI Act Article 6 - Risk Classification',
       description: 'Classify LLM as high-risk system',
       source: 'EU_AI_ACT',
       priority: 'high',
       due_date: '2026-09-15'
     })
   }).then(r => r.json()).then(d => console.log(d))
   ```

**Expected Behavior:**
- [ ] API responds with 200
- [ ] Response: { ok: true, obligation: {...} }
- [ ] Obligation has status='identified'

**Evidence Capture:**
- [ ] Browser Console output
- [ ] Database: SELECT * FROM obligations WHERE workspace_id = (workspace.id)

**Pass/Fail:** _____

---

### PHASE 2C.6: COMPLIANCE EXPORT

#### Test 6.1: Export Compliance Report

**Action:**
1. In Console, execute:
   ```javascript
   fetch('/api/export/compliance', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ format: 'json' })
   }).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
   ```

**Expected Behavior:**
- [ ] API responds with 200
- [ ] Response includes: { discovery_score, documentation_score, security_score, total_score, timestamp }
- [ ] Scores are integers 0-100

**Evidence Capture:**
- [ ] Browser Console output with full response
- [ ] Note: discovery_score should be ~10 (1 system < 5)

**Pass/Fail:** _____

---

### PHASE 2C.7: LOGOUT & RE-LOGIN

#### Test 7.1: Logout

**Action:**
1. Click "Sign out" button in header

**Expected Behavior:**
- [ ] Button shows "Signing out…"
- [ ] Redirect to homepage `/`
- [ ] Session cookies cleared (verify in DevTools)
- [ ] "Sign In" link visible in header (unauthenticated state)

**Evidence Capture:**
- [ ] Screenshot of homepage (signed out)
- [ ] DevTools Cookies: `sb-*` cookies gone

**Pass/Fail:** _____

---

#### Test 7.2: Re-Login & Workspace Persistence

**Action:**
1. Click "Sign In" in header
2. Navigate to `/auth/signin` (if not automatic redirect)
3. Fill form:
   - Email: `test-customer-20260715-primary@example.com`
   - Password: `TestPassword123!`
4. Click "Sign in"

**Expected Behavior:**
- [ ] Login succeeds
- [ ] Redirect to `/dashboard`
- [ ] Same workspace info displayed: "Test Corp 2026"
- [ ] Same inventory system shown: "Test LLM System"
- [ ] Inventory count: "1 system registered"

**Evidence Capture:**
- [ ] Screenshot of dashboard after re-login
- [ ] Network tab: POST /auth/signin, then GET /dashboard
- [ ] Verify workspace data persisted

**Pass/Fail:** _____

---

### PHASE 2C.8: FAILURE SCENARIOS

#### Test 8.1: Missing Authentication

**Action:**
1. Open new Private/Incognito window (no session)
2. In Console, execute:
   ```javascript
   fetch('/api/ai-systems').then(r => console.log('Status:', r.status, '| Body:', r.json()))
   ```

**Expected Behavior:**
- [ ] API responds with 401 "Authentication required"
- [ ] No data exposed

**Evidence Capture:**
- [ ] Console output

**Pass/Fail:** _____

---

#### Test 8.2: Invalid Token (Expired/Malformed)

**Action:**
1. In authenticated window, open DevTools
2. Find `sb-access-token` cookie
3. Modify it to garbage (e.g., `invalid_token_123`)
4. Refresh `/dashboard` page

**Expected Behavior:**
- [ ] Page redirects to `/auth/signin?redirect=/dashboard` (middleware catches invalid token)
- [ ] Dashboard not accessible without valid session

**Evidence Capture:**
- [ ] Screenshot of redirect

**Pass/Fail:** _____

---

#### Test 8.3: Cross-Workspace Access Attempt

**Action:**
1. In authenticated window (Test Corp workspace), open DevTools
2. In Database (Supabase UI), note the workspace_id from Test Corp
3. Get a different workspace_id that exists (or create second test customer)
4. Manually craft API request to other workspace:
   ```javascript
   // Simulating RLS bypass attempt (will fail)
   fetch('/api/ai-systems?workspace_id=OTHER_WORKSPACE_ID').then(r => r.json()).then(d => console.log(d))
   ```
   OR: Try to access other company's evidence

**Expected Behavior:**
- [ ] RLS filters queries: returns only data for current workspace
- [ ] No cross-workspace data leakage
- [ ] Query returns empty arrays or 403

**Evidence Capture:**
- [ ] API response (should be empty or filtered)
- [ ] Database audit: SELECT * FROM audit_logs (if available)

**Pass/Fail:** _____

---

#### Test 8.4: Workspace Creation Duplicate (Rapid Submission)

**Action:**
1. Navigate to `/workspace/setup` (create new account or use test account with manual DB cleanup)
2. Fill form quickly
3. Click "Continue" button multiple times rapidly

**Expected Behavior:**
- **Current (Buggy):** Multiple workspaces created
- **Expected (Fixed):** Only one workspace created; form shows "already submitted" or idempotent behavior

**Evidence Capture:**
- [ ] Database: SELECT COUNT(*) FROM workspaces WHERE owner_id = (test-user.id) (should be 1, not N)
- [ ] Note this as MAJOR-1 defect if multiple workspaces created

**Pass/Fail:** _____

---

#### Test 8.5: Workspace Creation Failure Scenario

**Action:**
1. Simulate company insert failure (via DB constraint or API modification)
2. Attempt workspace creation

**Expected Behavior:**
- **Current (Critical):** If company insert fails, workspace + membership still exist (orphaned)
- **Expected (Fixed):** Automatic rollback or cleanup

**Evidence Capture:**
- [ ] Database state after failure (workspace + membership exist but no company)
- [ ] User can recover or system cleans up automatically

**Pass/Fail:** _____

---

## BLOCKERS CONFIRMED IN RUNTIME

### BLOCKER-1: Assessment Routes Not Available

**Test:**
1. On dashboard, click "Risk Assessment" step
2. OR: In Console, execute:
   ```javascript
   fetch('/api/assessment', { method: 'POST', body: JSON.stringify({...}) }).then(r => console.log('Status:', r.status))
   ```

**Expected:**
- [ ] Dashboard link disabled ("coming soon" UX)
- [ ] API responds with 404 (route not found)

**Severity:** BLOCKER
**Action:** Implement `/api/assessment` routes

**Pass/Fail:** _____

---

### BLOCKER-2: Team Member Invitation Not Available

**Test:**
1. On dashboard, check "Add team members" step
2. OR: In Console, execute:
   ```javascript
   fetch('/api/workspace/{id}/members', { method: 'POST', body: JSON.stringify({...}) }).then(r => console.log('Status:', r.status))
   ```

**Expected:**
- [ ] Dashboard shows "coming soon" UX
- [ ] API responds with 404 (route not found)

**Severity:** BLOCKER
**Action:** Implement `/api/workspace/{id}/members` routes

**Pass/Fail:** _____

---

## SUMMARY TABLE

| Test | Expected | Pass | Fail | Notes |
|------|----------|------|------|-------|
| 1.1: Register | 200, redirect verify-email | ___ | ___ | |
| 1.2: Email verify | Redirect /dashboard, session created | ___ | ___ | |
| 2.1: Dashboard no WS | Shows setup prompt | ___ | ___ | |
| 3.1: Form validation | Error on empty | ___ | ___ | |
| 3.2: Workspace create | 200, redirect dashboard | ___ | ___ | |
| 3.3: Dashboard with WS | Shows workspace info | ___ | ___ | |
| 4.1: Inventory load | 200, systems: [] | ___ | ___ | |
| 4.2: Add system | 200, system appears | ___ | ___ | |
| 5.1: Create evidence | 200, status=submitted | ___ | ___ | |
| 5.2: Create obligation | 200, status=identified | ___ | ___ | |
| 6.1: Export | 200, scores returned | ___ | ___ | |
| 7.1: Logout | Session cleared, redirect / | ___ | ___ | |
| 7.2: Re-login | Workspace persists | ___ | ___ | |
| 8.1: No auth | 401 | ___ | ___ | |
| 8.2: Bad token | Redirect /auth/signin | ___ | ___ | |
| 8.3: Cross-workspace | 403 or empty | ___ | ___ | |
| 8.4: Duplicate submit | 1 workspace only | ___ | ___ | MAJOR-1 |
| 8.5: Create failure | Cleanup on failure | ___ | ___ | CRITICAL-1 |
| BLOCKER-1: Assessment | 404 or disabled | ___ | ___ | |
| BLOCKER-2: Team invite | 404 or disabled | ___ | ___ | |

---

## EXECUTION NOTES

- **Date Executed:** _______________________
- **Executed By:** _______________________
- **Environment:** Development / Staging / Production
- **Deployment Commit:** _______________________
- **Issues Encountered:** _______________________

---

## NEXT STEPS AFTER RUNTIME VERIFICATION

1. [ ] Document all failures with screenshots + network logs
2. [ ] Cross-reference failures with code trace
3. [ ] Create GitHub issues for each defect
4. [ ] Prioritize fixes (BLOCKER → CRITICAL → MAJOR)
5. [ ] Implement fixes
6. [ ] Re-run runtime verification after fixes
7. [ ] Generate final audit report

---

**Not Yet Executed** — Awaiting deployed instance with Supabase access.

