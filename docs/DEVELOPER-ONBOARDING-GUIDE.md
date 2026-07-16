# Developer Onboarding Guide — EURO AI

**Purpose:** Get new developers productive on EURO AI platform in 2-4 hours  
**Audience:** Engineers, contractors, team members  
**Last Updated:** 2026-07-16  
**Status:** Production-ready documentation

---

## Quick Start (15 minutes)

### Prerequisites
- Node.js 18+ (check: `node --version`)
- Git (check: `git --version`)
- GitHub account with access to mininglife7-dev/newspulse-ai
- Editor: VS Code recommended (has TypeScript/ESLint plugins)

### Setup

```bash
# Clone repository
git clone https://github.com/mininglife7-dev/newspulse-ai.git
cd newspulse-ai

# Install dependencies
npm install

# Verify environment
npm run check-env
# Output: ✓ Required environment variables present

# Run tests (verify everything works)
npm test
# Output: Test Files 16 passed (16) | Tests 177 passed (177)

# Start development server
npm run dev
# Navigate to http://localhost:3000
# You should see the landing page
```

**Done!** You have a working development environment.

---

## Part 1: Repository Structure

### High-Level Layout

```
newspulse-ai/
├── app/                    # Next.js App Router pages & API routes
│   ├── (auth)/            # Authentication routes (signin, signup, verify)
│   ├── dashboard/         # Authenticated user dashboard
│   ├── api/               # API endpoints (POST /api/workspace, etc.)
│   ├── error.tsx          # Error page
│   ├── layout.tsx         # Root layout (navbar, footer)
│   └── page.tsx           # Landing page (/)
│
├── components/            # Reusable React components
│   ├── Form*              # Form components (FormInput, FormSelect, etc.)
│   ├── ErrorBoundary.tsx  # React error boundary for graceful fallbacks
│   ├── LoadingSpinner.tsx # Loading indicator
│   ├── Modal.tsx          # Modal dialog
│   └── ...
│
├── lib/                   # Utility functions & clients
│   ├── supabase.ts        # Browser Supabase client
│   ├── supabase-server.ts # Server-side Supabase client
│   ├── auth.ts            # Authentication utilities
│   ├── retry.ts           # Retry with exponential backoff (Phase 1)
│   ├── circuit-breaker.ts # Circuit breaker pattern (Phase 2)
│   ├── logger.ts          # Structured logging (Phase 2)
│   ├── error-categorizer.ts # Error classification (Phase 2)
│   ├── metrics.ts         # Performance metrics tracking (Phase 2)
│   └── journey.ts         # Customer journey telemetry (Phase 2)
│
├── supabase/              # Database schema & migrations
│   ├── schema.sql         # Complete database schema (tables, RLS, indexes)
│   └── migrations/        # Future: SQL migration files
│
├── docs/                  # Documentation
│   ├── API.md            # API endpoint reference
│   ├── ROADMAP.md        # Feature roadmap
│   ├── TECHNICAL-ROADMAP-90DAYS.md # 90-day technical plan
│   └── [compliance docs] # SECURITY-AUDIT-REPORT.md, etc.
│
├── public/               # Static assets
│   └── screenshots/      # E2E test screenshots (auto-generated)
│
├── tests/                # Test suites
│   ├── unit/            # Unit tests (lib functions, utilities)
│   ├── e2e/             # Playwright end-to-end tests
│   └── fixtures/        # Mock data for tests
│
├── .github/             # GitHub configuration
│   └── workflows/       # CI/CD pipelines (ci.yml)
│
├── .env.example         # Environment variables template
├── .eslintrc.json       # ESLint configuration
├── eslintignore         # ESLint ignore patterns
├── prettier.config.cjs  # Prettier code formatter config
├── tsconfig.json        # TypeScript configuration
├── tailwind.config.ts   # Tailwind CSS configuration
└── package.json         # Dependencies and scripts
```

### Where Things Live

**Landing Page & Auth:**
- Landing page: `app/page.tsx`
- Signup form: `app/(auth)/signup/page.tsx`
- Signin form: `app/(auth)/signin/page.tsx`
- Email verification: `app/(auth)/verify-email/page.tsx`

**Customer Journey (After Signup):**
1. **Dashboard:** `app/dashboard/page.tsx` (shows onboarding progress)
2. **Step 1 - Company Setup:** `app/dashboard/workspace/page.tsx`
3. **Step 2 - AI Inventory:** `app/dashboard/inventory/page.tsx`
4. **Step 3 - Risk Assessment:** `app/dashboard/assessment/page.tsx`

**API Endpoints:**
- User signup: `app/api/auth/signup/route.ts`
- Workspace creation: `app/api/workspace/route.ts`
- AI systems CRUD: `app/api/ai-systems/route.ts`
- Risk assessments: `app/api/risk-assessments/route.ts`
- Health check: `app/api/health/route.ts`

**Database:**
- Schema: `supabase/schema.sql` (all tables, RLS policies, indexes defined here)
- No migrations (yet) — entire schema deployed at once

**Tests:**
- Unit tests: `tests/unit/*.test.ts`
- E2E smoke tests: `tests/e2e/*.spec.ts`

**Configuration:**
- Environment vars: `.env.example` (copy to `.env.local` for development)
- TypeScript: `tsconfig.json`
- ESLint: `.eslintrc.json`
- Prettier: `prettier.config.cjs`

---

## Part 2: Technology Stack & Conventions

### Frontend
- **Framework:** Next.js 14 (App Router, TypeScript strict mode)
- **Styling:** Tailwind CSS (utility-first, no custom CSS)
- **Icons:** lucide-react (tree-shakeable SVG icons)
- **State Management:** React hooks (useState, useEffect, useContext)
- **Form Handling:** HTML5 form elements + client-side validation

**Conventions:**
- Functional components only (no class components)
- Use TypeScript interfaces for props
- Separate logic into custom hooks (hooks can be tested independently)
- CSS via Tailwind classes (no CSS-in-JS)
- Components are single responsibility (one thing each)

### Backend
- **Runtime:** Node.js (Vercel serverless functions)
- **API Format:** REST JSON
- **Database:** PostgreSQL (via Supabase)
- **Authentication:** Supabase Auth (JWT + cookies)
- **Middleware:** Custom (middleware.ts handles auth + redirects)

**Conventions:**
- API endpoints use HTTP verbs correctly (GET read, POST create, PUT/PATCH update, DELETE remove)
- All endpoints return JSON
- Errors return appropriate HTTP status codes (401 auth, 409 conflict, 500 server error)
- No secret API keys in code (use environment variables)

### Database
- **Schema:** Single SQL file (`supabase/schema.sql`)
- **Access Control:** Row-Level Security (RLS) policies per table
- **No ORM** (uses Supabase JavaScript client for queries)
- **Migrations:** Currently not used (entire schema deployed at once)

### Testing
- **Unit Tests:** Vitest (fast in-process tests)
- **E2E Tests:** Playwright (browser automation)
- **Mocking:** External services (OpenAI, Firecrawl, Supabase) are mocked
- **Coverage:** 177 tests covering core flows

### Code Quality
- **Linting:** ESLint (enforces code style)
- **Formatting:** Prettier (auto-formats code)
- **Type Checking:** TypeScript strict mode (catches type errors at compile time)
- **CI/CD:** GitHub Actions (runs lint + test + build on every push)

---

## Part 3: Local Development

### Running the App

```bash
# Development mode (auto-reload on file changes)
npm run dev
# Opens http://localhost:3000

# Production build (optimized)
npm run build
npm run start

# Build without optimizations (faster iteration)
npm run build -- --debug
```

### Working with Database

**Connect to local Supabase (Docker):**
```bash
# Start Supabase locally (optional, for offline development)
npm install -g supabase-cli
supabase start
# Supabase API URL: http://localhost:54321
```

**Using Supabase Console (recommended for most dev):**
1. Go to https://app.supabase.com
2. Select the EURO AI project
3. SQL Editor tab: Run queries, browse tables
4. Auth tab: Manage test users
5. Database tab: View schema, create migrations

**Creating Test Data:**
```sql
-- In Supabase Console → SQL Editor
-- Create test user
INSERT INTO profiles (id, email, full_name)
VALUES (auth.uid(), 'test@example.com', 'Test User');

-- Create test workspace
INSERT INTO workspaces (id, created_by, name)
VALUES (gen_random_uuid(), auth.uid(), 'Test Workspace');

-- Query test data
SELECT * FROM profiles;
SELECT * FROM workspaces WHERE created_by = auth.uid();
```

### Environment Setup

**Copy template:**
```bash
cp .env.example .env.local
```

**Edit `.env.local` with your values:**
```env
# Supabase (get from supabase.com dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# GitHub (for preview deployments on Vercel)
GITHUB_TOKEN=ghp_your_personal_token  # (optional for local dev)
```

**Verify environment:**
```bash
npm run check-env
# If all env vars present: ✓ All required variables set
```

---

## Part 4: Adding a Feature

### 1. Design & Planning

**Before coding:**
1. Create a GitHub issue describing the feature
2. Plan the database schema (if needed): "What new tables or columns do we need?"
3. Plan the API (if needed): "What endpoints and data formats?"
4. Plan the UI (if needed): "What pages and components?"

**Example:** Adding a "note" field to company profile

**Database schema:**
```sql
ALTER TABLE companies ADD COLUMN notes TEXT;
```

**API endpoint:**
```
PUT /api/companies/:id
Request: { notes: "string" }
Response: { id, name, notes, ... }
```

**UI component:**
```typescript
// Page: app/dashboard/workspace/page.tsx
// New input: <textarea> for notes field
```

### 2. Implement Database Changes

Edit `supabase/schema.sql`:
```sql
-- Add new column
ALTER TABLE companies ADD COLUMN notes TEXT NULL;

-- (Re-deploy to Supabase by running entire schema.sql)
```

**Re-deploy:**
1. In Supabase Console → SQL Editor
2. Copy entire `supabase/schema.sql` content
3. Paste and run (overwrites existing schema)
4. Verify table has new column

### 3. Implement API

Create or modify `app/api/companies/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check authentication
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get request body
    const body = await req.json();
    const { notes } = body;

    // Validate input
    if (typeof notes !== 'string') {
      return NextResponse.json({ error: 'Invalid notes field' }, { status: 400 });
    }

    // Update database (RLS will enforce authorization)
    const { data, error } = await supabase
      .from('companies')
      .update({ notes })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error('Error updating company:', err);
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
  }
}
```

### 4. Implement UI

Create or modify `components/CompanyNotes.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { FormTextarea } from './FormTextarea';

interface CompanyNotesProps {
  companyId: string;
  initialNotes?: string;
  onSave?: () => void;
}

export function CompanyNotes({ companyId, initialNotes = '', onSave }: CompanyNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) throw new Error('Failed to save notes');
      onSave?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <FormTextarea
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add internal notes about this company..."
      />
      {error && <div className="text-red-600">{error}</div>}
      <button
        onClick={handleSave}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save Notes'}
      </button>
    </div>
  );
}
```

### 5. Write Tests

Create `tests/unit/companies.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateCompanyNotes } from '@/lib/companies';

describe('Company Notes', () => {
  it('should save notes to database', async () => {
    const result = await updateCompanyNotes('company-123', 'Test note');
    expect(result.notes).toBe('Test note');
  });

  it('should handle empty notes', async () => {
    const result = await updateCompanyNotes('company-123', '');
    expect(result.notes).toBe('');
  });

  it('should reject invalid input', async () => {
    expect(() => updateCompanyNotes('company-123', null as any)).toThrow();
  });
});
```

### 6. Manual Testing

1. Navigate to company profile page
2. Find new "Notes" field
3. Enter some text and click "Save Notes"
4. Verify text is saved and persists on page reload
5. Check browser console for errors

### 7. Run Automated Tests

```bash
npm test
# Verify all tests pass
```

### 8. Create PR

```bash
git checkout -b feature/company-notes
git add .
git commit -m "feat: Add notes field to company profile"
git push origin feature/company-notes
```

Then create a PR on GitHub with:
- **Title:** `feat: Add notes field to company profile`
- **Description:** Why this feature? How does it work?
- **Checklist:** Database schema ✓, API ✓, UI ✓, Tests ✓

---

## Part 5: Code Conventions & Style

### TypeScript

**Use strict types (no `any`):**
```typescript
// ✅ Good
interface CompanyData {
  id: string;
  name: string;
  country: string;
}

function createCompany(data: CompanyData): Promise<CompanyData> {
  // ...
}

// ❌ Bad
function createCompany(data: any): any {
  // ...
}
```

**Use interfaces for props and data:**
```typescript
// ✅ Good
interface FormProps {
  onSubmit: (data: FormData) => void;
  loading?: boolean;
}

function Form({ onSubmit, loading }: FormProps) {
  // ...
}

// ❌ Bad
function Form(props) {
  // props could be anything
}
```

### React Components

**Functional components, hooks only:**
```typescript
// ✅ Good
function Dashboard() {
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    fetchCompanies();
  }, []);

  return <div>{/* render companies */}</div>;
}

// ❌ Bad (class component)
class Dashboard extends React.Component {
  // ...
}
```

**Extract complex logic into custom hooks:**
```typescript
// ✅ Good - logic is testable separately
function useCompanies() {
  const [data, setData] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchCompanies().then(setData).finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

function Dashboard() {
  const { data, loading } = useCompanies();
  return <div>{/* render data */}</div>;
}

// ❌ Bad - logic is mixed with UI
function Dashboard() {
  const [data, setData] = useState([]);
  // ... 50 lines of logic here
  return <div>{/* render */}</div>;
}
```

### Styling with Tailwind

**Use utility classes, no custom CSS:**
```tsx
// ✅ Good
<button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
  Save
</button>

// ❌ Bad
<button style={{ backgroundColor: 'blue', padding: '10px' }}>Save</button>

// ❌ Bad (custom CSS)
<style>{`.btn { background: blue; padding: 10px; }`}</style>
<button className="btn">Save</button>
```

**Responsive design (mobile-first):**
```tsx
// ✅ Good
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Stack on mobile, 2 cols on tablet, 3 cols on desktop */}
</div>

// ❌ Bad
<div style={{ display: 'flex', flexWrap: 'wrap' }}>
  {/* Not responsive */}
</div>
```

### API Routes

**Consistent error handling:**
```typescript
// ✅ Good
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate
    if (!body.name) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 });
    }

    // Process
    const result = await db.create(body);
    
    // Return
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ❌ Bad
export async function POST(req) {
  const body = req.json();
  return db.create(body); // No error handling, returns wrong format
}
```

**Proper HTTP status codes:**
- `200` OK — Request succeeded
- `201` Created — Resource created
- `400` Bad Request — Invalid input
- `401` Unauthorized — Not authenticated
- `403` Forbidden — Authenticated but not authorized
- `404` Not Found — Resource doesn't exist
- `409` Conflict — Request conflicts with existing data
- `500` Internal Server Error — Server-side error

### File Naming

```
✅ Good
- components/CompanyForm.tsx (PascalCase, descriptive)
- lib/auth.ts (lowercase, clear purpose)
- tests/unit/auth.test.ts (lowercase with .test suffix)
- app/dashboard/page.tsx (lowercase, follows Next.js convention)

❌ Bad
- components/form.tsx (lowercase, unclear what form)
- lib/utils.js (vague, no extension)
- tests/test_auth.js (underscore convention, wrong extension)
```

### Comments

**Write comments that explain WHY, not WHAT:**
```typescript
// ✅ Good
// Retry 3 times because temporary network hiccups are common
const maxRetries = 3;

// ❌ Bad
// Set maxRetries to 3
const maxRetries = 3;
```

**Use self-documenting code instead:**
```typescript
// ✅ Good - code is clear
const isUserAuthenticated = !!session;

// ❌ Bad - needs explanation
const x = !!session; // true if user is logged in
```

---

## Part 6: Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test tests/unit/auth.test.ts

# Run tests in watch mode (re-run on file changes)
npm test -- --watch

# Run with coverage report
npm test -- --coverage
```

### Writing Unit Tests

**Example: Testing a utility function**

```typescript
// lib/validation.ts
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// tests/unit/validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateEmail } from '@/lib/validation';

describe('validateEmail', () => {
  it('should accept valid email', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });

  it('should reject invalid email', () => {
    expect(validateEmail('invalid-email')).toBe(false);
  });

  it('should reject email without domain', () => {
    expect(validateEmail('test@')).toBe(false);
  });
});
```

### Writing E2E Tests

**Example: Testing the signup flow**

```typescript
// tests/e2e/signup.spec.ts
import { test, expect } from '@playwright/test';

test('user can sign up and verify email', async ({ page }) => {
  // Navigate to signup
  await page.goto('/auth/signup');

  // Fill form
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'SecurePass123');
  await page.fill('input[name="confirmPassword"]', 'SecurePass123');

  // Submit
  await page.click('button[type="submit"]');

  // Verify success message
  await expect(page.locator('text=Verification email sent')).toBeVisible();
});
```

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific E2E test
npm run test:e2e -- signup.spec.ts

# Run with headed browser (see what's happening)
npm run test:e2e -- --headed

# Debug mode (interactive)
npm run test:e2e -- --debug
```

---

## Part 7: Debugging & Troubleshooting

### Common Issues

**Issue: `npm install` fails with peer dependency errors**
```bash
# Solution: Install with legacy peer deps flag
npm install --legacy-peer-deps
```

**Issue: TypeScript errors but `npm run build` succeeds**
```bash
# Solution: Your editor TypeScript version is out of sync
# Restart VS Code or run:
npm run type-check
```

**Issue: Database operations fail with "403 Forbidden" or "no rows returned"**
```bash
# Solution 1: Check RLS policies in Supabase console
# SQL Editor → find "Create policy" statements
# Verify current user has access to the table

# Solution 2: Verify you're using correct Supabase key
# console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
# Should be: https://your-project.supabase.co
```

**Issue: Tests timeout or hang**
```bash
# Solution 1: Increase timeout
// tests/unit/mytest.test.ts
it('long operation', async () => { ... }, { timeout: 10000 })

# Solution 2: Check for infinite loops or unresolved promises
// Make sure all async operations have .then() or await
```

### Browser DevTools

**Debug client-side code:**
1. Open browser DevTools (F12)
2. Go to Sources tab
3. Click line number to set breakpoint
4. Reload page, execution stops at breakpoint
5. Inspect variables in console

**View network requests:**
1. Open DevTools → Network tab
2. Perform an action (click button, submit form)
3. See all HTTP requests and responses
4. Check response status and body for errors

**View React component state:**
1. Install React DevTools extension (Chrome/Firefox)
2. Open DevTools → Components tab
3. Inspect component tree and hook values
4. Modify state values to test UI changes

### Server Logs

**Development mode:**
```bash
npm run dev
# Server logs print to console in real-time
# Watch for errors and debug info
```

**Production (Vercel):**
1. Go to https://vercel.com/dashboard
2. Select EURO AI project
3. Go to Deployments tab
4. Click a deployment → Logs
5. View output from that deployment

### Database Inspection

**Supabase Console:**
1. Go to https://app.supabase.com
2. Select EURO AI project
3. Table Editor tab: View all rows in a table
4. SQL Editor tab: Run custom queries
5. Auth tab: View user accounts and sessions

---

## Part 8: Deployment

### Before Deploying

**Checklist:**
```bash
# 1. All tests pass
npm test

# 2. No TypeScript errors
npm run type-check

# 3. No linting errors
npm run lint

# 4. Build succeeds
npm run build

# 5. Tests still pass after build
npm test
```

### Deployment Process

**Automatic (recommended):**
1. Create a branch: `git checkout -b feature/my-feature`
2. Make changes and commit: `git commit -m "feat: my feature"`
3. Push to GitHub: `git push origin feature/my-feature`
4. Open PR on GitHub
5. Wait for CI to pass (should be green check)
6. Get code review
7. Merge PR to `main` branch
8. Vercel automatically deploys (takes 2-3 min)
9. Verify deployment succeeded (check Vercel dashboard)

**Manual (if needed):**
```bash
# Deploy current branch
npm run build
npm run start

# Or use Vercel CLI
npm install -g vercel
vercel --prod
```

### Rollback (If Something Breaks)

1. Go to https://vercel.com/dashboard
2. Select EURO AI project
3. Go to Deployments tab
4. Find the previous working deployment (✓ checkmark)
5. Click "..." menu → Promote to Production
6. Deployment rolls back in ~30 seconds

---

## Part 9: Useful Commands

```bash
# Development
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Build for production
npm run start        # Run production build locally

# Testing
npm test             # Run all tests
npm test -- --ui     # Run tests with UI (opens browser)
npm run test:e2e     # Run E2E tests
npm run test:e2e -- --headed  # See browser while running

# Code Quality
npm run lint         # Check for linting errors
npm run type-check   # Check for TypeScript errors
npm run format       # Auto-format code with Prettier
npm run check-env    # Verify environment variables

# Database (local dev)
npm run db:pull      # Pull schema from Supabase (if using migrations)
npm run db:push      # Push schema to Supabase (if using migrations)

# Utilities
npm run clean        # Remove build artifacts
npm run deps-check   # Check for dependency updates
```

---

## Part 10: Getting Help

### Internal Resources

1. **API Documentation:** `docs/API.md` — All endpoints, request/response formats
2. **Architecture:** `docs/TECHNICAL-ROADMAP-90DAYS.md` — System design decisions
3. **Database Schema:** `supabase/schema.sql` — Tables, RLS policies, relationships
4. **Code Examples:** Look at similar features in `app/` and `lib/`

### External Resources

- **Next.js Docs:** https://nextjs.org/docs
- **React Docs:** https://react.dev
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/
- **Supabase Docs:** https://supabase.com/docs
- **Tailwind CSS:** https://tailwindcss.com/docs

### Asking for Help

**Before asking:**
1. Check the documentation (this guide, API.md, TECHNICAL-ROADMAP-90DAYS.md)
2. Search GitHub issues for similar problems
3. Try debugging with console.log or DevTools
4. Run tests to see if error is reproducible

**When asking:**
1. Describe what you're trying to do
2. Show the error message (full stack trace)
3. Show what you've already tried
4. Link to relevant code (GitHub permalink)

---

## Summary

You now understand:
- ✅ How to set up a development environment
- ✅ Where code lives in the repository
- ✅ Technology stack and conventions
- ✅ How to add features (database → API → UI)
- ✅ How to test your code
- ✅ How to debug issues
- ✅ How to deploy changes

**Next steps:**
1. Complete setup: `npm install && npm test`
2. Pick a small feature to implement
3. Follow the feature development process (Part 4)
4. Create a PR and ask for review

Welcome to the team! 🚀

---

**Developer Onboarding Guide Complete**  
**Last Updated:** 2026-07-16  
**Author:** Governor  
**For questions:** See "Getting Help" section above
