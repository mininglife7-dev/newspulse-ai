# Testing Procedures

**Type**: Procedure  
**Audience**: All Engineers, QA  
**Authority**: Governor Ω  
**Status**: Active  
**Last Updated**: 2026-07-16  
**Review Schedule**: After test strategy changes or quarterly  
**Owner**: Governor Ω

---

## Purpose

Standard procedures for running tests locally and in CI/CD pipeline. Ensures code quality and prevents regressions before deployment.

**Testing Philosophy**: Tests catch bugs early, enable confident refactoring, and document expected behavior.

---

## Test Types & When to Run

### Unit Tests (Fast)

**What**: Test individual functions/modules in isolation  
**Technology**: Vitest  
**Command**: `npm test`  
**Time**: <30 seconds  
**When to run**: After every code change  
**Coverage target**: >80% for lib/ modules

**Running**:
```bash
# Run all tests once
npm test

# Watch mode (re-run on file changes)
npm test -- --watch

# Run specific file
npm test -- evidence.test.ts

# Run with coverage report
npm test -- --coverage
```

**Example test structure**:
```typescript
describe('calculateRiskLevel', () => {
  it('should return HIGH for critical findings', () => {
    const risk = calculateRiskLevel([{ severity: 'critical' }])
    expect(risk).toBe('HIGH')
  })

  it('should return LOW when no findings', () => {
    const risk = calculateRiskLevel([])
    expect(risk).toBe('LOW')
  })
})
```

### Integration Tests (Slower)

**What**: Test customer journeys across multiple components  
**Technology**: Vitest + Supabase test database  
**Command**: `npm test:integration`  
**Time**: 1-2 minutes  
**When to run**: Before committing feature changes  
**Coverage target**: 4 core journeys (Auth, Inventory, Assessment, Evidence)

**Running**:
```bash
# Run all integration tests
npm test:integration

# Run specific journey
npm test:integration -- auth-workspace

# Watch mode
npm test:integration -- --watch
```

**Test database**: Uses Supabase test instance (separate from production)

### End-to-End Tests (Slowest)

**What**: Test UI flows in real browser  
**Technology**: Playwright  
**Command**: `npm run test:e2e`  
**Time**: 2-5 minutes  
**When to run**: If UI changed or before major deployments  
**Coverage target**: Happy path for critical flows

**Running**:
```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- auth.spec.ts

# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Debug mode (step through)
npm run test:e2e -- --debug
```

**Example E2E test**:
```typescript
test('should log in and navigate to inventory', async ({ page }) => {
  await page.goto('/')
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'password')
  await page.click('button:has-text("Log in")')
  await expect(page).toHaveURL('/workspace/inventory')
})
```

### Smoke Tests

**What**: Quick test that system is basically working  
**Technology**: curl + shell script  
**Command**: `npm run test:smoke`  
**Time**: <1 minute  
**When to run**: After deployments to verify service up  
**Coverage target**: Health endpoints, basic API routes

---

## Pre-Deployment Testing

**Before pushing to main**, run all tests locally:

```bash
# 1. Type check (catches TypeScript errors)
npm run type-check

# 2. Lint (code quality)
npm run lint

# 3. Unit tests (function-level correctness)
npm test

# 4. Integration tests (customer journey correctness)
npm test:integration

# 5. Format check
npm run format
```

**If any fails**: Don't push. Fix locally and re-run that test.

**Expected output**:
```
✓ npm run type-check (0 errors)
✓ npm run lint (0 errors)
✓ npm test (all passing)
✓ npm test:integration (all passing)
✓ npm run format (already formatted)
```

---

## Test-Driven Development (TDD)

Optional but recommended approach:

1. **Write failing test** for the feature you want
2. **Write minimal code** to make test pass
3. **Refactor** to clean up code
4. **Repeat** for next feature

**Example**:
```typescript
// STEP 1: Write failing test
it('should link evidence to obligation', () => {
  const evidence = createEvidence({ obligation_id: '123' })
  const obligation = getObligation('123')
  expect(obligation.evidence).toContain(evidence.id)
})

// STEP 2: Write minimal code to pass test
const evidence = db.insert('evidence', { obligation_id: '123' })
const obligation = db.select('obligations').where('id', '123')
// Add linking logic...

// STEP 3: Refactor to clean code
// Extract logic to lib/evidence.ts
// Improve error handling
// Add more test cases

// STEP 4: Repeat for next feature
```

---

## Test Coverage Targets

**Library code** (`lib/`): >80%  
**API routes** (`app/api/`): >90% (critical for reliability)  
**UI components** (`app/`): >70% (some UI testing is expensive)

**Check coverage**:
```bash
npm test -- --coverage
```

Output shows:
- Statements: What % of code executed by tests
- Branches: What % of if/else paths tested
- Functions: What % of functions called by tests
- Lines: What % of lines executed

---

## Common Test Patterns

### Testing API Routes

```typescript
import { POST } from '@/app/api/evidence/route'

it('should create evidence', async () => {
  const request = new Request('...', {
    method: 'POST',
    body: JSON.stringify({
      obligation_id: '123',
      title: 'Evidence 1'
    })
  })
  
  const response = await POST(request)
  expect(response.status).toBe(201)
})
```

### Testing Database Queries

```typescript
it('should fetch evidence by obligation', async () => {
  const obligation = await createTestObligation(workspaceId)
  const evidence = await createTestEvidence(workspaceId, obligation.id)
  
  const fetched = await listEvidenceForObligation(obligation.id)
  expect(fetched.map(e => e.id)).toContain(evidence.id)
})
```

### Testing with Fixtures

```typescript
it('should update evidence status', async () => {
  const obligation = await createTestObligation(workspaceId)
  const evidence = await createTestEvidence(workspaceId, obligation.id)
  
  // Use fixture factory to create test data
  const updated = await updateEvidence(evidence.id, { status: 'approved' })
  
  expect(updated.status).toBe('approved')
})
```

### Testing Error Cases

```typescript
it('should reject invalid obligation_id', async () => {
  const response = await POST(new Request('...', {
    body: JSON.stringify({
      obligation_id: null,  // Invalid
      title: 'Evidence'
    })
  }))
  
  expect(response.status).toBe(400)
  const error = await response.json()
  expect(error.error).toBe('obligation_id required')
})
```

---

## Debugging Failing Tests

### Reading Error Messages

**Type mismatch**:
```
Expected: string
Received: undefined
```
→ Check: Return value, null checks, optional fields

**Assertion failed**:
```
expect(5).toBe(6)
```
→ Check: Logic in code, test expectations, data setup

**Timeout**:
```
error: timeout of 5000 ms exceeded
```
→ Check: Async operations, database connections, network

### Debug Strategies

**Add console.log**:
```typescript
it('should calculate risk', () => {
  const risk = calculateRiskLevel([...])
  console.log('Risk result:', risk)  // See actual value
  expect(risk).toBe('HIGH')
})
```

**Run single test**:
```bash
npm test -- --t "should calculate risk"  # Only run this test
```

**Watch mode**:
```bash
npm test -- --watch  # Re-run on file change, good for iterating
```

**Add breakpoint** (VS Code):
```bash
# Run with debugger
node --inspect-brk ./node_modules/.bin/vitest run
# Open chrome://inspect in browser
```

---

## Test Data & Fixtures

**Location**: `tests/fixtures.ts`

**Available factories**:
- `createTestWorkspace()` — Create test workspace
- `createTestAISystem()` — Create test AI system
- `createTestAssessment()` — Create test assessment
- `createTestObligation()` — Create test obligation
- `createTestEvidence()` — Create test evidence

**Cleanup**: Tests automatically cleanup test data after running

**Example**:
```typescript
it('should work', async () => {
  const workspace = await createTestWorkspace(userId)
  const system = await createTestAISystem(workspace.id)
  
  // Test your code
  
  // Cleanup happens automatically in afterEach
})
```

---

## CI/CD Testing

GitHub Actions automatically runs tests on every push:

1. **On PR creation**: Runs tests, lint, type-check
2. **Before merge**: Must pass all checks
3. **On main push**: Runs full test suite + builds

**Locally simulate CI**:
```bash
npm run lint && npm run type-check && npm test
```

**View CI results**: GitHub PR status checks

---

## Test Maintenance

### Keep Tests Current

- When code changes, update related tests
- When tests fail: Debug before ignoring
- Remove obsolete tests (code that was deleted)

### Improve Test Coverage

If test coverage drops:
1. Identify untested code: `npm test -- --coverage`
2. Write tests for important functions
3. Verify tests actually test (not just "touching" code)

### Test Review

During code review:
- Do tests match the feature?
- Are edge cases tested?
- Is error handling tested?
- Is test code clean (not duplicating logic)?

---

## Quick Reference

| Command | What It Does | Time |
|---------|-------------|------|
| `npm test` | Run unit tests | <30s |
| `npm test -- --watch` | Watch mode | Continuous |
| `npm test:integration` | Integration tests | 1-2m |
| `npm run test:e2e` | End-to-end tests | 2-5m |
| `npm run test:smoke` | Smoke tests | <1m |
| `npm run type-check` | TypeScript check | <30s |
| `npm run lint` | ESLint check | <30s |

---

## Related Documents

- `CHECKLISTS/PRE_DEPLOYMENT.md` — Testing requirements before deployment
- `docs/governance/ENGINEERING_STANDARDS.md` — Testing standards and expectations
- `docs/governance/INTEGRATION_TEST_STANDARD.md` — Integration test specification
- `docs/engineering/PATTERNS/TESTING_PATTERNS.md` — Testing patterns and examples

---

## Updated By

**Session**: Governor Ω (STAGE 4 Phase 4.2)  
**Date**: 2026-07-16  
**Changes**: Initial creation as part of STAGE 4 Phase 4.2 (Operational Knowledge)
