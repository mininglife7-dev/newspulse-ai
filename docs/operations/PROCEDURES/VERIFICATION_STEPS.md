# Verification Steps Procedure

**Type**: Procedure  
**Audience**: Release Engineers, QA, Product Managers, DevOps  
**Authority**: Governor Ω  
**Status**: Active  
**Last Updated**: 2026-07-16  
**Review Schedule**: After test strategy changes or quarterly  
**Owner**: Governor Ω

---

## Purpose

Standardized procedure for verifying code changes before deployment. Provides repeatable, systematic verification steps across functionality, performance, security, and user experience dimensions.

**When to use**: Before creating PR, before merging PR, before releasing to production  
**Success criteria**: All verification steps pass with signed-off results

---

## Quick Start (5 min)

New to verification? Follow this for common changes:

### Bug Fix
```
1. Reproduce original bug (confirm it exists)
2. Make code change
3. Verify fix resolves bug
4. Run: npm test && npm run lint && npm run type-check
5. Test related features don't break
6. Check for regressions (try main workflows)
```

### Feature Addition
```
1. Understand feature requirements
2. Write/update tests (test-driven preferred)
3. Implement feature
4. Test happy path (main workflow)
5. Test edge cases and errors
6. Run full suite: npm test && npm run type-check && npm run lint
7. Manual E2E test in browser
8. Verify no regressions
```

### Refactoring
```
1. Understand current behavior
2. Refactor code
3. Ensure tests still pass: npm test
4. Verify behavior unchanged: npm run test:e2e
5. Type-check: npm run type-check
6. No regressions in dependent code
```

---

## Verification Dimensions

Choose verification dimension based on change type:

| Change Type | Dimensions | Time |
|------------|-----------|------|
| Bug fix | Functionality, Regression | 10-15min |
| Feature | Functionality, Edge Cases, UX, Security | 20-30min |
| Performance | Perf, Functionality, Regression | 15-20min |
| Security | Security, Functionality, Regression | 15-25min |
| UI/UX | Functionality, UX, Accessibility, Regression | 20-30min |
| Refactor | Functionality, Regression, Perf | 10-20min |
| Database | Data Integrity, Performance, Rollback | 20-40min |
| API | Functionality, Security, Performance, Regression | 20-30min |

---

## Dimension 1: Functionality Verification (Core)

**Apply to**: All changes  
**Time**: 5-10 minutes per feature

### Happy Path Test
Test the main, expected workflow:

```
For feature "Link evidence to obligation":
1. Create workspace
2. Create AI system
3. Create assessment
4. Create obligation
5. Create evidence
6. Link evidence to obligation ← Main feature
7. Verify evidence appears in obligation detail
8. Verify link properties display correctly
```

**Verification checklist**:
- [ ] Feature works as described in requirements
- [ ] Main workflow completes without error
- [ ] Output/result is correct and meaningful
- [ ] UI updates to reflect action
- [ ] User receives success confirmation

### Required Field Testing
Test that required fields are validated:

```
For form "Create evidence":
1. Try to submit with blank title
   → Expected: Error message, form doesn't submit
2. Try to submit with blank obligation_id
   → Expected: Error message, form doesn't submit
3. Fill all required fields
   → Expected: Form submits successfully
```

**Verification checklist**:
- [ ] Required fields enforced
- [ ] Error messages clear and specific
- [ ] Form doesn't submit with invalid data

### State Transitions
Test state changes work correctly:

```
For evidence status: submitted → approved → completed

1. Create evidence with status: submitted
2. Update status to approved
   → Verify: Status changed, timestamp updated
3. Update status to completed
   → Verify: Status changed, cannot revert
4. Create another evidence, skip approval
   → Verify: Direct transition to completed allowed
```

**Verification checklist**:
- [ ] State transitions work as defined
- [ ] Invalid transitions rejected with error
- [ ] State history preserved (if applicable)

---

## Dimension 2: Edge Cases & Error Handling

**Apply to**: Most changes  
**Time**: 5-10 minutes per feature

### Boundary Conditions

Test limit cases:

```
For "Add systems to inventory":
1. Add 1 system (minimum)
   → Works ✓
2. Add 100 systems
   → List loads, search works, no slowdown
3. Add system with 1000-character description
   → Accepted, displays correctly, no truncation
4. Add system with special characters: é, ü, 中文, emoji
   → Stored and displayed correctly
```

**Verification checklist**:
- [ ] Minimum values work (1, empty, null)
- [ ] Maximum values handled (100, 10000, limits)
- [ ] Special characters handled correctly
- [ ] Unicode/emoji supported

### Error Cases

Test failure modes:

```
For API endpoint POST /api/obligations:
1. Missing required field: obligation_id
   → Returns 400 with error message
2. Invalid obligation_id (not UUID)
   → Returns 400 with validation error
3. Non-existent obligation_id
   → Returns 404 or 400
4. Unauthorized workspace
   → Returns 403 Forbidden
5. Database error (simulate)
   → Returns 500 with generic message (no details)
```

**Verification checklist**:
- [ ] Invalid input rejected with helpful message
- [ ] Missing required fields caught
- [ ] Out-of-range values rejected
- [ ] Authorization failures return 403
- [ ] Server errors don't leak sensitive info
- [ ] Error messages are user-friendly

### Empty/Null Handling

Test with no data:

```
For "List evidence for obligation":
1. Create obligation with no evidence
   → Displays empty state message
   → "No evidence yet" or similar
2. Query with empty results
   → Doesn't crash, shows empty list
3. Filter that returns no results
   → Shows "No results match filter"
```

**Verification checklist**:
- [ ] Empty states handled gracefully
- [ ] No crashes with null/undefined
- [ ] User-friendly empty messages
- [ ] Filters that return nothing work

---

## Dimension 3: Performance Verification

**Apply to**: Changes affecting queries, UI, or scale  
**Time**: 5-10 minutes

### Load Time

Test page speed:

```
1. Open DevTools (F12)
2. Go to Network tab
3. Clear cache (Ctrl+Shift+Del)
4. Reload page
5. Check Total load time
```

| Page | Target | Acceptable | Status |
|------|--------|-----------|--------|
| Login | <2s | <3s | |
| Workspace | <2s | <3s | |
| Inventory | <3s | <4s | |
| Assessment | <3s | <4s | |
| Evidence list | <3s | <4s | |

**If slow** (>acceptable):
- Check Network tab for slow requests
- Check which API calls are slow
- Profile backend queries
- Add index or optimize query

**Verification checklist**:
- [ ] Page loads within acceptable time
- [ ] No 404 or failed requests
- [ ] Assets cached (2nd load faster)
- [ ] No render-blocking scripts

### Database Query Performance

Test query speed:

```sql
-- New query to check
EXPLAIN ANALYZE 
SELECT * FROM evidence WHERE obligation_id = '...' LIMIT 10;

-- Check execution time and plan
```

**Targets**:
- Simple queries: <100ms
- Complex queries: <500ms
- Aggregations: <1000ms

**If slow**:
- Check EXPLAIN plan for table scans
- Add index on WHERE columns
- Consider query optimization
- Check for N+1 patterns

**Verification checklist**:
- [ ] Query execution time acceptable
- [ ] No full table scans (if avoidable)
- [ ] Index used if appropriate
- [ ] No missing WHERE clauses

### Memory/Resource Usage

Test for memory leaks:

```
1. Open DevTools → Memory tab
2. Take heap snapshot (baseline)
3. Use feature for 5 minutes (create, update, delete, navigate)
4. Take another heap snapshot
5. Compare: Memory should not grow significantly
```

**Verification checklist**:
- [ ] Memory stable (not growing)
- [ ] No event listener leaks
- [ ] Timers properly cleared
- [ ] Subscriptions cleaned up

---

## Dimension 4: Security Verification

**Apply to**: Changes handling auth, input, data, or external connections  
**Time**: 5-10 minutes

### Authentication

Test login security:

```
1. Try to access protected page without login
   → Redirects to /auth/login
2. Log in with valid credentials
   → Access granted
3. Log out
   → Session cleared, cannot access protected pages
4. Reuse old session token
   → Rejected (expired or revoked)
```

**Verification checklist**:
- [ ] Protected pages require login
- [ ] Expired sessions logged out
- [ ] Logout clears session
- [ ] Cannot reuse old tokens

### Authorization

Test role-based access:

```
For workspace with roles: Owner, Admin, Analyst, Viewer

1. Create obligation as Owner → Can create ✓
2. Update obligation as Admin → Can update ✓
3. Delete obligation as Analyst → Cannot delete ✓ (403)
4. View evidence as Viewer → Can view ✓
5. Edit evidence as Viewer → Cannot edit ✓ (403)
```

**Verification checklist**:
- [ ] Different roles see different options
- [ ] Unauthorized actions rejected (403)
- [ ] Cannot change own role
- [ ] Role changes take effect immediately

### Workspace Isolation

Test that workspaces are isolated:

```
1. As user in Workspace A:
   - Create AI system (ID: sys-123)
2. As user in Workspace B:
   - Try to access /api/systems/sys-123
   - Expected: 403 Forbidden or error
3. Try direct database query from B's token:
   - SELECT * FROM ai_systems WHERE id = 'sys-123'
   - Expected: No rows returned (RLS blocks)
```

**Verification checklist**:
- [ ] Cannot access other workspace's data
- [ ] RLS policies enforced
- [ ] No data leaks via API
- [ ] No data leaks via direct queries

### Input Validation

Test against injection attacks:

```
Test input: '; DROP TABLE evidence; --

1. Try in "System name" field
   → Should store as literal string (escaped)
   → Should NOT execute SQL
   → Verify: data stored unchanged, table not dropped

Test input: <img src=x onerror="alert('xss')">

2. Try in "Description" field
   → Should render as text or escaped
   → Should NOT execute JavaScript
   → Verify: no alert popup, HTML rendered as text

Test CSRF:
3. Check form includes CSRF token
   → Token present and unique per request
4. Make request without token
   → Request rejected (403 or error)
```

**Verification checklist**:
- [ ] SQL injection attempt blocked
- [ ] XSS attempt blocked/escaped
- [ ] CSRF tokens present
- [ ] Invalid tokens rejected

### Data Exposure

Test that sensitive data isn't leaked:

```
1. Check API responses
   → No passwords in response
   → No database IDs exposed unnecessarily
   → No internal implementation details in errors
   
2. Check error messages
   → Generic messages: "Invalid input"
   → NOT detailed: "Column 'obligation_id' must be UUID"
   
3. Check logs (if viewing)
   → No password values logged
   → No sensitive user data logged
   → Audit trail present for critical actions
```

**Verification checklist**:
- [ ] Passwords never in response
- [ ] Error messages generic (don't reveal structure)
- [ ] Sensitive data not logged
- [ ] Audit trail for critical operations

---

## Dimension 5: User Experience & Accessibility

**Apply to**: UI changes, forms, or public-facing features  
**Time**: 5-10 minutes

### UI Clarity

Test that UI is clear:

```
1. Buttons have clear labels
   → "Save" not "OK"
   → "Delete" not "Remove"
   
2. Forms show what's required
   → Asterisk (*) or label text: "required"
   
3. Instructions are clear
   → Example: "System name must be unique"
   → Not: "Validation error on field"
   
4. Success/error messages are clear
   → "Obligation created successfully"
   → Not: "201 Created"
```

**Verification checklist**:
- [ ] Labels are clear and specific
- [ ] Required fields marked
- [ ] Instructions are helpful
- [ ] Messages are user-friendly

### Keyboard Navigation

Test keyboard accessibility:

```
1. Open form
2. Press Tab repeatedly
   → Focus moves through all inputs
   → Focus visible (border or highlight)
3. Press Enter on button
   → Button activates (same as click)
4. Press Escape (if applicable)
   → Modal/dialog closes
5. Check for focus traps
   → Tab should cycle through form
   → Not get stuck in one field
```

**Verification checklist**:
- [ ] Tab order logical (top-to-bottom, left-to-right)
- [ ] Focus visible at all times
- [ ] Enter/Space activates buttons
- [ ] No focus traps
- [ ] Escape closes modals

### Screen Reader Testing

Test for accessibility:

```
1. Enable screen reader (Mac: VoiceOver, Windows: NVDA)
2. Navigate page with reader
   → Headings announced
   → Form labels read with inputs
   → Button purposes clear
   → Images have alt text
```

**Verification checklist**:
- [ ] Headings marked with `<h1-h6>` tags
- [ ] Form labels associated with inputs
- [ ] Buttons have text or aria-label
- [ ] Images have alt text
- [ ] Links have descriptive text

### Mobile Responsiveness

Test on mobile:

```
1. Open page on mobile device (or DevTools mobile view)
2. Check layout
   → No horizontal scroll
   → Text readable (not tiny)
   → Buttons large enough to tap
3. Test forms
   → Text fields full width
   → Select dropdowns work
   → Buttons easy to tap
4. Test navigation
   → Menu accessible on mobile
   → Can reach all content
```

**Verification checklist**:
- [ ] Layout responsive (no horizontal scroll)
- [ ] Touch targets ≥44x44px
- [ ] Text readable at mobile size
- [ ] Forms work on mobile
- [ ] Navigation accessible

---

## Dimension 6: Regression Testing

**Apply to**: All changes  
**Time**: 10-15 minutes

### Core Features Still Work

Test that unchanged features work:

```
For a change to "assessment" feature:

Test these unrelated features:
1. Login → Works ✓
2. Create workspace → Works ✓
3. Invite team member → Works ✓
4. Create AI system → Works ✓
5. View obligations → Works ✓
```

**How to test**:
1. Identify core workflows
2. Perform each workflow
3. Verify no errors
4. Check that data persists

**Verification checklist**:
- [ ] Login/logout works
- [ ] Workspace switching works
- [ ] Navigation works
- [ ] Other features not broken
- [ ] No new errors in console

### Related Features

Test features that use same code:

```
For change to "evidence" feature:

Test related features:
1. Create evidence → Works ✓
2. Update evidence status → Works ✓
3. Delete evidence → Works ✓
4. Link evidence to obligation → Works ✓
5. View evidence in list → Works ✓
6. Filter evidence → Works ✓
```

**Verification checklist**:
- [ ] Direct related features work
- [ ] Dependent features work
- [ ] No console errors
- [ ] No new warnings

### Browser Compatibility

Test in multiple browsers:

```
Minimum browsers to test:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

For each browser:
1. Open app
2. Login
3. Test main feature
4. Check console for errors
5. Check styling looks right
```

**Verification checklist**:
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works in Edge
- [ ] No significant style differences

---

## Dimension 7: Database Verification

**Apply to**: Changes affecting database schema, migrations, or queries  
**Time**: 10-20 minutes

### Migration Testing

Test database changes:

```
1. Backup database (if production-like)
2. Create schema change/migration
3. Test locally:
   npm run db reset  # Apply migrations
4. Verify schema changed correctly:
   \d table_name  # In psql, shows schema
5. Test with sample data:
   INSERT INTO table VALUES (...);
   SELECT * FROM table;
6. Verify old queries still work:
   SELECT * FROM unrelated_table;
```

**Verification checklist**:
- [ ] Migration syntax correct
- [ ] Schema changed as expected
- [ ] Constraints in place
- [ ] Indexes created
- [ ] Old queries still work
- [ ] RLS policies present

### Data Consistency

Test that data integrity is maintained:

```
1. Create test data
2. Run migration
3. Verify data:
   - No orphaned records
   - Foreign keys valid
   - Required fields populated
   - Constraints enforced
```

**Verification checklist**:
- [ ] No data lost
- [ ] Foreign key relationships valid
- [ ] Constraints enforced
- [ ] Indexes work correctly

### Rollback Capability

Test that migration is reversible:

```
1. Apply migration forward
2. Verify change applied
3. Create rollback migration
4. Test rollback:
   - Apply forward
   - Apply backward
   - Verify schema back to original
```

**Verification checklist**:
- [ ] Rollback migration created
- [ ] Rollback syntax correct
- [ ] Rollback tested locally
- [ ] Can restore previous schema

---

## Test Execution Checklist

Before marking verification complete:

- [ ] Run type-check: `npm run type-check`
  - Expected: 0 errors
  
- [ ] Run lint: `npm run lint`
  - Expected: 0 errors
  
- [ ] Run tests: `npm test`
  - Expected: All passing, >80% coverage lib/
  
- [ ] Run integration tests: `npm test:integration`
  - Expected: All passing
  
- [ ] Run E2E tests (if UI change): `npm run test:e2e`
  - Expected: All passing
  
- [ ] Run build: `npm run build`
  - Expected: Successful build, no errors

---

## Verification Report Template

Document your verification:

```
## Verification Report

**Change**: [Feature name or fix description]
**Branch**: [branch name]
**Commit**: [commit hash]

### Dimensions Tested
- [x] Functionality
- [x] Edge Cases
- [x] Security
- [ ] Performance (not applicable)
- [x] UX/Accessibility
- [x] Regressions
- [ ] Database (not applicable)

### Results Summary
**Status**: PASS ✓

All tests passing:
- npm test: ✓ (123 tests)
- npm run type-check: ✓ (0 errors)
- npm run lint: ✓ (0 errors)
- npm run test:e2e: ✓ (5 tests)

Manual testing:
- Happy path: ✓
- Edge cases: ✓
- Regressions: ✓

### Issues Found
None

### Verified By
[Your name]

### Date
[Date completed]
```

---

## Common Pitfalls

### "Works on my machine"

**Problem**: Change works locally but fails in production

**Solution**:
1. Test with production-like data
2. Test with production environment variables
3. Check for environment-specific code
4. Run tests: they catch this

### Forgot to test edge case

**Problem**: Bug discovered after deploy

**Solution**:
1. Use test-driven development
2. Write tests BEFORE code
3. Review test coverage
4. Think of 3 edge cases per feature

### No regression testing

**Problem**: Breaking change discovered later

**Solution**:
1. Always run full test suite
2. Manual smoke test of core features
3. Test related features
4. Check for console errors

### Skipped security checks

**Problem**: Injection vulnerability in production

**Solution**:
1. Always test auth/authorization
2. Always test input validation
3. Always check for data leaks
4. Never skip security dimension

---

## Quick Reference

| Task | Command | Expected |
|------|---------|----------|
| Type check | npm run type-check | 0 errors |
| Lint | npm run lint | 0 errors |
| Unit tests | npm test | All pass, >80% coverage |
| Integration | npm test:integration | All pass |
| E2E | npm run test:e2e | All pass |
| Build | npm run build | Success |
| Smoke | npm run test:smoke | All pass |

---

## Related Documents

- `TESTING_PROCEDURES.md` — How to run tests
- `GIT_WORKFLOW.md` — Commit and PR procedures
- `CHECKLISTS/PRE_DEPLOYMENT.md` — Pre-deployment verification
- `RUNBOOKS/RELEASE_VERIFICATION.md` — Release-specific verification

---

## Updated By

**Session**: Governor Ω (STAGE 4 Phase 4.2)  
**Date**: 2026-07-16  
**Changes**: Initial creation as part of STAGE 4 Phase 4.2 (Operational Knowledge)
