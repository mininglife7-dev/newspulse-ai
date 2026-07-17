# Testing Patterns

This document establishes testing strategies and patterns for EURO AI.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Unit Tests](#unit-tests)
3. [Integration Tests](#integration-tests)
4. [End-to-End Tests](#end-to-end-tests)
5. [Test Coverage](#test-coverage)
6. [Mock & Fixture Patterns](#mock--fixture-patterns)
7. [Common Test Scenarios](#common-test-scenarios)

## Testing Philosophy

### Test Goals

- **Confidence**: Tests should verify behavior, not implementation
- **Maintenance**: Tests should be easy to update when behavior changes
- **Speed**: Tests should provide fast feedback
- **Isolation**: Each test should be independent

### Test Pyramid

```
          /\
         /E2E\           5-10 tests
        /----/\
       /Integration\     30-50 tests
      /----------/\
     /  Unit      \ 200-300 tests
    /____________/
```

## Unit Tests

### Test File Organization

```
lib/workspace/
├── service.ts
├── service.test.ts           # Unit tests for service
├── validation.ts
├── validation.test.ts        # Unit tests for validation
├── queries.ts
└── queries.test.ts           # Unit tests for queries
```

Collocate test files with source files using `.test.ts` suffix.

### Unit Test Structure

```typescript
// lib/workspace/service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createWorkspace, readWorkspace } from './service';
import * as queries from './queries';

// Mock the queries module
vi.mock('./queries');

describe('Workspace Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createWorkspace', () => {
    it('should create a workspace with valid input', async () => {
      const mockWorkspace = {
        id: 'ws-123',
        name: 'Test Workspace',
        description: null,
        created_at: '2026-07-16T10:00:00Z',
        updated_at: '2026-07-16T10:00:00Z',
      };

      vi.mocked(queries.insert).mockResolvedValue(mockWorkspace);

      const result = await createWorkspace('user-123', {
        name: 'Test Workspace',
      });

      expect(result).toEqual(mockWorkspace);
      expect(queries.insert).toHaveBeenCalledWith(
        expect.any(Object),
        'user-123',
        { name: 'Test Workspace' }
      );
    });

    it('should throw error if workspace creation fails', async () => {
      vi.mocked(queries.insert).mockResolvedValue(null);

      await expect(
        createWorkspace('user-123', { name: 'Test' })
      ).rejects.toThrow('Failed to create workspace');
    });

    it('should validate input before creating', async () => {
      await expect(createWorkspace('user-123', { name: '' })).rejects.toThrow(
        'Validation failed'
      );

      expect(queries.insert).not.toHaveBeenCalled();
    });
  });

  describe('readWorkspace', () => {
    it('should return workspace if found', async () => {
      const mockWorkspace = { id: 'ws-123', name: 'Test Workspace' };
      vi.mocked(queries.selectById).mockResolvedValue(mockWorkspace);

      const result = await readWorkspace('user-123', 'ws-123');

      expect(result).toEqual(mockWorkspace);
    });

    it('should throw error if workspace not found', async () => {
      vi.mocked(queries.selectById).mockResolvedValue(null);

      await expect(readWorkspace('user-123', 'ws-123')).rejects.toThrow(
        'Workspace not found'
      );
    });
  });
});
```

### Validation Unit Tests

```typescript
// lib/workspace/validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateWorkspaceInput } from './validation';

describe('Workspace Validation', () => {
  describe('validateWorkspaceInput', () => {
    it('should accept valid input', () => {
      const result = validateWorkspaceInput({
        name: 'Valid Workspace',
        description: 'A description',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject empty name', () => {
      const result = validateWorkspaceInput({ name: '' });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Name is required and must be non-empty');
    });

    it('should reject name exceeding max length', () => {
      const result = validateWorkspaceInput({
        name: 'x'.repeat(101),
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Name must be 100 characters or less');
    });

    it('should reject non-object input', () => {
      const result = validateWorkspaceInput('not an object');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Input must be an object');
    });

    it('should accept optional fields', () => {
      const result = validateWorkspaceInput({ name: 'Workspace' });

      expect(result.valid).toBe(true);
    });
  });
});
```

## Integration Tests

### Database Integration Tests

```typescript
// lib/workspace/__tests__/workspace.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@/lib/supabase/server';
import * as queries from '../queries';

describe('Workspace Queries Integration', () => {
  let supabase: any;
  let testUserId: string = 'test-user-id';

  beforeAll(async () => {
    supabase = await createClient();
    // Create test user context
  });

  afterAll(async () => {
    // Clean up test data
  });

  describe('insert', () => {
    it('should insert workspace and return created record', async () => {
      const input = {
        name: 'Integration Test Workspace',
        description: 'For testing',
      };

      const result = await queries.insert(supabase, testUserId, input);

      expect(result).toBeDefined();
      expect(result?.name).toBe(input.name);
      expect(result?.description).toBe(input.description);
      expect(result?.id).toBeDefined();
    });

    it('should enforce unique workspace names per user', async () => {
      const input = { name: 'Unique Name' };

      // First insert should succeed
      const first = await queries.insert(supabase, testUserId, input);
      expect(first).toBeDefined();

      // Second insert with same name should fail
      const second = await queries.insert(supabase, testUserId, input);
      expect(second).toBeNull();
    });
  });

  describe('selectById', () => {
    it('should retrieve workspace by ID', async () => {
      const created = await queries.insert(supabase, testUserId, {
        name: 'Retrieve Test',
      });

      if (!created) throw new Error('Failed to create workspace');

      const retrieved = await queries.selectById(
        supabase,
        testUserId,
        created.id
      );

      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Retrieve Test');
    });

    it('should not retrieve workspace from another user', async () => {
      const created = await queries.insert(supabase, 'user-a', {
        name: 'User A Workspace',
      });

      if (!created) throw new Error('Failed to create workspace');

      // RLS should prevent user-b from reading user-a's workspace
      const retrieved = await queries.selectById(
        supabase,
        'user-b',
        created.id
      );
      expect(retrieved).toBeNull();
    });
  });

  describe('update', () => {
    it('should update workspace fields', async () => {
      const created = await queries.insert(supabase, testUserId, {
        name: 'Original Name',
      });

      if (!created) throw new Error('Failed to create workspace');

      const updated = await queries.update(supabase, testUserId, created.id, {
        name: 'Updated Name',
      });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.id).toBe(created.id);
    });
  });

  describe('delete', () => {
    it('should delete workspace', async () => {
      const created = await queries.insert(supabase, testUserId, {
        name: 'To Delete',
      });

      if (!created) throw new Error('Failed to create workspace');

      const success = await queries.delete(supabase, testUserId, created.id);
      expect(success).toBe(true);

      // Verify deletion
      const retrieved = await queries.selectById(
        supabase,
        testUserId,
        created.id
      );
      expect(retrieved).toBeNull();
    });
  });
});
```

### API Route Integration Tests

```typescript
// app/api/workspace/__tests__/route.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { POST, GET } from '../route';
import { NextRequest } from 'next/server';

describe('Workspace API Routes Integration', () => {
  // Note: These tests would require setting up a test environment
  // with authenticated requests, which is complex with Next.js

  it('should list user workspaces', async () => {
    // This test requires:
    // 1. Authenticated session
    // 2. Test data setup
    // See E2E tests for comprehensive API testing
  });
});
```

## End-to-End Tests

### E2E Test Structure

```
e2e/
├── workspace.spec.ts          # Workspace features
├── assessment.spec.ts         # Assessment flow
├── compliance.spec.ts         # Compliance tracking
└── fixtures/
    ├── auth.ts                # Authentication helpers
    └── data.ts                # Test data generators
```

### E2E Test Example (Playwright)

```typescript
// e2e/workspace.spec.ts
import { test, expect } from '@playwright/test';
import { loginAs, cleanupUser } from './fixtures/auth';
import { createTestWorkspace } from './fixtures/data';

test.describe('Workspace Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'test-user@example.com');
  });

  test('user can create a workspace', async ({ page }) => {
    await page.goto('/workspace');
    await page.click('text=Create Workspace');

    // Fill form
    await page.fill('input[name="name"]', 'Test Workspace');
    await page.fill('textarea[name="description"]', 'Test description');

    // Submit
    await page.click('button:has-text("Create")');

    // Verify success
    await expect(page).toHaveURL(/\/workspace\/[^/]+$/);
    await expect(page.locator('h1')).toContainText('Test Workspace');
  });

  test('user can list workspaces', async ({ page }) => {
    await createTestWorkspace({ name: 'Workspace 1' });
    await createTestWorkspace({ name: 'Workspace 2' });

    await page.goto('/workspace');

    const workspaces = page.locator('[data-testid="workspace-card"]');
    await expect(workspaces).toHaveCount(2);
    await expect(workspaces.nth(0)).toContainText('Workspace 1');
    await expect(workspaces.nth(1)).toContainText('Workspace 2');
  });

  test('user can update workspace', async ({ page }) => {
    const workspace = await createTestWorkspace({ name: 'Original Name' });

    await page.goto(`/workspace/${workspace.id}/settings`);
    await page.fill('input[name="name"]', 'Updated Name');
    await page.click('button:has-text("Save")');

    await expect(page.locator('text=Updated successfully')).toBeVisible();
  });

  test('user can delete workspace', async ({ page }) => {
    const workspace = await createTestWorkspace({ name: 'To Delete' });

    await page.goto(`/workspace/${workspace.id}/settings`);
    await page.click('text=Delete Workspace');
    await page.click('button:has-text("Confirm")');

    await expect(page).toHaveURL('/workspace');
    await expect(page.locator('text=To Delete')).not.toBeVisible();
  });
});

test.describe('Workspace Access Control', () => {
  test('user cannot access other user workspace', async ({ page }) => {
    const workspace = await createTestWorkspace({
      name: 'Other User Workspace',
      ownedBy: 'other-user@example.com',
    });

    await loginAs(page, 'test-user@example.com');
    await page.goto(`/workspace/${workspace.id}`);

    await expect(page.locator('text=Access Denied')).toBeVisible();
  });

  test('workspace members can see shared workspace', async ({ page }) => {
    const workspace = await createTestWorkspace({ name: 'Shared' });
    await workspace.addMember('member@example.com', 'editor');

    await loginAs(page, 'member@example.com');
    await page.goto('/workspace');

    await expect(page.locator('text=Shared')).toBeVisible();
  });
});
```

### Authentication Fixtures

```typescript
// e2e/fixtures/auth.ts
import { Page } from '@playwright/test';

export async function loginAs(page: Page, email: string) {
  await page.goto('/auth/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'test-password-123');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('/workspace');
}

export async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('text=Sign Out');
  await page.waitForURL('/auth/login');
}

export async function cleanupUser(email: string) {
  // Make API call to delete test user account
  const response = await fetch('/api/test/cleanup', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  return response.ok;
}
```

## Test Coverage

### Coverage Targets

| Category         | Target                 |
| ---------------- | ---------------------- |
| Utilities        | 90%+                   |
| Library modules  | 85%+                   |
| API routes       | 80%+                   |
| React components | 70%+                   |
| E2E flows        | 100% of critical paths |

### Measuring Coverage

```bash
# Run tests with coverage report
npm run test -- --coverage

# Generate detailed report
npm run test -- --coverage --reporter=html
```

### Coverage Workflow

1. Write feature code
2. Write unit tests (target 80%+)
3. Run coverage: `npm run test -- --coverage`
4. Identify gaps: review uncovered lines
5. Add tests for critical paths, error cases
6. Iterate until target met

## Mock & Fixture Patterns

### Mocking Database Queries

```typescript
// lib/workspace/service.test.ts
import { vi } from 'vitest';
import * as queries from './queries';

vi.mock('./queries');

describe('with mocked queries', () => {
  it('calls queries with correct parameters', async () => {
    const mockWorkspace = { id: 'ws-1', name: 'Test' };
    vi.mocked(queries.insert).mockResolvedValue(mockWorkspace);

    const result = await createWorkspace('user-1', { name: 'Test' });

    expect(vi.mocked(queries.insert)).toHaveBeenCalledWith(
      expect.any(Object),
      'user-1',
      { name: 'Test' }
    );
  });
});
```

### Test Data Generators

```typescript
// lib/__tests__/fixtures/factories.ts
import { faker } from '@faker-js/faker';

export function createWorkspaceFixture(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.company.name(),
    description: faker.lorem.sentence(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

export function createAssessmentFixture(overrides = {}) {
  return {
    id: faker.string.uuid(),
    workspace_id: faker.string.uuid(),
    ai_system_id: faker.string.uuid(),
    status: 'completed' as const,
    risk_score: faker.number.int({ min: 0, max: 100 }),
    created_at: faker.date.past().toISOString(),
    ...overrides,
  };
}

// Usage in tests
const workspace = createWorkspaceFixture({ name: 'Custom Name' });
```

## Common Test Scenarios

### Testing Authorization

```typescript
describe('Authorization', () => {
  it('should return 403 if user lacks permission', async () => {
    const mockWorkspace = { id: 'ws-1', name: 'Test' };
    vi.mocked(queries.selectById).mockResolvedValue(mockWorkspace);
    vi.mocked(queries.getMember).mockResolvedValue(null);

    await expect(
      updateWorkspace('unauthorized-user', 'ws-1', { name: 'Updated' })
    ).rejects.toThrow('Access Denied');
  });
});
```

### Testing Error Cases

```typescript
describe('Error Handling', () => {
  it('should handle database connection errors gracefully', async () => {
    vi.mocked(queries.selectById).mockRejectedValue(
      new Error('Connection timeout')
    );

    await expect(readWorkspace('user-1', 'ws-1')).rejects.toThrow();
  });

  it('should validate input before database operations', async () => {
    await expect(createWorkspace('user-1', { name: '' })).rejects.toThrow(
      'Validation failed'
    );

    expect(queries.insert).not.toHaveBeenCalled();
  });
});
```

### Testing State Transitions

```typescript
describe('Assessment State Transitions', () => {
  it('should allow draft → in_progress transition', async () => {
    const assessment = createAssessmentFixture({ status: 'draft' });
    vi.mocked(queries.selectById).mockResolvedValue(assessment);

    const result = await updateAssessmentStatus(
      'user-1',
      assessment.id,
      'in_progress'
    );
    expect(result.status).toBe('in_progress');
  });

  it('should prevent invalid state transitions', async () => {
    const assessment = createAssessmentFixture({ status: 'completed' });
    vi.mocked(queries.selectById).mockResolvedValue(assessment);

    await expect(
      updateAssessmentStatus('user-1', assessment.id, 'draft')
    ).rejects.toThrow('Cannot transition from completed to draft');
  });
});
```
