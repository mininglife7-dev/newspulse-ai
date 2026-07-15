# PHASE 2A: CUSTOMER JOURNEY CODE TRACE
**Date:** 2026-07-15  
**Status:** Complete  
**Verified:** Code inspection (no runtime execution yet)

---

## EXECUTIVE SUMMARY

The actual implemented customer journey differs significantly from assumptions. The platform creates workspaces **manually during onboarding** (not automatically). Three critical blockers were identified:

1. **Assessment routes not implemented** — Risk assessment is disabled in UI ("coming soon") with no backend routes
2. **Team member invitation not implemented** — Collaboration features are disabled ("coming soon") with no API
3. **Workspace creation not transactional** — Company insert failure leaves orphaned workspace + membership records

The journey succeeds through: Registration → Email Verification → Login → Workspace Setup (manual) → Inventory → Evidence/Obligations → Export → Logout → Re-Login.

---

## SECTION 1: FRONTEND ENTRY POINTS

### 1.1 Registration (`/auth/signup`)

**File:** `app/auth/signup/page.tsx`

| Component | Details |
|-----------|---------|
| **Type** | Client-side form (use client) |
| **Form Fields** | email, password, repeatPassword, firstName, lastName, termsAgreed |
| **Validation** | Client-side: passwords match, 8+ chars, terms required |
| **API Call** | `signUp(email, password, firstName, lastName)` from `@/lib/auth` |
| **Method** | Supabase auth.signUp() with emailRedirectTo |
| **Payload** | `{ email, password, options: { data: { first_name, last_name }, emailRedirectTo } }` |
| **Expected Response** | Success: user object + auth session |
| **Error Handling** | Throws error; UI displays error message |
| **Redirect on Success** | `/auth/verify-email?email={email}` |
| **Email Action** | Supabase sends verification link to inbox |

**Code Flow:**
```
User → Signup Form → signUp() (lib/auth.ts)
→ supabase.auth.signUp() (Supabase SDK)
→ User record created in auth.users + email sent
→ Redirect to verify-email page
→ Trigger: handle_new_user() fires (creates profile row)
```

---

### 1.2 Email Verification (`/auth/confirm`)

**File:** `app/auth/confirm/route.ts`

| Component | Details |
|-----------|---------|
| **Type** | GET endpoint (email link handler) |
| **Query Parameters** | `code` (PKCE) OR `token_hash` + `type` (OTP) |
| **Default Redirect** | `/dashboard` (can override with `?next=/path`) |
| **Authentication** | Supabase exchangeCodeForSession() or verifyOtp() |
| **Session Creation** | JWT token + `sb-` prefixed cookies set |
| **Error Handling** | Redirect to `/auth/signin?error=verification_failed` |
| **Idempotency** | Non-idempotent: re-clicking link fails (code already used) |

**Code Flow:**
```
Email Link → GET /auth/confirm?code=... or ?token_hash=...
→ exchangeCodeForSession() or verifyOtp()
→ Session JWT created + cookies stored
→ Redirect to /dashboard or ?next parameter
→ Middleware recognizes session cookie + allows access
```

**Risk:** Link expiration (typically 24 hours). After expiration, user cannot verify via email link and must sign in and request new confirmation link.

---

### 1.3 Middleware Route Protection (`middleware.ts`)

**File:** `middleware.ts`

| Component | Details |
|-----------|---------|
| **Type** | Next.js middleware (runs on every request) |
| **Session Validation** | `supabase.auth.getUser()` validates JWT |
| **Route Classification** | classifyRoute() returns 'public', 'auth', or 'protected' |
| **Protected Routes** | `/dashboard`, `/workspace`, `/assessment`, `/inventory`, `/api/*` |
| **Auth Routes** | `/auth/signin`, `/auth/signup`, `/auth/reset` |
| **Public Routes** | Everything else (homepage, privacy, terms) |
| **Behavior if No Session** | Protected → Redirect to signin; Auth → Redirect to dashboard; Public → Allow |
| **Cookie Handling** | Reads `sb-*` cookies, validates session, refreshes if expired |

**Key:** Route protection is **UX only**. RLS in database is the security boundary.

---

### 1.4 Login (`/auth/signin`)

**File:** `app/auth/signin/page.tsx`

| Component | Details |
|-----------|---------|
| **Type** | Client-side form |
| **Form Fields** | email, password |
| **Validation** | Client-side: both fields required |
| **API Call** | `signIn(email, password)` from `@/lib/auth` |
| **Method** | Supabase auth.signInWithPassword() |
| **Payload** | `{ email, password }` |
| **Session Creation** | JWT token + `sb-` cookies |
| **Redirect on Success** | `/dashboard` or `?redirect=/path` |
| **Error Handling** | Throws error; UI displays "Invalid email or password" |
| **Error URL Parameter** | `?error=verification_failed` (from email verification failure) |

**Code Flow:**
```
User → Sign In Form → signIn() (lib/auth.ts)
→ supabase.auth.signInWithPassword()
→ JWT created + cookies stored
→ Middleware allows /dashboard access
→ Redirect to /dashboard
```

---

### 1.5 Dashboard Landing (`/dashboard`)

**File:** `app/dashboard/page.tsx`

| Component | Details |
|-----------|---------|
| **Type** | Server component (async) |
| **Authentication** | `supabase.auth.getUser()` (server-side, validates JWT) |
| **Query 1** | workspace_members table: `eq('user_id', user.id).eq('status', 'active').limit(1)` |
| **Query 2** | Fetch workspace name via JOINed workspaces table |
| **Query 3** | Count ai_systems in workspace (if workspace exists) |
| **Workspace Found** | Display "Company Setup" as completed; unlock Inventory step |
| **No Workspace** | Display "Company Setup" as link to `/workspace/setup` |
| **System Count** | Shows "X systems registered" or unlock message |
| **Error Handling** | Catches errors and renders "fresh-account" state (no workspace) |

**Key Insight:** This page is the **first time the customer path branches**. If workspace exists, show inventory. If not, show setup prompt.

---

### 1.6 Workspace Setup Form (`/workspace/setup`)

**File:** `app/workspace/setup/page.tsx`

| Component | Details |
|-----------|---------|
| **Type** | Client-side form |
| **Form Fields** | companyName*, legalName, country*, industry*, employees, website, description |
| **Validation (Client)** | Required: companyName, country, industry |
| **API Call** | POST `/api/workspace` |
| **Payload** | All form fields in JSON body |
| **Error Handling** | 401 → Redirect to signin; other errors → Display message |
| **Redirect on Success** | After 2s delay → `/dashboard` |
| **Success State** | "Company profile created! Redirecting to dashboard..." |

---

### 1.7 AI Inventory (`/inventory`)

**File:** `app/inventory/page.tsx`

| Component | Details |
|-----------|---------|
| **Type** | Client component (useEffect) |
| **Load Function** | GET `/api/ai-systems` on mount |
| **Status 409** | "Complete company setup first" alert + link to `/workspace/setup` |
| **Status 401** | Redirect to `/auth/signin?redirect=/inventory` |
| **Form Submission** | POST `/api/ai-systems` with system details |
| **Fields Sent** | name*, systemType, vendor, purpose, status |
| **Response Handling** | Refetch list after successful POST |

---

### 1.8 Evidence Page

**Not yet UI-integrated.** Evidence is created via API only (`POST /api/evidence`).

---

### 1.9 Obligations Page

**Not yet UI-integrated.** Obligations are created via API only (`POST /api/obligations`).

---

### 1.10 Assessment Page

**Disabled in UI ("coming soon").** No assessment routes exist.

---

### 1.11 Export / Report

**No dedicated UI page.** Export is via direct API call (`POST /api/export/compliance`).

---

### 1.12 Logout (`SignOutButton`)

**File:** `components/SignOutButton.tsx`

| Component | Details |
|-----------|---------|
| **Type** | Client button component |
| **Action** | `signOut()` from `@/lib/auth` |
| **Method** | Supabase auth.signOut() (clears session + cookies) |
| **Navigation** | `window.location.href = '/'` (full page reload) |
| **Result** | User redirected to homepage (unauthenticated) |
| **Re-Login** | User clicks "Sign In", enters credentials, lands on `/dashboard` |
| **Workspace Persistence** | Workspace membership remains in database; user resumes with same workspace |

---

## SECTION 2: BACKEND ROUTES

### 2.1 `/api/workspace` (Critical Path)

**File:** `app/api/workspace/route.ts`

| Field | Value |
|-------|-------|
| **HTTP Method** | POST only |
| **Authentication** | `supabase.auth.getUser()` (required, 401 if missing) |
| **Authorization** | None (user can create workspace for themselves) |
| **Input Validation** | companyName, country, industry required; trim whitespace |
| **Request Body** | `{ companyName, legalName?, country, industry, employees?, website?, description? }` |
| **Database Writes** | 3 separate, non-atomic inserts |

**Database Transactions:**
```sql
1. INSERT workspaces(slug, name, description, owner_id, status='active')
   → SELECT id, slug, name
   
2. INSERT workspace_members(workspace_id, user_id, role='owner', email, status='active', joined_at)
   
3. INSERT companies(workspace_id, name, legal_name, country, industry, employees_range, website, governance_priorities)
   → SELECT id
   
4. UPSERT profiles(id, email, current_workspace_id)  # Best effort
```

**Slug Generation:** `slugify(companyName)` produces `{base}-{8-char-uuid}`

**Response on Success:**
```json
{
  "ok": true,
  "workspace": { "id": "uuid", "slug": "string", "name": "string" },
  "companyId": "uuid"
}
```

**Response on Failure:**
```json
{ "ok": false, "error": "string" }  # Status: 400, 401, 500
```

**RLS Enforcement:** All writes checked by RLS (user owns workspace → can insert membership).

**Critical Issue:** Inserts are sequential, not atomic.
- If step 2 fails: workspace exists but no membership → user stranded
- If step 3 fails: workspace + membership exist, but company missing → data model corrupt
- If step 4 fails: workspace + membership + company exist, but profile not updated (acceptable)

**Idempotency:** Non-idempotent. Multiple POSTs create multiple workspaces.

---

### 2.2 `/api/ai-systems` (GET)

**File:** `app/api/ai-systems/route.ts`

| Field | Value |
|-------|-------|
| **HTTP Method** | GET |
| **Authentication** | Required (401 if missing) |
| **Context Resolution** | Calls `resolveContext()` helper |
| **Workspace Lookup** | workspace_members where `status='active'` |
| **Response on No Workspace** | `{ ok: false, error: "No workspace yet..." }` + 409 |
| **Query** | ai_systems filtered by `workspace_id` |
| **Response** | `{ ok: true, systems: [] }` or array of systems |

---

### 2.3 `/api/ai-systems` (POST)

**File:** `app/api/ai-systems/route.ts`

| Field | Value |
|-------|-------|
| **HTTP Method** | POST |
| **Authentication** | Required |
| **Context Resolution** | Resolves workspace_id + company_id |
| **Validation** | name required, systemType/status validated against enums |
| **Response on No Workspace** | 409 + "No workspace yet..." |
| **Response on No Company** | 409 + "No company profile..." |
| **Database Write** | INSERT ai_systems(workspace_id, company_id, name, ...) |
| **Response** | `{ ok: true, system: {...} }` |

---

### 2.4 `/api/evidence` (GET + POST)

**File:** `app/api/evidence/route.ts`

| Field | Value |
|-------|-------|
| **GET** | List evidence filtered by workspace_id |
| **POST** | Create evidence record (file metadata, not file storage) |
| **Auth** | Required for both |
| **Workspace Check** | Queries workspace_members for access validation |
| **Company Verification** | POST checks company belongs to workspace |
| **Obligation Verification** | POST checks obligation belongs to company (if provided) |
| **File Size Limit** | 50MB |
| **Max Duration** | 300s (5 minutes) |

---

### 2.5 `/api/obligations` (GET + POST)

**File:** `app/api/obligations/route.ts`

| Field | Value |
|-------|-------|
| **GET** | List obligations, filterable by company, status, priority, source |
| **POST** | Create obligation |
| **Auth** | Required for both |
| **Default Values** | status='identified', priority='medium', source='EU_AI_ACT' |

---

### 2.6 `/api/export/compliance` (POST)

**File:** `app/api/export/compliance/route.ts`

| Field | Value |
|-------|-------|
| **HTTP Method** | POST |
| **Auth** | Required |
| **Request Body** | `{ format: 'json' or 'csv' }` (optional, defaults to json) |
| **Workspace Check** | Resolves workspace from workspace_members |
| **Data Queries** | Fetches ai_system_detections, ai_bom_records, monitoring_alerts |
| **Scoring Logic** | Calculates discovery, documentation, security scores (0-100 scale) |
| **Response** | Compliance report with scores (partial implementation visible) |

---

## SECTION 3: WORKSPACE CREATION MODEL

**Model:** D — Workspace created manually during onboarding

**Characteristics:**
- ✓ User registers without workspace
- ✓ User logs in, lands on `/dashboard`
- ✓ Dashboard prompts: "Complete company setup" → link to `/workspace/setup`
- ✓ User fills setup form → POST `/api/workspace`
- ✓ Workspace created with user as owner (role='owner', status='active')
- ✓ User can create multiple workspaces (no limit enforced)
- ✗ Workspace creation is NOT atomic (sequences of inserts, not transaction)
- ✗ Workspace creation is NOT idempotent (multiple POSTs create multiple workspaces)

**Ownership & Membership:**
- Owner: User who created workspace (owner_id in workspaces table)
- Owner Role: role='owner' in workspace_members
- Active Status: status='active' in workspace_members
- RLS Filter: All queries filter by `workspace_id` from workspace_members.workspace_id

**Workspace Persistence After Logout:**
- Workspace records remain in database
- After re-login, dashboard queries workspace_members again
- User resumes with same workspace (no workspace re-selection UX)

---

## SECTION 4: DATABASE WRITES & RLS

### 4.1 Registration to Profile Auto-Creation

**Tables Modified:**
1. `auth.users` (Supabase-managed) — INSERT new user
2. `profiles` (trigger: `handle_new_user()`) — INSERT profile row

**Trigger Logic (`handle_new_user`):**
```
ON INSERT auth.users
→ Extract first_name, last_name from raw_user_meta_data
→ INSERT profiles(id, email, first_name, last_name, created_at, updated_at)
→ IF error: raise warning (but return new anyway, so signup succeeds)
```

**Risk:** Trigger failure does not halt signup (defensive pattern). Profile may not exist. Subsequent queries return NULL. API endpoints later handle missing profile via upsert.

---

### 4.2 Workspace Creation (Non-Atomic)

**Sequence:**

| Step | Table | Operation | On Failure |
|------|-------|-----------|-----------|
| 1 | workspaces | INSERT | Return 500; workspace created |
| 2 | workspace_members | INSERT | Return 500; workspace exists, membership missing |
| 3 | companies | INSERT | Return 500; workspace + membership exist, company missing |
| 4 | profiles | UPSERT | Log warning; workspace + membership + company exist |

**Critical Risk:** If step 2 fails, user has workspace but no membership → RLS filters out all workspace data → user stranded.

---

### 4.3 RLS Policies

All critical tables have RLS enabled:
- **profiles** — User can see their own profile
- **workspaces** — User can see workspaces they own
- **workspace_members** — User can see memberships where user_id = current_user
- **companies** — User can see companies in their workspace
- **ai_systems** — User can see systems in their workspace
- **obligations** — User can see obligations in their workspace
- **evidence** — User can see evidence in their workspace

**Enforcement:** Every query in API endpoints runs as authenticated user; RLS silently filters rows user shouldn't see.

---

## SECTION 5: AUTHENTICATION & SESSION FLOW

### 5.1 Session Lifecycle

| Stage | Action | Mechanism |
|-------|--------|-----------|
| Signup | Create user in auth.users | Supabase auth.signUp() |
| Email Verification | Create session | exchangeCodeForSession() or verifyOtp() |
| Session Storage | JWT + cookies | `sb-access-token`, `sb-refresh-token` in cookies (httpOnly if HTTPS) |
| Page Access | Validate session | middleware.ts calls supabase.auth.getUser(); validates JWT |
| Token Expiration | Automatic refresh | Middleware refreshes expired tokens via setAll() |
| Logout | Clear session | supabase.auth.signOut() clears tokens + cookies |

### 5.2 Critical Path Blockers

**Stranding Risk 1: Profile auto-creation fails**
- Signup succeeds (trigger failure non-fatal)
- Profile row not created
- Subsequent queries return NULL for profile data
- **Mitigation:** API endpoints upsert profile on first access

**Stranding Risk 2: Workspace creation fails at step 2**
- Workspace exists but membership missing
- User has session but RLS filters workspace data
- User sees empty dashboard (no workspace found)
- **Mitigation:** Add transactional RPC or explicit error recovery

**Stranding Risk 3: Email never verified**
- User completes signup but doesn't click email link
- Redirect to `/auth/verify-email` (holding page)
- Cannot log in (email not verified)
- Cannot re-request verification (UI doesn't exist)
- **Mitigation:** Add "Resend verification" link on verify-email page

---

## SECTION 6: DOCUMENTED JOURNEY MAP

```
┌─────────────────────────────────────────────────────────────────────┐
│ FIRST-TIME CUSTOMER JOURNEY (Implemented)                           │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│ REGISTRATION │
└──────────────┘
   ↓
   User → Sign Up Form
      ↓ (app/auth/signup/page.tsx)
      └→ signUp(email, password, firstName, lastName)
         ↓ (lib/auth.ts)
         └→ supabase.auth.signUp()
            ↓ (Supabase backend)
            ├→ INSERT auth.users
            ├→ Trigger: CREATE profiles row (handle_new_user)
            └→ SEND verification email
            
      ↓
      Redirect to /auth/verify-email?email=...

┌───────────────────────────┐
│ EMAIL VERIFICATION (ASYNC)│
└───────────────────────────┘
   ↓
   User → Click email link
      ↓ (email contains code or token_hash)
      └→ GET /auth/confirm?code=... or ?token_hash=...
         ↓ (app/auth/confirm/route.ts)
         └→ exchangeCodeForSession() or verifyOtp()
            ↓
            ├→ CREATE JWT token
            ├→ SET sb-* cookies
            └→ Validate session
            
      ↓
      Redirect to /dashboard (or ?next param)

┌───────────────────┐
│ FIRST LOGIN       │
└───────────────────┘
   ↓
   User lands on /dashboard (after email verification)
      ↓ (app/dashboard/page.tsx, server component)
      └→ supabase.auth.getUser() ← Validates JWT from cookies
         ↓
         ├→ Query workspace_members (user_id=..., status='active')
         └→ No workspace found → Show setup prompt

┌────────────────────────────┐
│ WORKSPACE SETUP (MANUAL)   │
└────────────────────────────┘
   ↓
   User → Company Setup Link (/workspace/setup)
      ↓ (app/workspace/setup/page.tsx)
      └→ Form: companyName, legalName, country, industry, ...
         ↓ (on submit)
         └→ POST /api/workspace
            ↓ (app/api/workspace/route.ts)
            
            1. Validate input (companyName, country, industry required)
            2. Auth check: supabase.auth.getUser() → 401 if missing
            
            3. INSERT workspaces
               └→ slug = slugify(companyName) + random suffix
               └→ owner_id = user.id
               └→ Receive: workspace.id
               
            4. INSERT workspace_members
               └→ workspace_id, user_id, role='owner', status='active'
               └→ FAILURE → Return 500 (user stranded; membership missing)
               
            5. INSERT companies
               └→ workspace_id, name, legal_name, country, industry, ...
               └→ FAILURE → Return 500 (data model corrupt)
               
            6. UPSERT profiles
               └→ Set current_workspace_id = workspace.id
               └→ FAILURE → Log warning (non-fatal)
               
            ↓
            Return { ok: true, workspace, companyId }
            
      ↓
      Redirect to /dashboard (after 2s)

┌──────────────────────────┐
│ DASHBOARD (WORKSPACE SET)│
└──────────────────────────┘
   ↓
   User → /dashboard
      ↓ (app/dashboard/page.tsx)
      └→ Query workspace_members → Workspace found
         ├→ Display "Company Setup" as ✓ completed
         ├→ Show workspace name
         └→ Unlock "AI Inventory" step

┌──────────────────────────┐
│ AI INVENTORY             │
└──────────────────────────┘
   ↓
   User → Click "AI Inventory" (/inventory)
      ↓ (app/inventory/page.tsx)
      └→ GET /api/ai-systems
         ├→ Auth check: 401 if missing
         ├→ Workspace check: 409 if no workspace
         └→ Return ai_systems[] filtered by workspace_id
         
   ↓
   User → Add AI System (form)
      ↓
      └→ POST /api/ai-systems
         ├→ Validate: name required
         ├→ Resolve: workspace_id, company_id from workspace_members
         ├→ INSERT ai_systems(workspace_id, company_id, name, ...)
         └→ Return system record

┌──────────────────────────────────────────┐
│ EVIDENCE & OBLIGATIONS (API-FIRST)       │
└──────────────────────────────────────────┘
   ↓
   Application → POST /api/evidence
      ├→ Auth check: 401 if missing
      ├→ Workspace check: 409 if no workspace
      ├→ Company verification: 404 if not in workspace
      ├→ Obligation verification (optional): 404 if not found
      └→ INSERT evidence(company_id, workspace_id, obligation_id, title, ...)
      
   ↓
   Application → POST /api/obligations
      ├→ Auth check: 401 if missing
      ├→ Workspace check: 409 if no workspace
      ├→ Company verification: 404 if not in workspace
      └→ INSERT obligations(company_id, workspace_id, title, ...)

┌──────────────────────────┐
│ ASSESSMENT (NOT IMPL.)   │
└──────────────────────────┘
   ↓
   Blocked: No POST /api/assessment route
   Blocked: No GET /api/assessment route
   Status: "Coming soon" in dashboard UI

┌──────────────────────────┐
│ COMPLIANCE EXPORT        │
└──────────────────────────┘
   ↓
   Application → POST /api/export/compliance
      ├→ Auth check: 401 if missing
      ├→ Workspace check: 409 if no workspace
      ├→ Query: ai_system_detections, ai_bom_records, monitoring_alerts
      ├→ Calculate: discovery, documentation, security scores
      └→ Return compliance report (JSON/CSV)

┌──────────────────────────┐
│ LOGOUT                   │
└──────────────────────────┘
   ↓
   User → Click "Sign out" button
      ↓ (components/SignOutButton.tsx)
      └→ signOut() (lib/auth.ts)
         └→ supabase.auth.signOut()
            ├→ Clear JWT token
            ├→ Clear sb-* cookies
            └→ Session destroyed
            
      ↓
      Redirect to / (homepage, unauthenticated)

┌──────────────────────────────────────────┐
│ RE-LOGIN (PERSISTENCE)                   │
└──────────────────────────────────────────┘
   ↓
   User → Sign In
      ↓
      └→ signIn(email, password)
         └→ supabase.auth.signInWithPassword()
            ├→ Validate credentials
            ├→ CREATE new JWT
            ├→ SET new cookies
            └→ Session created
            
      ↓
      Redirect to /dashboard
      
      ↓ (app/dashboard/page.tsx)
      └→ Query workspace_members
         └→ Same workspace found (persisted in DB)
         └→ Display workspace info + inventory + systems
         
   ✓ User resumes with same workspace data
```

---

## SECTION 7: FINDINGS CLASSIFICATION

### **BLOCKER-1: Assessment Routes Not Implemented**

- **File/Line:** app/dashboard/page.tsx:165-180
- **Evidence:**
  - Dashboard shows "Risk Assessment" step (UI exists)
  - Step is visually disabled ("coming soon" message)
  - No `POST /api/assessment` endpoint found in codebase
  - No `GET /api/assessment` endpoint found in codebase
  - `risk_assessments` table exists (schema.sql) but no API routes
  
- **Impact:** BLOCKER for first customer
  - Governance assessment phase cannot be completed
  - Compliance scoring depends on risk assessment data
  - Customer onboarding stalled at step 3

- **Severity:** BLOCKER
- **Fix Required:** Implement `POST /api/assessment` to create risk assessment records

---

### **BLOCKER-2: Team Member Invitation Not Implemented**

- **File/Line:** app/dashboard/page.tsx:207-210
- **Evidence:**
  - Dashboard shows "Add team members" step (UI exists)
  - Step displays "coming soon" message
  - Grep search for "members" in app/api returned no POST endpoint
  - No `/api/workspace/{id}/members` or `/api/invite` found
  - `workspace_members` table exists but no create/update endpoint for team
  
- **Impact:** BLOCKER for multi-user workspaces
  - Customers cannot invite team members to collaborate
  - Only workspace owner can access systems
  - Team collaboration features are non-functional

- **Severity:** BLOCKER
- **Fix Required:** Implement `POST /api/workspace/{id}/members` or `/api/invitations`

---

### **CRITICAL-1: Workspace Creation Not Atomic**

- **File/Line:** app/api/workspace/route.ts:66-128
- **Issue:**
  - Step 1 (INSERT workspaces) succeeds → workspace.id obtained
  - Step 2 (INSERT workspace_members) fails → membership missing
  - User now has workspace but RLS filters all access → user stranded
  - No automatic rollback of step 1
  
- **Evidence:**
  - Three separate `.insert()` calls, no transaction wrapping
  - If step 2 fails, return 500 with error
  - Workspace record remains in database
  
- **Risk:** Customer cannot access their workspace after creation failure

- **Severity:** CRITICAL
- **Fix Required:** Use Supabase RPC to wrap all three inserts in a single transaction
  - If any step fails, rollback all
  - Or add explicit error recovery (check + cleanup)

---

### **CRITICAL-2: Profile Auto-Creation Failure Non-Fatal**

- **File/Line:** supabase/schema.sql:49-51 (handle_new_user trigger)
- **Issue:**
  ```sql
  exception when others then
    raise warning '...';  -- Log but don't fail
    return new;           -- Signup succeeds anyway
  ```
- **Risk:**
  - If trigger fails, profile row never created
  - Subsequent queries assume profile exists
  - getUser() queries return empty profile
  - API endpoints upsert to recover, but pattern is fragile
  
- **Severity:** CRITICAL (silent data inconsistency risk)
- **Mitigation:** Already mitigated by profile upsert in `/api/workspace`, but no validation that profile was created during signup

---

### **MAJOR-1: Workspace Creation Allows Duplicate Submissions**

- **File/Line:** app/api/workspace/route.ts:66-128
- **Issue:**
  - POST `/api/workspace` has no idempotency key
  - Submitting form twice creates two workspaces for same user
  - No unique constraint on (owner_id, companyName)
  
- **Evidence:**
  - Form submit button toggles `loading` state during request
  - No "already submitted" check
  - Multiple rapid clicks can bypass loading state (race condition)
  
- **Impact:** User accidentally creates duplicate workspaces (cosmetic but confusing)

- **Severity:** MAJOR
- **Fix Required:** 
  - Add UI-side form submission guard (disable button until response)
  - Server-side: check for existing workspace before insert, or use idempotency key
  - Or: Add unique constraint on (owner_id, company_name)

---

### **MAJOR-2: Current Workspace ID Not Enforced**

- **File/Line:** app/api/workspace/route.ts:132-136 (profiles upsert)
- **Issue:**
  - Profile stores `current_workspace_id`
  - RLS does NOT filter queries by this field
  - Workspace filtering relies on workspace_members table only
  - If profile.current_workspace_id becomes stale, no data loss but UX confusion
  
- **Impact:** Low-risk but architectural inconsistency
  - Frontend might display stale workspace ID in dropdown
  - Backend ignores it for RLS (correct behavior)
  - Potential for future confusion

- **Severity:** MAJOR (architectural)
- **Fix Required:**
  - Option A: Remove current_workspace_id from profiles (not needed if RLS filters by membership)
  - Option B: Enforce it via RLS view
  - Recommendation: Option A (simplify; use workspace_members as source of truth)

---

### **DOCUMENTATION-1: /api/workspace Not Documented**

- **File/Line:** docs/GOVERNANCE_API_REFERENCE.md (or missing from)
- **Issue:**
  - `/api/workspace` is critical for customer onboarding (creates workspace + ownership)
  - Not included in documented 17 customer-facing APIs
  - Endpoint is authenticated but not documented
  
- **Impact:** API reference incomplete; discrepancy between implementation and documentation

- **Severity:** DOCUMENTATION GAP
- **Fix Required:** Add `/api/workspace` to API reference with full spec

---

### **DOCUMENTATION-2: Assessment Routes Mentioned But Unimplemented**

- **File/Line:** app/dashboard/page.tsx:165-180, GOVERNANCE_API_REFERENCE.md
- **Issue:**
  - Dashboard UI lists Risk Assessment as step 3 ("coming soon")
  - Documentation may mention assessment endpoints
  - Backend routes do not exist
  
- **Impact:** Customer expectations misaligned with implementation

- **Severity:** DOCUMENTATION GAP
- **Fix Required:**
  - Either: Implement assessment routes (BLOCKER-1)
  - Or: Remove assessment UI from dashboard, update docs to note feature not yet available

---

### **EXPECTED ARCHITECTURE: Workspace Selection Not Implemented**

- **Observation:** Multi-workspace support is not in scope
  - User creates one workspace during onboarding
  - User cannot switch between workspaces
  - No workspace selector in UI
  - current_workspace_id on profile is hint-only
  
- **Status:** Documented as "coming soon"; not a blocker for first customer

---

## SECTION 8: NEXT ACTIONS

### Immediate (Before First Customer):

1. **FIX BLOCKER-1:** Implement assessment routes
   - POST /api/assessment (create)
   - GET /api/assessment (list)
   - Update dashboard UI to enable step

2. **FIX BLOCKER-2:** Implement team member invitation
   - POST /api/workspace/{id}/members (invite)
   - GET /api/workspace/{id}/members (list)
   - Update dashboard UI to enable step

3. **FIX CRITICAL-1:** Make workspace creation atomic
   - Use Supabase RPC or transaction wrapper
   - Test failure scenarios (simulate step 2 failure)

4. **FIX DOCUMENTATION-1:** Add /api/workspace to API reference

### Before Production:

5. **FIX MAJOR-1:** Add idempotency to workspace creation
   - Server-side check for duplicate workspace
   - Or: UI-side button disable guard

6. **REFACTOR MAJOR-2:** Remove current_workspace_id or enforce it
   - Simplify profiles table
   - Document workspace_members as source of truth

7. **ADD TESTS:**
   - Test successful end-to-end customer journey
   - Test workspace creation failure recovery
   - Test team member invitation
   - Test assessment creation

8. **DEPLOYMENT:** Verify all fixes in staging environment before production

---

**Trace Complete.** Ready for runtime verification in PHASE 2C.

