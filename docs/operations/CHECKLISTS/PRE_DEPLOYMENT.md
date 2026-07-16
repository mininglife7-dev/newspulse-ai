# Pre-Deployment Verification Checklist

**Type**: Checklist  
**Audience**: Deployers, Code Authors  
**Authority**: Governor Ω  
**Status**: Active  
**Last Updated**: 2026-07-16  
**Review Schedule**: Before every deployment  
**Owner**: Governor Ω

---

## Purpose

Verify code meets quality standards and is safe to deploy to production before pushing changes. Use this checklist every time before merging code to `main`.

**When to use**: Before any `git push` to main or opening a PR for merge

**Time estimate**: 10-15 minutes

---

## Code Quality Verification

- [ ] **All changes committed**
  ```bash
  git status
  ```
  - No untracked files
  - No uncommitted changes
  - If files exist: `git add` then `git commit -m "..."`

- [ ] **Correct branch**
  ```bash
  git branch
  ```
  - You're on a feature branch (not `main`)
  - Branch name starts with `claude/` (convention)
  - If wrong: `git checkout <correct-branch>`

- [ ] **TypeScript strict mode passing**
  ```bash
  npm run type-check
  ```
  - No type errors (warnings are ok)
  - If fails: Fix type errors and re-run
  - Common: Remove `any` types, add proper interfaces

- [ ] **ESLint passing**
  ```bash
  npm run lint
  ```
  - No linting errors (warnings are ok)
  - If fails: Run `npm run format` to auto-fix, then re-run

- [ ] **Prettier formatting correct**
  ```bash
  npm run format
  git diff
  ```
  - Check diff is clean (no unexpected formatting changes)
  - If formatting changed: `git add .` and `git commit -am "style: prettier formatting"`

- [ ] **Unit tests passing**
  ```bash
  npm test
  ```
  - All unit tests pass (0 failures)
  - If fails: Debug with `npm test -- --watch` or read error message
  - New code should include tests (see ENGINEERING_STANDARDS.md)

- [ ] **E2E tests passing (if UI changed)**
  ```bash
  npm run test:e2e
  ```
  - If changed TypeScript files in `app/` (not `lib/`): Must run
  - If changed `lib/` only: E2E not required
  - If fails: Check test expectations match new behavior

- [ ] **No console.log/console.error statements**
  ```bash
  grep -r "console\." app/ lib/ --include="*.ts" --include="*.tsx"
  ```
  - If found: Replace with `logger.info()` or `logger.error()`
  - See ENGINEERING_STANDARDS.md for logger usage

- [ ] **No hardcoded secrets or credentials**
  ```bash
  git diff HEAD~1 HEAD
  ```
  - Review diff line by line
  - Check for: API keys, passwords, tokens, internal URLs
  - If found: Remove and use environment variables instead

---

## Feature & API Verification

- [ ] **If added new API endpoint**
  - [ ] Route follows ENGINEERING_STANDARDS.md pattern
  - [ ] Input validation using `validators` module
  - [ ] Proper error responses (400, 403, 404, 500)
  - [ ] RLS policies enforce workspace isolation (if database query)
  - [ ] Logged requests with logger module
  - [ ] Update `docs/engineering/API_REFERENCE.md`

- [ ] **If modified database**
  - [ ] Migration file created and tested
  - [ ] RLS policies reviewed and correct
  - [ ] Test data includes cross-workspace verification
  - [ ] Update `docs/engineering/DATABASE_SCHEMA.md`
  - [ ] Run migration on test database first

- [ ] **If modified React component**
  - [ ] Component is either Server Component or Client Component (explicit)
  - [ ] No `use client` directive unless needed
  - [ ] Props are properly typed (no `any`)
  - [ ] No direct database queries (use API route instead)
  - [ ] Accessibility: Interactive elements keyboard-accessible

- [ ] **If modified auth/security**
  - [ ] RLS policies reviewed by tech lead
  - [ ] No authentication bypass
  - [ ] No privilege escalation possible
  - [ ] Test: Cannot access other workspaces' data
  - [ ] Test: Cannot access data without proper role

- [ ] **If modified business logic**
  - [ ] Matches product requirements
  - [ ] Edge cases handled (empty lists, null values, etc.)
  - [ ] Error messages are user-friendly
  - [ ] Logging includes enough context to debug

---

## Test Coverage Verification

- [ ] **Unit tests for new functions**
  - Line coverage: >80% for lib/ code
  - Branch coverage: Key if/else paths tested
  - Error cases tested (not just happy path)

- [ ] **Integration tests for customer journeys** (if applicable)
  - Tests in `tests/*.integration.test.ts`
  - Workspace isolation verified
  - Error scenarios tested
  - See INTEGRATION_TEST_STANDARD.md

- [ ] **Manual smoke test on test database**
  - If added new feature: Manually test it works
  - If modified existing feature: Verify it still works
  - Check both success and error cases

---

## Documentation Verification

- [ ] **Code comments for non-obvious logic**
  - Complex algorithms: Explained in 1-2 line comments
  - Gotchas: Documented (e.g., "workspace isolation enforced here")
  - No comments for obvious code (bad: `// increment counter`, good: `// skip records from other workspaces`)

- [ ] **Commit messages are clear**
  ```bash
  git log --oneline -n 5
  ```
  - Each commit has a meaningful message
  - Format: `type: description` (see PROCEDURES/GIT_WORKFLOW.md)
  - Examples: `feat: add evidence linking`, `fix: validate assessment input`, `refactor: extract obligation logic`

- [ ] **PR description is complete** (if creating PR)
  - What changed: Brief summary
  - Why it changed: Context or issue reference
  - How to test: Steps to verify it works
  - References: Link to DECISION_LOG if major decision

- [ ] **Updated knowledge docs if needed**
  - API changed: Update `docs/engineering/API_REFERENCE.md`
  - Database changed: Update `docs/engineering/DATABASE_SCHEMA.md`
  - New pattern: Document in `docs/engineering/PATTERNS/`
  - Lessons learned: Add to `docs/lessons/LEARNING_LOG.md`

---

## Git Workflow Verification

- [ ] **Rebased on main (if main changed)**
  ```bash
  git fetch origin
  git rebase origin/main
  npm test  # Re-run tests after rebase
  ```
  - If conflicts: Resolve and continue
  - If tests fail: Debug and fix

- [ ] **Feature branch is clean**
  ```bash
  git log origin/main..HEAD --oneline
  ```
  - History is logical (not dozens of "fix" commits)
  - Consider squashing if >10 commits: `git rebase -i origin/main`

- [ ] **No merge commits in history**
  ```bash
  git log --oneline | grep -i merge
  ```
  - History should be linear (rebase instead of merge)
  - If merge commits present: Rebase to remove them

---

## Security Verification

- [ ] **No new dependencies without review**
  - Check `package.json` diff
  - Only known, trusted packages
  - If new: Scan with `npm audit`

- [ ] **Environment variables not logged**
  - Search code: No `console.log(process.env.*)`
  - Logger never includes secrets
  - Test: Run code and check no secrets in logs

- [ ] **CORS and CSP policies respected**
  - No new fetch() to untrusted domains
  - No inline scripts added
  - No eval() or Function() constructors

- [ ] **SQL injection prevention**
  - No string concatenation in SQL queries
  - Use parameterized queries: `supabase.from('table').select('*').eq('id', id)`
  - Never: `where "id" = '${id}'`

---

## Final Approval

Before committing to push:

- [ ] **All checks above: PASSED**
- [ ] **I understand the changes**: Can explain to another engineer
- [ ] **I would deploy this**: Comfortable with production impact
- [ ] **Ready for review**: PR description clear and complete

---

## If Any Check Fails

**Do not push to main.** Instead:

1. Identify the failure
2. Fix the issue locally
3. Re-run the check that failed
4. Once passing, proceed with deployment

**Example**:
- Type-check fails → Read error, fix, re-run `npm run type-check`
- Test fails → Debug in `npm test -- --watch`, fix, re-run
- Missing docs → Update docs, `git add`, `git commit`

---

## Next Steps

Once this checklist passes:

1. Follow `RUNBOOKS/DEPLOYMENT.md` to deploy
2. Complete `POST_DEPLOYMENT_VERIFICATION.md` after deploy
3. If issues: See `PROCEDURES/ROLLBACK.md`

---

## Related Documents

- `RUNBOOKS/DEPLOYMENT.md` — Full deployment procedure
- `docs/governance/ENGINEERING_STANDARDS.md` — Code quality standards
- `docs/governance/INTEGRATION_TEST_STANDARD.md` — Test standards
- `PROCEDURES/GIT_WORKFLOW.md` — Git conventions
- `docs/engineering/PATTERNS/` — Code patterns and examples

---

## Updated By

**Session**: Governor Ω (STAGE 4 Phase 4.2)  
**Date**: 2026-07-16  
**Changes**: Initial creation as part of STAGE 4 Phase 4.2 (Operational Knowledge)
