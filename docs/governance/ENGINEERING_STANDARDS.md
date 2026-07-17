# Engineering Standards

**Authority**: Governor Ω  
**Version**: 1.0  
**Effective**: 2026-07-16  
**Scope**: EURO AI Platform (app/, api/, lib/)

---

## Overview

These standards establish baseline expectations for code quality, structure, and maintainability across the EURO AI codebase. All code must meet these standards before merging.

**Core Principles**:

1. **TypeScript Strict** — No `any`, no implicit types, full coverage
2. **Clear Intent** — Code names and structure should be self-documenting
3. **Error Handling** — All error paths handled explicitly (no silent failures)
4. **Testing** — Unit tests for logic, integration tests for workflows
5. **Security** — Validate at boundaries, enforce RLS, prevent open redirects

---

## 1. TypeScript & Code Style

### 1.1 Type Annotations

All functions must have explicit parameter and return types.

**✅ GOOD**:

```typescript
async function validateRiskLevel(level: string): Promise<RiskLevel | null> {
  const valid = ['unacceptable', 'high', 'medium', 'low'];
  return valid.includes(level) ? (level as RiskLevel) : null;
}
```

**❌ BAD**:

```typescript
async function validateRiskLevel(level: any) {
  const valid = ['unacceptable', 'high', 'medium', 'low'];
  return valid.includes(level) ? level : null;
}
```

### 1.2 Interface Definitions

Define interfaces at the top of the file, grouped by concern.

**✅ GOOD**:

```typescript
// Request/Response types
interface CreateAssessmentRequest {
  aiSystemId: string;
  answers: Record<string, unknown>;
  status?: 'draft' | 'in_review' | 'finalized';
}

// Domain types
interface RiskAssessmentResult {
  riskLevel: RiskLevel;
  riskScore: number;
  reasoning: string[];
}
```

### 1.3 Variable Naming

Use descriptive names that express intent.

**✅ GOOD**:

```typescript
const workspaceId = await resolveWorkspaceContext(supabase);
const isCriticalRisk = assessment.riskLevel === 'unacceptable';
const affectedCategories = result.categories.filter((c) => c.isHighRisk);
```

**❌ BAD**:

```typescript
const wid = await resolveWorkspaceContext(supabase);
const cr = assessment.riskLevel === 'unacceptable';
const ac = result.categories.filter((c) => c.hr);
```

### 1.4 Comments

No comments explaining WHAT — code should be clear. Comments explain WHY.

**✅ GOOD**:

```typescript
// Security: only allow same-origin redirects to prevent open-redirect
const redirect = safeRedirectPath(searchParams.get('redirect'));
```

**❌ BAD**:

```typescript
// Get the redirect parameter
const redirect = searchParams.get('redirect');
```

### 1.5 ESLint & Prettier

All code must pass `npm run lint` and `npm run format`.

- ESLint: strict configuration
- Prettier: enforced on save
- No `// eslint-disable` comments without explicit justification in the code

---

## 2. API Routes (REST Endpoints)

### 2.1 Route Structure

Each endpoint file (`route.ts`) must:

1. Define request/response types
2. Export `runtime` and `dynamic` for Next.js
3. Have JSDoc for each handler
4. Resolve context (auth, workspace)
5. Handle errors consistently

**✅ GOOD**:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

interface CreateSystemRequest {
  name: string;
  systemType: string;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/ai-systems — list workspace systems or fetch by ID.
 * Query: ?id=<systemId> (optional)
 */
export async function GET(request: NextRequest) {
  const supabase = await createRouteClient();
  const ctx = await resolveWorkspaceContext(supabase);

  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  // ... implementation
}
```

### 2.2 Error Handling

All errors must:

1. Be logged (for ops visibility)
2. Return appropriate HTTP status codes
3. Include user-friendly error messages (never leak internals)

**✅ GOOD**:

```typescript
try {
  const { data, error } = await supabase.from('ai_systems').select('*');
  if (error) throw error;
  return NextResponse.json({ ok: true, systems: data });
} catch (err) {
  logger.error('Failed to list systems', 'AI_SYSTEMS_LIST_ERROR', err);
  return NextResponse.json(
    { ok: false, error: 'Could not load systems' },
    { status: 500 }
  );
}
```

### 2.3 Input Validation

Validate all user input at the route boundary.

**✅ GOOD**:

```typescript
export async function POST(request: NextRequest) {
  let body: CreateSystemRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (!body.name?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'name is required' },
      { status: 400 }
    );
  }

  // ... proceed with validated input
}
```

### 2.4 Response Format

All responses must follow a consistent shape:

- `ok: boolean` — success indicator
- `data?: T` — payload on success
- `error?: string` — human-readable error on failure
- HTTP status codes: 200 (success), 400 (bad input), 401 (auth), 403 (permission), 404 (not found), 500 (server error)

**✅ GOOD**:

```typescript
// Success
NextResponse.json({ ok: true, system }, { status: 200 });

// Bad input
NextResponse.json({ ok: false, error: 'Invalid system ID' }, { status: 400 });

// Auth error
NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
```

---

## 3. Library & Domain Logic

### 3.1 Module Organization

Domain logic lives in `lib/` organized by concern, not by operation.

**✅ GOOD**:

```
lib/
├── risk-assessment.ts       # Risk classification engine
├── obligations.ts           # Obligation generation & retrieval
├── auth.ts                  # Auth helpers
├── supabase-server.ts       # Server-side Supabase client
└── api-auth.ts              # API route auth middleware
```

**❌ BAD**:

```
lib/
├── create.ts                # Operations grouped by action
├── update.ts
├── delete.ts
└── fetch.ts
```

### 3.2 Pure Functions vs Side Effects

Logic should be pure (no side effects) when possible.

**✅ GOOD**:

```typescript
// Pure: no side effects, testable
export function classifyRisk(answers: Map<string, unknown>): RiskLevel {
  const prohibitedCount = answers.size;
  return prohibitedCount > 0 ? 'unacceptable' : 'low';
}

// Side effect: clearly marked as such
export async function saveAssessment(data: AssessmentResult): Promise<void> {
  const supabase = await getSupabaseAdmin();
  await supabase.from('risk_assessments').insert(data);
}
```

### 3.3 Error Handling in Libraries

Libraries should throw meaningful errors, not return null.

**✅ GOOD**:

```typescript
export function getRiskLevel(level: string): RiskLevel {
  const valid = ['unacceptable', 'high', 'medium', 'low'];
  if (!valid.includes(level)) {
    throw new Error(`Invalid risk level: ${level}`);
  }
  return level as RiskLevel;
}
```

**❌ BAD**:

```typescript
export function getRiskLevel(level: string): RiskLevel | null {
  const valid = ['unacceptable', 'high', 'medium', 'low'];
  return valid.includes(level) ? (level as RiskLevel) : null;
}
```

---

## 4. React Components & Pages

### 4.1 Server vs Client Components

- Server components (default) for data fetching, auth checks
- Client components (`'use client'`) only for interactivity, state, hooks
- Keep client component surface area minimal

**✅ GOOD**:

```typescript
// Server component — no 'use client'
export default async function AssessmentPage({ params }: Props) {
  const assessment = await fetchAssessment(params.id);
  return (
    <AssessmentDetail assessment={assessment}>
      <InteractiveForm />  {/* Client component for form handling */}
    </AssessmentDetail>
  );
}

// Client component
'use client';

export function InteractiveForm() {
  const [loading, setLoading] = useState(false);
  // ... state and handlers
}
```

### 4.2 Hook Usage

Use hooks correctly:

- `useState` for component-local state only
- `useEffect` with dependency array
- `useCallback` for stable function references in lists
- No unlimited dependency array

**✅ GOOD**:

```typescript
const [formData, setFormData] = useState({ email: '', password: '' });
const [error, setError] = useState<string | null>(null);

const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  setFormData((prev) => ({ ...prev, [name]: value }));
}, []);

useEffect(() => {
  // Cleanup function
  return () => {
    // cleanup
  };
}, [dependency]); // Explicit dependency array
```

### 4.3 Error Boundaries

Components handling async data must have error boundaries.

**✅ GOOD**:

```typescript
'use client';

import { useEffect, useState } from 'react';

export function AssessmentList() {
  const [data, setData] = useState(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAssessments()
      .then(setData)
      .catch(err => setError(err.message));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!data) return <Skeleton />;
  return <div>{/* render data */}</div>;
}
```

---

## 5. Database & Supabase

### 5.1 RLS (Row Level Security)

All queries through Supabase must respect RLS. Never bypass RLS.

**✅ GOOD**:

```typescript
// Query respects workspace_id in RLS policy
const { data } = await supabase
  .from('ai_systems')
  .select('*')
  .eq('workspace_id', workspaceId);
```

**❌ BAD**:

```typescript
// Never use admin client for user queries (bypasses RLS)
const supabase = createClient(url, serviceKey); // ❌
```

### 5.2 Migrations

All schema changes via migrations in `supabase/migrations/`.

**✅ GOOD**:

```sql
-- supabase/migrations/20260716_add_assessment_status.sql
ALTER TABLE risk_assessments ADD COLUMN status text DEFAULT 'draft';
```

### 5.3 Query Patterns

Validate that queries include workspace/tenant context.

**✅ GOOD**:

```typescript
// Explicit tenant filtering
const { data } = await supabase
  .from('obligations')
  .select('*')
  .eq('workspace_id', workspaceId)
  .eq('company_id', companyId);
```

---

## 6. Testing

### 6.1 Unit Tests

Every pure function should have unit tests.

**✅ GOOD**:

```typescript
// risk-assessment.test.ts
import { classifyRisk } from './risk-assessment';

describe('classifyRisk', () => {
  it('returns unacceptable for prohibited indicators', () => {
    const answers = new Map([['q1-prohibited-biometric', true]]);
    expect(classifyRisk(answers)).toBe('unacceptable');
  });

  it('returns low for general-purpose AI', () => {
    const answers = new Map([['q-general-purpose', false]]);
    expect(classifyRisk(answers)).toBe('low');
  });
});
```

### 6.2 Test Coverage

- Aim for 80%+ coverage on lib/ (domain logic)
- 100% coverage on RLS/auth logic
- Cover error paths, not just happy paths

### 6.3 Test Organization

Tests co-locate with source files.

**✅ GOOD**:

```
lib/
├── risk-assessment.ts
└── risk-assessment.test.ts
```

---

## 7. Security Checklist

Every change must address:

### 7.1 Input Validation

- [ ] User input validated at route boundary
- [ ] Type-checked (no `any`)
- [ ] Length limits enforced
- [ ] SQL injection impossible (using parameterized queries)

### 7.2 Authorization

- [ ] RLS policies enforced for all Supabase queries
- [ ] Workspace/tenant context verified
- [ ] No admin client used for user queries

### 7.3 Data Leakage

- [ ] Error messages don't leak internal state
- [ ] Sensitive data not logged
- [ ] No credentials in code or comments

### 7.4 Redirect Safety

- [ ] All redirects use `safeRedirectPath()`
- [ ] No open redirects to arbitrary URLs

---

## 8. Performance

### 8.1 Database Queries

- [ ] Queries include `.select()` to limit fields (not `select('*')` if not needed)
- [ ] `.limit()` used to prevent unbounded result sets
- [ ] `.order()` used only when necessary

### 8.2 Client Rendering

- [ ] Server components for data fetching
- [ ] Client components kept small
- [ ] useCallback used for lists
- [ ] No unnecessary re-renders

---

## 9. Documentation

### 9.1 JSDoc for Public APIs

All exported functions must have JSDoc.

**✅ GOOD**:

```typescript
/**
 * Classify risk level for an AI system based on assessment answers.
 *
 * @param answers - Map of question IDs to boolean/string/number responses
 * @returns Risk level: 'unacceptable' | 'high' | 'medium' | 'low'
 * @throws Error if required questions are missing
 */
export function classifyRisk(answers: Map<string, unknown>): RiskLevel {
  // ...
}
```

### 9.2 README for Complex Modules

If a lib module is complex (>300 lines), include a README explaining:

- Purpose
- Main exports
- Example usage

---

## 10. Pre-Push Checklist

Before `git push`, verify:

- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] `npm run format` applied
- [ ] `npm test` passes (unit tests)
- [ ] Integration tests added for new workflows
- [ ] No `any` types
- [ ] Error paths tested
- [ ] RLS checks included (if data access)
- [ ] Security checklist items addressed

---

## References

- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Next.js App Router**: https://nextjs.org/docs/app
- **Supabase RLS**: https://supabase.com/docs/guides/auth/row-level-security
- **React Best Practices**: https://react.dev/reference/rules
- **EU AI Act**: docs/governance/EU_AI_ACT_REQUIREMENTS.md

---

## Evolution

This standard is living. Submit improvements as pull requests with justification in the commit message. Governor Ω will review and integrate.

**Last Updated**: 2026-07-16 (STAGE 3 Phase 3.1)  
**Next Review**: Upon completion of STAGE 3 Phase 3.3 (Integration Tests)
