# Staging Validation Checklist

**Phase:** 3 - Runtime Verification  
**Prerequisites:** Supabase staging credentials required  
**Estimated Time:** 2-3 hours full validation  
**Tester Role:** QA/Product, with access to staging Supabase  

---

## Prerequisites

### Before Testing
- [ ] Obtain staging Supabase credentials (URL, anon key, service key)
- [ ] Update environment: `.env.local` with staging credentials
- [ ] Restart development server: `npm run dev`
- [ ] Verify database migrations are applied to staging DB
- [ ] Confirm preview deployment is accessible: [Vercel Preview](https://newspulse-ai-git-claude-euro-ai-9110f4-lalit-kumar-d-s-projects.vercel.app)

### Accounts Needed
- **User A:** Owner/founder (can create workspaces, invite members)
- **User B:** Regular member (tests invitation acceptance)
- **User C:** Admin role (tests admin-only actions)

---

## Test Group 1: Workspace Creation (BLOCKER-1 Fix)

### Test 1a: Atomic Workspace Creation
**Goal:** Verify workspace, membership, and company created atomically  
**Steps:**
1. Sign in as User A
2. Create workspace: name="TestCorp", country="US", industry="Tech"
3. Verify in Supabase:
   - `workspaces` table has 1 record
   - `workspace_members` has 1 record (User A, role=owner)
   - `companies` has 1 record matching workspace

**Expected:** All 3 records created in single atomic operation  
✅ **Pass / ❌ Fail / ⏸️ Blocked**

### Test 1b: Idempotency on Duplicate Submission
**Goal:** Verify no duplicate workspace if form re-submitted  
**Steps:**
1. Start workspace creation for "TestCorp"
2. Submit form twice rapidly (or retry on network timeout)
3. Verify only 1 workspace record created in DB
4. Response includes: `isDuplicate: true` on second submission

**Expected:** Single workspace, idempotent response on retry  
✅ **Pass / ❌ Fail / ⏸️ Blocked**

### Test 1c: Slug Generation with Special Characters
**Goal:** Verify slug handles Unicode/special chars safely  
**Steps:**
1. Create workspace: name="Müller & Söhne AG"
2. Verify slug generated: matches `/^muller-sohne-ag-[a-z0-9]{8}$/`
3. Confirm workspace accessible at slug URL

**Expected:** Slug is URL-safe and unique  
✅ **Pass / ❌ Fail / ⏸️ Blocked**

---

## Test Group 2: Team Member Invitation (BLOCKER-2 Fix)

### Test 2a: Owner Invites Member
**Goal:** Verify invitation creates pending membership record  
**Steps:**
1. Sign in as User A (owner)
2. Navigate to workspace members
3. Invite User B with email: `user-b@example.com`, role=member
4. Verify in DB:
   - New `workspace_members` record created
   - `status: 'pending'`, `role: 'member'`
   - `invited_at` timestamp set

**Expected:** Invitation created, User B can see pending invite  
✅ **Pass / ❌ Fail / ⏸️ Blocked**

### Test 2b: Invited User Accepts Invitation
**Goal:** Verify acceptance transitions membership to active  
**Steps:**
1. Sign in as User B
2. Navigate to invitations
3. Click "Accept invitation" for TestCorp workspace
4. Verify in DB:
   - Same membership record updated
   - `status: 'active'`, `joined_at` timestamp set
5. User B can now access workspace features

**Expected:** User B becomes active member, can access workspace  
✅ **Pass / ❌ Fail / ⏸️ Blocked**

### Test 2c: Owner Prevents Duplicate Invitations
**Goal:** Verify same email cannot be invited twice  
**Steps:**
1. User A attempts to invite same email again
2. System returns 409 Conflict
3. Error message: "already a member"

**Expected:** Duplicate invitation rejected with 409  
✅ **Pass / ❌ Fail / ⏸️ Blocked**

### Test 2d: Owner Can Remove Members
**Goal:** Verify remove action deletes membership  
**Steps:**
1. User A removes User B from workspace
2. User B sees "Access denied" when trying to view workspace
3. Verify in DB: membership record deleted

**Expected:** User B loses access immediately  
✅ **Pass / ❌ Fail / ⏸️ Blocked**

### Test 2e: Owner Cannot Remove Self
**Goal:** Verify self-removal is prevented  
**Steps:**
1. User A attempts to remove themselves from workspace
2. System returns 409 Conflict
3. Error message: "Cannot remove yourself"

**Expected:** Self-removal blocked, workspace remains accessible  
✅ **Pass / ❌ Fail / ⏸️ Blocked**

### Test 2f: Only Owner Can Change Roles
**Goal:** Verify role change restricted to owner  
**Steps:**
1. Invite User C with role=member
2. User A (owner) promotes User C to admin
3. User B (member) attempts to promote User C to owner
4. System returns 403 Forbidden

**Expected:** Only owner can change roles  
✅ **Pass / ❌ Fail / ⏸️ Blocked**

---

## Test Group 3: Assessment (CRITICAL Fix)

### Test 3a: Create Assessment in Workspace
**Goal:** Verify assessment scoped to workspace  
**Steps:**
1. Sign in as User A
2. Create assessment:
   - `ai_system_id`: (choose existing AI system)
   - `risk_level: high`
   - `risk_score: 75`
3. Verify in Supabase:
   - `risk_assessments` record created
   - `workspace_id` matches User A's workspace
   - `status: draft` (default)

**Expected:** Assessment created with correct workspace scope  
✅ **Pass / ❌ Fail / ⏸️ Blocked**

### Test 3b: List Assessments in Workspace
**Goal:** Verify user sees only their workspace's assessments  
**Steps:**
1. Sign in as User A
2. Open assessments list
3. Verify only assessments from TestCorp workspace shown
4. Create another workspace
5. Switch to new workspace
6. Verify assessments list is now empty

**Expected:** Assessment listing respects workspace isolation  
✅ **Pass / ❌ Fail / ⏸️ Blocked**

### Test 3c: Update Assessment Fields
**Goal:** Verify PATCH supports partial updates  
**Steps:**
1. Update assessment: `risk_level: low`, `status: finalized`
2. Verify `updated_at` timestamp changed
3. Verify other fields (risk_score, assessment_data) unchanged

**Expected:** Partial update succeeds without overwriting other fields  
✅ **Pass / ❌ Fail / ⏸️ Blocked**

### Test 3d: Delete Assessment
**Goal:** Verify assessment deletion works  
**Steps:**
1. Delete the assessment
2. Verify 404 when trying to fetch deleted assessment

**Expected:** Assessment deleted successfully  
✅ **Pass / ❌ Fail / ⏸️ Blocked**

---

## Test Group 4: Email Resend (BLOCKER-3 Fix)

### Test 4a: Resend Email on Verification Page
**Goal:** Verify email resend button works  
**Steps:**
1. Sign up new user (not verified yet)
2. Navigate to `/auth/verify-email`
3. Click "Resend verification email"
4. Observe loading state then success message
5. Check email for verification link

**Expected:** Email resent successfully, user can click link to verify  
✅ **Pass / ❌ Fail / ⏸️ Blocked**

### Test 4b: Resend Email Error Handling
**Goal:** Verify error feedback on failure  
**Steps:**
1. Attempt resend with invalid/malformed email
2. Observe error message displayed to user

**Expected:** Clear error message, user knows to retry or contact support  
✅ **Pass / ❌ Fail / ⏸️ Blocked**

---

## Test Group 5: Access Control (CRITICAL Fix)

### Test 5a: User Not in Workspace Cannot Access
**Goal:** Verify RLS prevents unauthorized access  
**Steps:**
1. Create workspaceA as User A
2. Create workspaceB as different user
3. Sign in as User A
4. Attempt to list members of workspaceB (direct URL/API)
5. Verify 403 Forbidden response

**Expected:** Access denied, error message shown  
✅ **Pass / ❌ Fail / ⏸️ Blocked**

### Test 5b: Non-Admin Cannot Invite Members
**Goal:** Verify only owner/admin can invite  
**Steps:**
1. User B (member) attempts to invite new user
2. System returns 403 Forbidden
3. Error message: "Only workspace owners/admins can invite"

**Expected:** Non-admin users cannot invite  
✅ **Pass / ❌ Fail / ⏸️ Blocked**

---

## Test Group 6: Timeouts & Resilience (CRITICAL Fix)

### Test 6a: Workspace Creation Completes Within Timeout
**Goal:** Verify 25s timeout guard works  
**Steps:**
1. Create workspace with normal network conditions
2. Verify completes in < 5 seconds
3. Response status: 200 OK

**Expected:** No timeout under normal conditions  
✅ **Pass / ❌ Fail / ⏸️ Blocked**

### Test 6b: Graceful Failure on Database Error
**Goal:** Verify error handling when DB fails  
**Steps:**
1. Simulate database error (or use failover)
2. Attempt workspace creation
3. Verify clear error message shown
4. Verify status: 500 or 503

**Expected:** User-friendly error, no blank screens  
✅ **Pass / ❌ Fail / ⏸️ Blocked**

---

## Test Group 7: TypeScript & Build (CRITICAL)

### Test 7a: Build Succeeds on Vercel
**Goal:** Verify no runtime errors in deployment  
**Steps:**
1. Check Vercel deployment status
2. Open preview URL
3. Navigate main flows without console errors

**Expected:** Application loads, no TypeScript errors in logs  
✅ **Pass / ❌ Fail / ⏸️ Blocked**

### Test 7b: Mobile Responsive
**Goal:** Verify UI works on mobile  
**Steps:**
1. Open preview on mobile device or in responsive mode
2. Test workspace creation flow
3. Test member invitation flow
4. Test assessment creation

**Expected:** All flows accessible on mobile  
✅ **Pass / ❌ Fail / ⏸️ Blocked**

---

## Stress Test Group (Optional, if time permits)

### Stress Test 1: Create Many Assessments
**Goal:** Verify list performance with 100+ assessments  
**Steps:**
1. Bulk create 100 assessments
2. Load assessment list
3. Measure load time, verify all visible

**Expected:** Performance acceptable (< 2s load), all items load  
✅ **Pass / ❌ Fail / ⏸️ Blocked**

### Stress Test 2: Large Team
**Goal:** Verify member list performance with 50+ members  
**Steps:**
1. Invite 50 users to workspace
2. Load member list
3. Measure load time

**Expected:** Performance acceptable (< 2s load)  
✅ **Pass / ❌ Fail / ⏸️ Blocked**

---

## Sign-Off

### Summary
- **Total Tests:** 20+ core tests, 2 optional stress tests
- **Estimated Duration:** 2-3 hours
- **Risk Level:** Low (all features production-ready per unit tests)

### Approval Criteria
- [ ] All core tests pass (groups 1-7)
- [ ] No production blocking issues found
- [ ] Error messages are clear and helpful
- [ ] Performance is acceptable (no 10s+ waits)
- [ ] Mobile experience is functional

### Failed Tests
*Document any failures below with reproduction steps:*

1. **Test:** _________________  
   **Issue:** _________________  
   **Reproduction:** _________________  
   **Impact:** Production / Non-blocking  

---

### Sign-Off
- [ ] **Tester Name:** ________________
- [ ] **Date:** ________________
- [ ] **Result:** ✅ All Pass / ⚠️ With Issues / ❌ Blocking Issues
- [ ] **Recommendation:** ✅ Ready for Production / ⏳ Needs Fixes / ❌ Not Ready

---

*Validation Checklist v1.0 — Generated 2026-07-15*  
*All features ready for production pending successful completion of above tests.*
