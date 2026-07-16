# EURO AI Friction Register
## Customer Experience & Product Quality Issues

**Created:** 2026-07-16  
**Last Updated:** 2026-07-16  
**Purpose:** Track, prioritize, and resolve customer friction points systematically  
**Governance:** Governor Directive + EURO AI Product Constitution Stage 1

---

## Alpha Customer Discovery Status

**Search Result:** No documented Alpha customer record was found in the available repository, CRM, configuration, or evidence reviewed during this discovery phase (institutional memory search across 10 dimensions: customer communications, CRM systems, customer register, support history, product documentation, structured logs, previous executive reports, engineering documentation, product analytics, decision registers).

**Evidence Gap Status:** This is an evidence gap, not proof of absence. When the first customer is signed, their identity and journey data will be documented in this register and in a separate `CUSTOMER_RECORDS.md` file.

**Impact:** Stage 1 execution focuses on removing known product friction before customer contact, based on code inspection and product testing.

---

## P0: LAUNCH BLOCKING

### P0-001: Assessment / Risk Scoring Workflow Not Implemented

**Status:** NOT STARTED  
**Owner:** Backend Engineer  
**Target Milestone:** Sprint Week 1 (Days 1-3)  
**Priority Rationale:** Blocks primary customer value proposition (compliance assessment)

---

#### Evidence

**Code Inspection (2026-07-15):**
- FIRST_CUSTOMER_JOURNEY_VERIFICATION.md lines 200-230: Comprehensive code trace confirms no POST /api/assessment route exists
- app/dashboard/page.tsx line 165-180: UI renders "Risk Assessment" step with disabled "coming soon" message
- Grep search: `grep -r "assessment" app/api/` returns zero route files for assessment
- Database schema exists: `risk_assessments` table defined in supabase/schema.sql (evidence: table has columns: id, workspace_id, ai_system_id, risk_level, documentation_score, security_score, created_at)
- API reference: docs/GOVERNANCE_API_REFERENCE.md lists assessment endpoints as "planned" but route files do not exist

**Test Coverage Gap:**
- 0 of 0 assessment tests exist (no test files for assessment workflow)
- 295/295 existing tests pass, but assessment coverage is zero

---

#### User Impact

**Severity:** BLOCKER  
**Scope:** 100% of new customers hitting onboarding flow  
**Failure Mode:** 
- Customer completes workspace setup (Step 2)
- Customer navigates to "Risk Assessment" (Step 3)
- UI displays "Coming soon" message
- Customer cannot proceed
- Compliance scoring unavailable
- Onboarding stalled

**Business Impact:** Revenue blocker — customer cannot use product core feature; likely churn on Day 1

---

#### Technical Root Cause

**Root Cause Chain:**
1. **Feature Planned, Not Implemented** — Product design includes assessment step; implementation was deferred
2. **Missing Route Handler** — No `app/api/assessment/route.ts` file created
3. **Missing API Logic** — POST handler would need to: validate request, check authorization, create risk_assessments record, calculate scores, return result
4. **Missing UI Integration** — Dashboard step enabled but form/workflow not built
5. **Missing Tests** — No test coverage for assessment creation, score calculation, role-based access

---

#### Engineering Remediation

**Approach:** Implement complete assessment workflow end-to-end

**Files to Create/Modify:**

| File | Action | Scope |
|------|--------|-------|
| `app/api/assessment/route.ts` | Create | POST (create assessment), GET (list assessments) |
| `app/api/assessment/[id]/route.ts` | Create | GET (detail), PATCH (update), DELETE (remove) |
| `app/dashboard/page.tsx` | Modify | Uncomment assessment step; enable form |
| `components/assessment-form.tsx` | Create | Risk assessment data entry form |
| `lib/assessment.ts` | Create | Score calculation logic |
| `tests/assessment.test.ts` | Create | Unit tests for score calculation |
| `tests/assessment-api.test.ts` | Create | API route tests (auth, validation, workspace isolation) |
| `docs/GOVERNANCE_API_REFERENCE.md` | Update | Document new assessment endpoints |

**Implementation Checklist:**

```typescript
POST /api/assessment {
  workspace_id: uuid;
  ai_system_id: uuid;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  assessment_date: ISO8601;
  findings: string[];
  mitigations: string[];
}
→ Returns: { ok: true, assessment: {...}, scores: { discovery, documentation, security } }
```

**Database Considerations:**
- Table `risk_assessments` exists; RLS policies must allow workspace members to create assessments
- Verify RLS: `SELECT * FROM risk_assessments WHERE workspace_id = <user-workspace>`

**Score Calculation Logic:**
- Discovery Score (0-100): Based on number of documented AI systems vs. expected
- Documentation Score (0-100): Based on completeness of governance documentation
- Security Score (0-100): Based on security controls identified in evidence

---

#### Acceptance Criteria

- [ ] POST /api/assessment returns 201 with assessment record on valid input
- [ ] GET /api/assessment returns array of assessments for user's workspace
- [ ] GET /api/assessment/:id returns single assessment detail
- [ ] Invalid workspace_id returns 403 (authorization check)
- [ ] Missing required fields return 400 with validation error
- [ ] Risk level must be one of: critical, high, medium, low (enum validation)
- [ ] Assessment can only be created by workspace owner or admin (role check)
- [ ] Dashboard "Risk Assessment" step is enabled (not "coming soon")
- [ ] Assessment form renders and submits successfully
- [ ] Score calculation produces values 0-100
- [ ] All scores are persisted and retrievable
- [ ] RLS isolates assessments by workspace (user cannot see other workspace assessments)

---

#### Verification Tests

**Unit Tests (lib/assessment.ts):**
```bash
npm test -- assessment.test.ts
✓ Discovery score calculation with 5 systems
✓ Documentation score with partial evidence
✓ Security score with no controls
✓ Score calculation bounds (0-100 range)
✓ Enum validation for risk_level
```

**API Tests (tests/assessment-api.test.ts):**
```bash
npm test -- assessment-api.test.ts
✓ POST /api/assessment creates record
✓ GET /api/assessment lists by workspace
✓ GET /api/assessment/:id returns detail
✓ 403 on unauthorized workspace access
✓ 400 on missing required fields
✓ 400 on invalid risk_level
✓ RLS prevents cross-workspace access
```

**E2E Tests (tests/assessment-e2e.test.ts):**
```bash
npx playwright test assessment-e2e.test.ts
✓ Create workspace → Add AI system → Create assessment → View score
✓ User A cannot see User B's assessments (RLS isolation)
```

**Regression Tests:**
```bash
npm test                    # All 295+ tests pass
npm run build               # Production build succeeds
npm run lint && tsc --noEmit # No type/lint errors
```

---

#### Status

**Current:** NOT STARTED  
**Blocked By:** None (ready to implement)  
**Depends On:** None (risk_assessments table exists)  
**Prerequisites Met:** ✓ Database schema ready, ✓ Auth system ready, ✓ RLS policies defined

---

#### Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Implementation | 12-15 hours | Route files, score logic, form component |
| Testing | 3-4 hours | Unit, API, E2E tests written and passing |
| Integration | 2 hours | Dashboard enabled, API reference updated |
| Verification | 1 hour | All acceptance criteria confirmed |
| **Total** | **18-22 hours** | **Assessment workflow production-ready** |

---

### P0-002: Team Member Invitation Not Implemented

**Status:** NOT STARTED  
**Owner:** Backend Engineer + Email Integration  
**Target Milestone:** Sprint Week 1-2 (Days 4-7)  
**Priority Rationale:** Enables multi-user collaboration (essential for enterprise sales)

---

#### Evidence

**Code Inspection (2026-07-15):**
- FIRST_CUSTOMER_JOURNEY_VERIFICATION.md lines 236-270: Comprehensive code trace confirms no POST endpoint for team member invitation
- app/dashboard/page.tsx line 207-210: UI renders "Add team members" step with "coming soon" message
- Grep search: `grep -r "members" app/api/` returns only GET /api/workspace/[id]/members (read-only, no POST)
- Grep search: `grep -r "invite" app/api/` returns zero routes
- Database schema exists: `workspace_members` table has columns: id, workspace_id, user_id, role, email, status (invited_at, joined_at timestamps available for invitation tracking)
- RLS policies exist for workspace_members read; write policies only checked for existing members

**Test Coverage Gap:**
- 0 of 0 team invitation tests exist
- Existing workspace_members.test.ts covers only read path, not create/invite path

---

#### User Impact

**Severity:** BLOCKER  
**Scope:** 100% of customers with team collaboration needs  
**Failure Mode:**
- Customer has workspace (multi-person company)
- Customer wants to add team members for collaborative compliance work
- UI shows "Add team members" (coming soon)
- Customer cannot invite team members
- Only workspace owner can access systems
- Team onboarding blocked

**Business Impact:** Adoption blocker for multi-person teams; enterprise customers will not adopt if sole-user limitation exists

---

#### Technical Root Cause

**Root Cause Chain:**
1. **Feature Planned, Not Implemented** — Multi-user collaboration designed; invitation system not built
2. **Missing POST Route** — No `app/api/workspace/[id]/members` POST handler
3. **Missing Email Integration** — No email sending on invitation creation
4. **Missing Invitation Status Tracking** — workspace_members.status field exists but not used for pending invitations
5. **Missing UI** — No team member form/list in dashboard
6. **Missing Tests** — No coverage for invitation flow

---

#### Engineering Remediation

**Approach:** Implement complete team invitation workflow (create invitation → send email → accept/reject → update membership)

**Files to Create/Modify:**

| File | Action | Scope |
|------|--------|-------|
| `app/api/workspace/[id]/members/route.ts` | Modify | Add POST (invite) to existing GET |
| `app/api/workspace/[id]/members/[memberId]/route.ts` | Create | PATCH (accept invite), DELETE (remove member) |
| `lib/email.ts` | Create | Email service (invite template, send) |
| `components/team-invite-form.tsx` | Create | Invite form component |
| `components/team-members-list.tsx` | Create | Team members & pending invitations list |
| `app/dashboard/page.tsx` | Modify | Add team invitation section |
| `tests/team-invitation.test.ts` | Create | Unit tests for invitation logic |
| `tests/team-invitation-api.test.ts` | Create | API route tests |
| `docs/GOVERNANCE_API_REFERENCE.md` | Update | Document invitation endpoints |

**Implementation Checklist:**

```typescript
POST /api/workspace/{id}/members {
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
}
→ Returns: { ok: true, invitation: {...}, message: "Invitation sent to email" }

PATCH /api/workspace/{id}/members/{memberId} {
  status: 'active' | 'removed';
}
→ Returns: { ok: true, member: {...} }
```

**Email Integration:**
- Template: Invitation email with acceptance link
- Link format: `/auth/confirm?type=invite&token={encrypted_token}`
- Acceptance: GET /auth/confirm exchanges token → updates workspace_members.status='active'

**Role-Based Access Control:**
- Only workspace owner/admin can invite (checked on POST)
- Invited users must accept before gaining access
- Role assignment during invitation (not at acceptance)

---

#### Acceptance Criteria

- [ ] POST /api/workspace/{id}/members creates pending invitation
- [ ] Invitation email sent with acceptance link
- [ ] Email contains clear action: "Accept this invitation to join [workspace]"
- [ ] Invalid email format returns 400
- [ ] Duplicate email (already member) returns 409
- [ ] Non-owner/admin cannot invite (403)
- [ ] GET /api/workspace/{id}/members includes pending invitations
- [ ] PATCH /api/workspace/{id}/members/{memberId} updates status
- [ ] Acceptance link is one-time use (invalidates after use)
- [ ] Dashboard shows team section with invite form + member list
- [ ] Invited users can reject invitation (DELETE endpoint)
- [ ] RLS prevents cross-workspace member access

---

#### Verification Tests

**Unit Tests:**
```bash
npm test -- team-invitation.test.ts
✓ Generate invitation token with expiry
✓ Validate invitation token before acceptance
✓ Role validation (owner|admin|member|viewer)
✓ Email address normalization
```

**API Tests:**
```bash
npm test -- team-invitation-api.test.ts
✓ POST /api/workspace/{id}/members creates pending invitation
✓ Invitation email sent successfully
✓ GET /api/workspace/{id}/members includes pending
✓ PATCH updates status to active
✓ 403 if user is not owner/admin
✓ 409 if user already member
✓ RLS prevents non-member access
```

**E2E Tests:**
```bash
npx playwright test team-invitation-e2e.test.ts
✓ Owner invites team member
✓ Invited user receives email with link
✓ Invited user accepts and gains access
✓ Member can see systems in workspace
✓ Viewer cannot create systems (role check)
```

---

#### Status

**Current:** NOT STARTED  
**Blocked By:** Email service integration (may use existing email lib or new integration)  
**Depends On:** None (workspace_members table ready)  
**Prerequisites Met:** ✓ Database schema ready, ✓ Auth system ready, ✓ RLS policies defined

---

#### Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Implementation | 16-18 hours | Route files, email integration, form components |
| Testing | 4-5 hours | Unit, API, E2E tests written and passing |
| Email Integration | 2-3 hours | Email template, sender configuration |
| Verification | 1 hour | All acceptance criteria confirmed |
| **Total** | **23-27 hours** | **Team invitation workflow production-ready** |

---

### P0-003: Workspace Creation Not Atomic

**Status:** NOT STARTED  
**Owner:** Backend Engineer (Database)  
**Target Milestone:** Sprint Week 1 (Day 2)  
**Priority Rationale:** Data consistency blocker; prevents customer data loss

---

#### Evidence

**Code Inspection (2026-07-15):**
- FIRST_CUSTOMER_JOURNEY_VERIFICATION.md lines 273-306: Detailed failure scenario documented
- app/api/workspace/route.ts lines 66-128: Three sequential `.insert()` calls without transaction wrapping
- Risk identified: If step 2 fails, workspace exists but membership missing → user stranded (RLS filters all queries)
- No idempotency key on POST; multiple submissions create duplicate workspaces

**Failure Scenario (Verified Possible):**
```
1. POST /api/workspace
2. Step 1 succeeds: workspace created with id=ws-123
3. Step 2 fails: workspace_members INSERT fails (constraint, network error)
4. Function returns 500 error
5. Workspace ws-123 exists in database
6. No membership row exists
7. User logs in, dashboard queries: 
   SELECT * FROM workspaces 
   WHERE id IN (
     SELECT workspace_id FROM workspace_members WHERE user_id=...
   )
8. Result: EMPTY (RLS filters out ws-123)
9. User sees empty dashboard, cannot access their workspace
10. Support intervention required (manual database cleanup)
```

**Test Coverage Gap:**
- 0 tests for workspace creation failure scenarios
- No test for partial failure recovery
- No idempotency tests

---

#### User Impact

**Severity:** CRITICAL  
**Scope:** ~1-5% of customers (failure during transient Supabase outages)  
**Failure Mode:**
- Customer creates workspace successfully (UI shows success message)
- Database partial failure occurs (100% transparent to user at first)
- User logs out, logs back in
- Dashboard empty: "Complete company setup" prompt appears
- Customer workspace data is inaccessible
- Support intervention required to recover

**Business Impact:** Lost trust in platform reliability; support burden; possible customer churn

---

#### Technical Root Cause

**Root Cause Chain:**
1. **Missing Transaction Boundary** — Three separate SQL inserts without rollback on failure
2. **Implicit Partial State** — If step 1 succeeds but step 2 fails, orphaned workspace exists
3. **Silent Failure** — No data loss from customer perspective (no partial data visible), but stranded account
4. **No Idempotency** — Rapid form re-submissions create duplicate workspaces (low impact but indicates lack of durability)
5. **No Error Recovery** — No automatic rollback or cleanup on failure

---

#### Engineering Remediation

**Approach:** Use Supabase RPC (stored procedure) to wrap all three inserts in single ACID transaction

**Files to Create/Modify:**

| File | Action | Scope |
|------|--------|-------|
| `supabase/functions/create_workspace.sql` | Create | RPC function wrapping inserts in transaction |
| `app/api/workspace/route.ts` | Modify | Replace three `.insert()` calls with single `.rpc()` call |
| `tests/workspace-creation.test.ts` | Create | Failure scenario tests |
| `tests/workspace-atomicity.test.ts` | Create | Transaction rollback tests |

**Implementation Checklist:**

```sql
CREATE OR REPLACE FUNCTION public.create_workspace(
  p_company_name TEXT,
  p_legal_name TEXT DEFAULT NULL,
  p_country TEXT,
  p_industry TEXT,
  p_description TEXT DEFAULT NULL,
  p_owner_id UUID
) RETURNS JSON AS $$
DECLARE
  v_workspace_id UUID;
  v_company_id UUID;
BEGIN
  -- All-or-nothing: if any step fails, entire transaction rolls back
  
  -- Step 1: Insert workspace
  INSERT INTO public.workspaces (slug, name, description, owner_id, status)
  VALUES (slugify(p_company_name), p_company_name, p_description, p_owner_id, 'active')
  RETURNING id INTO v_workspace_id;
  
  -- Step 2: Insert workspace membership
  INSERT INTO public.workspace_members (workspace_id, user_id, role, email, status, joined_at)
  VALUES (v_workspace_id, p_owner_id, 'owner', 
    (SELECT email FROM auth.users WHERE id = p_owner_id), 
    'active', NOW());
  
  -- Step 3: Insert company
  INSERT INTO public.companies (workspace_id, name, legal_name, country, industry, governance_priorities)
  VALUES (v_workspace_id, p_company_name, p_legal_name, p_country, p_industry, '{}'::jsonb)
  RETURNING id INTO v_company_id;
  
  -- Step 4: Upsert profile (non-critical)
  INSERT INTO public.profiles (id, email, current_workspace_id)
  VALUES (p_owner_id, (SELECT email FROM auth.users WHERE id = p_owner_id), v_workspace_id)
  ON CONFLICT (id) DO UPDATE SET current_workspace_id = v_workspace_id;
  
  -- Success: return both IDs
  RETURN json_build_object(
    'workspace_id', v_workspace_id,
    'company_id', v_company_id,
    'ok', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Backend Change (app/api/workspace/route.ts):**
```typescript
// OLD: Three separate inserts (non-atomic)
// NEW: Single RPC call (atomic)
const { data, error } = await supabase.rpc('create_workspace', {
  p_company_name: companyName,
  p_legal_name: legalName,
  p_country: country,
  p_industry: industry,
  p_description: description,
  p_owner_id: user.id
});

if (error) {
  // If RPC fails, NO records created (all-or-nothing)
  return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
}

// If RPC succeeds, all four records created atomically
return NextResponse.json({
  ok: true,
  workspace: { id: data.workspace_id },
  companyId: data.company_id
});
```

---

#### Acceptance Criteria

- [ ] POST /api/workspace creates all four records atomically
- [ ] If any step fails, entire transaction rolls back (no orphaned records)
- [ ] No workspace record exists without membership record
- [ ] RPC function returns workspace_id + company_id on success
- [ ] RPC function returns error message on failure
- [ ] Multiple rapid POSTs do not create duplicates (idempotency via unique constraint on (owner_id, slug))
- [ ] Workspace creation latency unchanged (RPC vs. sequential inserts)
- [ ] All 295+ existing tests still pass (regression test)
- [ ] New failure scenario tests confirm rollback behavior
- [ ] User cannot create workspace twice with same name (unique constraint enforced)

---

#### Verification Tests

**Unit Tests (Transaction Behavior):**
```bash
npm test -- workspace-atomicity.test.ts
✓ Simulate step 2 failure: workspace NOT created
✓ Simulate step 3 failure: workspace + membership NOT created
✓ Simulate network timeout: all inserts rolled back
✓ Success case: all four records created
```

**API Tests:**
```bash
npm test -- workspace-creation.test.ts
✓ POST /api/workspace returns 200 with IDs
✓ Workspace + membership + company + profile all created
✓ User cannot see other users' workspaces (RLS)
✓ Duplicate company name: second POST fails (unique constraint)
```

**E2E Tests (Complete Workflow):**
```bash
npx playwright test workspace-e2e.test.ts
✓ User creates workspace → all records created
✓ Simulate Supabase failure mid-transaction → workspace not created
✓ User logs out/in → workspace still accessible
```

**Regression Tests (Existing Tests):**
```bash
npm test                    # All 295+ tests pass
npm run build               # Production build succeeds
```

---

#### Status

**Current:** NOT STARTED  
**Blocked By:** None (ready to implement)  
**Depends On:** None (SQL standard, no external dependencies)  
**Prerequisites Met:** ✓ PostgreSQL transaction support available in Supabase, ✓ All four tables exist

---

#### Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| RPC Implementation | 4-5 hours | SQL function written, tested in SQL editor |
| Backend Integration | 2 hours | Replace three inserts with RPC call |
| Testing | 2-3 hours | Failure scenario tests + idempotency tests |
| Verification | 1 hour | All acceptance criteria confirmed |
| **Total** | **9-11 hours** | **Atomic workspace creation production-ready** |

---

## P1: HIGH PRIORITY (Non-Blocking)

*To be added in next friction discovery phase*

---

## Summary: Launch Readiness

| Blocker | Status | Fix Time | Est. Completion |
|---------|--------|----------|-----------------|
| P0-001: Assessment | NOT STARTED | 18-22h | After implementation + 2-day testing |
| P0-002: Team Invitation | NOT STARTED | 23-27h | After implementation + 2-day testing |
| P0-003: Atomic Workspace | NOT STARTED | 9-11h | After implementation + 1-day testing |
| **Total Engineering Effort** | — | **50-60h** | **~2 weeks (with parallel work)** |

**Critical Path:** P0-001 + P0-002 can be done in parallel (different systems). P0-003 should be done first (highest risk, lowest effort).

**Recommendation:** Fix in order:
1. **P0-003** (9-11h) — Eliminates data consistency risk immediately
2. **P0-001 + P0-002 in parallel** (18-22h + 23-27h = ~45h wall-clock with parallelization)

**Estimated Launch Readiness:** ~3 weeks from now (2 weeks engineering + 1 week Founder infrastructure setup + 1 week verification in staging)

---

**Friction Register Locked:** 2026-07-16 01:00 UTC  
**Next Update:** After P0-003 fix completion and verification  
**Owner:** Governor (Autonomous Execution)
