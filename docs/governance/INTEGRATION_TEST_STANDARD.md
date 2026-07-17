# Integration Test Standard

**Authority**: Governor Ω  
**Version**: 1.0  
**Effective**: 2026-07-16  
**Scope**: Customer journey testing, E2E verification, multi-service workflows

---

## Overview

Integration tests verify that components work together correctly across service boundaries (API routes, database, auth, external services). These tests are essential for catching issues that unit tests cannot.

**When to Write Integration Tests**:

- Customer workflows (signup → assessment → obligations → evidence)
- API routes that interact with database
- Auth flows (signup, signin, email verification)
- Multi-step operations (create assessment → generate obligations → link evidence)

**When NOT to Write Integration Tests**:

- Pure function logic (covered by unit tests)
- Single-operation API routes with no side effects
- UI interactions without data persistence

---

## 1. Test Environment Setup

### 1.1 Test Database

All integration tests run against a Supabase test instance:

- Separate database from production
- Migrations applied fresh for each test run
- Automatic cleanup between tests

**Configuration** (`vitest.config.ts`):

```typescript
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    env: {
      SUPABASE_URL: process.env.TEST_SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.TEST_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_KEY: process.env.TEST_SUPABASE_SERVICE_KEY,
    },
  },
});
```

**Setup** (`tests/setup.ts`):

```typescript
import { createClient } from '@supabase/supabase-js';
import { beforeAll, afterEach } from 'vitest';

const supabase = createClient(
  process.env.TEST_SUPABASE_URL!,
  process.env.TEST_SUPABASE_SERVICE_KEY!
);

beforeAll(async () => {
  // Run migrations
  // Seed base data
});

afterEach(async () => {
  // Clean up test data
  // Reset sequences
});
```

### 1.2 Test Users & Workspaces

Create reusable test fixtures:

```typescript
// tests/fixtures/users.ts
export const TEST_USERS = {
  founder: {
    email: 'founder@test.example.com',
    password: 'Test123!@#',
    id: 'user-founder-001',
  },
  admin: {
    email: 'admin@test.example.com',
    password: 'Test123!@#',
    id: 'user-admin-001',
  },
};

export const TEST_WORKSPACES = {
  default: {
    name: 'Test Workspace',
    id: 'ws-test-001',
    ownerId: TEST_USERS.founder.id,
  },
};
```

---

## 2. Integration Test Structure

### 2.1 File Organization

Tests live alongside source files:

```
lib/
├── risk-assessment.ts
├── risk-assessment.test.ts        # Unit tests
└── risk-assessment.integration.ts # Integration tests

app/api/assessments/
├── route.ts
└── route.integration.ts           # Integration test
```

### 2.2 Test Template

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRouteClient } from '@/lib/supabase-server';
import { TEST_USERS, TEST_WORKSPACES } from '../../fixtures';

describe('Assessment Journey', () => {
  let supabase: any;
  let workspaceId: string;
  let userId: string;

  beforeEach(async () => {
    // Setup: create test user, workspace, system
    supabase = await createRouteClient(TEST_USERS.founder);
    workspaceId = TEST_WORKSPACES.default.id;
    userId = TEST_USERS.founder.id;
  });

  afterEach(async () => {
    // Cleanup: remove test data
  });

  it('should create assessment and link obligations', async () => {
    // 1. Create AI system
    const system = await supabase
      .from('ai_systems')
      .insert({ name: 'Test System', workspace_id: workspaceId })
      .select()
      .single();

    // 2. Create assessment
    const assessment = await supabase
      .from('risk_assessments')
      .insert({
        ai_system_id: system.id,
        workspace_id: workspaceId,
        risk_level: 'high',
      })
      .select()
      .single();

    // 3. Verify obligations were created
    const obligations = await supabase
      .from('obligations')
      .select('*')
      .eq('workspace_id', workspaceId);

    expect(assessment).toBeDefined();
    expect(obligations.data?.length).toBeGreaterThan(0);
  });
});
```

---

## 3. Customer Journey Tests

### 3.1 Journey: Auth & Workspace Setup

**Path**: Signup → Email Verification → Workspace Creation → Team Invite

**Test Checklist**:

- [ ] User can sign up with email
- [ ] Verification email sent
- [ ] Verification link works
- [ ] User logged in after verification
- [ ] User can create workspace
- [ ] User can invite team members
- [ ] Invited user receives email
- [ ] Invited user can accept invitation

**Example**:

```typescript
describe('Auth & Workspace Setup Journey', () => {
  it('completes signup through workspace creation', async () => {
    // 1. Signup
    const { user } = await signUp('new@test.example.com', 'Password123!');
    expect(user).toBeDefined();

    // 2. Verify email
    const verificationToken = await getVerificationToken(user.id);
    await verifyEmail(verificationToken);

    // 3. Create workspace
    const workspace = await createWorkspace('My Company', user.id);
    expect(workspace.name).toBe('My Company');
    expect(workspace.owner_id).toBe(user.id);

    // 4. Invite team member
    const invitation = await inviteTeamMember(
      workspace.id,
      'team@test.example.com'
    );
    expect(invitation.status).toBe('pending');
  });
});
```

### 3.2 Journey: AI System Inventory

**Path**: Create System → Add Details → Assign Category → Verify

**Test Checklist**:

- [ ] User can create AI system
- [ ] System fields validated (name, vendor, type)
- [ ] System appears in inventory list
- [ ] User can update system details
- [ ] User can delete system
- [ ] Deletion cascades to assessments

**Example**:

```typescript
describe('AI System Inventory Journey', () => {
  it('manages system lifecycle', async () => {
    const system = await createAISystem({
      name: 'Fraud Detection',
      vendor: 'Acme Inc.',
      type: 'high-risk',
      description: 'Credit card fraud detection',
      workspace_id: workspaceId,
    });

    // Verify in list
    const systems = await listAISystems(workspaceId);
    expect(systems.map((s) => s.id)).toContain(system.id);

    // Update
    const updated = await updateAISystem(system.id, { name: 'Payment Fraud' });
    expect(updated.name).toBe('Payment Fraud');

    // Delete
    await deleteAISystem(system.id);
    const remaining = await listAISystems(workspaceId);
    expect(remaining.map((s) => s.id)).not.toContain(system.id);
  });
});
```

### 3.3 Journey: Risk Assessment

**Path**: Start Assessment → Answer Questions → Auto-Generate Obligations → Review

**Test Checklist**:

- [ ] Assessment created with draft status
- [ ] User can answer questions
- [ ] Questions conditional on prior answers
- [ ] Assessment risk level calculated correctly
- [ ] Obligations auto-generated based on risk
- [ ] Assessment can be finalized
- [ ] Finalized assessment cannot be edited

**Example**:

```typescript
describe('Risk Assessment Journey', () => {
  it('creates assessment and generates obligations', async () => {
    const system = await createTestSystem();

    // Start assessment
    const assessment = await createAssessment({
      ai_system_id: system.id,
      answers: {
        'q1-prohibited-biometric': true, // Prohibited indicator
      },
      status: 'draft',
    });

    expect(assessment.risk_level).toBe('unacceptable');

    // Verify obligations created
    const obligations = await getObligations(assessment.workspace_id);
    expect(obligations.length).toBeGreaterThan(0);
    expect(obligations[0].priority).toBe('critical');

    // Finalize
    const final = await finalizeAssessment(assessment.id);
    expect(final.status).toBe('finalized');

    // Cannot edit after finalized
    await expect(
      updateAssessment(assessment.id, { answers: {} })
    ).rejects.toThrow('Cannot edit finalized assessment');
  });
});
```

### 3.4 Journey: Evidence & Compliance

**Path**: Create Evidence → Link to Obligation → Track Remediation → Mark Complete

**Test Checklist**:

- [ ] User can upload evidence
- [ ] Evidence links to obligation
- [ ] Remediation plan created
- [ ] Remediation status tracked
- [ ] Compliance dashboard updated
- [ ] Evidence expiry tracked

**Example**:

```typescript
describe('Evidence & Compliance Journey', () => {
  it('tracks evidence through compliance cycle', async () => {
    const assessment = await createTestAssessment();
    const obligation = assessment.obligations[0];

    // Create evidence
    const evidence = await createEvidence({
      obligation_id: obligation.id,
      title: 'Privacy Policy v2.1',
      url: 'https://example.com/privacy',
      expires_at: '2027-01-01',
    });

    // Verify linked
    const linked = await getEvidenceForObligation(obligation.id);
    expect(linked.map((e) => e.id)).toContain(evidence.id);

    // Create remediation plan
    const plan = await createRemediationPlan({
      obligation_id: obligation.id,
      description: 'Update privacy policy',
      target_date: '2026-12-31',
    });

    // Mark progress
    await updateRemediationStatus(plan.id, 'in_progress');

    // Mark complete
    const completed = await completeRemediation(plan.id);
    expect(completed.status).toBe('complete');
  });
});
```

---

## 4. Error Scenario Tests

### 4.1 Required Error Paths

Every integration test must include error scenarios:

```typescript
describe('Assessment API - Error Cases', () => {
  it('rejects invalid risk level', async () => {
    await expect(
      createAssessment({
        ai_system_id: 'sys-123',
        risk_level: 'invalid-risk', // ❌ Invalid
      })
    ).rejects.toThrow('Invalid risk level');
  });

  it('rejects unauthenticated requests', async () => {
    const response = await fetch('/api/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({/* ... */}),
    });
    expect(response.status).toBe(401);
  });

  it('prevents cross-workspace access', async () => {
    const assessment = await createAssessmentInWorkspace(ws1.id);

    await expect(getAssessmentAs(assessment.id, ws2.user)).rejects.toThrow(
      'Not found'
    ); // User cannot see other workspace
  });
});
```

---

## 5. Coverage & Reporting

### 5.1 Coverage Targets

- **lib/**: 80%+ coverage
- **api routes/**: 70%+ coverage (with integration tests)
- **Auth/Security**: 100% coverage required
- **RLS Policies**: 100% coverage required

### 5.2 Running Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Coverage report
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### 5.3 Coverage Report Format

Coverage output must include:

- Line coverage percentage
- Branch coverage percentage
- Uncovered lines/branches
- Coverage trend vs. previous run

---

## 6. Performance Benchmarks

Integration tests should be <5 seconds each:

```typescript
it('should complete within 5 seconds', async () => {
  const start = performance.now();

  // Test workflow
  const result = await journeyStep();

  const duration = performance.now() - start;
  expect(duration).toBeLessThan(5000); // 5 seconds
});
```

---

## 7. CI/CD Integration

### 7.1 Pre-Push Enforcement

`.husky/pre-push`:

```bash
#!/bin/sh
echo "Running integration tests before push..."
npm run test:integration || exit 1
```

### 7.2 CI Pipeline

GitHub Actions (`.github/workflows/ci.yml`):

```yaml
- name: Run integration tests
  run: npm run test:integration
  timeout-minutes: 10
```

---

## 8. Test Data Management

### 8.1 Fixtures vs. Factories

**Fixtures**: Immutable test data

```typescript
export const FIXTURE_ASSESSMENT = {
  ai_system_id: 'sys-fixture-001',
  risk_level: 'high',
  status: 'draft',
};
```

**Factories**: Create fresh data for each test

```typescript
export async function createTestAssessment(overrides = {}) {
  const system = await createTestSystem();
  return createAssessment({
    ai_system_id: system.id,
    risk_level: 'high',
    ...overrides,
  });
}
```

### 8.2 Cleanup Strategy

Use `afterEach` for automatic cleanup:

```typescript
afterEach(async () => {
  // Delete in reverse dependency order
  await supabase.from('assessment_obligations').delete();
  await supabase.from('risk_assessments').delete();
  await supabase.from('ai_systems').delete();
});
```

---

## 9. Debugging Failed Tests

### 9.1 Verbose Logging

Enable detailed logs:

```bash
DEBUG=* npm run test:integration
```

### 9.2 Inspect Test Database

Connect to test DB manually:

```bash
npx supabase db push --remote-is-live
supabase db connect --local
```

### 9.3 Single Test Execution

```bash
npm test -- tests/api/assessments.integration.ts -t "creates assessment"
```

---

## References

- **Vitest Documentation**: https://vitest.dev/
- **Supabase Testing**: https://supabase.com/docs/guides/testing
- **React Testing Library**: https://testing-library.com/
- **Customer Journey Mapping**: docs/governance/CUSTOMER_JOURNEY.md

---

## Evolution

Integration test patterns will evolve as the codebase grows. Key milestones:

- STAGE 3 (current): Customer journey verification
- STAGE 6: Full E2E automation (Playwright)
- STAGE 8: Performance benchmarking

**Last Updated**: 2026-07-16 (STAGE 3 Phase 3.1)  
**Next Review**: Upon STAGE 3 Phase 3.3 completion (Integration Tests Implementation)
